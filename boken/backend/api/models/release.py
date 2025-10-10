from django.db import models
from .base_model import BaseModel
from .webtoon import Webtoon


class Release(BaseModel):
    alt_title = models.CharField(max_length=255, unique=True, null=False, blank=False)
    description = models.TextField(null=False, blank=False)
    language = models.CharField(max_length=12, default='cor', null=False, blank=False)
    total_chapter = models.IntegerField(default=0)
    webtoon_id = models.ForeignKey(
        Webtoon,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
 
