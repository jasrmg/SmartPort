from django.urls import path
from . import views

urlpatterns = [
  path('me/', views.get_current_user),
  path("firebase-register/", views.firebase_register_view, name="firebase_register_view"),
]
