from django.contrib import admin
from .models import UserProfile

class UserProfileAdmin(admin.ModelAdmin):
  list_display = ("auth_user", "role", "email", "is_superuser")

  def is_superuser(self, obj):
    return obj.auth_user.is_superuser  # use auth_user instead of user

  is_superuser.boolean = True

admin.site.register(UserProfile, UserProfileAdmin)
