from django.http import JsonResponse
import json
from django.views.decorators.csrf import csrf_exempt

from firebase_admin import auth
from accounts.models import UserProfile

def get_current_user(request):
  user = getattr(request, 'user_profile', None)
  if not user:
    return JsonResponse({'error': 'Unauthorized'}, status=401)

  return JsonResponse({
    'user_id': user.user_id,
    'first_name': user.first_name,
    'last_name': user.last_name,
    'email': user.email,
    'role': user.role,
    'avatar': user.avatar
  })

@csrf_exempt
def firebase_register_view(request):
  if request.method == 'POST':
    id_token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
      decoded = auth.verify_id_token(id_token, clock_skew_seconds=10)
      if not decoded.get("email_verified", False):
        return JsonResponse({"error": "Email not verified"}, status=403)
      # print("AUTH TOKEN: ", decoded)
      data = json.loads(request.body)
      email = decoded["email"]
      uid = decoded["uid"]

      # ✅ Now safe to query DB
      if UserProfile.objects.filter(email=email).exists() or UserProfile.objects.filter(firebase_uid=uid).exists():
        # print("USER ALREADY REGISTERED")
        return JsonResponse({"message": "Already registered"}, status=409)
      else: 
        # print("About to create user:")
        # print("  Email:", email)
        # print("  UID:", uid)
        # print("  First name:", data.get("first_name"))
        # print("  Last name:", data.get("last_name"))
        # print("  Role:", data.get("role"))
        # print(" Avatar: ", data.get("avatar"))
        
        UserProfile.objects.create(
          firebase_uid=uid,
          email=email,
          first_name=data.get("first_name", ""),
          last_name=data.get("last_name", ""),
          role=data.get("role", ""),
          avatar=data.get("avatar", ""),
        )

        user = UserProfile.objects.get(firebase_uid=uid)
        # print("Stored in DB:", user.first_name, user.last_name, user.role)

        return JsonResponse({"message": "User registered successfully"})

    except Exception as e:
      import traceback
      print("Firebase Register Error:")
      traceback.print_exc()
      return JsonResponse({"error": str(e)}, status=400)


# ENDPOINT FOR THE CUSTOM VERIFICATION USING DJANGO + FIREBASE SDK IN SENDING EMAIL
from django.core.mail import EmailMessage
from django.urls import reverse
from django.conf import settings
@csrf_exempt
def send_custom_verification_email(request):
  if request.method == "POST":
    try:
      id_token = request.headers.get("Authorization", "").replace("Bearer ", "")
      decoded = auth.verify_id_token(id_token, clock_skew_seconds=10)
      data = json.loads(request.body);

      first_name = data.get("first_name", "").title()
      last_name = data.get("last_name", "").title()

      email = decoded["email"]
      uid = decoded["uid"]

      #generate verification token signed with timestamp:
      from itsdangerous import URLSafeTimedSerializer
      serializer = URLSafeTimedSerializer(settings.SECRET_KEY)
      token = serializer.dumps(uid, salt="email-verify")

      verification_url = request.build_absolute_uri(
        reverse("verify-email") + f"?token={token}"
      )

      email_subject = "Verify your SmartPort account"
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

      email_message = EmailMessage(email_subject, email_body, to=[email])
      email_message.content_subtype = "html"
      email_message.send()

      return JsonResponse({"message": "Verification Email sent!"})

    except Exception as e:
      import traceback
      traceback.print_exc()
      return JsonResponse({"error": str(e)},status=400)


# VERIFY EMAIL
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
from django.shortcuts import redirect

def verify_email_view(request):
  token = request.GET.get("token")
  serializer = URLSafeTimedSerializer(settings.SECRET_KEY)

  try:
    uid = serializer.loads(token, salt="email-verify", max_age=60) #30 mins
    user = auth.get_user(uid)

    print("UID VERIFY: ", uid)
    print("USER VERIFY: ", user)
    print("TOKEN VERIFY: ", token)

    auth.update_user(uid, email_verified=True)
    return redirect("email_verified") 
  
  except SignatureExpired:
    # return JsonResponse({"error": "Verification link expired."}, status=400)
    return redirect("email_expired")
  except BadSignature:
    # return JsonResponse({"error": "Invalid token."}, status=400)
    return redirect("email_invalid")

# RESEND VERIFICATION:
@csrf_exempt
def resend_verification_email_view(request):
  if request.method != "POST":
    return JsonResponse({"error": "Invalid method"}, status=405)
  if request.method == 'POST':
    print("POST METHOD")
    id_token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
      decoded = auth.verify_id_token(id_token, clock_skew_seconds=10)
      uid = decoded["uid"]
      email = decoded["email"]
      # print("ID TOKEN: ", id_token)
      # print("EMAIL: ", email)
      # print("UID: ", uid)
      
      # Generate a new token
      serializer = URLSafeTimedSerializer(settings.SECRET_KEY)
      token = serializer.dumps(uid, salt="email-verify")

      verify_url = request.build_absolute_uri(
        reverse("verify-email") + f"?token={token}"
      )

      subject = "Your New Email Verification Link"
      body = f"Please click the following link to verify your email:\n{verify_url}"

      email_message = EmailMessage(
        subject, body, to=[email]
      )
      email_message.send()

      return JsonResponse({"message": "Verification email resent."})

    except Exception as e:
      print("🔥 RESEND ERROR:", str(e))
      return JsonResponse({"error": str(e)}, status=400)



# EMAIL STATUS VIEW:
from django.shortcuts import render
def email_verified_page(request):
  return render(request, "smartportApp/email_verified.html")

def email_expired_page(request):
  return render(request, "smartportApp/email_expired.html")

def email_invalid_page(request):
  return render(request, "smartportApp/email_invalid.html")