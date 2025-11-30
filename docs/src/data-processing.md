# Data Processing Documentation

## Introduction

This document provides a comprehensive overview of data processing practices for our educational management system database. As part of our commitment to data protection and privacy compliance (GDPR/DSGVO), we document what personal and operational data is intentionally collected, stored, and processed, as well as identify potential unintentional data capture points across all system tables.

### Scope

This documentation describes all database tables defined in the current Prisma schema, with particular attention to the processing of personal data and related privacy implications. It also details the data stored in the Redis-powered cache, as well as the information collected during server monitoring (logs).

---

## Data Processing Analysis by Table

### 1. Account Table

**Purpose**: User authentication and access management.

| Field     | Data Type | Intentionally Stored                | Potentially Unintentional                            |
| :-------- | :-------- | :---------------------------------- | :--------------------------------------------------- |
| accountId | Integer   | Unique user identifier              | Could enable cross-system tracking                   |
| username  | String    | **Personal identifier** for login   | May reveal real names or personal info               |
| password  | String    | Encrypted authentication credential | **Risk**: Hash algorithms may become vulnerable |
| createdAt | BigInt    | Account creation timestamp          | -                                                    |
| deletedAt | BigInt    | Account deletion timestamp          | -                                                    |

**Privacy Concerns**:

- Usernames might contain real names or other identifying information.
- Password security is critically dependent on the strength and implementation of the hashing algorithm.
- Personal data (`username`, `password`) is retained after the user has initiated deletion, creating a risk if the cleanup process fails.

**Solutions**:

- Hashing using bcrypt: bcrypt automatically generates a unique random salt per password, making rainbow table attacks ineffective. We use a sufficient number of salt rounds (`SALT_ROUNDS = 10`).
- Implement a robust, automated cron job to ensure permanent deletion after the 30-day period.

---

### 2. AccountSessions Table

**Purpose**: Session management and user state tracking, provided by `express-session`.

| Field  | Data Type | Intentionally Stored                    | Potentially Unintentional                                               |
| :----- | :-------- | :-------------------------------------- | :---------------------------------------------------------------------- |
| sid    | String    | Session identifier for state management | Could enable session tracking across requests                           |
| sess   | JSON      | **Session data and user context**       | **High risk**: May contain browsing patterns, IP addresses, device info |
| expire | DateTime  | Session timeout management              | Could reveal usage patterns (login/logout times)                        |

**Privacy Concerns**:

- The `sess` JSON blob could inadvertently store sensitive runtime information.
- Long session retention periods could enable user behavior analysis.
- Session hijacking risks if cookies are not properly secured.

**Addressing Concerns**:

- The `sess` JSON column intentionally stores: `accountId`, `username`, `classId` (if joined), and a `csrfToken`.
- **Security**: The session secret is cryptographically secure. Cookies are set with `httpOnly: true` and `secure: true` (in production) to prevent client-side script access and ensure transmission only over HTTPS.

---

### 4. Class Table

**Purpose**: Defines a class, acting as a central hub for all related data like students, subjects, events, homework and upload data.

| Field                  | Data Type | Intentionally Stored                           | Potentially Unintentional                                    |
| :--------------------- | :-------- | :--------------------------------------------- | :----------------------------------------------------------- |
| classId                | Integer   | Unique class identifier                        | -                                                            |
| className              | String    | The name of the class                          | May identify a specific group of students                    |
| classCode              | String    | Unique code for students to join the class     | Could lead to abusive joins if class code is breached        |
| classCreated           | BigInt    | Timestamp of class creation                    | -                                                            |
| isTestClass            | Boolean   | Flag to identify test/demo classes             | -                                                            |
| defaultPermissionLevel | Integer   | Default user permission level for new members  | -                                                            |
| storageUsedBytes       | BigInt    | Current storage usage by the class             | May reveal class activity level and content volume           |
| storageQuotaBytes      | BigInt    | Storage limit allocated to the class           | -                                                            |
| dsbMobileUser          | String    | **Third-party service username (DSB Mobile)**  | **Critical risk**: Credentials for external system           |
| dsbMobilePassword      | String    | **Third-party service password (DSB Mobile)**  | **Critical risk**: Enables account compromise                |
| dsbMobileSchoolNumber  | String    | School identifier for DSB Mobile service       | May identify the specific school/institution                 |

