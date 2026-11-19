from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ("username", "email", "approval_status", "is_staff", "created_at")
    list_filter = ("approval_status", "is_staff")
    actions = ["approve_users"]

    @admin.action(description="Approve selected users")
    def approve_users(self, request, queryset):
        updated = queryset.update(approval_status=User.APPROVED)
        self.message_user(request, f"{updated} user(s) approved.")
