import firebase_admin
from firebase_admin import credentials

# Prevent reinitialization
if not firebase_admin._apps:
  cred = credentials.Certificate("firebase_service_account.json")
  firebase_admin.initialize_app(cred)
