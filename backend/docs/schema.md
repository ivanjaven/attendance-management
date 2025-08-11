# Attendance Management System - Database Schema Documentation

This document outlines the database schema for the Attendance Management System, designed to support QR code-based attendance tracking, time logging, analytics, late detection, and notifications. The schema is optimized for a school environment, ensuring data integrity, efficient querying, and scalability. The `auth` table centralizes authentication, while `users` acts as a supertype table managing shared fields (`status`, `type`, `last_login`) and role-based access control (RBAC). Role-specific tables (`teachers`, `admins`) store unique fields, extending `users` in a supertype-subtype pattern.

## Authentication and RBAC Design

The `auth` table stores credentials for all system users. The `users` table is the supertype, holding common fields (`auth_id`, `status`, `type`, `last_login`) and driving RBAC by checking `type` (e.g., 'Teacher', 'Admin'). Role-specific tables (`teachers`, `admins`) use `auth_id` as both primary key and foreign key to `auth`, storing unique fields for each role. Admins have high-level access (e.g., opening the QR scanning portal), teachers handle advisory roles, and `users` supports extensibility for future roles (e.g., Principal, Student).

## Soft Delete Strategy

Tables containing important business data implement soft deletes using `deleted_at` fields to maintain audit trails, comply with data retention requirements, and preserve referential integrity. Session data and temporary records use hard deletes for performance optimization.

## Table: `auth`

Stores authentication credentials for all users.

| Field      | Type         | Description                     |
| ---------- | ------------ | ------------------------------- |
| `auth_id`  | INT          | Primary key, auto-incremented.  |
| `email`    | VARCHAR(100) | Unique email for login.         |
| `password` | VARCHAR(255) | Hashed password (e.g., BCrypt). |

**Constraints**:

- `email`: UNIQUE

**Why**: Supports secure authentication for all user types. `VARCHAR(255)` accommodates hashed passwords. `auth_id` is referenced by `users`, `teachers`, and `admins`. No soft delete needed - managed by Supabase Auth in this project.

## Table: `users`

Stores common user account information and drives RBAC.

| Field        | Type                            | Description                                                          |
| ------------ | ------------------------------- | -------------------------------------------------------------------- |
| `auth_id`    | INT                             | Primary key, foreign key to `auth`. Uniquely identifies a user.      |
| `type`       | ENUM('Teacher','Admin','Staff') | User role, determines access level and links to role-specific table. |
| `status`     | ENUM('Active','Inactive')       | Account status for access control.                                   |
| `last_login` | TIMESTAMP                       | Last login time. Nullable.                                           |
| `deleted_at` | TIMESTAMP                       | Soft delete timestamp. NULL = active, timestamp = deleted.           |
| `created_at` | TIMESTAMP                       | Record creation time, default CURRENT_TIMESTAMP.                     |
| `updated_at` | TIMESTAMP                       | Record update time, default CURRENT_TIMESTAMP.                       |

**Constraints**:

- Foreign key: `auth_id` (one-to-one with `auth.auth_id`)
- Index: `auth_id`, `type`, `deleted_at` (for RBAC queries and active user filtering)
- UNIQUE: `(auth_id, type)` (prevents duplicate role assignments)

**Why**: Acts as the supertype for all users, managing RBAC and shared fields. `type` directs to role-specific tables (e.g., `teachers` for 'Teacher'). ENUM types prevent invalid data entry and provide better performance than VARCHAR with CHECK constraints. Soft delete preserves user account history and audit trails.

## Table: `admins`

Stores admin-specific information for high-level system access.

| Field        | Type         | Description                                                       |
| ------------ | ------------ | ----------------------------------------------------------------- |
| `auth_id`    | INT          | Primary key, foreign key to `auth`. Uniquely identifies an admin. |
| `name`       | VARCHAR(100) | Admin's full name.                                                |
| `deleted_at` | TIMESTAMP    | Soft delete timestamp. NULL = active, timestamp = deleted.        |
| `created_at` | TIMESTAMP    | Record creation time, default CURRENT_TIMESTAMP.                  |
| `updated_at` | TIMESTAMP    | Record update time, default CURRENT_TIMESTAMP.                    |

**Constraints**:

- Foreign key: `auth_id` (one-to-one with `auth.auth_id`)
- Index: `auth_id`, `deleted_at` (for efficient joins and active admin filtering)

