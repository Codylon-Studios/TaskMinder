# Data Processing Documentation

## Introduction

This document provides a comprehensive overview of data processing practices for our educational management system database. As part of our commitment to data protection and privacy compliance (GDPR/DSGVO), we document what personal and operational data is intentionally collected, stored, and processed, as well as identify potential unintentional data capture points across all system tables.

### Purpose

- Ensure transparency in data handling practices.
- Enable informed decision-making about data retention and minimization.
- Identify and mitigate high-risk data processing activities.
- Align documentation with the current database schema.

### Scope

This documentation describes all database tables defined in the current Prisma schema, with particular attention to the processing of personal data and related privacy implications. It also details the data stored in the Redis-powered cache, as well as the information collected during server monitoring (logs).

---

## Data Processing Analysis by Table

### 1. Account Table

**Purpose**: User authentication and access management.

| Field     | Data Type | Intentionally Stored                | Potentially Unintentional                            | Privacy Classification  |
| :-------- | :-------- | :---------------------------------- | :--------------------------------------------------- | :---------------------- |
| accountId | Integer   | Unique user identifier              | Could enable cross-system tracking                   | Technical data          |
| username  | String    | **Personal identifier** for login   | May reveal real names or personal info               | Personal data           |
| password  | String    | Encrypted authentication credential | **High risk**: Hash algorithms may become vulnerable | Sensitive personal data |

**Privacy Concerns**:

- Usernames might contain real names or other identifying information.
- Password security is critically dependent on the strength and implementation of the hashing algorithm.

**Solutions**:

- Hashing using bcrypt: bcrypt automatically generates a unique random salt per password, making rainbow table attacks ineffective. We use a sufficient number of salt rounds (e.g., `SALT_ROUNDS = 10`).

---

### 2. AccountSessions Table

**Purpose**: Session management and user state tracking, provided by `express-session`.

| Field  | Data Type | Intentionally Stored                    | Potentially Unintentional                                               | Privacy Classification   |
| :----- | :-------- | :-------------------------------------- | :---------------------------------------------------------------------- | :----------------------- |
| sid    | String    | Session identifier for state management | Could enable session tracking across requests                           | Technical data           |
| sess   | JSON      | **Session data and user context**       | **High risk**: May contain browsing patterns, IP addresses, device info | Personal/Behavioral data |
| expire | DateTime  | Session timeout management              | Could reveal usage patterns (login/logout times)                        | Technical data           |

**Privacy Concerns**:

- The `sess` JSON blob could inadvertently store sensitive runtime information.
- Long session retention periods could enable user behavior analysis.
- Session hijacking risks if cookies are not properly secured.

**Addressing Concerns**:

- The `sess` JSON column intentionally stores: `accountId`, `username`, `classId` (if joined), and a `csrfToken`.
- **Security**: The session secret is cryptographically secure. Cookies are set with `httpOnly: true` and `secure: true` (in production) to prevent client-side script access and ensure transmission only over HTTPS.

---

### 3. deletedAccount Table

**Purpose**: Temporarily holds soft-deleted accounts for a 30-day grace period before permanent deletion.

| Field            | Data Type | Intentionally Stored                       | Potentially Unintentional                    | Privacy Classification  |
| :--------------- | :-------- | :----------------------------------------- | :------------------------------------------- | :---------------------- |
| deletedAccountId | Integer   | Identifier for the deleted account record  | -                                            | Technical data          |
| deletedUsername  | String    | The username of the deleted account        | Retains a personal identifier post-deletion  | Personal data           |
| deletedPassword  | String    | The hashed password of the deleted account | Retains a sensitive credential post-deletion | Sensitive personal data |
| deletedOn        | BigInt    | Timestamp for scheduled permanent deletion | -                                            | Technical data          |

**Privacy Concerns**:

- Personal data (`username`, `password`) is retained after the user has initiated deletion, creating a risk if the cleanup process fails.

**Solutions**:

- Implement a robust, automated cron job to ensure permanent deletion after the 30-day period.

---

### 4. Class Table

**Purpose**: Defines a class, acting as a central hub for all related data like students, subjects, events, and homework.

| Field        | Data Type      | Intentionally Stored                               | Potentially Unintentional                 | Privacy Classification  |
| :----------- | :------------- | :------------------------------------------------- | :---------------------------------------- | :---------------------- |
| classId      | Integer        | Unique class identifier                            | -                                         | Technical data          |
| className    | String         | The name of the class (e.g., "Grade 10b")          | May identify a specific group of students | Operational data        |
| classCode    | String         | Unique code for students to join the class         | -                                         | Technical data          |
| dsbMobile... | String/Boolean | Credentials for a third-party service (DSB Mobile) | -                                         | Sensitive personal data |

