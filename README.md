# The Boken project

## 1. User Stories and Mockups

## 2. System Architecture

This System Architecture Diagram represents a high-level view of the architecture of the site there are 3 elements:
* Frontend : (with NEXTjs) is representing the user and admin interface.
* Backend + API : (with Django) is representing the backend that receives HTTP requests and handles them by performing SQL queries to the Database.
* Database : (with PostgreSQL) is representing the database that will stock all the user and webtoon data.<br/><br/>

<img src="./documentation/img/System_Architecture_diagram.png" alt="System Architecture Diagrams" width="700" height="200"/><br/>

## 3. System structure and data model

### class diagram

The class diagram that represents the structure of our database.<br/>
Here is a short description of each table :
* BaseModel : the parent class of all classes, implementing key methods and variables like ID.
* Webtoon : class that represents data of Webtoon (title, release date, authors...).
* Genre : class represent the different Genre that exist.
* User : a registered user with personal information.
* WebtoonGenre : table that link genre between Webtoon.
* Release: represents all translations of a Webtoon and data that is link to (alt title, description, total chapter out... ).
* UserWebtoon: table linking Users to Webtoons.<br/><br/>

<img src="./documentation/img/Class_Diagram_boken.png" alt="Class Diagrams DB" width="600" height="800"/><br/>

### ERdiagram

The ERdiagram represents the relation between elements in the database.<br/>
Here is a short description of each element :
* BaseModel : the parent class of all classes, implementing key methods and variables like ID.
* Webtoon : class that represents data of Webtoon (title, release date, authors...).
* Genre : class represent the different Genre that exist.
* User : a registered user with personal information.
* WebtoonGenre : table that link genre between Webtoon.
* Release: represents all translations of a Webtoon and data that is link to (alt title, description, total chapter out... ).
* UserWebtoon : table that link User between Webtoon.<br/><br/>

<img src="./documentation/img/ERdiagram.png" alt="Class Diagrams DB" width="600" height="500"/><br/>

### front-end_component_diagram

the front-end component diagram represent how the different parts of a user interface (UI) are organized and how they interact with each other.<br/>
here is a short description of each element :
* Navbar Component : A navigation bar that lets the user move between pages.
* Home Page : The first page where the user arrives.
* Webtoon List : A list of webtoons ordered by last modification.
* Webtoon Detail Page : A page where all the details of a webtoon are displayed.
* Advanced Search Page : A page that lets the user search for a particular webtoon with adjustable parameters.
* Matched Webtoon List : The list of all webtoons that match the user’s search parameters.
* User Library Page : The user’s library containing all the webtoons they are currently reading.
* Webtoon Favorites List : The list of all the user’s favorite webtoons.
* Settings Page : The page where the user can configure the site’s settings.<br/><br/>

<img src="./documentation/img/front-end_component_diagram.png" alt="Class Diagrams DB" width="600" height="400"/><br/>

## 4. Sequence Diagrams

These 3 Sequence Diagrams each represent a key interaction between : 
* The Frontend (User Interface) : where the user will interact and send http request.
* The API : get the http request and send to the business logic.
* The business logic : validates the data sent, and if correct, saves it in the database.
* The database : database where all data is save.
<br/>
the key interaction is :

### User creation
Represents a visitor creating an account.<br/><br/>


<img src="./documentation/img/Sequence_diagram_User_creation.PNG" alt="Sequence Diagrams for User creation" width="900" height="450"/><br/>

### Webtoon creation
Represents a user creating a webtoon.<br/><br/>


<img src="./documentation/img/Sequence_diagram_Webtoon_creation.PNG" alt="Sequence Diagrams for Webtoon creation" width="900" height="450"/><br/>

### Chatper update
Represents a user updating their reading progress and/or the number of chapters released.<br/><br/>


<img src="./documentation/img/Sequence_diagram_chapter_update.PNG" alt="Sequence Diagrams for chapter update" width="900" height="450"/><br/>


## 5. API Specifications

This table summarizes all available API endpoints, including their URL paths, HTTP methods, required input formats, and expected output formats.<br/>


