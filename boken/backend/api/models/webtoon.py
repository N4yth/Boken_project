from django.db import models
from .base_model import BaseModel


class WebtoonManager(models.Manager):
    def create_webtoon(self, title, authors, release_date, status, is_public, rating, add_by):
        if not title:
            raise ValueError("Le titre est obligatoire")
        if not authors:
            raise ValueError("Les auteurs sont obligatoires")
        if not release_date:
            raise ValueError("Le titre est obligatoire")
        if not status:
            raise ValueError("Les auteurs sont obligatoires")

        webtoon = self.model(title=title, authors=authors, release_date=release_date, status=status, is_public=is_public, rating=rating, add_by=add_by)
        webtoon.save(using=self._db)
        return webtoon


class Webtoon(BaseModel):
    title = models.CharField(max_length=255, unique=True, null=False, blank=False)
    authors = models.CharField(max_length=255, null=False, blank=False)
    release_date = models.DateTimeField(null=False, blank=False)
    status = models.CharField(max_length=64, null=False, blank=False)
    is_public = models.BooleanField(default=False)
    rating = models.FloatField(default=0.0)
    add_by = models.CharField(max_length=255, default='')
    
