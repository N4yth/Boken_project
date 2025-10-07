from django.db import models
from .base_model import BaseModel


class Genre(BaseModel):
    name = models.CharField(max_length=255, unique=True, null=False, blank=False)
