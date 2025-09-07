from django.shortcuts import render
from . models import IncidentReport
from smartportApp.utils.utils import with_approval_priority, serialize_incident, enforce_access

from django.db.models import F, Q
from django.db.models import Case, When, IntegerField
from django.core.paginator import Paginator, EmptyPage

from django.http import JsonResponse, HttpResponseForbidden

def incident_feed_view(request):
  auth_check = enforce_access(request, 'employee')
  if auth_check:
    return auth_check
  
  user = request.user.userprofile

  sort = request.GET.get("sort", "newest")
  incidents = IncidentReport.objects.filter(is_approved=True)

  if sort == "newest":
    incidents = with_approval_priority(incidents).order_by('approval_priority', '-incident_datetime')
  elif sort == "oldest":
    incidents = with_approval_priority(incidents).order_by('approval_priority', 'incident_datetime')
  elif sort == "vessel":
    incidents = with_approval_priority(
        incidents.filter(vessel__isnull=False)
      ).order_by('approval_priority', 'vessel__name')
  elif sort == "impact":
    impact_order = Case(
      When(impact_level="high", then=0),
      When(impact_level="medium", then=1),
      When(impact_level="low", then=2),
      default=3,
      output_field=IntegerField()
    )
    incidents = with_approval_priority(incidents).annotate(
      impact_order=impact_order
    ).order_by('approval_priority', 'impact_order')

  elif sort == "status_resolved":
    incidents = with_approval_priority(incidents).order_by(
      'approval_priority', '-status'
    )

  elif sort == "status_pending":
    incidents = with_approval_priority(incidents).order_by(
      'approval_priority', 'status'
    )

  paginator = Paginator(incidents, 2)  # ilisanan ug 5 ig deploy
  page_number = int(request.GET.get("page", 1))

  try:
    page_obj = paginator.page(page_number)

  except EmptyPage:
    if request.headers.get("x-requested-with") == "XMLHttpRequest":
      return JsonResponse({"incidents": [], "has_more": False})
    return render(request, "smartportApp/admin/incident-report-feed.html", {"page_obj": paginator.page(paginator.num_pages)})
  
  if request.headers.get("x-requested-with") == "XMLHttpRequest":
    data = [serialize_incident(incident) for incident in page_obj]
    return JsonResponse({"incidents": data, "has_more": page_obj.has_next()})


  context = {
    "user": user,
    "page_obj": page_obj
  }
  return render(request, "smartportApp/employee/incident-feed.html", context)


