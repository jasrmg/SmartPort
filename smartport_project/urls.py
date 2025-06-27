from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/account/', include('accounts.urls')),
    path('', include('smartportApp.urls')),
    path('reset-password/', TemplateView.as_view(template_name="accounts/reset_password.html"), name="reset-password")
]
