from django.utils.timezone import now, timedelta
from django.utils import timezone
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from . models import Notification

# NOTIFICAITON POLLING ENDPOINT FOR UNREAD NOTIFICATIONS

@login_required
def poll_recent_notifications(request):
  user_profile = request.user.userprofile
  now = timezone.now()
  one_minute_ago = now - timedelta(minutes=1)

  print(f"Server timezone: {timezone.get_current_timezone()}")
  print(f"Current time: {now}")
  print(f"One minute ago: {one_minute_ago}")


  # Get unread notifications from the last 60 seconds
  recent_notifications = Notification.objects.filter(
    user=user_profile,
    is_read=False,
    created_at__gte=one_minute_ago,
    created_at__lte=now
  ).select_related('user')

  # debug print found notif
  all_notifs = Notification.objects.filter(user=user_profile).order_by('-created_at')[:5]
  print("Recent 5 notifications:")

  for notif in all_notifs:
    print(f"  ID {notif.notification_id}: {notif.created_at} ({'future' if notif.created_at > now else 'past'})")

  notifications_data = [
    {
      'notification_id': notif.notification_id,  # unique identifier for frontend tracking
      'title': notif.title,
      'message': notif.message,
      'link_url': notif.link_url,
      'created_at': notif.created_at.isoformat(),
      'user_name': f"{notif.triggered_by.first_name} {notif.triggered_by.last_name}",
      'avatar_url': notif.triggered_by.avatar
    }
    for notif in recent_notifications
  ]

  unread_count = Notification.objects.filter(
    user=user_profile,
    is_read=False
  ).count()

  return JsonResponse({
    'notifications': notifications_data,
    'unread_count': unread_count,
    'debug_info': {
      'current_time': timezone.now().isoformat(),
      'cutoff_time': one_minute_ago.isoformat(),
      'found_count': len(notifications_data),
      'timezone': str(timezone.get_current_timezone())
    }
  })