**Why**: Manages admin accounts with high-level access (e.g., QR scanning portal). Excludes `last_login`, `type` as they're in `users`. Soft delete preserves administrative history.

## Table: `staff`

Stores staff-specific information for gate operations and scanning duties.

| Field        | Type         | Description                                                      |
| ------------ | ------------ | ---------------------------------------------------------------- |
| `auth_id`    | INT          | Primary key, foreign key to `auth`. Uniquely identifies a staff. |
| `name`       | VARCHAR(100) | Staff member's full name.                                        |
| `deleted_at` | TIMESTAMP    | Soft delete timestamp. NULL = active, timestamp = deleted.       |
| `created_at` | TIMESTAMP    | Record creation time, default CURRENT_TIMESTAMP.                 |
| `updated_at` | TIMESTAMP    | Record update time, default CURRENT_TIMESTAMP.                   |

**Constraints**:

- Foreign key: `auth_id` (one-to-one with `auth.auth_id`)
- Index: `auth_id`, `deleted_at` (for efficient joins and active staff filtering)

**Why**: Manages staff accounts with scanning permissions for QR code attendance logging. Excludes `last_login`, `type` as they're in `users`. Soft delete preserves employment history.

## Table: `teachers`

Stores faculty-specific information for advisory roles.

| Field                        | Type        | Description                                                        |
| ---------------------------- | ----------- | ------------------------------------------------------------------ |
| `auth_id`                    | INT         | Primary key, foreign key to `auth`. Uniquely identifies a teacher. |
| `first_name`                 | VARCHAR(50) | Teacher's first name.                                              |
| `last_name`                  | VARCHAR(50) | Teacher's last name.                                               |
| `middle_name`                | VARCHAR(50) | Teacher's middle name. Nullable.                                   |
| `advisory_level_id`          | INT         | Foreign key to `levels`, for advisory class.                       |
| `advisory_specialization_id` | INT         | Foreign key to `specializations`, for advisory track.              |
| `advisory_section_id`        | INT         | Foreign key to `sections`, for advisory section.                   |
| `deleted_at`                 | TIMESTAMP   | Soft delete timestamp. NULL = active, timestamp = deleted.         |
| `created_at`                 | TIMESTAMP   | Record creation time, default CURRENT_TIMESTAMP.                   |
| `updated_at`                 | TIMESTAMP   | Record update time, default CURRENT_TIMESTAMP.                     |

**Constraints**:

- Foreign key: `auth_id` (one-to-one with `auth.auth_id`)
- Foreign keys: `advisory_level_id`, `advisory_specialization_id`, `advisory_section_id`
- Index: `auth_id`, `deleted_at` (for efficient joins and active teacher filtering)

**Why**: Stores teacher-specific data (e.g., advisory assignments). Excludes `last_login`, `type` as they're in `users`. Soft delete preserves employment history and advisory relationships.

## Table: `students`

Stores student information, including QR code tokens and academic details.

| Field               | Type        | Description                                                                      |
| ------------------- | ----------- | -------------------------------------------------------------------------------- |
| `id`                | INT         | Primary key, auto-incremented. Uniquely identifies a student.                    |
| `student_id`        | VARCHAR(20) | Unique identifier (e.g., "S001") for student records and analytics.              |
| `qr_token`          | VARCHAR(36) | Unique GUID for QR code scanning (e.g., "123e4567-e89b-12d3-a456-426614174000"). |
| `first_name`        | VARCHAR(50) | Student's first name.                                                            |
| `last_name`         | VARCHAR(50) | Student's last name.                                                             |
| `middle_name`       | VARCHAR(50) | Student's middle name. Nullable.                                                 |
| `level_id`          | INT         | Foreign key to `levels`, for grouping in analytics.                              |
| `specialization_id` | INT         | Foreign key to `specializations`, for filtering by track.                        |
| `section_id`        | INT         | Foreign key to `sections`, for class grouping.                                   |
| `adviser_id`        | INT         | Foreign key to `teachers`, for notifications.                                    |
| `deleted_at`        | TIMESTAMP   | Soft delete timestamp. NULL = active, timestamp = deleted.                       |
| `created_at`        | TIMESTAMP   | Record creation time, default CURRENT_TIMESTAMP.                                 |
| `updated_at`        | TIMESTAMP   | Record update time, default CURRENT_TIMESTAMP.                                   |

