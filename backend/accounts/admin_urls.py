from django.urls import path

from .admin_views import (
    AllUsersView,
    ApproveUserView,
    PendingUsersView,
    RejectUserView,
)

urlpatterns = [
    path("users/pending/", PendingUsersView.as_view(), name="admin-pending-users"),
    path("users/", AllUsersView.as_view(), name="admin-all-users"),
    path("users/<int:pk>/approve/", ApproveUserView.as_view(), name="admin-approve-user"),
    path("users/<int:pk>/reject/", RejectUserView.as_view(), name="admin-reject-user"),
]
