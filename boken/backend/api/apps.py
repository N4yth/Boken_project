from django.apps import AppConfig


class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

    def ready(self):
        # keeps Webtoon.rating up to date when readers rate
        from api import signals  # noqa: F401
