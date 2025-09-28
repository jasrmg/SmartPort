import firebase_admin
from firebase_admin import credentials, auth, firestore


# Prevent reinitialization
if not firebase_admin._apps:
  cred = credentials.Certificate("firebase_service_account.json")
  firebase_admin.initialize_app(cred)


# Export Firestore client
firestore_client = firestore.client()

# (Optional) you can also re-export auth if you use it often
firebase_auth = auth