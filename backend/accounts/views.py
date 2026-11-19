from django.contrib.auth import get_user_model
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import LoginSerializer, RegisterSerializer, UserSerializer
from .tasks import send_approval_email

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

        data = UserSerializer(user).data
        data["message"] = (
            "Registration received. Your account is pending admin approval "
            "and you will get an email once it is reviewed."
        )
        return Response(data, status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    """POST /api/auth/login/ - only approved accounts get a token."""

    serializer_class = LoginSerializer

    def post(self, request, *args, **kwargs):
        username = request.data.get("username", "")
        password = request.data.get("password", "")

        user = User.objects.filter(username=username).first()
        if user is None or not user.check_password(password):
            return Response(
                {"detail": "Invalid username or password."},
                status=status.HTTP_400_BAD_REQUEST,
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
