import os
import traceback
from django.http import JsonResponse
import json
from django.views.decorators.csrf import csrf_exempt

from firebase_admin import auth, firestore
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

# EMAIL STATUS VIEW:
from django.shortcuts import render
def email_verified_page(request):
  return render(request, "smartportApp/email_verified.html")

def email_expired_page(request):
  return render(request, "smartportApp/email_expired.html")

def email_invalid_page(request):
  return render(request, "smartportApp/email_invalid.html")


from django.contrib.auth.models import User
@csrf_exempt
def firebase_register_view(request):
  if request.method == 'POST':
    id_token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
      decoded = auth.verify_id_token(id_token, clock_skew_seconds=10)
      if not decoded.get("email_verified", False):
        return JsonResponse({"error": "Email not verified"}, status=403)
      
      data = json.loads(request.body)
      email = decoded["email"]
      uid = decoded["uid"]
      
      role = data["role"]
      # avatar = ""
      # if role == "admin":
      #   avatar = "/media/avatars/default_admin.jfif"
      # elif role == "custom":
      #   avatar = "/media/avatars/default_custom.jfif"
      # elif role == "employee":
      #   avatar = "/media/avatars/default_employee.jfif"
      # elif role == "shipper":
      #   avatar = "/media/avatars/default_shipper.jfif"
      # else:
      #   avatar = "/media/avatars/default.png"

      # ✅ Now safe to query DB
      if UserProfile.objects.filter(email=email).exists() or UserProfile.objects.filter(firebase_uid=uid).exists():
        # print("USER ALREADY REGISTERED")
        return JsonResponse({"message": "Already registered"}, status=409)
      
      # CREATE DJANGO USER
      django_user, created = User.objects.get_or_create(
        username=email,
        defaults={"email": email, "first_name": data["first_name"], "last_name": data["last_name"]},
      )

      # CREATE USER PROFILE
      UserProfile.objects.update_or_create(
        firebase_uid=uid,
        defaults={
          "user": django_user,
          "first_name": data["first_name"],
          "last_name": data["last_name"],
          "email": email,
          "role": role,
          "avatar": data["avatar"]
        }
      )

      user = UserProfile.objects.get(firebase_uid=uid)
      # print("Stored in DB:", user.first_name, user.last_name, user.role)

      return JsonResponse({"message": "User registered successfully"})

    except Exception as e:
      import traceback
      print("Firebase Register Error:")
      traceback.print_exc()
      return JsonResponse({"error": str(e)}, status=400)



from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
from django.shortcuts import redirect

# VERIFY EMAIL
def verify_email_view(request):
  token = request.GET.get("token")
  serializer = URLSafeTimedSerializer(settings.SECRET_KEY)

  try:
    uid = serializer.loads(token, salt="email-verify", max_age=60) #30 mins
    user = auth.get_user(uid)

    # print("UID VERIFY: ", uid)
    # print("USER VERIFY: ", user)
    # print("TOKEN VERIFY: ", token)

    auth.update_user(uid, email_verified=True)
    return redirect("email_verified") 
  
  except SignatureExpired:
    # return JsonResponse({"error": "Verification link expired."}, status=400)
    return redirect("email_expired")
  except BadSignature:
    # return JsonResponse({"error": "Invalid token."}, status=400)
    return redirect("email_invalid")


# ENDPOINT FOR THE CUSTOM VERIFICATION USING DJANGO + FIREBASE SDK IN SENDING EMAIL
from django.core.mail import EmailMessage
from django.urls import reverse
from django.conf import settings
# SEND CUSTOM VERIFCATION EMAIL:
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
      
      # Generate a new token
      data = json.loads(request.body.decode("utf-8"))
      first_name = data.get("first_name", "").title()
      last_name = data.get("last_name", "").title()

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

      email_message = EmailMessage(
        email_subject, email_body, to=[email]
      )
      email_message.content_subtype = "html"
      email_message.send()

      return JsonResponse({"message": "Verification email resent."})

    except Exception as e:
      print("🔥 RESEND ERROR:", str(e))
      return JsonResponse({"error": str(e)}, status=400)


