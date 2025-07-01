from django.db import models
from django.contrib.auth.models import User

from django.utils import timezone
from datetime import timedelta

# Create your models here.
class UserProfile(models.Model):
  class Role(models.TextChoices):
    ADMIN = "admin", "Admin"
    SHIPPER = "shipper", "Shipper"
    CUSTOM = "custom", "Custom"
    EMPLOYEE = "employee", "Employee"

  user = models.OneToOneField(User, on_delete=models.CASCADE)
  # user_id = models.AutoField(primary_key=True)
  firebase_uid = models.CharField(max_length=128, unique=True)
  first_name = models.CharField(max_length=50)
  last_name = models.CharField(max_length=50)
  email = models.EmailField(unique=True)
  role = models.CharField(
    max_length=20,
    choices=Role.choices,
    default=Role.SHIPPER
    )
  avatar = models.URLField(blank=True, null=True)
  created_at = models.DateTimeField(auto_now_add=True)
  last_seen = models.DateTimeField(null=True, blank=True)

  @property
  def is_online(self):
    if not self.last_seen:
      return False
    now = timezone.now()
    return now - self.last_seen <= timedelta(minutes=5)

  def __str__(self):
    return f'{self.firebase_uid}. {self.first_name} {self.last_name}, ({self.role})'
  