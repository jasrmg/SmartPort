from django.urls import path
from . import views
from . import views_customs

urlpatterns = [
  path("dashboard/", views_customs.dashboard_view, name="customs-dashboard"),
]