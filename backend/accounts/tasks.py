import logging

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


@shared_task
def send_approval_email(user_id, approved=True):
    """Tell the user that an admin reviewed their registration.

    Runs on Celery so the API response is not slowed down by sending mail.
    """
    from django.contrib.auth import get_user_model

    User = get_user_model()
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        logger.warning("Approval mail skipped, user %s no longer exists", user_id)
        return "user missing"

    details = (
        f"Username: {user.username}\n"
        f"Email: {user.email}\n"
        f"Full name: {(user.first_name + ' ' + user.last_name).strip() or '-'}\n"
        f"Account status: {user.approval_status}\n"
        f"Registered: {user.date_joined.strftime('%Y-%m-%d %H:%M UTC')}"
    )

    if approved:
        subject = "Your Air Booking account is active"
        message = (
            f"Hi {user.first_name or user.username},\n\n"
            "Good news! An administrator approved your registration.\n"
            "You can now log in and start booking flights.\n\n"
            "Account details:\n"
            f"{details}\n\n"
            "- Air Booking team"
        )
    else:
        subject = "Update on your Air Booking registration"
        message = (
            f"Hi {user.first_name or user.username},\n\n"
            "Unfortunately an administrator rejected your registration.\n"
            "If you think this is a mistake please contact support.\n\n"
            "Account details:\n"
            f"{details}\n\n"
            "- Air Booking team"
        )

    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=False,
    )
    logger.info("Sent %s email to %s", "approval" if approved else "rejection", user.email)
    return "sent"

@shared_task
def send_verification_email(email, code):
    """Send the registration confirmation code."""
    subject = "Confirm your Air Booking email"
    message = (
        f"Welcome to Air Booking!\n\n"
        f"Your email confirmation code is: {code}\n\n"
        "It expires in 10 minutes. Enter it on the confirm-email page to "
        "verify your address.\n\n"
        "- Air Booking team"
    )
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [email],
        fail_silently=False,
    )
    logger.info("Sent verification email to %s", email)
    return "sent"


@shared_task
def send_otp_email(email, code):
    """Send the password reset code to the user's email."""
    subject = "Your Air Booking password reset code"
    message = (
        f"Your password reset code is: {code}\n\n"
        "It expires in 10 minutes. If you did not ask for this, ignore this email.\n\n"
        "- Air Booking team"
    )
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [email],
        fail_silently=False,
    )
    logger.info("Sent OTP email to %s", email)
    return "sent"
