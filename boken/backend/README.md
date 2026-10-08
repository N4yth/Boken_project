# Boken – Backend

REST API of Boken, a platform to track your reading progress on webtoons, manhwa and manhua.
It stores the webtoons, their releases in each language, the users and their personal library,
and imports webtoons from [AniList](https://anilist.co).

**Stack:** Python 3.12 · Django 5 · Django REST Framework · Simple JWT · django-filter · PostgreSQL 16

---

## Table of contents

1. [Getting started](#1-getting-started)
2. [Configuration](#2-configuration)
3. [Project structure](#3-project-structure)
4. [Data model](#4-data-model)
5. [Authentication and roles](#5-authentication-and-roles)
6. [API reference](#6-api-reference)
7. [Review workflow](#7-review-workflow)
8. [AniList import](#8-anilist-import)
9. [Tests](#9-tests)

---

## 1. Getting started

### With Docker (recommended)

From the `boken/` folder (where `docker-compose.yml` is):

```bash
docker compose up --build
```

This starts PostgreSQL, the backend on <http://127.0.0.1:8000> and the frontend on <http://127.0.0.1:3000>.
The backend applies the migrations on every start, and the `./backend` folder is mounted in the
container, so code changes are reloaded automatically.

Create the first administrator:

```bash
docker compose exec backend python manage.py createsuperuser
```

### Without Docker

You need Python 3.12+ and a running PostgreSQL server.

```bash
cd boken/backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

export DB_HOST=localhost          # see "Configuration" for the other variables
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

---

## 2. Configuration

Everything is read from environment variables. The default values match `docker-compose.yml`
and are meant for **local development only**.

| Variable | Default | Description |
|---|---|---|
| `DB_NAME` | `boken` | PostgreSQL database |
| `DB_USER` | `N4yt` | PostgreSQL user |
| `DB_PASSWORD` | `1234` | PostgreSQL password |
| `DB_HOST` | `db` | `db` inside Docker, `localhost` outside |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DJANGO_SECRET_KEY` | insecure dev key | **Must be set in production** |
| `DJANGO_DEBUG` | `1` | `0` to disable debug mode |
| `DJANGO_ALLOWED_HOSTS` | `localhost,127.0.0.1,[::1],backend` | Comma separated host names |
| `DJANGO_CORS_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | Allowed origins when `DEBUG` is off (every origin is allowed in debug) |
| `THROTTLE_LOGIN` | `10/minute` | Login attempts per IP |
| `THROTTLE_REGISTER` | `20/hour` | Sign ups per IP |

JWT lifetimes are set in `backend/settings.py` (`SIMPLE_JWT`): 15 minutes for the access token,
1 hour for the refresh token.

---

## 3. Project structure

```
backend/
├── backend/            # Django project: settings.py, urls.py (all the routes), wsgi/asgi
├── api/
│   ├── models/         # one file per model (see "Data model")
│   ├── views/          # one file per resource + admin_command.py (AniList) + admin_dashboard.py
│   ├── migrations/
│   ├── serializers.py  # validation and JSON format of every resource
│   ├── permissions.py  # is_admin(), IsAdmin, IsCreatorOrAdmin, IsReleaseEditor, ...
│   ├── visibility.py   # what each user is allowed to see (public / own / pending)
│   └── external_api.py # AniList client and import of one webtoon
├── test/               # API tests, files named *_test.py
├── Dockerfile
└── requirements.txt
```

---

## 4. Data model

Every model inherits from `BaseModel`: a UUID primary key `id`, `create_at` and `update_at`.

| Model | Main fields | Notes |
|---|---|---|
| **User** | `email` (login), `username`, `role` (`user` / `admin`), `is_staff` | Custom user model (`AUTH_USER_MODEL = 'api.User'`) |
| **Webtoon** | `title` (unique), `release_date`, `status`, `rating`, `rating_count`, `is_public`, `waiting_review`, `add_by` | Many-to-many with `Author` and `Genre` |
| **Author** | `name` (unique) | Shared between webtoons |
| **Genre** | `name` (unique) | |
| **Release** | `webtoon_id`, `language`, `alt_title`, `description`, `total_chapter`, `waiting_review`, `add_by` | One version of a webtoon in one language |
| **UserRelease** | `user_id`, `release_id`, `reading_status`, `chapter_read`, `personal_total_chapter`, `rating`, `note` | An entry of a user's library |

### One release per language

Each language of a webtoon is a separate `Release` with its own title, description and number of
chapters. For example, a webtoon can have 550 chapters in Korean and 400 in English.

- Languages are ISO 639-1 codes: `ko`, `zh`, `ja`, `en`, `fr`, `es`.
- A webtoon can only have **one release per language** (database constraint).
- A library entry (`UserRelease`) points to a release, so a user follows a webtoon **in a given language**.
  The same release can only be added once to a library.

### Community rating

`Webtoon.rating` is the **average of the readers' ratings** and `Webtoon.rating_count` the number of
readers who rated. Both are computed by the API (read-only, even for admins):

- a reader rates by setting `rating` on their library entry (`/api/usereleases/{id}/`):
  from `0.5` (worst) to `5`. `0` means "not rated" (entries are created with 0, and sending 0 clears
  a rating) and is not counted. Values between 0 and 0.5 are refused (400)
- one vote per reader: someone following the webtoon in several languages counts once, with the
  average of their ratings
- the values are refreshed automatically when an entry is created, updated or deleted (also when a
  user, a release or a webtoon is deleted) — see `api/ratings.py` and `api/signals.py`
- they are stored on the webtoon, so the `min_rating` / `max_rating` search filters use them

### Choices

| Field | Values |
|---|---|
| `Webtoon.status` | `finish`, `in progress`, `pause`, `cancel` |
| `UserRelease.reading_status` | `finish`, `reading`, `to read` |
| `Release.language` | `ko`, `zh`, `ja`, `en`, `fr`, `es` |

---

## 5. Authentication and roles

The API uses JWT (Simple JWT). Log in, then send the access token in every request:

```
Authorization: Bearer <access token>
```

```http
POST /login/
{"email": "reader@mail.com", "password": "..."}

→ 200 {"access": "...", "refresh": "...", "id": "...", "username": "reader", "role": "user"}
```

When the access token expires (15 min), get a new one with `POST /refresh/ {"refresh": "..."}`.

- `POST /logout/ {"refresh": "..."}` revokes the refresh token (blacklist). The access token stays
  valid until it expires.
- Changing your password revokes all your refresh tokens: you are logged out everywhere.
- Login is limited to 10 attempts per minute and sign up to 20 accounts per hour, per IP (429 after that).
- The first admin is created with `python manage.py createsuperuser`; after that only an admin can
  create another admin.

### Roles

A user is an **admin** when `is_staff` is true or `role == "admin"` (`permissions.is_admin`).

| Who | Can |
|---|---|
| Anonymous | Read public webtoons, releases, genres; search; create an account |
| User | Everything above, plus: manage their library, create (private) webtoons, submit releases for public webtoons in their library |
| Creator of a webtoon | While it is **private**: edit it, delete it, add / edit / delete its releases directly. Once **public**, it is shared data: their changes go through an admin (new releases wait for review) |
| Admin | Everything: see all data, review submissions, make webtoons public, manage genres and users, run the AniList import |

### Visibility

- A **private** webtoon (`is_public = false`) is only visible to its creator and to admins.
  For everyone else it does not exist (404).
- A **pending** release (`waiting_review = true`) is only visible to the user who submitted it and to admins.

---

## 6. API reference

Base URL: `http://127.0.0.1:8000`. All bodies are JSON.
Lists are not paginated. **Auth** column: `–` public, `user` logged in, `admin` admin only.

### Accounts

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/login/` | – | Get the tokens (see above) |
| POST | `/refresh/` | – | New access token from a refresh token |
| POST | `/verify_token/` | – | `{"valid": true}` (200) or 401; token in the body `{"token": ...}` or in the `Authorization` header |
| POST | `/logout/` | user | Revoke a refresh token `{"refresh": "..."}` (205) |
| POST | `/api/user/` | – | Register `{"username", "email", "password"}` |
| GET / PATCH / DELETE | `/api/user/me/` | user | Read, update or delete **your own** account (no id needed) |
| GET | `/api/user/` | admin | List the users |
| GET / PATCH / PUT / DELETE | `/api/user/{id}/` | self or admin | Read, update or delete an account |
| POST | `/api/user/create_admin/` | admin | Create another admin (the first one comes from `createsuperuser`) |

**Updating an account**

```http
PATCH /api/user/me/
{"username": "new name", "email": "new@mail.com"}

PATCH /api/user/me/
{"current_password": "old password", "password": "new password"}
```

- `password` is only required to sign up: a profile update does not have to change it.
- Users changing **their own** password must send `current_password`. An admin can reset
  another user's password without it.
- Passwords follow Django's validators (`AUTH_PASSWORD_VALIDATORS`): at least 8 characters,
  not a common password, not only digits, not too close to the username or email.
- `role`, `is_staff` and `is_superuser` cannot be changed through the API; `email` and
  `username` must stay unique.
- JWTs are stateless: tokens issued before a password change stay valid until they expire
  (15 min for the access token, 1 h for the refresh token).

### Webtoons

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/webtoon/` | – | Visible webtoons with their genres, authors and releases |
| GET | `/api/webtoon/{id}/` | – | One webtoon; adds `addable` (false if already in your library) when logged in |
| POST | `/api/webtoon/` | user | Create a private webtoon |
| PATCH / PUT | `/api/webtoon/{id}/` | creator (private webtoon) or admin | Update it; only an admin can change `is_public` and `rating` |
| DELETE | `/api/webtoon/{id}/` | creator or admin | Delete it (a public webtoon can only be deleted by an admin) |
| POST | `/api/webtoon/full_create/` | user | Create a webtoon, its releases and a library entry in one call (see below) |
| GET | `/api/webtoon/logged_user/` | user | Visible webtoons, each with `addable` |
| GET | `/api/webtoon/get_library/` | user | Webtoons in your library, with `UR_rating` and `UR_total_chapter` |
| GET | `/api/webtoon/check/` | admin | Webtoons waiting for review |
| POST | `/api/webtoon/{id}/review/` | admin | `{"approve": true}` makes it public, `false` keeps it private |
| PATCH | `/api/webtoon/{id}/set_to_public/` | admin | `{"is_public": bool}` |
| GET | `/api/webtoon/search/` | – | Search, see the filters below |

`rating` and `rating_count` are read-only (see [Community rating](#community-rating)).
`authors` is returned as `[{"id", "name"}]`. When writing, it accepts a list of names
(`["Kim", "Lee"]`) or a comma separated string (`"Kim, Lee"`).

**Search filters** (query string, all optional):
`title`, `author` (contains, case insensitive), `genres` (genre id, repeatable), `status`,
`min_chapters`, `max_chapters`, `min_rating`, `max_rating`.

```http
GET /api/webtoon/search/?author=chugong&min_rating=4&genres=<genre id>
```

**`full_create`** — everything is validated together; if any part is invalid, nothing is created
and the response is `400 {"error": "...", "details": {field: [messages]}}`.

```json
{
  "title": "Omniscient Reader",
  "authors": "Sing Shong, Sleepy-C",
  "genres": ["<genre id>"],
  "release_date": "2020-05-04",
  "status": "in progress",
  "releases": [
    {"language": "ko", "alt_title": "전지적 독자 시점", "description": "...", "total_chapter": 200},
    {"language": "en", "alt_title": "Omniscient Reader", "description": "...", "total_chapter": 180}
  ],
  "reading_language": "en",
  "reading_status": "reading",
  "chapter_read": 12,
  "personal_rating": 4.5,
  "note": "",
  "waiting_review": false
}
```

- `releases`: at least one, each language only once. The old format (one release given with flat
  `alt_title` / `description` / `language` / `total_chapter` fields) is still accepted.
- `reading_language`: the release used for the library entry (the first release by default).
- `waiting_review: true` submits the webtoon to the admins to make it public.
- Response: `200 {"webtoon_id": "...", "release_ids": {"ko": "...", "en": "..."}}`.

### Releases

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/releases/` | – | Visible releases |
| GET | `/api/releases/{id}/` | – | One release |
| POST | `/api/releases/` | user | Add a release to a webtoon (see [Review workflow](#7-review-workflow)) |
| PATCH / PUT / DELETE | `/api/releases/{id}/` | admin, creator of a private webtoon, or submitter while pending | A non-admin cannot move a release to another webtoon |
| POST | `/api/releases/{id}/review/` | admin | `{"approve": true}` publishes it, `false` deletes it |

```json
{"webtoon_id": "<id>", "language": "fr", "alt_title": "...", "description": "...", "total_chapter": 90}
```

`waiting_review` and `add_by` are read-only: they are set by the API.

### Library

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/usereleases/` | user | Your library entries (all entries for an admin) |
| POST | `/api/usereleases/` | user | Add a release to your library |
| GET / PATCH / DELETE | `/api/usereleases/{id}/` | owner or admin | Read, update or remove an entry |
| GET | `/api/usereleases/with_webtoon/{webtoon_id}/` | user | Your entry for a webtoon, 404 if none |

```json
{"release_id": "<id>", "reading_status": "reading", "chapter_read": 0, "personal_total_chapter": 120, "rating": 0, "note": ""}
```

Only an admin can change `user_id` or `release_id` of an existing entry.

### Genres

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/genre/`, `/api/genre/{id}/` | – | List / read |
| POST / PATCH / PUT / DELETE | `/api/genre/`, `/api/genre/{id}/` | admin | Manage genres |

### Admin

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/admin/dashboard/` | admin | Counts, releases per language, pending webtoons and releases, users, import status |
| GET | `/admin/create/` | admin | Start the AniList import in the background (409 if one is running) |
| GET | `/admin/update/` | admin | Status of the AniList import |
| GET | `/admin/update_all/` | admin | Placeholder, does nothing yet |

---

## 7. Review workflow

Nothing becomes public without an admin.

**Webtoons**
1. A user creates a webtoon: it is private and only visible to them.
2. They submit it with `waiting_review: true` (in `full_create` or with a `PATCH`).
3. An admin sees it in `/admin/dashboard/` (or `/api/webtoon/check/`) and calls
   `POST /api/webtoon/{id}/review/` → public, or stays private.

**Releases** (e.g. a new translation)

| Who creates the release | Result |
|---|---|
| Admin, or creator of a webtoon that is still private | Published directly |
| Creator of a public webtoon, or user who has it in their library | Pending until an admin reviews it |
| Anyone else | 403 |

An admin approves (`{"approve": true}`) or rejects (`false`, deletes it) with
`POST /api/releases/{id}/review/`.

---

## 8. AniList import

`GET /admin/create/` starts a background import of up to 150 new webtoons from AniList's GraphQL API
(`api/external_api.py`), and `GET /admin/update/` returns its progress:

```json
{"status": "in progress", "create": 42, "already found": 7, "pourcentage": "28%"}
```

- Kept: Korean and Chinese works, plus works tagged "Webtoon" or "Full Color".
  Excluded: Japanese manga, novels and adult content.
- Each webtoon gets **one release in its original language** (`KR` → `ko`, `CN`/`TW` → `zh`), with the
  native title and the chapter count given by AniList. AniList gives no chapter count while a series
  is still releasing, so the count is `0` in that case. Translations are added later as releases.
- Authors are the staff members with a story or art role (translators and editors are ignored).
- Running the import again updates the existing webtoons instead of duplicating them.
- Each AniList request has a 30 s timeout and is tried 3 times. After that the import stops with
  `"status": "error"` and an `error` message. Only one import can run at a time.

---

## 9. Tests

The tests are in `test/` and use DRF's `APITestCase`. Django creates a temporary test database,
so your data is not touched. The files are named `*_test.py`, so the pattern has to be given:

```bash
# with Docker
docker compose exec backend python manage.py test test --pattern="*_test.py"

# without Docker (from boken/backend)
python manage.py test test --pattern="*_test.py"
```

Run a single file or test:

```bash
python manage.py test test.release_submission_test --pattern="*_test.py"
python manage.py test test.full_create_test.FullCreateTests.test_duplicate_language_rejected --pattern="*_test.py"
```

| File | Covers |
|---|---|
| `user_test.py` | Registration, admin creation, user permissions, token verification |
| `account_test.py` | Own account (`/api/user/me/`), password change and password rules |
| `webtoon_test.py` | Webtoon visibility and permissions |
| `release_test.py` | Release permissions |
| `userrelease_test.py` | Library permissions |
| `genre_test.py` | Genre permissions |
| `global_test.py` | Permissions across all endpoints |
| `author_language_test.py` | Authors, one release per language, AniList import mapping |
| `release_submission_test.py` | Release submissions, review, visibility of pending data |
| `full_create_test.py` | Creating a webtoon with several releases |
| `admin_dashboard_test.py` | Admin dashboard, AniList import status |
| `checkup_test.py` | Password update, privacy, creator rules, duplicates, query count, AniList retries |
| `rating_test.py` | Community rating: average, vote count, refresh on every change |
| `security_test.py` | Admin creation, login / sign up limits, logout and session revocation, public data rules, value ranges |
