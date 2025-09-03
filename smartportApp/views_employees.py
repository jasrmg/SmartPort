from django.shortcuts import render


def incident_feed_view(request):
  context = {
    "text": "hi",
  }
  return render(request, "smartportApp/employee/incident-feed.html", context)