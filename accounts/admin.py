from django.contrib import admin
from . models import UserProfile

# Register your models here.
class UserProfileAdmin(admin.ModelAdmin):
  list_display = ("user", "role", "email", "is_superuser")

  def is_superuser(self, obj):
    return obj.user.is_superuser
  
  is_superuser.boolean = True

admin.site.register(UserProfile, UserProfileAdmin)