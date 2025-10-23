# **Sprint Planning:**

## **Contexte**

Projet : creation of an website for referencing webtoon
Sprint : Sprint 1
Durée : 4 week (from 29 september to 24 octobre)
Équipe Scrum :
Developer : Nathan, Laura

User story : 
* As a user, I want to view the home page so that I can see all recently modified or new webtoons and search for webtoons by name.
* As a user, I want to access my library page so that I can see the webtoons I want to read or have already read.
* As a user, I want to view the details page of a webtoon so that I can see all relevant information about it, including title, authors, description, and release date.
* As a user, I want to use the advanced search page so that I can find webtoons by genre, name, number of chapters, or status.
* As a user, I want to access the page to create a new webtoon so that I can add all the important information about it for other users to see.
* As a user, I want to access the settings page so that I can configure my experience on the site according to my preferences.

### **Separate task**

We decide to separate the devellopement in 2 main principe backend and frontend :
* Nathan do the backend and can help Laura with the frontend
* Laura do the frontend and can help Nathan with the backend

We decide to separate each part (backend and frontend) into another small part :
* the frontend develloepement will be separate with each user story
* the backend devellopement will be separate into each model (Webtoon, User, Genre, Release, UserRelease)

### **Prioritize tasks**

| MoSCoW Category| User Story                                                                                                                                                            |
| ---------------| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Must Have**  | As a user, I want to view the home page so that I can see all recently modified or new webtoons and search for webtoons by name.                                      |
| **Must Have**  | As a user, I want to access my library page so that I can see the webtoons I want to read or have already read.                                                       |
| **Should Have**| As a user, I want to view the details page of a webtoon so that I can see all relevant information about it, including title, authors, description, and release date. |
| **Should Have**| As a user, I want to use the advanced search page so that I can find webtoons by genre, name, number of chapters, or status.                                          |
| **Could Have** | As a user, I want to access the page to create a new webtoon so that I can add all the important information about it for other users to see.                         |
| **Could Have** | As a user, I want to access the settings page so that I can configure my experience on the site according to my preferences.                                          |
| **Won't Have** | As a user, I want to know where i can read the webtoon that i follow or any other webtoon.                                                                            |
| **Won't Have** | As a user, I want to discuse with other about the news of the webtoon that i follow or any other webtoon.                                                             |

### **Duration of each sprint**

* Backend (Nathan)
    * User -> 1 week (29 september to 5 october)
    * Webtoon & Genre -> 1 week (6 october to 13 october)
    * Release & UserRelease -> 1 week (14 october to 19 october)
    * Debug -> 3 days (20 october to 22 october)
* Nathan will be in charge of the QA (backend)
    * with APITestCase from rest_framework from django
    * with Postman
</br>

* Frontend (Laura)
    * Learn Nextjs -> 1 week (29 september to 7 october)
    * Home page & library page -> 1 week (8 october to 15 october)
    * Details page & advanced search page & create webtoon page -> 1 week (16 october to 21 october)
    * settings page -> 3 days (22 october to 24 october)
* Laura will be in charge of the QA (frontend)
    * with backend and the prebuild Database
    * with Jest

# **Important link :**

* [Source repository](./../)
* [frontend (dev)](./../boken/frontend/)
* [frontend (test)](./../boken/frontend/test/)
* [backend (dev)](./../boken/backend/)
* [backend (test)](./../boken/backend/test/)

## **Test**

execute the next command (in the [backend](./../boken/backend/) file) to perform a global test :
```
python3 manage.py test test.global_test
```
this following command are for the other model test :
```
python3 manage.py test test.webtoon_test
python3 manage.py test test.release_test
python3 manage.py test test.genre_test
python3 manage.py test test.user_test
python3 manage.py test test.userrelease_test
```
