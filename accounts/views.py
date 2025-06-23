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
    existing_user = UserProfile.objects.filter(email=email).first()
    if existing_user:
      return JsonResponse({"error": "User already exists"}, status=409)
    id_token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
      decoded = auth.verify_id_token(id_token)
      # print("DECODED TOKEN: ", decoded_token)
      if not decoded.get("email_verified", False):
        return JsonResponse({"error": "Email not verified"}, status=403)

      data = json.loads(request.body)
      email = decoded["email"]
      uid = decoded["uid"]

      # Check if already exists
      if UserProfile.objects.filter(email=email).exists():
        return JsonResponse({"message": "Already registered"})

      UserProfile.objects.create(
        firebase_uid=uid,
        email=email,
        first_name=data["first_name"],
        last_name=data["last_name"],
        role=data["role"]
      )
      return JsonResponse({"message": "User registered successfully"})

    except Exception as e:
      import traceback
      print("Firebase Register Error:")
      traceback.print_exc()
      return JsonResponse({"error": str(e)}, status=400)