**Privacy Concerns**:
- The existence of a `Class` centralizes all student data, making profile-building easier.

---

### 5. Event & EventType Tables

**Purpose**: Management of class-specific events (e.g., exams, holidays) and their categories.

| Table.Field             | Data Type | Intentionally Stored                       | Potentially Unintentional                                                  | Privacy Classification |
| :---------------------- | :-------- | :----------------------------------------- | :------------------------------------------------------------------------- | :--------------------- |
| Event.eventId           | Integer   | Unique event identifier                    | -                                                                          | Technical data         |
| Event.name / desc.      | String    | Event title and details                    | **High risk**: May contain personal info (student names, sensitive topics) | Potentially personal   |
| Event.startDate/endDate | BigInt    | Event scheduling                           | Reveals attendance/activity patterns                                       | Behavioral data        |
| EventType.name          | String    | Category name (e.g., "Exam", "Field Trip") | Adds context that could have privacy implications (e.g., "Detention")      | Operational data       |
| Event.classId           | Integer   | Links event to a specific class            | -                                                                          | Technical data         |

**Privacy Concerns**:

- Free-text fields (`name`, `description`) are high-risk for unintentional storage of personal data.
- The combination of event data, when linked to a `Class`, can reveal detailed schedules and activities for a specific group of students.

**Solutions**:

- Provide clear guidance or input masks to discourage users from entering personal data in event names and descriptions.
- Regularly audit event data for inappropriate content.

---

### 6. Homework & HomeworkCheck Tables

**Purpose**: Management of homework assignments and tracking student completion.

| Table.Field              | Data Type | Intentionally Stored   | Potentially Unintentional                                            | Privacy Classification           |
| :----------------------- | :-------- | :--------------------- | :------------------------------------------------------------------- | :------------------------------- |
| Homework.homeworkId      | Integer   | Assignment identifier  | -                                                                    | Technical data                   |
| Homework.content         | String    | **Assignment details** | May contain student-specific instructions or references              | Educational/Potentially personal |
| Homework.submissionDate  | BigInt    | Deadline management    | **Reveals individual work patterns**                                 | Behavioral data                  |
| HomeworkCheck.accountId  | Integer   | **Student identifier** | **Direct link to student performance**                               | Personal data                    |
| HomeworkCheck.homeworkId | Integer   | Assignment reference   | **Creates detailed academic profile when combined with `accountId`** | Educational data                 |

**Privacy Concerns**:

- The `HomeworkCheck` table creates a direct, persistent record of individual student performance and behavior (completion status).
- This data is highly valuable for academic analytics but is privacy-sensitive and can be used for student profiling.

---

### 7. JoinedClass & JoinedTeams Tables

**Purpose**: Manage the relationship between `Account`s and the `Class` or `Team` they belong to.

| Table.Field                 | Data Type | Intentionally Stored                 | Potentially Unintentional                              | Privacy Classification |
| :-------------------------- | :-------- | :----------------------------------- | :----------------------------------------------------- | :--------------------- |
| JoinedClass.accountId       | Integer   | **Student/user identifier**          | Links a specific user to a class                       | Personal data          |
| JoinedClass.classId         | Integer   | Class identifier                     | -                                                      | Technical data         |
| JoinedClass.permissionLevel | Integer   | User's role/permissions in the class | -                                                      | Operational data       |
| JoinedTeams.accountId       | Integer   | **Student/user identifier**          | **Creates social network mapping** within a class      | Personal/Social data   |
| JoinedTeams.teamId          | Integer   | Group association                    | **Could reveal social connections and group dynamics** | Social data            |

**Privacy Concerns**:

- **Social Graph**: The `JoinedTeams` table explicitly maps out social connections and group affiliations within a class, which can be highly sensitive.
- This data can be used to analyze social dynamics, peer relationships, and potential cliques.

---

### 8. Lesson Table

**Purpose**: Defines the weekly class schedule, including subjects, times, and locations.

| Field                | Data Type | Intentionally Stored   | Potentially Unintentional                    | Privacy Classification |
| :------------------- | :-------- | :--------------------- | :------------------------------------------- | :--------------------- |
| lessonNumber/weekDay | Integer   | Schedule structure     | Reveals attendance patterns                  | Operational data       |
| classId/teamId       | Integer   | Class/group assignment | Links schedule to specific groups            | Educational data       |
| room                 | String    | Location management    | **May reveal physical presence patterns**    | Location data          |
| startTime/endTime    | BigInt    | Time management        | **Enables detailed daily schedule tracking** | Behavioral data        |

