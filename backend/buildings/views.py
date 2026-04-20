import json
from pathlib import Path
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import BuildingSerializer, TipSerializer

DATA_FILE = Path(__file__).parent / 'data' / 'buildings.json'
TIPS_FILE = Path(__file__).parent / 'data' / 'tips.json'

with open(DATA_FILE) as f:
    BUILDINGS = json.load(f)

with open(TIPS_FILE) as f:
    TIPS = json.load(f)

class BuildingListView(APIView):
    def get(self, request):
        serializer = BuildingSerializer(BUILDINGS, many=True)
        return Response(serializer.data)

class BuildingDetailView(APIView):
    def get(self, request, acronym):
        building = next(
            (b for b in BUILDINGS if b['acronym'].lower() == acronym.lower()),
            None
        )
        if not building:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = BuildingSerializer(building)
        return Response(serializer.data)

class TipListView(APIView):
    def get(self, request, acronym):
        tips = [t for t in TIPS if t['building'].lower() == acronym.lower()]
        serializer = TipSerializer(tips, many=True)
        return Response(serializer.data)