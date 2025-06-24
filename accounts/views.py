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
      print("AUTH TOKEN: ", decoded)
      data = json.loads(request.body)
      email = decoded["email"]
      uid = decoded["uid"]

      # ✅ Now safe to query DB
      if UserProfile.objects.filter(email=email).exists() or UserProfile.objects.filter(firebase_uid=uid).exists():
        print("USER ALREADY REGISTERED")
        return JsonResponse({"message": "Already registered"}, status=409)
      else: 
        print("About to create user:")
        print("  Email:", email)
        print("  UID:", uid)
        print("  First name:", data.get("first_name"))
        print("  Last name:", data.get("last_name"))
        print("  Role:", data.get("role"))

        
        UserProfile.objects.create(
          firebase_uid=uid,
          email=email,
          first_name=data.get("first_name", ""),
          last_name=data.get("last_name", ""),
          role=data.get("role", ""),
          avatar="",
        )

        user = UserProfile.objects.get(firebase_uid=uid)
        print("Stored in DB:", user.first_name, user.last_name, user.role)

        return JsonResponse({"message": "User registered successfully"})

    except Exception as e:
      import traceback
      print("Firebase Register Error:")
      traceback.print_exc()
      return JsonResponse({"error": str(e)}, status=400)


