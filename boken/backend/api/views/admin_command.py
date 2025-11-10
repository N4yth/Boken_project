from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from api.external_api import save_webtoon, fetch_page, is_webtoon
from api.models.webtoon import Webtoon
import time
import threading

# ---- available request ----
@api_view(['GET'])
@permission_classes([IsAdminUser])
def update_all(request):
    print("test update_all")
    return Response({"message": "Mise à jour réussie"}, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAdminUser])
def update(request):
    print("test update")
    return Response({"message": "Mise à jour des {} réussie".format(len(request.data))}, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAdminUser])
def create_new(request):
    thread = threading.Thread(target=create_from_anilist)
    thread.start()
    return Response({"message": "Traitement lancé"})

@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_progress(request):
    return Response(progress)


# ---- create DB with anilist ----

def create_from_anilist(max_count=150):
    global progress
    progress = {
        "status": "in progress",
        "create": 0,
        "already found": 0,
        "pourcentage": "0"
    }
    page = 1
    has_next = True
    added_by = None

    print(f"🚀 Début de la mise à jour (max {max_count} webtoons)")

    while has_next and progress["create"] < max_count:
        data = fetch_page(page)
        medias = data["media"]
        has_next = data["pageInfo"]["hasNextPage"]

        for entry in medias:
            if is_webtoon(entry):
                created = save_webtoon(entry, added_by=added_by)
                if created:
                    progress["create"] += 1
                    progress["pourcentage"]= f"{int(progress['create'] / max_count * 100)}%"
                    if progress["create"] >= max_count:
                        progress["status"] = "finish"
                        return
                else:
                    progress["already found"] += 1
        page += 1
        time.sleep(0.5)