from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes
# FORGOT PASSWORD RESET EMAIL:
@csrf_exempt
def send_reset_password_link(request):
    if request.method != "POST":
      return JsonResponse({"error": "Invalid method"}, status=405)
    
    try:
      data = json.loads(request.body)
      email = data.get("email", "").strip()
      user = UserProfile.objects.get(email=email)

      uid = urlsafe_base64_encode(force_bytes(user.firebase_uid))
      reset_url = request.build_absolute_uri(
        reverse("reset-password") + f"?uid={uid}"
      )
      email_subject = "Reset Your SmartPort Password"
      email_body = f"""
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Password Reset</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Montserrat', sans-serif;">
          <table align="center" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px; background-color: #ffffff; margin: 40px auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <tr>
              <td style="padding: 2rem;">
                <h2 style="color: #0a1f44; margin-top: 0; font-size: 24px;">Reset Your SmartPort Password</h2>
                <p style="font-size: 16px; color: #333;">
                  We received a request to reset the password for your SmartPort account.
                  If you made this request, please click the button below to set a new password.
                </p>
                <div style="margin: 30px 0; text-align: center;">
                  <a href="{reset_url}" target="_blank" 
                    style="display: inline-block; padding: 12px 24px; background-color: #1e3a8a; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">
                    Reset Password
                  </a>
                </div>
                <p style="font-size: 14px; color: #666;">
                  If you didn't request a password reset, you can safely ignore this email.
                  This link will expire in 30 minutes.
                </p>
                <p style="font-size: 14px; color: #666; margin-top: 40px;">– The SmartPort Team</p>
              </td>
            </tr>
          </table>
        </body>
      </html>
      """


      email_message = EmailMessage(email_subject, email_body, to=[email])
      email_message.content_subtype = "html"
      email_message.send()

      return JsonResponse({"message": "Reset email sent"})
    except UserProfile.DoesNotExist:
      return JsonResponse({"error": "Email not found"}, status=404)
    except Exception as e:
      return JsonResponse({"error": str(e)}, status=500)
    
# PERFORM FORGOT PASSWORD RESET:
@csrf_exempt
def perform_password_reset(request):
  if request.method != "POST":
    return JsonResponse({"error": "Invalid request"}, status=405)
  
  try:
    data = json.loads(request.body)
    uid = data.get("uid")
    new_password = data.get("password")

    decoded_uid = urlsafe_base64_decode(uid).decode()
    user = UserProfile.objects.get(firebase_uid=decoded_uid)

    # using firebase sdk to update password:
    auth.update_user(decoded_uid, password=new_password)

    # call the helper function for sending the email:
    send_password_change_confirmation(user)

    return JsonResponse({"message": "Password reset successful"})
  except Exception as e:
    return JsonResponse({"error": str(e)}, status=500)


from firebase_admin import auth, credentials, initialize_app, _apps
# CHANGE PASSWORD:
@csrf_exempt
def notify_change_password(request):
  if request.method != "POST":
    return JsonResponse({"error": "Invalid request method"}, status=405)
  
  try:
    id_token = request.headers.get("Authorization", "").replace("Bearer ", "")
    decoded = auth.verify_id_token(id_token, clock_skew_seconds=10)

    uid = decoded.get("uid")


    user = UserProfile.objects.get(firebase_uid=uid)
    send_password_change_confirmation(user)


    return JsonResponse({"message": "Password change successfully!"})
  except Exception as e:
    print("❌ Exception occurred:")
    traceback.print_exc()
    return JsonResponse({"error": str(e)}, status=500)


# HELPER METHOD FOR PERFORM PASSWORD RESET;
# THIS WOULD SEND AN EMAIL TO INFORM THE USER FOR THE SUCCESSFUL PASSWORD CHANGE
# @csrf_exempt
def send_password_change_confirmation(user):
  subject = "🔒 Password Changed Successfully"
  body = f"""
  <!DOCTYPE html>
  <html lang="en">
  <body style="font-family: 'Montserrat', sans-serif; background-color: #f5f5f5; padding: 2rem;">
    <div style="max-width: 600px; margin: auto; background-color: #ffffff; padding: 2rem; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
      <h2 style="color: #0a1f44;">Your Password Was Successfully Changed</h2>
      <p>Ahoy, <strong>{user.first_name}</strong>!
      <p style="font-size: 1rem; color: #333;">
        This is a confirmation that your password has been successfully updated. If you made this change, no further action is needed.
      </p>
      <div style="margin-top: 2rem; font-size: 0.9rem; color: #666;">
        <p style="color: #6b7280;">
          Fair winds and following seas,<br/>
          <strong>The SmartPort Team<strong>
        </p>
      </div>
    </div>
  </body>
  </html>
  """

  email_message = EmailMessage(subject, body, to=[user.email])
  email_message.content_subtype = "html"
  email_message.send()