**Constraints**:

- `student_id`: UNIQUE
- `qr_token`: UNIQUE
- Foreign keys: `level_id`, `specialization_id`, `section_id`, `adviser_id`
- Index: `student_id`, `qr_token`, `deleted_at` (for QR scanning and active student filtering)

**Why**: `qr_token` supports secure QR scanning. Foreign keys enable analytics by level, specialization, or section. Soft delete preserves student enrollment history and academic records.

## Table: `levels`

Stores academic year/grade levels for grouping students.

| Field        | Type      | Description                                                |
| ------------ | --------- | ---------------------------------------------------------- |
| `id`         | INT       | Primary key, auto-incremented.                             |
| `level`      | INT       | Year or grade level (e.g., 11, 12).                        |
| `deleted_at` | TIMESTAMP | Soft delete timestamp. NULL = active, timestamp = deleted. |
| `created_at` | TIMESTAMP | Record creation time, default CURRENT_TIMESTAMP.           |
| `updated_at` | TIMESTAMP | Record update time, default CURRENT_TIMESTAMP.             |

**Constraints**:

- Index: `deleted_at` (for active level filtering)

**Why**: Enables analytics by grade level. `INT` for `level` is sufficient for grades 1–12. Soft delete prevents foreign key violations when levels are referenced by students.

## Table: `sections`

Stores class section groupings.

| Field          | Type        | Description                                                |
| -------------- | ----------- | ---------------------------------------------------------- |
| `id`           | INT         | Primary key, auto-incremented.                             |
| `section_name` | VARCHAR(20) | Section name (e.g., "A", "B").                             |
| `deleted_at`   | TIMESTAMP   | Soft delete timestamp. NULL = active, timestamp = deleted. |
| `created_at`   | TIMESTAMP   | Record creation time, default CURRENT_TIMESTAMP.           |
| `updated_at`   | TIMESTAMP   | Record update time, default CURRENT_TIMESTAMP.             |

**Constraints**:

- Index: `deleted_at` (for active section filtering)

**Why**: Supports grouping for analytics and late tracking. Soft delete prevents foreign key violations when sections are referenced by students.

## Table: `specializations`

Stores student academic tracks (e.g., STEM, ABM).

| Field                 | Type        | Description                                                |
| --------------------- | ----------- | ---------------------------------------------------------- |
| `id`                  | INT         | Primary key, auto-incremented.                             |
| `specialization_name` | VARCHAR(50) | Track name (e.g., "STEM").                                 |
| `deleted_at`          | TIMESTAMP   | Soft delete timestamp. NULL = active, timestamp = deleted. |
| `created_at`          | TIMESTAMP   | Record creation time, default CURRENT_TIMESTAMP.           |
| `updated_at`          | TIMESTAMP   | Record update time, default CURRENT_TIMESTAMP.             |

**Constraints**:

- Index: `deleted_at` (for active specialization filtering)

**Why**: Filters analytics by track. `VARCHAR(50)` covers most specialization names. Soft delete prevents foreign key violations when specializations are referenced by students.

## Table: `attendance_log`

Stores student attendance records for time tracking and analytics.

| Field             | Type      | Description                                                |
| ----------------- | --------- | ---------------------------------------------------------- |
| `id`              | INT       | Primary key, auto-incremented.                             |
| `student_id`      | INT       | Foreign key to `students`.                                 |
| `attendance_date` | DATE      | Date of attendance record.                                 |
| `time_in`         | TIME      | Time student clocked in.                                   |
| `time_out`        | TIME      | Time student clocked out. Nullable.                        |
| `is_late`         | BOOLEAN   | True if `time_in` exceeds `quarters.school_start_time`.    |
| `deleted_at`      | TIMESTAMP | Soft delete timestamp. NULL = active, timestamp = deleted. |
| `created_at`      | TIMESTAMP | Record creation time, default CURRENT_TIMESTAMP.           |
| `updated_at`      | TIMESTAMP | Record update time, default CURRENT_TIMESTAMP.             |

**Constraints**:

- Foreign key: `student_id`
- Index: `student_id`, `attendance_date`, `deleted_at` (for analytics queries and active record filtering)

