from django.contrib.auth import get_user_model
from rest_framework import generics, status
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import UserSerializer
from .tasks import send_approval_email

User = get_user_model()


class IsAdmin(BasePermission):
    """Only staff members may use the admin endpoints."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_staff
        )


class PendingUsersView(generics.ListAPIView):
    """GET /api/admin/users/pending/"""

    serializer_class = UserSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return User.objects.filter(approval_status=User.PENDING).order_by("-created_at")


class AllUsersView(generics.ListAPIView):
    """GET /api/admin/users/?status=approved

    Admin (staff) accounts are excluded from this list - only regular
    users show up here.
    """

    serializer_class = UserSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        queryset = User.objects.exclude(is_staff=True).order_by("-created_at")
        status_param = self.request.query_params.get("status")
        if status_param:
            queryset = queryset.filter(approval_status=status_param)
        return queryset


class ApproveUserView(APIView):
    """POST /api/admin/users/{id}/approve/"""

    permission_classes = [IsAdmin]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        user.approval_status = User.APPROVED
        user.save(update_fields=["approval_status"])

        # Hand the email over to Celery so the response stays fast.
        send_approval_email.delay(user.id, True)

        return Response(UserSerializer(user).data)


class RejectUserView(APIView):
    """POST /api/admin/users/{id}/reject/"""

    permission_classes = [IsAdmin]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        user.approval_status = User.REJECTED
        user.save(update_fields=["approval_status"])
        send_approval_email.delay(user.id, False)

        return Response(UserSerializer(user).data)
