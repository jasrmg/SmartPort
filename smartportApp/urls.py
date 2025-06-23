from django.urls import path
from . import views

urlpatterns = [
  path("", views.auth_view, name="auth_view"),
  path("verify/", views.verify_view, name="verify_view"),
  path("admin_dashboard/", views.admin_view, name="admin_view"),
]