from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0014_split_authors_normalize_languages'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='webtoon',
            name='authors_old',
        ),
        migrations.AlterField(
            model_name='release',
            name='language',
            field=models.CharField(choices=[('ko', 'Korean'), ('zh', 'Chinese'), ('ja', 'Japanese'), ('en', 'English'), ('fr', 'French'), ('es', 'Spanish')], default='ko', max_length=12),
        ),
        migrations.AlterField(
            model_name='release',
            name='alt_title',
            field=models.CharField(max_length=255),
        ),
        migrations.AlterModelOptions(
            name='release',
            options={'ordering': ['create_at']},
        ),
        migrations.AddConstraint(
            model_name='release',
            constraint=models.UniqueConstraint(fields=('webtoon_id', 'language'), name='unique_release_language_per_webtoon'),
        ),
    ]
