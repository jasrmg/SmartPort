import firebase_admin
from firebase_admin import credentials
from django.conf import settings

cred = credentials.Certificate(str(settings.FIREBASE_ADMIN_KEY))
firebase_admin.initialize_app(cred)
