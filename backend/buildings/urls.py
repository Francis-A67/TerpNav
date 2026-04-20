from django.urls import path
from .views import BuildingListView, BuildingDetailView, TipListView

urlpatterns = [
    path('', BuildingListView.as_view()),
    path('<str:acronym>/', BuildingDetailView.as_view()),
    path('tips/<str:acronym>/', TipListView.as_view()),
]