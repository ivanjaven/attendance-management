# Attendance Management System - Database Schema Documentation

This document outlines the database schema for the Attendance Management System, designed to support QR code-based attendance tracking, time logging, analytics, late detection, and notifications. The schema is optimized for a school environment, ensuring data integrity, efficient querying, and scalability. The `auth` table centralizes authentication, while `users` acts as a supertype table managing shared fields (`status`, `type`, `last_login`) and role-based access control (RBAC). Role-specific tables (`teachers`, `admins`) store unique fields, extending `users` in a supertype-subtype pattern.

## Authentication and RBAC Design

The `auth` table stores credentials for all system users. The `users` table is the supertype, holding common fields (`auth_id`, `status`, `type`, `last_login`) and driving RBAC by checking `type` (e.g., ‘Teacher’, ‘Admin’). Role-specific tables (`teachers`, `admins`) use `auth_id` as both primary key and foreign key to `auth`, storing unique fields for each role. Admins have high-level access (e.g., opening the QR scanning portal), teachers handle advisory roles, and `users` supports extensibility for future roles (e.g., Principal, Student).

## Table: `auth`

Stores authentication credentials for all users.

| Field      | Type         | Description                     |
| ---------- | ------------ | ------------------------------- |
| `auth_id`  | INT          | Primary key, auto-incremented.  |
| `email`    | VARCHAR(100) | Unique email for login.         |
| `password` | VARCHAR(255) | Hashed password (e.g., BCrypt). |

**Constraints**:

- `email`: UNIQUE

**Why**: Supports secure authentication for all user types. `VARCHAR(255)` accommodates hashed passwords. `auth_id` is referenced by `users`, `teachers`, and `admins`.

## Table: `users`

Stores common user account information and drives RBAC.

| Field        | Type                            | Description                                                                |
| ------------ | ------------------------------- | -------------------------------------------------------------------------- |
| `auth_id`    | INT                             | Primary key, foreign key to `auth`. Uniquely identifies a user.            |
| `type`       | ENUM('Teacher','Admin','Staff') | User role, determines access level and links to role-specific table.       |
| `status`     | ENUM('Active','Banned')         | Account status for access control.                                         |
| `last_login` | DATETIME                        | Last login time. Nullable.                                                 |
| `created_at` | DATETIME                        | Record creation time, default CURRENT_TIMESTAMP.                           |
| `updated_at` | DATETIME                        | Record update time, default CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP. |

**Constraints**:

- Foreign key: `auth_id` (one-to-one with `auth.auth_id`)
- Index: `auth_id`, `type` (for RBAC queries)
- UNIQUE: `(auth_id, type)` (prevents duplicate role assignments)

**Why**: Acts as the supertype for all users, managing RBAC and shared fields. `type` directs to role-specific tables (e.g., `teachers` for ‘Teacher’).

## Table: `admins`

Stores admin-specific information for high-level system access.

| Field        | Type         | Description                                                                |
| ------------ | ------------ | -------------------------------------------------------------------------- |
| `auth_id`    | INT          | Primary key, foreign key to `auth`. Uniquely identifies an admin.          |
| `name`       | VARCHAR(100) | Admin’s full name.                                                         |
| `created_at` | DATETIME     | Record creation time, default CURRENT_TIMESTAMP.                           |
| `updated_at` | DATETIME     | Record update time, default CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP. |

**Constraints**:

- Foreign key: `auth_id` (one-to-one with `auth.auth_id`)
- Index: `auth_id` (for efficient joins)

**Why**: Manages admin accounts with high-level access (e.g., QR scanning portal). Excludes `last_login`, `type` as they’re in `users`.

## Table: `teachers`

Stores faculty-specific information for advisory roles.

| Field                        | Type        | Description                                                                |
| ---------------------------- | ----------- | -------------------------------------------------------------------------- |
| `auth_id`                    | INT         | Primary key, foreign key to `auth`. Uniquely identifies a teacher.         |
| `first_name`                 | VARCHAR(50) | Teacher's first name.                                                      |
| `last_name`                  | VARCHAR(50) | Teacher's last name.                                                       |
| `middle_name`                | VARCHAR(50) | Teacher's middle name. Nullable.                                           |
| `advisory_level_id`          | INT         | Foreign key to `levels`, for advisory class.                               |
| `advisory_specialization_id` | INT         | Foreign key to `specializations`, for advisory track.                      |
| `advisory_section_id`        | INT         | Foreign key to `sections`, for advisory section.                           |
| `created_at`                 | DATETIME    | Record creation time, default CURRENT_TIMESTAMP.                           |
| `updated_at`                 | DATETIME    | Record update time, default CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP. |

**Constraints**:

- Foreign key: `auth_id` (one-to-one with `auth.auth_id`)
- Foreign keys: `advisory_level_id`, `advisory_specialization_id`, `advisory_section_id`
- Index: `auth_id` (for efficient joins)

**Why**: Stores teacher-specific data (e.g., advisory assignments). Excludes `last_login`, `type` as they’re in `users`.

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
| `created_at`        | DATETIME    | Record creation time, default CURRENT_TIMESTAMP.                                 |
| `updated_at`        | DATETIME    | Record update time, default CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP.       |

**Constraints**:

- `student_id`: UNIQUE
- `qr_token`: UNIQUE
- Foreign keys: `level_id`, `specialization_id`, `section_id`, `adviser_id`

**Why**: `qr_token` supports secure QR scanning. Foreign keys enable analytics by level, specialization, or section.

## Table: `levels`

Stores academic year/grade levels for grouping students.

