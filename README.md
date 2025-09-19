# The Boken project

## 1. User Stories and Mockups

## 2. System Architecture

This System Architecture Diagram represent an higher view of the architecture of the site there are 3 element :
* Frontend : (with NEXTjs) is representing the user and admin interface
* Backend + API : (with Django) is representing the back that will receive that http request and handle them to do SQL Queris to the Database
* Database : (with PostgreSQL) is representing the database that will stock all the user and webtoon data<br/><br/>

<img src="./documentation/img/System_Architecture_diagram.png" alt="System Architecture Diagrams" width="700" height="200"/><br/>

## 3. System structure and data model

the class diagram that represente the structure of our database<br/>
here is a short description of each table :
* BaseModel : the mother class of all class to implement important methode and variable like ID 
* Webtoon : class that represent data of Webtoon (title, release date, authors...)
* Genre : class represent the different Genre that exist
* User : user that is register with their personal information
* WebtoonGenre : table that link genre between Webtoon
* release : represent all traduction of a Webtoon and data that is link to (alt title, description, total chapter out... )
* UserWebtoon : table that link User between Webtoon<br/><br/>

<img src="./documentation/img/Class_Diagram_boken.png" alt="Class Diagrams DB" width="600" height="800"/><br/>

## 4. Sequence Diagrams

this 3 Sequence Diagram represent each a key interaction between : 
* the front : where the user will interact and send http request
* the API : get the http request and send to the business logic
* the business logic : test the data send and if it s all right save in database
* the database : database where all data is save
<br/>
the key interaction is :

### User creation
represent the visitor that create a account to become a user of the site<br/><br/>


<img src="./documentation/img/Sequence_diagram_User_creation.PNG" alt="Sequence Diagrams for User creation" width="900" height="450"/><br/>

### Webtoon creation
represent the user that create a webtoon for himself with all mandatory data and Optional data<br/><br/>


<img src="./documentation/img/Sequence_diagram_Webtoon_creation.PNG" alt="Sequence Diagrams for Webtoon creation" width="900" height="450"/><br/>

### Chatper update
represent the user that want to update his reading progress or/and the number of chapter that is out<br/><br/>


<img src="./documentation/img/Sequence_diagram_chapter_update.PNG" alt="Sequence Diagrams for chapter update" width="900" height="450"/><br/>


## 5. API Specifications

| **API Endpoint** | **URL Path** | **HTTP Method** | **Input Format** | **Output Format** |
| ---------------- | ------------ | --------------- | ---------------- | ----------------- |
| **User Authentication** | `/api/auth/login` | `POST` | JSON (email, password) | JSON (token) |
| **User Creation** | `/api/user/` | `POST` | JSON (email, password, username) | JSON (msg) |
| **User Retrieval** | `/api/user/{id}` | `GET` | Query param (id in path) | JSON (id, email, username, created_at) |
| **User Update** | `/api/user/{id}` | `PUT` | JSON (email?, password?, username?) | JSON (msg) |
| **User Deletion** | `/api/user/{id}` | `DELETE` | Query param (id in path) | JSON (msg) |
| **Genre Creation** | `/api/genre/` | `POST` | JSON (name) | JSON (msg) |
| **Genre Retrieval** | `/api/genre/{id}` | `GET` | Query param (id in path) | JSON (id, name) |
| **Genre Update** | `/api/genre/{id}` | `PUT` | JSON (name) | JSON (msg) |
| **Genre Deletion** | `/api/genre/{id}` | `DELETE` | Query param (id in path) | JSON (msg) |
| **Webtoon Creation** | `/api/webtoon/` | `POST` | JSON (authors, release_date, title, status, rating, alt_title, description, language, totalChapters) | JSON (msg) |
| **Webtoon Retrieval** | `/api/webtoon/{id}` | `GET` | Query param (id in path) | JSON (id, title, authors, description, etc.) |
| **Webtoon Update** | `/api/webtoon/{id}` | `PUT` | JSON (authors?, release_date?, title?, status?, rating?, alt_title?, description?, language?, totalChapters?) | JSON (msg) |
| **Webtoon Deletion** | `/api/webtoon/{id}` | `DELETE` | Query param (id in path) | JSON (msg) |
| **Release Creation** | `/api/release/` | `POST` | JSON (webtoon_id, alt_title, description, language, totalChapters) | JSON (msg) |
| **Release Retrieval** | `/api/release/{id}` | `GET` | Query param (id in path) | JSON (id, webtoon_id, alt_title, description, language, totalChapters) |
| **Release Update** | `/api/release/{id}` | `PUT` | JSON (alt_title?, description?, language?, totalChapters?) | JSON (msg) |
| **Release Deletion** | `/api/release/{id}` | `DELETE` | Query param (id in path) | JSON (msg) |
| **Amdin Review** | `/api/admin_review` | `POST` | JSON(approval, msg_review) | JSON (msg) |
| **Change Chapter** | `/api/webtoon/chapter` | `POST` | JSON(chapter, total_chapter) | JSON (msg) |
| **Add Webtoon Library** | `/api/library/` | `POST` | JSON(Webtoon_id, user_id) | JSON (msg) |
| **Webtoon Library Retrieval** | `/api/release/` | `GET` | nothing | JSON(alt_title, description, language, totalChapters) |
| **Webtoon Library Deletion** | `/api/webtoon/{id}` | `DELETE` | JSON(chapter, total_chapter) | JSON (msg) |



## 6. SCM and QA Plans

## 7. Technical Justifications

