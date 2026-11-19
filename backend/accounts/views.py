from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from django.utils.crypto import get_random_string
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import EmailVerificationOTP, PasswordResetOTP
from .serializers import LoginSerializer, RegisterSerializer, UserSerializer
from .tasks import send_approval_email, send_otp_email, send_verification_email

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """POST /api/auth/register/ - anyone can sign up."""

    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Send a 6-digit code so the user can confirm the email address.
        code = get_random_string(length=6, allowed_chars="0123456789")
        EmailVerificationOTP.objects.create(user=user, code=code)
        send_verification_email.delay(user.email, code)

        data = UserSerializer(user).data
        data["message"] = (
            f"We sent a 6-digit code to {user.email}. "
            "Enter it to confirm your email address."
        )
        return Response(data, status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    """POST /api/auth/login/ - only approved accounts get a token."""

    serializer_class = LoginSerializer

    def post(self, request, *args, **kwargs):
        identifier = request.data.get("username", "")
        password = request.data.get("password", "")

        # Let people log in with either their username or their email.
        user = User.objects.filter(username=identifier).first()
        if user is None:
            user = User.objects.filter(email__iexact=identifier).first()
        if user is None or not user.check_password(password):
            return Response(
                {"detail": "Invalid username or password."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # The email must be confirmed before the account can be used.
        # Admin accounts skip this check.
        if not (user.is_staff or user.is_superuser) and not user.email_verified:
            return Response(
                {
                    "detail": (
                        "Please confirm your email address first. "
                        "Check your inbox for the 6-digit code."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # A pending or rejected user knows the right password but still
        # must not be let in.
        if not user.is_approved:
            if user.approval_status == User.PENDING:
                detail = "Your account is still waiting for admin approval."
            else:
                detail = "Your registration was rejected. Please contact support."
            return Response({"detail": detail}, status=status.HTTP_403_FORBIDDEN)

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
            }
        )


class MeView(APIView):
    """GET /api/auth/me/ - returns the logged in user."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class LogoutView(APIView):
    """POST /api/auth/logout/ - blacklists the refresh token."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            RefreshToken(request.data.get("refresh", "")).blacklist()
        except Exception:
            # A missing/already used token is not a real problem here.
            pass
        return Response({"detail": "Logged out."})


class ResendApprovalView(APIView):
    """POST /api/auth/resend-approval/ - handy while testing the flow."""

    permission_classes = [AllowAny]

    def post(self, request):
        user = User.objects.filter(email=request.data.get("email", "")).first()
        if user is None:
            # Do not reveal whether the email exists.
            return Response({"detail": "If that email exists we sent a reminder."})
        if user.is_approved:
            return Response({"detail": "That account is already approved."})
        send_approval_email.delay(user.id, True)
        return Response({"detail": "Reminder queued."})

class ForgotPasswordView(APIView):
    """POST /api/auth/forgot-password/ - email a 6-digit reset code."""

    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "")
        user = User.objects.filter(email__iexact=email).first()
        if user:
            code = get_random_string(length=6, allowed_chars="0123456789")
            PasswordResetOTP.objects.create(user=user, code=code)
            send_otp_email.delay(user.email, code)
        return Response({"detail": f"OTP sent to {email}"})


class VerifyEmailView(APIView):
    """POST /api/auth/verify-email/ - confirm the registration code."""

    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "")
        otp = request.data.get("otp", "")
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response({"detail": "Invalid or expired code."}, status=status.HTTP_400_BAD_REQUEST)
        if user.email_verified:
            return Response(
                {"detail": "This email is already confirmed. You can log in once an admin approves your account."}
            )

        verification = user.verify_otps.order_by("-created_at").first()
        if (
            not verification
            or verification.code != str(otp)
            or timezone.now() - verification.created_at > timedelta(minutes=10)
        ):
            return Response({"detail": "Invalid or expired code."}, status=status.HTTP_400_BAD_REQUEST)

        user.email_verified = True
        user.save(update_fields=["email_verified"])
        user.verify_otps.all().delete()
        return Response(
            {"detail": "Email confirmed. Your account is now waiting for admin approval."}
        )


class ResendVerificationView(APIView):
    """POST /api/auth/resend-verification/ - send a new confirmation code."""

    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "")
        user = User.objects.filter(email__iexact=email).first()
        if user and not user.email_verified:
            code = get_random_string(length=6, allowed_chars="0123456789")
            EmailVerificationOTP.objects.create(user=user, code=code)
            send_verification_email.delay(user.email, code)
        return Response({"detail": f"If {email} needs confirmation, a new code was sent."})


class ResetPasswordView(APIView):
    """POST /api/auth/reset-password/ - check the code and set a new password."""

    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "")
        otp = request.data.get("otp", "")
        password = request.data.get("password", "")
        password2 = request.data.get("password2", "")
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response({"detail": "Invalid or expired code."}, status=status.HTTP_400_BAD_REQUEST)
        if password != password2:
            return Response({"detail": "The two passwords do not match."}, status=status.HTTP_400_BAD_REQUEST)
        if len(password) < 6:
            return Response({"detail": "Password must be at least 6 characters."}, status=status.HTTP_400_BAD_REQUEST)

        reset = user.reset_otps.order_by("-created_at").first()
        if (
            not reset
            or reset.code != str(otp)
            or timezone.now() - reset.created_at > timedelta(minutes=10)
        ):
            return Response({"detail": "Invalid or expired code."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(password)
        user.save(update_fields=["password"])
        user.reset_otps.all().delete()
        return Response({"detail": "Password reset successful. You can now log in."})
