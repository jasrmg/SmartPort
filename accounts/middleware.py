import firebase_admin
from firebase_admin import auth
from django.http import JsonResponse
from .models import UserProfile
from . import firebase  # ⚠️ This initializes the app
from firebase_admin import auth



class FirebaseAuthMiddleware:
  def __init__(self, get_response):
    self.get_response = get_response

  def __call__(self, request):
    authorization = request.headers.get('Authorization')

    if authorization and authorization.startswith('Bearer '):
      id_token = authorization.split(' ')[1]

      try:
        decoded_token = auth.verify_id_token(id_token)
        uid = decoded_token['uid']
        email = decoded_token.get('email', '')

        # Get or create user profile
        user, created = UserProfile.objects.get_or_create(
          firebase_uid=uid,
          defaults={
            'email': email,
            'first_name': '',
            'last_name': '',
            'role': 'shipper',  # default role
            'avatar': ''
          }
        )
        request.user_profile = user

      except Exception as e:
        return JsonResponse({'error': 'Invalid Firebase token', 'details': str(e)}, status=401)
    else:
      request.user_profile = None

    return self.get_response(request)
