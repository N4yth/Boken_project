from django.db import models
import uuid
from datetime import datetime

class BaseModel(models.Model):
    id = models.UUIDField(primary_key = True, default = uuid.uuid4, editable = False)
    create_at = models.DateField(default = datetime.now, editable = False)
    update_at = models.DateField(default = datetime.now)

    def SaveDate(self):
        """Update the updated_at timestamp whenever the object is modified"""
        self.updated_at = datetime.now()

    def update(self, data):
        """Update the attributes of the object based on the provided dictionary"""
        for key, value in data.items():
            if hasattr(self, key):
                setattr(self, key, value)
        self.SaveDate()

    class Meta:
        abstract = True