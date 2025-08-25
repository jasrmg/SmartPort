from django.urls import path
from . import views
from . import views_customs

urlpatterns = [
  path("dashboard/", views_customs.dashboard_view, name="customs-dashboard"),
  path("submanifest-review/", views_customs.submanifest_review_view, name="submanifest-review"),
]