**Privacy Concerns**:
- The existence of a `Class` centralizes all student data, making profile-building easier.

**Solutions**:
- Implement change class code function/button for class members.
- Implement strict access controls for rows containing third-party credentials.

---

### 5. Event & EventType Tables

**Purpose**: Management of class-specific events (e.g., exams, holidays) and their categories.

| Table.Field             | Data Type | Intentionally Stored                       | Potentially Unintentional                                                  |
| :---------------------- | :-------- | :----------------------------------------- | :------------------------------------------------------------------------- |
| Event.eventId           | Integer   | Unique event identifier                    | -                                                                          |
| Event.name / desc.      | String    | Event title and details                    | **High risk**: May contain personal info (student names, sensitive topics) |
| Event.startDate/endDate | BigInt    | Event scheduling                           | Reveals attendance/activity patterns                                       |
| Event.createdAt         | BigInt    | Record creation timestamp                  | -                                                                          |
| EventType.name          | String    | Category name (e.g., "Exam", "Field Trip") | Adds context that could have privacy implications (e.g., "Detention")      |
| EventType.createdAt     | BigInt    | Record creation timestamp                  | -                                                                          |
| Event.classId           | Integer   | Links event to a specific class            | -                                                                          |

**Privacy Concerns**:

- Free-text fields (`name`, `description`) are high-risk for unintentional storage of personal data.
- The combination of event data, when linked to a `Class`, can reveal detailed schedules and activities for a specific group of students.

**Solutions**:

- Provide clear guidance or input masks to discourage users from entering personal data in event names and descriptions.
- Regularly audit event data for inappropriate content.

---

### 6. Homework & HomeworkCheck Tables

**Purpose**: Management of homework assignments and tracking student completion.

| Table.Field              | Data Type | Intentionally Stored   | Potentially Unintentional                                            |
| :----------------------- | :-------- | :--------------------- | :------------------------------------------------------------------- |
| Homework.homeworkId      | Integer   | Assignment identifier  | -                                                                    |
| Homework.content         | String    | Assignment details     | May contain student-specific instructions or references              |
| Homework.submissionDate  | BigInt    | Deadline management    | Reveals individual work patterns                                     |
| Homework.createdAt       | BigInt    | Record creation timestamp | -                                                                 |
| HomeworkCheck.accountId  | Integer   | Student identifier     | Direct link to student performance                                   |
| HomeworkCheck.homeworkId | Integer   | Assignment reference   | Creates detailed academic profile when combined with `accountId`     |
| HomeworkCheck.createdAt  | BigInt    | Record creation timestamp | -                                                                 |

**Privacy Concerns**:

- The `HomeworkCheck` table creates a direct, persistent record of individual student performance and behavior (completion status).
- This data is highly valuable for academic analytics but is privacy-sensitive and can be used for student profiling.

---

### 7. JoinedClass & JoinedTeams Tables

**Purpose**: Manage the relationship between `Account`s and the `Class` or `Team` they belong to.

| Table.Field                 | Data Type | Intentionally Stored                 | Potentially Unintentional                              |
| :-------------------------- | :-------- | :----------------------------------- | :----------------------------------------------------- |
| JoinedClass.accountId       | Integer   | Student/user identifier              | Links a specific user to a class                       |
| JoinedClass.classId         | Integer   | Class identifier                     | -                                                      |
| JoinedClass.permissionLevel | Integer   | User's role/permissions in the class | -                                                      |
| JoinedClass.createdAt       | BigInt    | Record creation timestamp            | -                                                      |
| JoinedTeams.accountId       | Integer   | Student/user identifier              | Creates social network mapping within a class          |
| JoinedTeams.teamId          | Integer   | Group association                    | Could reveal social connections and group dynamics     |
| JoinedTeams.createdAt       | BigInt    | Record creation timestamp            | -                                                      |

