import firebase_admin
from firebase_admin import credentials, auth

cred = credentials.Certificate("firebase_service_account.json")
firebase_admin.initialize_app(cred)

# Replace this with your actual Firebase UID (from Firebase Console > Authentication > Users)
uid = "l3rOyxDM2jbpQWX6HVbt4R1TNpv1"

# Create the custom token (returns bytes)
custom_token = auth.create_custom_token(uid)

# ✅ Decode the bytes to string
print("Custom Token:\n")
print(custom_token.decode("utf-8"))