| Field        | Type     | Description                                                                |
| ------------ | -------- | -------------------------------------------------------------------------- |
| `id`         | INT      | Primary key, auto-incremented.                                             |
| `level`      | INT      | Year or grade level (e.g., 11, 12).                                        |
| `created_at` | DATETIME | Record creation time, default CURRENT_TIMESTAMP.                           |
| `updated_at` | DATETIME | Record update time, default CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP. |

**Why**: Enables analytics by grade level. `INT` for `level` is sufficient for grades 1–12.

## Table: `sections`

Stores class section groupings.

| Field          | Type        | Description                                                                |
| -------------- | ----------- | -------------------------------------------------------------------------- |
| `id`           | INT         | Primary key, auto-incremented.                                             |
| `section_name` | VARCHAR(20) | Section name (e.g., "A", "B").                                             |
| `created_at`   | DATETIME    | Record creation time, default CURRENT_TIMESTAMP.                           |
| `updated_at`   | DATETIME    | Record update time, default CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP. |

**Why**: Supports grouping for analytics and late tracking.

## Table: `specializations`

Stores student academic tracks (e.g., STEM, ABM).

| Field                 | Type        | Description                                                                |
| --------------------- | ----------- | -------------------------------------------------------------------------- |
| `id`                  | INT         | Primary key, auto-incremented.                                             |
| `specialization_name` | VARCHAR(50) | Track name (e.g., "STEM").                                                 |
| `created_at`          | DATETIME    | Record creation time, default CURRENT_TIMESTAMP.                           |
| `updated_at`          | DATETIME    | Record update time, default CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP. |

**Why**: Filters analytics by track. `VARCHAR(50)` covers most specialization names.

## Table: `attendance_log`

Stores student attendance records for time tracking and analytics.

| Field             | Type     | Description                                                                |
| ----------------- | -------- | -------------------------------------------------------------------------- |
| `id`              | INT      | Primary key, auto-incremented.                                             |
| `student_id`      | INT      | Foreign key to `students`.                                                 |
| `attendance_date` | DATE     | Date of attendance record.                                                 |
| `time_in`         | TIME     | Time student clocked in.                                                   |
| `time_out`        | TIME     | Time student clocked out. Nullable.                                        |
| `is_late`         | BOOLEAN  | True if `time_in` exceeds `quarters.school_start_time`.                    |
| `created_at`      | DATETIME | Record creation time, default CURRENT_TIMESTAMP.                           |
| `updated_at`      | DATETIME | Record update time, default CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP. |

**Constraints**:

- Foreign key: `student_id`
- Index: `student_id`, `attendance_date` (for analytics queries)

**Why**: Core table for time logs, late calculations, and absence detection.

## Table: `notifications`

Stores notifications for teachers (e.g., 3+ absences).

| Field        | Type                            | Description                                                                |
| ------------ | ------------------------------- | -------------------------------------------------------------------------- |
| `id`         | INT                             | Primary key, auto-incremented.                                             |
| `student_id` | INT                             | Foreign key to `students`.                                                 |
| `teacher_id` | INT                             | Foreign key to `teachers`.                                                 |
| `type`       | ENUM('Alert','Reminder')        | Notification type.                                                         |
| `message`    | VARCHAR(255)                    | Notification content (e.g., "Student X has 3 absences").                   |
| `sent_at`    | DATETIME                        | Time notification was sent.                                                |
| `status`     | ENUM('Sent','Delivered','Read') | Notification status.                                                       |
| `created_at` | DATETIME                        | Record creation time, default CURRENT_TIMESTAMP.                           |
| `updated_at` | DATETIME                        | Record update time, default CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP. |

**Constraints**:

- Foreign keys: `student_id`, `teacher_id`
- Index: `teacher_id` (for notification queries)

**Why**: Supports automated notifications for absences.

## Table: `quarters`

Defines academic quarters for analytics and late calculations.

| Field               | Type        | Description                                                                |
| ------------------- | ----------- | -------------------------------------------------------------------------- |
| `id`                | INT         | Primary key, auto-incremented.                                             |
| `quarter_name`      | VARCHAR(20) | Quarter name (e.g., "Q1").                                                 |
| `start_date`        | DATE        | Quarter start date.                                                        |
| `end_date`          | DATE        | Quarter end date.                                                          |
| `school_start_time` | TIME        | Official class start time for late calculations.                           |
| `created_at`        | DATETIME    | Record creation time, default CURRENT_TIMESTAMP.                           |
| `updated_at`        | DATETIME    | Record update time, default CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP. |

**Why**: `school_start_time` enables automatic late detection.

## Table: `school_calendar`

Stores school calendar to filter non-school days.

| Field           | Type         | Description                                                                |
| --------------- | ------------ | -------------------------------------------------------------------------- |
| `id`            | INT          | Primary key, auto-incremented.                                             |
| `calendar_date` | DATE         | Calendar date.                                                             |
| `is_school_day` | BOOLEAN      | True if a school day.                                                      |
| `description`   | VARCHAR(100) | Holiday or event description. Nullable.                                    |
| `created_at`    | DATETIME     | Record creation time, default CURRENT_TIMESTAMP.                           |
| `updated_at`    | DATETIME     | Record update time, default CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP. |

**Why**: Excludes holidays from absence/late calculations.

## Indexes

- `students(student_id, qr_token)`: Speeds up QR scanning and student lookups.
- `attendance_log(student_id, attendance_date)`: Optimizes analytics queries.
- `notifications(teacher_id)`: Improves notification retrieval.
- `users(auth_id, type)`: Optimizes RBAC and joins with `auth`.
- `teachers(auth_id)`: Optimizes joins with `auth`.
- `admins(auth_id)`: Optimizes joins with `auth`.
