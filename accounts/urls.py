from django.urls import path
from . import views

urlpatterns = [
  path('me/', views.get_current_user),
  path("firebase-register/", views.firebase_register_view, name="firebase_register_view"),
  path("send-custom-verification-email/", views.send_custom_verification_email, name="send_custom_verification_email"),
  path("verify-email/", views.verify_email_view, name="verify-email"),
  path("resend-verification/", views.resend_verification_email_view, name="resend-verification"),

  # EMAIL VERIFICATION STATUS
  path("email-verified/", views.email_verified_page, name="email_verified"),
  path("email-expired/", views.email_expired_page, name="email_expired"),
  path("email-invalid/", views.email_invalid_page, name="email_invalid"),

  # LOGIN LOGOUT:
  path("firebase-login/", views.firebase_login_view, name="firebase-login"),
  path("firebase-logout/", views.firebase_logout_view, name="firebase-logout"),

  # FORGOT PASSWORD:
  path("send-reset-link/", views.send_reset_password_link, name="send-reset-link"),
  path("perform-password-reset/", views.perform_password_reset, name="perform-password-reset"),

  # FORGOT PASSWORD SUCCESS EMAIL:
  path("send-password-confirmation/", views.send_password_change_confirmation, name="send-password-confirmation"),
  # CHANGE PASSWORD EMAIL:
  path("notify-password-change/", views.notify_change_password, name="notify-password-change"),

  # UPDATE PROFILE:
  path("update-profile/", views.update_profile, name="update-profile"),

  # API ENDPOINT FOR FETCHING THE USERS IN THE DB:
  path("get-users/", views.get_users_by_role, name="get_users_by_role"),
]
