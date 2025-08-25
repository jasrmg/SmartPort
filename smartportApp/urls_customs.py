from django.urls import path
from . import views
from . import views_customs

urlpatterns = [
  # ====================== TEMPLATES ======================
  path("dashboard/", views_customs.dashboard_view, name="customs-dashboard"),
  # list view - render the page that has the table
  path("submanifest-review/", views_customs.submanifest_review_view, name="submanifest-list"),
  path("review-history/", views_customs.review_history_view, name="review-history"),
  # ====================== END OF TEMPLATES ======================
  # detail view - render the page in showing the submanifest details
  path("submanifest/review/<int:submanifest_id>/", views_customs.submanifest_review, name="submanifest-detail"),
]