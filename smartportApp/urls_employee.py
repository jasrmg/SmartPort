from django.urls import path
from . import views_employees

urlpatterns = [
  path("incident-feed/", views_employees.incident_feed_view, name="incident-feed-view"),
  
]