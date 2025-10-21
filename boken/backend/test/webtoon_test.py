from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from datetime import date
from api.models.webtoon import Webtoon
from api.models.genre import Genre

User = get_user_model()


class WebtoonViewSetTestCase(APITestCase):
    """Tests pour le WebtoonViewSet avec différents niveaux de permissions"""

    def setUp(self):
        """Préparation des données de test"""
        self.client = APIClient()
        
        # Création d’un admin (corrigé : create_superuser)
        self.admin = User.objects.create_admin(
            email="admin@test.com", username="admin", password="admin1234"
        )
        
        self.creator1 = User.objects.create_user(
            email="creator@1.com", username="creator1", password="creator123"
        )
        self.creator2 = User.objects.create_user(
            email="creator@2.com", username="creator2", password="creator456"
        )
        
        # Création des genres
        self.genre1 = Genre.objects.create(name='Action')
        self.genre2 = Genre.objects.create(name='Romance')
        
        # Création des webtoons publics
        self.public_webtoon = Webtoon.objects.create(
            title='Public Webtoon',
            authors='Author 1',
            release_date=date(2020, 1, 1),
            status='in progress',
            is_public=True,
            add_by=self.creator1
        )
        self.public_webtoon.genres.add(self.genre1)
        
        # Création des webtoons privés
        self.private_webtoon_creator1 = Webtoon.objects.create(
            title='Private Webtoon Creator1',
            authors='Author 2',
            release_date=date(2021, 1, 1),
            status='finish',
            is_public=False,
            add_by=self.creator1
        )
        self.private_webtoon_creator1.genres.add(self.genre2)
        
        self.private_webtoon_creator2 = Webtoon.objects.create(
            title='Private Webtoon Creator2',
            authors='Author 3',
            release_date=date(2022, 1, 1),
            status='pause',
            is_public=False,
            add_by=self.creator2
        )
        self.private_webtoon_creator2.genres.add(self.genre1, self.genre2)
        
        # URLs de base
        self.list_url = '/api/webtoons/'  # Adapter selon votre configuration
        self.public_detail_url = f'/api/webtoons/{self.public_webtoon.id}/'
        self.private_detail_url_c1 = f'/api/webtoons/{self.private_webtoon_creator1.id}/'
        self.private_detail_url_c2 = f'/api/webtoons/{self.private_webtoon_creator2.id}/'

    # ==================== TESTS LIST ====================
    
    def test_list_anonymous_user_only_public(self):
        """Un utilisateur anonyme ne voit que les webtoons publics"""
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], 'Public Webtoon')

    def test_list_authenticated_user_sees_public_and_own(self):
        """Un utilisateur authentifié voit les publics et ses propres privés"""
        self.client.force_authenticate(user=self.creator1)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        titles = [webtoon['title'] for webtoon in response.data]
        self.assertIn('Public Webtoon', titles)
        self.assertIn('Private Webtoon Creator1', titles)
        self.assertNotIn('Private Webtoon Creator2', titles)

    def test_list_admin_sees_all(self):
        """Un admin voit tous les webtoons"""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)

    # ==================== TESTS RETRIEVE ====================
    
    def test_retrieve_public_anonymous(self):
        """Un anonyme peut voir un webtoon public"""
        response = self.client.get(self.public_detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Public Webtoon')

    def test_retrieve_private_anonymous_forbidden(self):
        """Un anonyme ne peut pas voir un webtoon privé"""
        response = self.client.get(self.private_detail_url_c1)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_retrieve_private_by_creator(self):
        """Un créateur peut voir son propre webtoon privé"""
        self.client.force_authenticate(user=self.creator1)
        response = self.client.get(self.private_detail_url_c1)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Private Webtoon Creator1')

    def test_retrieve_private_by_other_creator_forbidden(self):
        """Un créateur ne peut pas voir le webtoon privé d'un autre"""
        self.client.force_authenticate(user=self.creator2)
        response = self.client.get(self.private_detail_url_c1)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_retrieve_private_by_admin(self):
        """Un admin peut voir tous les webtoons privés"""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.private_detail_url_c1)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Private Webtoon Creator1')

    # ==================== TESTS CREATE ====================
    
    def test_create_anonymous_forbidden(self):
        """Un anonyme ne peut pas créer de webtoon"""
        data = {
            'title': 'New Webtoon',
            'authors': 'New Author',
            'release_date': '2023-01-01',
            'status': 'in progress',
            'genres': [self.genre1.id]
        }
        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_authenticated_user_success(self):
        """Un utilisateur authentifié peut créer un webtoon"""
        self.client.force_authenticate(user=self.creator1)
        data = {
            'title': 'New Webtoon by Creator1',
            'authors': 'Creator One',
            'release_date': '2023-01-01',
            'status': 'in progress',
            'genres': [self.genre1.id]
        }
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'New Webtoon by Creator1')
        self.assertEqual(str(response.data['add_by']["id"]), str(self.creator1.id))

    def test_create_admin_success(self):
        """Un admin peut créer un webtoon"""
        self.client.force_authenticate(user=self.admin)
        data = {
            'title': 'New Webtoon by Admin',
            'authors': 'Admin Author',
            'release_date': '2023-01-01',
            'status': 'finish',
            'genres': [self.genre1.id, self.genre2.id]
        }
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    # ==================== TESTS UPDATE ====================
    
    def test_update_anonymous_forbidden(self):
        """Un anonyme ne peut pas modifier un webtoon"""
        data = {'title': 'Updated Title'}
        response = self.client.patch(self.public_detail_url, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_by_creator_success(self):
        """Un créateur peut modifier son propre webtoon"""
        self.client.force_authenticate(user=self.creator1)
        data = {'title': 'Updated by Creator1'}
        response = self.client.patch(self.private_detail_url_c1, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Updated by Creator1')

    def test_update_by_other_creator_forbidden(self):
        """Un créateur ne peut pas modifier le webtoon d'un autre"""
        self.client.force_authenticate(user=self.creator2)
        data = {'title': 'Hacked Title'}
        response = self.client.patch(self.private_detail_url_c1, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_by_admin_success(self):
        """Un admin peut modifier n'importe quel webtoon"""
        self.client.force_authenticate(user=self.admin)
        data = {'title': 'Updated by Admin'}
        response = self.client.patch(self.private_detail_url_c2, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Updated by Admin')

    def test_full_update_by_creator(self):
        """Test de PUT complet par le créateur"""
        self.client.force_authenticate(user=self.creator1)
        data = {
            'title': 'Completely Updated',
            'authors': 'New Authors',
            'release_date': '2024-01-01',
            'status': 'cancel',
            'genres': [self.genre2.id]
        }
        response = self.client.put(self.private_detail_url_c1, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Completely Updated')
        self.assertEqual(response.data['status'], 'cancel')

    # ==================== TESTS DELETE ====================
    
    def test_delete_anonymous_forbidden(self):
        """Un anonyme ne peut pas supprimer un webtoon"""
        response = self.client.delete(self.public_detail_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_delete_by_creator_success(self):
        """Un créateur peut supprimer son propre webtoon"""
        self.client.force_authenticate(user=self.creator1)
        response = self.client.delete(self.private_detail_url_c1)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Webtoon.objects.filter(id=self.private_webtoon_creator1.id).exists())

    def test_delete_by_other_creator_forbidden(self):
        """Un créateur ne peut pas supprimer le webtoon d'un autre"""
        self.client.force_authenticate(user=self.creator2)
        response = self.client.delete(self.private_detail_url_c1)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Webtoon.objects.filter(id=self.private_webtoon_creator1.id).exists())

    def test_delete_by_admin_success(self):
        """Un admin peut supprimer n'importe quel webtoon"""
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(self.private_detail_url_c2)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Webtoon.objects.filter(id=self.private_webtoon_creator2.id).exists())

    # ==================== TESTS SET_TO_PUBLIC ====================
    
    def test_set_to_public_anonymous_forbidden(self):
        """Un anonyme ne peut pas rendre un webtoon public"""
        data = {'is_public': 1}
        url = f'{self.private_detail_url_c1}set_to_public/'
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_set_to_public_creator_forbidden(self):
        """Un créateur ne peut pas rendre son webtoon public (seul admin)"""
        self.client.force_authenticate(user=self.creator1)
        data = {'is_public': 1}
        url = f'{self.private_detail_url_c1}set_to_public/'
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_set_to_public_admin_success(self):
        """Un admin peut rendre un webtoon public"""
        self.client.force_authenticate(user=self.admin)
        data = {'is_public': 1}
        url = f'{self.private_detail_url_c1}set_to_public/'
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Vérifier que le webtoon est maintenant public
        self.private_webtoon_creator1.refresh_from_db()
        self.assertTrue(self.private_webtoon_creator1.is_public)

    # ==================== TESTS DE CAS LIMITES ====================
    
    def test_create_webtoon_without_genres(self):
        """Test de création sans genres (devrait échouer si required)"""
        self.client.force_authenticate(user=self.creator1)
        data = {
            'title': 'Webtoon Without Genres',
            'authors': 'Author',
            'release_date': '2023-01-01',
            'status': 'in progress'
        }
        response = self.client.post(self.list_url, data, format='json')
        # Adapter selon votre validation
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_201_CREATED])

    def test_create_duplicate_title_fails(self):
        """Test de création avec un titre déjà existant"""
        self.client.force_authenticate(user=self.creator1)
        data = {
            'title': 'Public Webtoon',  # Titre déjà utilisé
            'authors': 'Author',
            'release_date': '2023-01-01',
            'status': 'in progress',
            'genres': [self.genre1.id]
        }
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_to_duplicate_title_fails(self):
        """Test de modification vers un titre déjà utilisé"""
        self.client.force_authenticate(user=self.creator1)
        data = {'title': 'Private Webtoon Creator2'}  # Titre déjà utilisé
        response = self.client.patch(self.private_detail_url_c1, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_status_fails(self):
        """Test avec un statut invalide"""
        self.client.force_authenticate(user=self.creator1)
        data = {'status': 'invalid_status'}
        response = self.client.patch(self.private_detail_url_c1, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

