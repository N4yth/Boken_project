## 1. Specifique Objectif

The site will be designed for people who want to track their reading progress of manhwa and manhua, as well as discover new works.

The main objectives are:

* **Display information about manhwa and manhua** to all visitors.
* **Allow users to track their reading progress** by adding manhwa and manhua to their library, updating the number of chapters read/remaining, and leaving personal notes.
* **Allow users to create a manhwa and manhua entry**, with certain mandatory information displayed. These entries are private by default but can be made public after review by an admin.
* *(Beyond the MVP)* **Enable users to share their appreciation and feedback** on the manhwa and manhua they read.


## 2. Stakeholders and Roles

### Core Team

| Name              | Role                         |
| ----------------- | ---------------------------- |
| **Nathan DUPUIS** | Team Leader · Developer      |
| **Laura AUPETIT** | Developer · Graphic Designer |

---

### External Support

| Name                   | Role             |
| ---------------------- | ---------------- |
| **Chloé VANENGELANDT** | Beta Tester      |
| **Marc DUPUIS**        | Senior Developer |
| **Pierre DUPUIS**      | Senior Developer |



* **Nathan Dupuis**
  Founder of the **Boken Paradise** project.
  Mainly responsible for back-end development and database management using Django.
  Also provides front-end support.

* **Laura Aupetit**
  Mainly responsible for front-end developmentand core design using Next.js, figma and Procreate.
  Also provides back-end support.

* **Marc** and **Pierre Dupuis**
  Contribute to the understanding and execution of overall development.

* **Chloé Vanengelandt**
  Tests all site functionalities on both PC and mobile devices.


## 3. Project Scope

### In-Scope

* Users can add a manhwa and manhua to their personal library to keep track of progress (e.g., number of chapters released and number of chapters read).
* Users can view detailed information about manhwa and manhua, including description, release date, author(s), and status.
* Users can rate manhwa and manhua. (Commenting is planned but not part of the MVP.)
* Users can add existing manhwa and manhua that are not yet listed on the platform, either as private entries or public submissions (public submissions must be verified by an admin).

### Out-of-Scope

* Reading manhwa and manhua directly within the platform.
* Allowing users to become authors and publish their own manhwa and manhua (to be considered only once reading is possible).
* Allowing users to act as translators and provide translations into other languages (to be considered only once reading is possible).
* Advanced monetization features such as purchasing individual manhwa and manhua or subscribing to unlock access.
* Social features such as chat or discussion threads linked to each manhwa and manhua.

## 4. Project Risks
| Risk                          | Probability | Impact | Solution                           |
| ----------------------------- | ----------- | ------ | ---------------------------------- |
| Lack of time                  | High        | High   | Reduction of the MVP scope         |
| Route security                | Medium      | High   | Increase the number of tests       |
| Post security (webtoon)       | Medium      | Low    | Admin verification of posts        |
| Compatibility (PC and mobile) | High        | Medium | Focus on responsive development    |
| User experience               | Medium      | Medium | Testing phase after MVP completion |


## 5. High-Level Plan
![gant diagram](./Boken%20Project.png?raw=true)