**Why**: Core table for time logs, late calculations, and absence detection. Soft delete preserves attendance history for audit trails and compliance requirements.

## Table: `notifications`

Stores notifications for teachers (e.g., 3+ absences).

| Field        | Type         | Description                                              |
| ------------ | ------------ | -------------------------------------------------------- |
| `id`         | INT          | Primary key, auto-incremented.                           |
| `student_id` | INT          | Foreign key to `students`.                               |
| `teacher_id` | INT          | Foreign key to `teachers`.                               |
| `type`       | VARCHAR(20)  | Notification type ('Alert', 'Reminder').                 |
| `message`    | VARCHAR(255) | Notification content (e.g., "Student X has 3 absences"). |
| `sent_at`    | TIMESTAMP    | Time notification was sent.                              |
| `status`     | VARCHAR(20)  | Notification status ('Sent', 'Delivered', 'Read').       |
| `created_at` | TIMESTAMP    | Record creation time, default CURRENT_TIMESTAMP.         |
| `updated_at` | TIMESTAMP    | Record update time, default CURRENT_TIMESTAMP.           |

**Constraints**:

- Foreign keys: `student_id`, `teacher_id`
- Index: `teacher_id` (for notification queries)
- CHECK: `type IN ('Alert', 'Reminder')`
- CHECK: `status IN ('Sent', 'Delivered', 'Read')`

**Why**: Supports automated notifications for absences. No soft delete needed - notifications have natural lifecycle (sent, delivered, read) and can be hard deleted after retention period.

## Table: `quarters`

Defines academic quarters for analytics and late calculations.

| Field               | Type        | Description                                                |
| ------------------- | ----------- | ---------------------------------------------------------- |
| `id`                | INT         | Primary key, auto-incremented.                             |
| `quarter_name`      | VARCHAR(20) | Quarter name (e.g., "Q1").                                 |
| `start_date`        | DATE        | Quarter start date.                                        |
| `end_date`          | DATE        | Quarter end date.                                          |
| `school_start_time` | TIME        | Official class start time for late calculations.           |
| `deleted_at`        | TIMESTAMP   | Soft delete timestamp. NULL = active, timestamp = deleted. |
| `created_at`        | TIMESTAMP   | Record creation time, default CURRENT_TIMESTAMP.           |
| `updated_at`        | TIMESTAMP   | Record update time, default CURRENT_TIMESTAMP.             |

**Constraints**:

- Index: `deleted_at` (for active quarter filtering)

**Why**: `school_start_time` enables automatic late detection. Soft delete preserves academic calendar history for reporting and analytics.

## Table: `school_calendar`

Stores school calendar to filter non-school days.

| Field           | Type         | Description                                      |
| --------------- | ------------ | ------------------------------------------------ |
| `id`            | INT          | Primary key, auto-incremented.                   |
| `calendar_date` | DATE         | Calendar date.                                   |
| `is_school_day` | BOOLEAN      | True if a school day.                            |
| `description`   | VARCHAR(100) | Holiday or event description. Nullable.          |
| `created_at`    | TIMESTAMP    | Record creation time, default CURRENT_TIMESTAMP. |
| `updated_at`    | TIMESTAMP    | Record update time, default CURRENT_TIMESTAMP.   |

**Why**: Excludes holidays from absence/late calculations. No soft delete needed - calendar entries are historical facts that should not be "deleted" to maintain data integrity for past attendance calculations.

## Indexes

- `students(student_id, qr_token, deleted_at)`: Speeds up QR scanning and active student lookups.
- `attendance_log(student_id, attendance_date, deleted_at)`: Optimizes analytics queries for active records.
- `notifications(teacher_id)`: Improves notification retrieval.
- `users(auth_id, type, deleted_at)`: Optimizes RBAC and active user filtering.
- `teachers(auth_id, deleted_at)`: Optimizes joins with `auth` and active teacher filtering.
- `admins(auth_id, deleted_at)`: Optimizes joins with `auth` and active admin filtering.
- `staff(auth_id, deleted_at)`: Optimizes joins with `auth` and active staff filtering.
- `levels(deleted_at)`: Optimizes active level filtering.
- `sections(deleted_at)`: Optimizes active section filtering.
- `specializations(deleted_at)`: Optimizes active specialization filtering.
- `quarters(deleted_at)`: Optimizes active quarter filtering.