**Privacy Concerns**:

- **Social Graph**: The `JoinedTeams` table explicitly maps out social connections and group affiliations within a class, which can be highly sensitive.
- This data can be used to analyze social dynamics, peer relationships, and potential cliques.

---

### 8. Lesson Table

**Purpose**: Defines the weekly class schedule, including subjects, times, and locations.

| Field                | Data Type | Intentionally Stored   | Potentially Unintentional                    |
| :------------------- | :-------- | :--------------------- | :------------------------------------------- |
| lessonNumber/weekDay | Integer   | Schedule structure     | Reveals attendance patterns                  |
| classId/teamId       | Integer   | Class/group assignment | Links schedule to specific groups            |
| room                 | String    | Location management    | **May reveal physical presence patterns**    |
| startTime/endTime    | BigInt    | Time management        | **Enables detailed daily schedule tracking** |
| createdAt            | BigInt    | Record creation timestamp | -                                         |

**Privacy Concerns**:

- The combination of fields in this table allows for the reconstruction of a detailed daily schedule for student groups, including their physical location (`room`) at specific times.

---

### 9. Subjects Table

**Purpose**: Stores information about school subjects and their assigned teachers for a specific class.

| Field          | Data Type         | Intentionally Stored              | Potentially Unintentional                                   |
| :------------- | :---------------- | :-------------------------------- | :---------------------------------------------------------- |
| subjectId      | Integer           | Unique subject identifier         | -                                                           |
| subjectName... | String / String[] | Subject name and variations       | -                                                           |
| teacherGender  | String            | Teacher gender for display/admin  | **Privacy concern**: May enable discrimination or profiling |
| teacherName... | String / String[] | **Full and short teacher name**   | **Direct personal identifiers** of staff                    |
| classId        | Integer           | Links subject to a specific class | -                                                           |
| createdAt      | BigInt            | Record creation timestamp         | -                                                           |

**Privacy Concerns**:

- **Teacher's Personal Data**: This table directly stores identifiable personal data about teachers (`teacherNameLong`, `teacherNameShort`, `teacherGender`). The necessity of storing gender and name variations should be reviewed.
- **Consent**: Ensure teacher consent is obtained for storing and displaying this information.

---

### 10. Team Table

**Purpose**: Defines a specific group (team) within a class.

| Field   | Data Type | Intentionally Stored           | Potentially Unintentional                                     |
| :------ | :-------- | :----------------------------- | :------------------------------------------------------------ |
| teamId  | Integer   | Unique team identifier         | -                                                             |
| name    | String    | Name of the team               | May be revealing (e.g., "Advanced Group", "Remedial Reading") |
| classId | Integer   | Links team to a specific class | -                                                             |
| createdAt | BigInt  | Record creation timestamp      | -                                                             |

**Privacy Concerns**:

- The `name` of a team could imply academic level, behavioral status, or other sensitive classifications about its members.

---

### 11. Upload & FileMetadata Tables

**Purpose**: Management of file uploads and their metadata. An upload can contain one or multiple files.

