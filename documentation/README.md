## Project Team

* **Nathan Dupuis**: Frontend & Backend
* **Laura Aupetit**: Frontend & Backend

## Target Audience

This platform is designed for webtoon enthusiasts who want to track their reading progress across manhwa, manhua, and webtoons.
It will allow readers to easily see their progress, keep track of chapters read, and manage their personal reading lists.

## MVP (Minimum Viable Product)

The first version of the platform will be a website where users can browse a catalog of available series with the following details:

* Title
* Status (e.g., finished, on hold, ongoing)
* Description
* Rating
* Number of chapters released (and total if completed)
* Average release frequency of chapters for ongoing series (based on community data)
* Comments

### Logged-in users will be able to:

* Add webtoons to their personal list (reading / to read).
* Write private notes (visible only to themselves).
* Post public comments (visible to everyone).
* Rate webtoons.
* Update their reading progress (number of chapters read).
* Update the number of chapters released (private, for ongoing or paused series).
* Suggest the number of chapters released (public with community moderation to ensure accuracy).
* Create custom entries for webtoons not yet available on the site (private entries).
* Create custom entries for webtoons not yet available on the site (public entries, flagged for review by admins to ensure compliance).
* Track reading progress separately for different languages.
* Create and share reading lists (groups of manhwa/webtoons to recommend to others).

### Admin users will have additional permissions:

* Create, edit, or delete comments.
* Create, edit, or delete webtoons.
* Create, edit, or delete users.
* Create, edit, or delete genres.
* Access and review all saved webtoon lists for each user.
* Monitor all changes made to series (who did what and when).
* Review and validate requests for new webtoon entries.

## Technical Requirements

To complete this project, we will explore new frameworks such as **Django** and **Next.js**, while still relying on programming languages we already know: **Python** and **JavaScript**.

**Key challenges include:**

* Displaying a large amount of information in a clear, user-friendly way.
* Implementing CRUD operations (Create, Read, Update, Delete) in the database.
* Designing different user roles with distinct interfaces and permissions.
* Ensuring that each user’s personal data is securely stored and displayed correctly.

## Project Timeline

The project will span 3 months, divided into three phases:

1. **Planning & Conceptualization (Month 1)**

   * Define objectives, features, and user flows.
   * Design the database schema and basic architecture.

2. **Documentation & Initial Development (Month 2)**

   * Write technical documentation.
   * Build the first version of the backend and frontend.

3. **Full Development & Refinement (Month 3)**

   * Implement all features.
   * Improve the user interface and user experience.
   * Conduct testing and debugging before the final release.
