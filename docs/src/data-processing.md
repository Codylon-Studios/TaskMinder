# Data Processing

## Introduction

This document provides a comprehensive overview of data processing practices for our educational management system database. As part of our commitment to data protection and privacy compliance (GDPR/DSGVO), we document what personal and operational data is intentionally collected, stored, and processed, as well as identify potential unintentional data capture points across all system tables.

### Purpose
- Ensure transparency in data handling practices
- Enable informed decision-making about data retention and minimization
- Identify high-risk data processing activities

### Scope
This documentation covers all database tables, with particular focus on personal data processing and privacy implications.

---

## Data Processing Analysis by Table

### 1. Account Table
**Purpose**: User authentication and access management

| Field | Data Type | Intentionally Stored | Potentially Unintentional | Privacy Classification | Retention Notes |
|-------|-----------|---------------------|---------------------------|----------------------|-----------------|
| accountId | Integer | Unique user identifier | Could enable cross-system tracking | Technical data | System lifetime |
| username | String | **Personal identifier** for login | May reveal real names or personal info | Personal data | Account lifetime + legal retention |
| password | String | Encrypted authentication credential | **High risk**: Hash algorithms may become vulnerable | Sensitive personal data | Regular hash updates required |
| isAdmin | Boolean | Administrative privilege flag | Could indicate sensitive access levels | Authorization data | Role-based, audit regularly |

**Privacy Concerns**: 

- Usernames might contain real names or identifying information
- Password security depends on hashing algorithm strength
- Admin flags create high-value targets for attackers

---

### 2. AccountSessions Table
**Purpose**: Session management and user state tracking

| Field | Data Type | Intentionally Stored | Potentially Unintentional | Privacy Classification | Retention Notes |
|-------|-----------|---------------------|---------------------------|----------------------|-----------------|
| sid | String | Session identifier for state management | Could enable session tracking across requests | Technical data | Session expiry |
| sess | JSON | **Session data and user preferences** | **High risk**: May contain browsing patterns, IP addresses, device info | Personal/behavioral data | Automatic expiry |
| expire | DateTime | Session timeout management | Could reveal usage patterns | Technical data | Automatic cleanup |

**Privacy Concerns**:

- Session JSON may inadvertently store browsing behavior, IP addresses, or device fingerprints
- Long session retention could enable user behavior analysis
- Session hijacking risks if not properly secured

---

### 3. Event Table
**Purpose**: Calendar and event management

| Field | Data Type | Intentionally Stored | Potentially Unintentional | Privacy Classification | Retention Notes |
|-------|-----------|---------------------|---------------------------|----------------------|-----------------|
| eventId | Integer | Event identifier | Could link to personal schedules | Technical data | Academic year basis |
| eventTypeId | Integer | Event categorization | May reveal activity patterns | Operational data | Event lifecycle |
| name | String | Event title | **May contain personal references** (student names, private info) | Potentially personal | Review content regularly |
| description | String | Event details | **High risk**: May contain personal information about individuals | Potentially personal | Content review required |
| startDate/endDate | BigInt | Event scheduling | Could reveal attendance patterns | Behavioral data | Academic retention |
| lesson | String | Associated lesson info | May indicate individual performance | Educational data | Academic retention |
| teamId | Integer | Group association | Could enable group behavior analysis | Operational data | Academic year |

**Privacy Concerns**:

- Event names and descriptions may inadvertently contain student names or personal information
- Combined with attendance data, could reveal detailed behavioral patterns

---

### 4. Homework10d Table
**Purpose**: Assignment tracking and management

| Field | Data Type | Intentionally Stored | Potentially Unintentional | Privacy Classification | Retention Notes |
|-------|-----------|---------------------|---------------------------|----------------------|-----------------|
| homeworkId | Integer | Assignment identifier | Could link to student performance | Technical data | Academic retention |
| content | String | **Assignment details** | **May contain student-specific instructions or personal references** | Educational/potentially personal | Academic year + archive period |
| subjectId | Integer | Subject association | Could reveal curriculum tracking | Educational data | Academic retention |
| assignmentDate/submissionDate | BigInt | Deadline management | **Could reveal individual work patterns** | Behavioral data | Academic retention |
| teamId | Integer | Class/group assignment | Group performance tracking | Educational data | Academic retention |

**Privacy Concerns**:

- Assignment content might reference individual students
- Date patterns could reveal individual work habits and performance trends

---

### 5. Homework10dCheck Table
**Purpose**: Assignment completion tracking

| Field | Data Type | Intentionally Stored | Potentially Unintentional | Privacy Classification | Retention Notes |
|-------|-----------|---------------------|---------------------------|----------------------|-----------------|
| checkId | Integer | Check record identifier | Could enable completion tracking | Technical data | Academic retention |
| accountId | Integer | **Student identifier** | **Direct link to student performance** | Personal data | Academic retention + legal period |
| homeworkId | Integer | Assignment reference | **Combined with accountId creates detailed academic profile** | Educational data | Academic retention |

