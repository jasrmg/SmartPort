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
      decoded = auth.verify_id_token(id_token)
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
      decoded = auth.verify_id_token(id_token)

      email = decoded["email"]
      uid = decoded["uid"]

      #generate verification token signed with timestamp:
      from itsdangerous import URLSafeTimedSerializer
      serializer = URLSafeTimedSerializer(settings.SECRET_KEY)
      token = serializer.dumps(uid, salt="email-verify")

      verification_url = request.build_absolute_uri(
        reverse("verify_email") + f"?token={token}"
      )

      email_subject = "Verify your SmartPort account"
      email_body = f"""
        <h2>Hi {email},<h2>
        <p>Please verify your email by clicking the link below:</p>
        <a href="{verification_url}" target="_blank">Verify My Email</a>
        <p>This link will expire in 30 minutes</p>
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
    uid = serializer.loads(token, salt="email-verify", max_age=1800) #30 mins
    user = auth.get_user(uid)
    auth.udpate_user(uid, email_verified=True)
    return redirect("email_verified") # url for the success template
  
  except SignatureExpired:
    return JsonResponse({"error": "Verification link expired."}, status=400)
  except BadSignature:
    return JsonResponse({"error": "Invalid token."}, status=400)


# EMAIL LINK REDIRECT VIEW:
from django.shortcuts import render
def email_verified_page(request):
  return render(request, "smartportApp/templates/email_verified.html")