**Privacy Concerns**:

- The combination of fields in this table allows for the reconstruction of a detailed daily schedule for student groups, including their physical location (`room`) at specific times.

---

### 9. Subjects Table

**Purpose**: Stores information about school subjects and their assigned teachers for a specific class.

| Field          | Data Type         | Intentionally Stored              | Potentially Unintentional                                   | Privacy Classification |
| :------------- | :---------------- | :-------------------------------- | :---------------------------------------------------------- | :--------------------- |
| subjectId      | Integer           | Unique subject identifier         | -                                                           | Technical data         |
| subjectName... | String / String[] | Subject name and variations       | -                                                           | Operational data       |
| teacherGender  | String            | Teacher gender for display/admin  | **Privacy concern**: May enable discrimination or profiling | Personal data          |
| teacherName... | String / String[] | **Full and short teacher name**   | **Direct personal identifiers** of staff                    | Personal data          |
| classId        | Integer           | Links subject to a specific class | -                                                           | Technical data         |

**Privacy Concerns**:

- **Teacher's Personal Data**: This table directly stores identifiable personal data about teachers (`teacherNameLong`, `teacherNameShort`, `teacherGender`). The necessity of storing gender and name variations should be reviewed.
- **Consent**: Ensure teacher consent is obtained for storing and displaying this information.

---

### 10. Team Table

**Purpose**: Defines a specific group (team) within a class.

| Field   | Data Type | Intentionally Stored           | Potentially Unintentional                                     | Privacy Classification |
| :------ | :-------- | :----------------------------- | :------------------------------------------------------------ | :--------------------- |
| teamId  | Integer   | Unique team identifier         | -                                                             | Technical data         |
| name    | String    | Name of the team               | May be revealing (e.g., "Advanced Group", "Remedial Reading") | Potentially personal   |
| classId | Integer   | Links team to a specific class | -                                                             | Technical data         |

**Privacy Concerns**:

- The `name` of a team could imply academic level, behavioral status, or other sensitive classifications about its members.

---

## Cross-Table Privacy Risks

The new schema, with `Class` as a central entity, amplifies cross-table risks.

### 1. Granular Profile Building

Combining data across tables enables the creation of highly detailed user profiles:

- **Student Profile**: Academic performance (`HomeworkCheck`) + social connections (`JoinedTeams`) + daily schedule and location (`Lesson`) + specific activities (`Event`). All data is now easily correlated through `classId`.
- **Teacher Profile**: Personal information (`Subjects`) + teaching schedule (`Lesson`) + administrative actions (`Event`).

### 2. Behavioral and Social Analytics

- The normalized structure allows for powerful analytics on student behavior, such as correlating homework completion (`HomeworkCheck`) with team membership (`JoinedTeams`) or specific lessons (`Lesson`).
- Social network graphs can be easily generated from the `JoinedTeams` and `Account` tables, revealing peer influence and group dynamics.

### 3. Third-Party Credential Exposure

- The `Class` table introduces a **critical risk** by storing credentials for an external service (`dsbMobilePassword`, `dsbMobileUser`). A breach of this database would directly lead to the compromise of accounts on another system, violating the principle of data minimization and posing a severe security threat. Currently, DSBMobile Integration is not implemented yet.

---

## Data Collected and Stored in Redis and Telemetry Systems (Prometheus/Loki)

### Redis

Our Redis architecture serves as a cache to temporarily store data, reducing database load and improving performance. Cached data is automatically cleared when a service restarts or when the corresponding data is deleted from the database. The following types of content are stored:

* Homework, events, lessons, timetables, teams, and substitutions for each class
* Authenticated user and class information

---

### Telemetry Data

To maintain and improve our service quality, we collect certain telemetry data, which is stored in server logs:

* Date and time of the request
* Request content
* HTTP status code
* Size of the returned data
* Referrer information
* User agent details (e.g., browser name and version, device manufacturer, operating system, etc.)

**Retention:** Logs are stored for **3 days** and are permanently deleted thereafter.

---

- **Document Version:** 2.0
- **Stable Version Alignment:** v2.0.0
- **Last Updated:** August 13, 2025
- **Next Scheduled Review:** Quarterly – December 10, 2025
- **Technical Contact:** [info@taskminder.de](mailto:info@taskminder.de)
