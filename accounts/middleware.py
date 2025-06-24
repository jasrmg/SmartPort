# accounts/middleware.py

from django.http import JsonResponse
from firebase_admin import auth
from accounts.models import UserProfile

import traceback
class FirebaseAuthMiddleware:
  def __init__(self, get_response):
    self.get_response = get_response

  def __call__(self, request):
    authorization = request.headers.get('Authorization')

    # print("AUTH HEADER: ", authorization)

    if authorization and authorization.startswith('Bearer '):
      id_token = authorization.split(' ')[1]

      # print("TOKEN: ", id_token)

      try:
        decoded_token = auth.verify_id_token(id_token)
        uid = decoded_token['uid']
        email = decoded_token.get('email', '')

        try:
          user = UserProfile.objects.get(firebase_uid=uid)
          request.user_profile = user
        except UserProfile.DoesNotExist:
          request.user_profile = None  # User is authenticated but not yet registered in DB

      except Exception as e:
        # print("🔥 Firebase verification error:")
        traceback.print_exc()  # ✅ Show detailed traceback
        return JsonResponse({'error': 'Invalid Firebase token', 'details': str(e)}, status=401)
    else:
      request.user_profile = None  # No token provided

    return self.get_response(request)
