from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from api.permissions import IsAdmin
from api.external_api import save_webtoon, fetch_page, is_webtoon
import time
from django.db import connection
import threading

progress = {"status": "not started", "create": 0, "already found": 0, "pourcentage": "0%"}

# ---- available request ----
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def update_all(request):
    print("test update_all")
    return Response({"message": "Update successfull"}, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def update(request):
    print("test update")
    return Response({"message": "Update of {} successfull".format(len(request.data))}, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def create_new(request):
    if progress["status"] == "in progress":
        return Response({"message": "an import is already running"}, status=status.HTTP_409_CONFLICT)
    progress["status"] = "in progress"
    thread = threading.Thread(target=create_from_anilist, daemon=True)
    thread.start()
    return Response({"message": "threading start"})

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def get_progress(request):
    return Response(progress)


# ---- create DB with anilist ----

def create_from_anilist(max_count=150):
    # progress is updated in place so readers of admin_command.progress always see the live dict
    progress.clear()
    progress.update({
        "status": "in progress",
        "create": 0,
        "already found": 0,
        "pourcentage": "0%"
    })
    page = 1
    has_next = True
    added_by = None

    try:
        while has_next and progress["create"] < max_count:
            data = fetch_page(page)
            medias = data["media"]
            has_next = data["pageInfo"]["hasNextPage"]

            for entry in medias:
                if is_webtoon(entry):
                    created = save_webtoon(entry, added_by=added_by)
                    if created:
                        progress["create"] += 1
                        progress["pourcentage"] = f"{int(progress['create'] / max_count * 100)}%"
                        if progress["create"] >= max_count:
                            return
                    else:
                        progress["already found"] += 1
            page += 1
            time.sleep(0.5)
    except Exception as e:
        progress["error"] = str(e)
    finally:
        # without this a crash or the last page would leave the status stuck on "in progress"
        progress["status"] = "error" if "error" in progress else "finish"
        if threading.current_thread() is not threading.main_thread():
            connection.close()
