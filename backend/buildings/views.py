import json
from pathlib import Path
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import BuildingSerializer

DATA_FILE = Path(__file__).parent / 'data' / 'buildings.json'

with open(DATA_FILE) as f:
    BUILDINGS = json.load(f)

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