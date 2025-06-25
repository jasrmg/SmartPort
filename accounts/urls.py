from django.urls import path
from . import views

urlpatterns = [
  path('me/', views.get_current_user),
  path("firebase-register/", views.firebase_register_view, name="firebase_register_view"),
  path("send-custom-verification-email/", views.send_custom_verification_email, name="send_custom_verification_email"),
  path("verify-email/", views.verify_email_view, name="verify-email"),
  path("resend-verification/", views.resend_verification_email_view, name="resend-verification"),

  # EMAIL VERIFICATION STATUS
  path("email-verified/",   views.email_verified_page, name="email_verified"),
  path("email-expired/", views.email_expired_page, name="email_expired"),
  path("email-invalid/", views.email_invalid_page, name="email_invalid"),
]
