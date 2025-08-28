## Main idea

A platform designed for webtoon enthusiasts who want to track their reading progress across manhwa, manhua, and webtoons.
It will allow readers to easily see their progress, keep track of chapters read, and manage their personal reading lists.

## Idea abort or approve

### Database ideas

| **Ideas** | **Strengths** | **Weaknesses** | **Decision** |
| ----- | --------------------- | ------------------------ | ------------ |
| Use External API | - No need to control data manually<br>- Fully automated | - Risk of illegal content (pirated translations)<br>- No official/legal API available | ❌ Aborted (no official/legal API exists for manhwa/webtoon/manhua) |
| Create a database (row by row) | - Full control of stored data  | - Extremely time-consuming  | ❌ Aborted (too inefficient)|
| Free & legal dataset   | - Full control of stored data<br>- Large sample available | - Risk of missing/incomplete data<br>- Time to structure & verify<br>- Hard to update | ✅ Approved (data is legal and easier to verify)|

---

### Content Type ideas

| **Ideas** | **Strengths** | **Weaknesses** | **Decision** |
| ----- | --------------------- | ------------------------ | ------------ |
| Reading Webtoons | - Users can read directly on platform<br>- Potential revenue stream | - Requires agreements with authors<br>- Requires payment system | ⏳ Not in MVP, possible in future |

---

### User Types Ideas

| **User Types Ideas** | **Strengths** | **Weaknesses** | **Decision** |
| ----- | --------------------- | ------------------------ | ------------ |
| Author | - Authors can add their own webtoons | - Requires identity verification| ⏳ Not in MVP, possible in future |
| Translator | - Provides more language variety (with author approval) | - Must verify translator’s skills<br>- Must moderate content changes | ⏳ Not in MVP, possible in future |


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

## Project Team and Timeline

### Team

* **Nathan Dupuis**: Frontend & Backend
* **Laura Aupetit**: Frontend & Backend

### Timeline

The project will span 3 months, divided into three phases:

1. **Planning & Conceptualization (Month 1)**

   * Define objectives, features, and the MVP.

2. **Documentation & Initial Development (Month 2)**

   * Write technical documentation.
   * Design the database schema and basic architecture.
   * Build the foundations of the backend and frontend.

3. **Full Development & Refinement (Month 3)**

   * Implement all features of the MVP.
   * Improve the user interface and user experience.
   * Conduct testing and debugging before the final release.
