from django.urls import path, include

urlpatterns = [
    path('api/buildings/', include('buildings.urls')),
]
