from django.urls import path
from . import views_employees

urlpatterns = [
  path("incident-feed/", views_employees.incident_feed_view, name="incident-feed-view"),
  # path('search-incidents/', views_employees.search_incidents, name='employee_search_incidents'),
]