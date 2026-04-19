from django.urls import path
from .views import BuildingListView, BuildingDetailView

urlpatterns = [
    path('', BuildingListView.as_view()),
    path('<str:acronym>/', BuildingDetailView.as_view()),
]