| **API Endpoint** | **URL Path** | **HTTP Method** | **Input Format** | **Output Format** |
| ---------------- | ------------ | --------------- | ---------------- | ----------------- |
| **User Authentication** | `/api/auth/login` | `POST` | JSON (email, password) | JSON (token) |
| **User Creation** | `/api/user/` | `POST` | JSON (email, password, username) | JSON (success, msg) |
| **User Retrieval All** | `/api/user/` | `GET` | Nothing | JSON ({{id, email, username, created_at, updated_at}, ...}) |
| **User Retrieval** | `/api/user/{user_id}` | `GET` | Path parameter: user_id | JSON (id, email, username, created_at, updated_at) |
| **User Update** | `/api/user/{user_id}` | `PUT` | JSON (email?, password?, username?) | JSON (success, msg) |
| **User Deletion** | `/api/user/{user_id}` | `DELETE` | Path parameter: user_id | JSON (success, msg) |
| **Genre Creation** | `/api/genre/` | `POST` | JSON (name) | JSON (success, msg) |
| **Genre Retrieval All** | `/api/genre/` | `GET` | Nothing | JSON ({{id, name}, ...}) |
| **Genre Retrieval** | `/api/genre/{genre_id}` | `GET` | Path parameter: genre_id | JSON (id, name) |
| **Genre Update** | `/api/genre/{genre_id}` | `PUT` | JSON (name) | JSON (success, msg) |
| **Genre Deletion** | `/api/genre/{genre_id}` | `DELETE` | Path parameter: genre_id | JSON (success, msg) |
| **Webtoon Creation** | `/api/webtoon/` | `POST` | JSON (authors, release_date, title, status, rating, alt_title, description, language, total_chapters) | JSON (success, msg) |
| **Webtoon Retrieval All** | `/api/webtoon/` | `GET` | Nothing | JSON {{id, title, description, status, rating, updated_at, memo}, ...} |
| **Webtoon Retrieval** | `/api/webtoon/{webtoon_id}` | `GET` | Path parameter: webtoon_id | JSON (id, authors, release_date, title, status, rating, alt_title, description, language, total_chapters, memo) |
| **Webtoon Update** | `/api/webtoon/{webtoon_id}` | `PUT` | JSON (authors?, release_date?, title?, status?, rating?, alt_title?, description?, language?, total_chapters?) | JSON (success, msg) |
| **Webtoon Deletion** | `/api/webtoon/{webtoon_id}` | `DELETE` | Path parameter: webtoon_id | JSON (success, msg) |
| **Release Creation** | `/api/release/` | `POST` | JSON (webtoon_id, alt_title, description, language, total_chapters) | JSON (success, msg) |
| **Release Retrieval All** | `/api/release/` | `GET` | Nothing | JSON ({{id, webtoon_id, alt_title, description, language, total_chapters}, ...}) |
| **Release Retrieval** | `/api/release/{release_id}` | `GET` | Path parameter: release_id | JSON (id, webtoon_id, alt_title, description, language, total_chapters) |
| **Release Update** | `/api/release/{release_id}` | `PUT` | JSON (alt_title?, description?, language?, total_chapters?) | JSON (success, msg) |
| **Release Deletion** | `/api/release/{release_id}` | `DELETE` | Path parameter: release_id | JSON (success, msg) |
| **Admin Review** | `/api/admin_review` | `POST` | JSON(approval, msg_review) | JSON (success, msg) |
| **Change Chapter** | `/api/webtoon/{webtoon_id}/chapter` | `PUT` | JSON(chapter, total_chapter) | JSON (success, msg) |
| **Add Webtoon Library** | `/api/library/` | `POST` | JSON(webtoon_id, user_id) | JSON (success, msg) |
| **Webtoon Library Retrieval** | `/api/library/` | `GET` | Nothing | JSON({{id, title, description, status, rating, memo, updated_at}, ...}) |
| **Webtoon Library Retrieval by User** | `/api/library/{user_id}` | `GET` | Path param (user_id in path) | JSON (id, authors, release_date, title, status, rating, alt_title, description, language, total_chapters, memo, updated_at) |
| **Webtoon Library Removal** | `/api/library/{webtoon_id}` | `DELETE` | Path parameter: webtoon_id | JSON (success, msg) |


## 6. SCM and QA Plans

### SCM plan

* Version controling : In this project, we will use Git and GitHub .
* branches organization : The branches will be  as main → dev → feature, where
    * main : contains the final working product.
    * dev : integrates all features.
    * feature : contains individual features, such as the user page (frontend) or the webtoon endpoint (backend).
* Control plan : For each push to the dev branch, we will conduct a meeting to review the code before it is pushed and determine where it should be merged.


### QA plan

* Define a testing strategy : Implement unit tests for backend logic, API endpoints, and frontend components; include integration tests for full user flows (e.g., user registration, webtoon creation, library updates).
* Specify testing tools : Use Django’s built-in testing framework for backend, Jest/React Testing Library for frontend, and Postman for API endpoint verification.
* Deployment pipeline : Set up a CI/CD pipeline with automated tests, staging environment for pre-production verification, and production deployment with rollback options.


## 7. Technical Justifications

