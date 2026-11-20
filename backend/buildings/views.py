import json
from django.conf import settings
from django.db.models import Q
from rest_framework.exceptions import NotFound
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.throttling import ScopedRateThrottle
from .campuses import CAMPUSES, DEFAULT_CAMPUS, campus_data_dir
from .models import Building, Comment, ParkingLot
from .moderation import is_clean
from .serializers import BuildingSerializer, TipSerializer, CommentSerializer, ParkingLotSerializer

_TIPS = {}


def get_campus(request):
    """The campus a request is about: ?campus=<slug>, or UMD when it is left out.

    Leaving it out must keep working: links, the keep-alive ping and older
    copies of the frontend all call the API without it.
    """
    slug = (request.query_params.get('campus') or DEFAULT_CAMPUS).strip().lower()
    if slug not in CAMPUSES:
        raise NotFound('Unknown campus.')
    return slug


def get_tips(campus):
    """Tips live in each campus's own tips.json; a campus may have none."""
    if campus not in _TIPS:
        try:
            with open(campus_data_dir(campus) / 'tips.json', encoding='utf-8') as f:
                _TIPS[campus] = json.load(f)
        except (OSError, json.JSONDecodeError):
            _TIPS[campus] = []
    return _TIPS[campus]


def get_building(request, acronym):
    """The building with this code on the request's campus, or None."""
    return Building.objects.filter(
        campus=get_campus(request), code__iexact=acronym,
    ).first()


class BuildingListView(APIView):
    def get(self, request):
        search = request.query_params.get('search', '').strip()
        # Ordered by id so the list (and the home page's "Popular buildings",
        # which shows the first few) always comes back in the same order.
        queryset = Building.objects.filter(campus=get_campus(request)).order_by('id')
        if search:
            matches = (
                Q(code__icontains=search) |
                Q(name__icontains=search) |
                Q(department__icontains=search)
            )
            # Aliases are stored as a JSON list and matched as text, so a
            # search for a bracket, a quote or a comma would match the list's
            # own punctuation instead of an alias.
            if not set(search) & set('[]",'):
                matches |= Q(aliases__icontains=search)
            queryset = queryset.filter(matches)
        serializer = BuildingSerializer(queryset, many=True)
        return Response(serializer.data)


class BuildingDetailView(APIView):
    def get(self, request, acronym):
        building = get_building(request, acronym)
        if building is None:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = BuildingSerializer(building)
        return Response(serializer.data)


class ParkingListView(APIView):
    def get(self, request):
        lots = ParkingLot.objects.filter(campus=get_campus(request)).order_by('code')
        serializer = ParkingLotSerializer(lots, many=True)
        return Response(serializer.data)


class TipListView(APIView):
    def get(self, request, acronym):
        tips = [
            t for t in get_tips(get_campus(request))
            if t['building'].lower() == acronym.lower()
        ]
        serializer = TipSerializer(tips, many=True)
        return Response(serializer.data)


class CommentView(APIView):
    throttle_scope = 'comments'

    def get_throttles(self):
        if self.request.method == 'POST':
            return [ScopedRateThrottle()]
        return []

    def get(self, request, acronym):
        building = get_building(request, acronym)
        if building is None:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        comments = building.comments.order_by('-created_at')
        serializer = CommentSerializer(comments, many=True)
        return Response(serializer.data)

    def post(self, request, acronym):
        campus = get_campus(request)
        if not settings.COMMENTS_ENABLED or campus in settings.COMMENTS_DISABLED_CAMPUSES:
            return Response(
                {'error': 'Comments are currently disabled.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        building = get_building(request, acronym)
        if building is None:
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
