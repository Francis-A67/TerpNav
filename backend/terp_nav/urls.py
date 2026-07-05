from django.urls import path, include

from buildings.views import ParkingListView

urlpatterns = [
    path('api/buildings/', include('buildings.urls')),
    path('api/parking/', ParkingListView.as_view()),
]