**Privacy Concerns**:

- Creates detailed academic performance profiles for individual students
- Could be used to evaluate student behavior and performance trends
- High value for academic analytics but privacy-sensitive

---

### 6. JoinedClass/JoinedTeams Tables
**Purpose**: Group membership management

| Field | Data Type | Intentionally Stored | Potentially Unintentional | Privacy Classification | Retention Notes |
|-------|-----------|---------------------|---------------------------|----------------------|-----------------|
| accountId | Integer | **Student/user identifier** | **Creates social network mapping** | Personal data | Membership duration |
| teamId | Integer | Group association | **Could reveal social connections and group dynamics** | Social data | Academic year |

**Privacy Concerns**:

- Creates detailed social network maps of student associations
- Could reveal social dynamics, peer relationships, and group performance patterns
- May impact student privacy in social contexts

---

### 7. Lesson Table
**Purpose**: Class scheduling and room management

| Field | Data Type | Intentionally Stored | Potentially Unintentional | Privacy Classification | Retention Notes |
|-------|-----------|---------------------|---------------------------|----------------------|-----------------|
| lessonNumber/weekDay | Integer | Schedule structure | Could reveal attendance patterns | Operational data | Academic year |
| teamId | Integer | Class assignment | Links to student groups | Educational data | Academic year |
| subjectId | Integer | Subject teaching | Could reveal curriculum exposure | Educational data | Academic year |
| room | String | Location management | **May reveal physical presence patterns** | Location data | Academic year |
| startTime/endTime | BigInt | Time management | **Could enable detailed schedule tracking** | Behavioral data | Academic year |

**Privacy Concerns**:

- Combined data could reveal detailed student location and time patterns
- May enable reconstruction of individual daily schedules

---

### 8. Subjects Table

**Purpose**: Information about school subjects and their assigned teachers

### Data Processing Documentation

| Field | Data Type | Intentionally Stored | Potentially Unintentional | Privacy Classification | Retention Notes |
|-------|-----------|---------------------|---------------------------|----------------------|-----------------|
| subjectId | Integer | Unique identifier for database operations | Could enable tracking across related tables | Technical data | Retained for system integrity |
| subjectNameLong | String | Full subject name for display purposes | May reveal curriculum details/school type | Operational data | Academic year basis |
| subjectNameShort | String | Abbreviated subject name for UI constraints | Could indicate teaching methodology | Operational data | Academic year basis |
| subjectNameSubstitution | String[] | Alternative names for subject recognition | May capture colloquial/regional variations | Operational data | Review annually |
| teacherGender | String | Teacher gender for administrative purposes | **Privacy concern**: May enable discrimination or profiling | Personal data | Consider necessity |
| teacherNameLong | String | Full teacher name for identification | **Personal data**: Direct identifier | Personal data | Employment duration + retention period |
| teacherNameShort | String | Abbreviated teacher name for display | **Personal data**: Partial identifier, still recognizable | Personal data | Employment duration + retention period |
| teacherNameSubstitution | String[] | Alternative teacher names/nicknames | **Potentially sensitive**: May capture informal names, maiden names, or cultural variations | Personal data | Review necessity and consent |

**Privacy Concerns**:

- Table could include Teacher names, gender information and alternative name variations

---

### 9. Timetable Table
**Purpose**: Class schedule management

| Field | Data Type | Intentionally Stored | Potentially Unintentional | Privacy Classification | Retention Notes |
|-------|-----------|---------------------|---------------------------|----------------------|-----------------|
| class | Integer | Class identifier | Could link to student groups | Educational data | Academic year |
| content | JSON | **Schedule data** | **May contain detailed attendance patterns, room assignments, teacher info** | Educational/personal data | Academic year |
| lastUpdated | BigInt | Change tracking | Could reveal administrative patterns | Technical data | System maintenance |

**Privacy Concerns**:

- JSON content may contain extensive personal and behavioral data
- Could include teacher schedules, student group compositions, and detailed timing information

---

## Cross-Table Privacy Risks

### 1. Profile Building
Combining data across tables enables creation of detailed profiles:

- **Student profiles**: Academic performance (homework checks) + social connections (teams) + schedule patterns (lessons/events)
- **Teacher profiles**: Personal information (subjects) + schedule patterns (lessons) + administrative actions (events)

### 2. Behavioral Analytics
Time-series data across multiple tables could reveal:

- Individual work patterns and productivity cycles
- Social interaction patterns and peer relationships
- Attendance and engagement trends
- Performance correlation with scheduling

### 3. Social Network Analysis

- Team membership data creates detailed social graphs
- Could reveal social hierarchies, group dynamics, and peer influence patterns
- May impact student privacy in social contexts

---

* **Document Version:** 1.0
* **Stable Version Alignment:** v1.2.1
* **Last Updated:** July 14, 2025
* **Next Scheduled Review:** Quarterly – September 1, 2025
* **Technical Contact:** [info@taskminder.de](mailto:info@taskminder.de)
