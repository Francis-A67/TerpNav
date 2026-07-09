import json
from pathlib import Path
from django.conf import settings
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.throttling import ScopedRateThrottle
from .models import Building, Comment, ParkingLot
from .moderation import is_clean
from .serializers import BuildingSerializer, TipSerializer, CommentSerializer, ParkingLotSerializer

TIPS_FILE = Path(__file__).parent / 'data' / 'tips.json'
_TIPS = None


def get_tips():
    global _TIPS
    if _TIPS is None:
        try:
            with open(TIPS_FILE, encoding='utf-8') as f:
                _TIPS = json.load(f)
        except (OSError, json.JSONDecodeError):
            _TIPS = []
    return _TIPS


class BuildingListView(APIView):
    def get(self, request):
        search = request.query_params.get('search', '').strip()
        queryset = Building.objects.all()
        if search:
            queryset = queryset.filter(
                Q(code__icontains=search) |
                Q(name__icontains=search) |
                Q(department__icontains=search)
            )
        serializer = BuildingSerializer(queryset, many=True)
        return Response(serializer.data)


class BuildingDetailView(APIView):
    def get(self, request, acronym):
        try:
            building = Building.objects.get(code__iexact=acronym)
        except Building.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = BuildingSerializer(building)
        return Response(serializer.data)


class ParkingListView(APIView):
    def get(self, request):
        lots = ParkingLot.objects.all().order_by('code')
        serializer = ParkingLotSerializer(lots, many=True)
        return Response(serializer.data)


class TipListView(APIView):
    def get(self, request, acronym):
        tips = [t for t in get_tips() if t['building'].lower() == acronym.lower()]
        serializer = TipSerializer(tips, many=True)
        return Response(serializer.data)


class CommentView(APIView):
    throttle_scope = 'comments'

    def get_throttles(self):
        if self.request.method == 'POST':
            return [ScopedRateThrottle()]
        return []

    def get(self, request, acronym):
        try:
            building = Building.objects.get(code__iexact=acronym)
        except Building.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        comments = building.comments.order_by('-created_at')
        serializer = CommentSerializer(comments, many=True)
        return Response(serializer.data)

    def post(self, request, acronym):
        if not settings.COMMENTS_ENABLED:
            return Response(
                {'error': 'Comments are currently disabled.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            building = Building.objects.get(code__iexact=acronym)
        except Building.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = CommentSerializer(data=request.data)
        if serializer.is_valid():
            if not is_clean(serializer.validated_data['text']):
                return Response(
                    {'error': 'Comment rejected: please keep it respectful.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            serializer.save(building=building)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
