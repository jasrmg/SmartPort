from django.core.mail import EmailMessage
from django.conf import settings
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.urls import reverse
from itsdangerous import URLSafeTimedSerializer
from accounts.models import UserProfile
# from accounts.firebase import firebase_app  
import firebase_admin.auth as firebase_auth
from firebase_admin import firestore

class Command(BaseCommand):
  help = "Creates an admin user in Firebase and Django"

  def handle(self, *args, **kwargs):
    email = input("Enter email for admin: ").strip()
    password = input("Enter password: ").strip()
    first_name = input("Enter first name: ").strip()
    last_name = input("Enter last name: ").strip()

    try:
      # Firebase user
      firebase_user = firebase_auth.create_user(
        email=email,
        password=password,
        display_name=f"{first_name} {last_name}"
      )
      uid = firebase_user.uid
      self.stdout.write(self.style.SUCCESS(f"✅ Firebase user created (UID: {uid})"))

      # Django user
      django_user, created = User.objects.get_or_create(
        username=email,
        defaults={"email": email, "first_name": first_name, "last_name": last_name}
      )

      # UserProfile
      UserProfile.objects.update_or_create(
        firebase_uid=uid,
        defaults={
          "user": django_user,
          "first_name": first_name,
          "last_name": last_name,
          "email": email,
          "role": "admin",
          "avatar": "/media/avatars/default_admin.png",  # optional default avatar
        }
      )

      # initialize firestore client
      db = firestore.client()

      # firestore document path:
      db.collection("users").document(uid).set({
        "first_name": first_name,
        "last_name": last_name,
        "email": email,
        "role": "admin",
        "avatar": "/media/avatars/default_admin.png",
      })

      # Generate verification token
      serializer = URLSafeTimedSerializer(settings.SECRET_KEY)
      token = serializer.dumps(uid, salt="email-verify")

      # Construct verification URL
      verification_url = f"http://127.0.0.1:8000{reverse('verify-email')}?token={token}"

      # Compose email
      email_subject = "Verify your SmartPort admin account"
      email_body = f"""
        <!DOCTYPE html>
        <html lang="en">
          <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Montserrat', sans-serif;">
            <table align="center" cellpadding="0" cellspacing="0" width="100%" style="max-width=600px; background-color: #fff; margin: 2rem auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
              <tr>
                <td style="padding: 2rem;">
                  <h2 style="color: #0a1f44; margin-top: 0;">Hi {first_name} {last_name},<h2>
                  <p style="font-size: 1rem; color: #333;>
                    Thank you for signing up with SmartPort! To complete your registration and activate your account, please verify your email address by clicking the button below:
                  </p>

                  <p style="font-size: .8rem; color: #333;">
                    Verifying your email helps us keep your account secure and ensures you’re the rightful owner of this address. If you did not sign up for this account, please ignore this message
                  </p>

                  <p style="font-size: 14px; color: #d14343; margin-top: 1.5rem;">
                    ⚠️ This link will expire in <strong>30 minutes</strong>.
                  </p>

                  <p style="text-align: center; margin: 2rem 0; margin-bottom: 1rem;">
                    <a href="{verification_url}" target="_blank" style="background-color: #2d9c5a; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                      Verify My Email
                    </a>
                  </p>
                  <p style="font-size: 15px; color: #333;">Thanks,</p>
                  <p style="font-size: 15px; color: #333;">The <strong>SmartPort</strong> Team</p>
                </td>
              </tr>
            </table>
          </body>
        </html>
      """

      email_message = EmailMessage(
        subject=email_subject, 
        body=email_body, 
        from_email=None, 
        to=[email]
      )
      email_message.content_subtype = "html"
      email_message.send()
      self.stdout.write(self.style.SUCCESS("✅ Verification email sent."))

      self.stdout.write(self.style.SUCCESS("✅ Admin user created successfully."))

    except Exception as e:
      self.stderr.write(self.style.ERROR(f"❌ Error: {e}"))
