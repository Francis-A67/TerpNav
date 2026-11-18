from django.db import migrations, models


class Migration(migrations.Migration):
    """Give buildings and parking lots a campus.

    Order matters. The campus column is added first (every existing row becomes
    'umd'), then the new (campus, code) uniqueness is created, and only then is
    the old code-only uniqueness dropped, so codes are never left unprotected.
    Primary keys do not change, so comments stay attached to their buildings.
    """

    dependencies = [
        ('buildings', '0006_building_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='building',
            name='campus',
            field=models.CharField(db_default='umd', default='umd', max_length=20),
        ),
        migrations.AddField(
            model_name='parkinglot',
            name='campus',
            field=models.CharField(db_default='umd', default='umd', max_length=20),
        ),
        migrations.AddConstraint(
            model_name='building',
            constraint=models.UniqueConstraint(
                fields=('campus', 'code'), name='building_campus_code_uniq',
            ),
        ),
        migrations.AddConstraint(
            model_name='parkinglot',
            constraint=models.UniqueConstraint(
                fields=('campus', 'code'), name='parkinglot_campus_code_uniq',
            ),
        ),
        migrations.AlterField(
            model_name='building',
            name='code',
            field=models.CharField(max_length=20),
        ),
        migrations.AlterField(
            model_name='parkinglot',
            name='code',
            field=models.CharField(max_length=20),
        ),
    ]
