from django.db import models
from .base_model import BaseModel


class Author(BaseModel):
    name = models.CharField(max_length=255, unique=True, null=False, blank=False)

    def __str__(self):
        return self.name

    @classmethod
    def from_names(cls, names):
        """Accept a list of names or a comma separated string, return Author objects."""
        if isinstance(names, str):
            names = names.split(",")
        cleaned = []
        for name in names or []:
            name = str(name).strip()
            if name and name not in cleaned:
                cleaned.append(name)
        return [cls.objects.get_or_create(name=name)[0] for name in cleaned]