| Table.Field             | Data Type | Intentionally Stored                         | Potentially Unintentional                                           |
| :---------------------- | :-------- | :------------------------------------------- | :------------------------------------------------------------------ |
| Upload.uploadId         | Integer   | Unique upload job identifier                 | -                                                                   |
| Upload.uploadName       | String    | User-provided name for the upload            | **May contain personal info or sensitive content descriptions**     |
| Upload.uploadType       | String    | Category/type of upload                      | Could reveal the nature of shared content                           |
| Upload.status           | String    | Processing state of upload                   | Reveals system usage patterns                                       |
| Upload.errorReason      | String    | Error details if upload failed               | **May leak technical details or file content information**          |
| Upload.reservedBytes    | BigInt    | Storage space reserved for upload            | Indicates size/scope of content being shared                        |
| Upload.createdAt        | BigInt    | Upload timestamp                             | **Reveals user activity patterns and collaboration timing**         |
| Upload.teamId           | Integer   | Links upload to a specific team              | **Creates connection between users and shared content**             |
| Upload.accountId        | Integer   | **Identifier of user who uploaded**          | **Direct link to user and their shared content**                    |
| Upload.classId          | Integer   | Links upload to a specific class             | -                                                                   |
| FileMetadata.fileMetaDataId | Integer | Unique file metadata identifier          | -                                                                   |
| FileMetadata.uploadId   | Integer   | Links file to its upload job                 | -                                                                   |
| FileMetadata.storedFileName | String | UUID-based filename on disk                  | Prevents direct file access but enables file tracking               |
| FileMetadata.mimeType   | String    | File type information                        | **Reveals nature of content** (documents, images, videos, etc.)     |
| FileMetadata.size       | Integer   | File size in bytes                           | Combined with mime type, may identify specific content              |
| FileMetadata.createdAt  | BigInt    | File creation timestamp                      | Enables detailed activity tracking                                  |

**Privacy Concerns**:

- **Content Profiling**: The combination of `uploadName`, `uploadType`, `mimeType`, and `size` can create detailed profiles of what type of content users and teams are sharing.
- **User Attribution**: The `accountId` field directly links uploaded content to specific users, creating a permanent record of who shared what.
- **Team Dynamics**: Upload patterns (frequency, size, type) can reveal team collaboration dynamics and potentially identify active vs. inactive members.
- **Error Exposure**: The `errorReason` field may inadvertently store sensitive information about file contents or system vulnerabilities.
- **Temporal Tracking**: Timestamps enable detailed analysis of when users are active and how they collaborate over time.

**Solutions**:

- Implement strict file type validation and size limits to prevent abuse.
- Ensure `errorReason` messages are sanitized and do not expose sensitive details.
- Implement retention policies for old uploads and automatic cleanup.
- Monitor storage usage patterns to detect potential abuse.

---

## Cross-Table Privacy Risks

The `Class` schema as a central entity increases cross-table risks.

### 1. Granular Profile Building

Combining data across tables enables the creation of highly detailed user profiles:

- Student Profile: Academic performance (`HomeworkCheck`) + social connections (`JoinedTeams`) + daily schedule and location (`Lesson`) + specific activities (`Event`). All data is now correlated through `classId`.

### 2. Behavioral and Social Analytics

- The normalized structure allows for analytics on student behavior, such as correlating homework completion (`HomeworkCheck`) with team membership (`JoinedTeams`) or specific lessons (`Lesson`).
- Social network graphs can be generated from the `JoinedTeams` and `Account` tables, revealing peer influence and group dynamics.

---

## Data Collected and Stored in Redis and Telemetry Systems (Prometheus/Loki)

### Redis

Our Redis architecture serves as a cache to temporarily store data, reducing database load and improving performance. Cached data is automatically cleared when a service restarts or when the corresponding data is deleted from the database. The following types of content are stored:

* Homework, events, lessons, timetables, teams, substitutions and upload metadata (first 50 entries) for each class
* Authenticated user and class information

---

### Telemetry Data

To maintain and improve our service quality, we collect certain telemetry data, which is stored in server logs:

* Date and time of the request
* Request content
* HTTP status code
* Size of the returned data
* Referrer information
* User agent details (e.g., browser name and version, operating system, etc.)

**Retention:** Logs are stored for **14 days (±2h)** and are permanently deleted thereafter.

---

- **Document Version:** 2.1
- **Stable Version Alignment:** v2.2.2
- **Last Updated:** November 25th, 2025
- **Next Scheduled Review:** Quarterly – December 10, 2025
- **Technical Contact:** [info@taskminder.de](mailto:info@taskminder.de)