# LOGIN:
from django.contrib.auth import login, logout
@csrf_exempt
def firebase_login_view(request):
  user_profile = getattr(request, "user_profile", None)
  print("USER PROFILE: ", user_profile)

  if not user_profile or not hasattr(user_profile, 'user'):
    return JsonResponse({"error": "Unauthorized"}, status=401)
  
  # log the user in using django's session system:
  login(request, user_profile.user)
  return JsonResponse({
    "message": "Login acknowledge", 
    "role": user_profile.role
  })

# LOGOUT (DUMMY ENDPOINT):
@csrf_exempt
def firebase_logout_view(request):
  if request.method == "POST":
    logout(request)
    print("FIREBASE LOGOUT ACKNOWLEDGE")
    return JsonResponse({"message": "Successfully logged out."}, status=200)
  
  return JsonResponse({"message": "logout acknowledge"})


from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from urllib.parse import urljoin

# EDIT PROFILE:
@csrf_exempt
def update_profile(request):

  if request.method != "POST":
    return JsonResponse({"error": "Invalid method request"}, status=405)
  
  try:
    # extract and clean the id token
    id_token = request.headers.get("Authorization").replace("Bearer ", "").strip()
    if not id_token:
      return JsonResponse({"error": "Authorization header missing"}, status=401)
    
    # decode the token with 10 sec clock skew
    decoded = auth.verify_id_token(id_token, clock_skew_seconds=10)

    # extract uid and email
    uid = decoded.get("uid")
    email = decoded.get("email")

    if not uid or not email:
      return JsonResponse({"error": "Invalid token payload"}, status=400)
    
    # get the user profile from mysql db
    try: 
      user = UserProfile.objects.get(firebase_uid=uid)
    except UserProfile.DoesNotExist:
      return JsonResponse({"error": "User not found"}, status=400)
    
    # get form values
    first_name = request.POST.get("first_name", "").title()
    last_name = request.POST.get("last_name", "").title()
    avatar_file = request.FILES.get("avatar")

    avatar_url = user.avatar

    if avatar_file:
      # generate filename: role_firstname_lastname.ext
      extension = avatar_file.name.split(".")[-1]
      filename = f"{user.role.lower()}_{first_name.lower()}_{last_name.lower()}.{extension}"
      saved_path = f"avatars/{filename}"

      # save to media dir 
      full_path = default_storage.save(saved_path, ContentFile(avatar_file.read()))
      avatar_url = request.build_absolute_uri(settings.MEDIA_URL + full_path)
      user.avatar = avatar_url
      # user.avatar = saved_path

    # update user in mysql
    user.first_name = first_name
    user.last_name = last_name
    user.avatar = avatar_url
    user.save()
    # update auth user:
    user.user.first_name = first_name
    user.user.last_name = last_name
    user.user.save()

    # update user in firestore
    db = firestore.client()
    user_ref = db.collection("users").document(uid)
    user_ref.set({
      "first_name": first_name,
      "last_name": last_name,
      "avatar": user.avatar or "",
    }, merge=True)

    return JsonResponse({"message": "Profile updated"})
  except Exception as e:
    return JsonResponse({"error": str(e)}, status=500)
  
# API ENDPOINT TO GET USERS IN USER MANAGEMENT TAB:
@csrf_exempt
def get_users_by_role(request):
  role = request.GET.get("role")
  if not role:
    return JsonResponse({"error": "Missing role parameter"}, status=400)
  
  users = UserProfile.objects.filter(role=role)
  user_list = [
    {
      'first_name': user.first_name,
      'last_name': user.last_name,
      'role': user.role,
      'avatar': user.avatar or "",
      'is_online': user.is_online,
      'email': user.email,
    }
    for user in users
  ]

  return JsonResponse({"users": user_list})

