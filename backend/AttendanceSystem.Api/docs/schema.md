# Attendance Management System - Database Schema Documentation

This document outlines the database schema for the Attendance Management System, designed to support QR code-based attendance tracking, time logging, analytics, late detection, and notifications. The schema is optimized for a school environment, ensuring data integrity, efficient querying, and scalability for requirements like scanning student QR IDs, logging time-in/time-out, calculating late arrivals, and notifying teachers.

## Table: `students`

Stores student information, including QR code tokens and academic details, to support QR scanning and analytics.

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

**Why**: `qr_token` supports secure QR scanning. Foreign keys enable analytics by level, specialization, or section. `INT` for IDs is sufficient for school-scale data.

---

## Table: `teachers`

Stores faculty information, linking to advisory classes for notifications and analytics.

| Field                        | Type        | Description                                                                |
| ---------------------------- | ----------- | -------------------------------------------------------------------------- |
| `id`                         | INT         | Primary key, auto-incremented.                                             |
| `first_name`                 | VARCHAR(50) | Teacher's first name.                                                      |
| `last_name`                  | VARCHAR(50) | Teacher's last name.                                                       |
| `middle_name`                | VARCHAR(50) | Teacher's middle name. Nullable.                                           |
| `advisory_level_id`          | INT         | Foreign key to `levels`, for advisory class.                               |
| `advisory_specialization_id` | INT         | Foreign key to `specializations`, for advisory track.                      |
| `advisory_section_id`        | INT         | Foreign key to `sections`, for advisory section.                           |
| `created_at`                 | DATETIME    | Record creation time, default CURRENT_TIMESTAMP.                           |
| `updated_at`                 | DATETIME    | Record update time, default CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP. |

**Constraints**:

- Foreign keys: `advisory_level_id`, `advisory_specialization_id`, `advisory_section_id`

**Why**: Links teachers to students for notifications (e.g., 3 absences). `INT` for IDs ensures efficient joins.

---

## Table: `levels`

Stores academic year/grade levels for grouping students.

| Field        | Type     | Description                                                                |
| ------------ | -------- | -------------------------------------------------------------------------- |
| `id`         | INT      | Primary key, auto-incremented.                                             |
| `level`      | INT      | Year or grade level (e.g., 11, 12).                                        |
| `created_at` | DATETIME | Record creation time, default CURRENT_TIMESTAMP.                           |
| `updated_at` | DATETIME | Record update time, default CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP. |

**Why**: Enables analytics by grade level. `INT` for `level` is sufficient for grade numbers (1–12).

---

## Table: `sections`

Stores class section groupings.

| Field          | Type        | Description                                                                |
| -------------- | ----------- | -------------------------------------------------------------------------- |
| `id`           | INT         | Primary key, auto-incremented.                                             |
| `section_name` | VARCHAR(20) | Section name (e.g., "A", "B").                                             |
| `created_at`   | DATETIME    | Record creation time, default CURRENT_TIMESTAMP.                           |
| `updated_at`   | DATETIME    | Record update time, default CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP. |

**Why**: Supports grouping for analytics and late tracking. `VARCHAR(20)` is ample for section names.

---

## Table: `specializations`

Stores student academic tracks (e.g., STEM, ABM).

| Field                 | Type        | Description                                                                |
| --------------------- | ----------- | -------------------------------------------------------------------------- |
| `id`                  | INT         | Primary key, auto-incremented.                                             |
| `specialization_name` | VARCHAR(50) | Track name (e.g., "STEM").                                                 |
| `created_at`          | DATETIME    | Record creation time, default CURRENT_TIMESTAMP.                           |
| `updated_at`          | DATETIME    | Record update time, default CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP. |

**Why**: Filters analytics by track. `VARCHAR(50)` covers most specialization names.

---

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

**Why**: Core table for time logs, late calculations, and absence detection. `TIME` ensures precise time-of-day storage. `is_late` simplifies late tracking queries.

---

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

**Why**: Supports automated notifications for absences. `VARCHAR(255)` balances storage and message length.

---

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

**Why**: `school_start_time` enables automatic late detection. `DATE` fields support analytics by quarter.

---

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

**Why**: Excludes holidays from absence/late calculations. `BOOLEAN` is efficient for flags.

---

## Table: `auth`

Stores authentication credentials for users.

| Field      | Type         | Description                     |
| ---------- | ------------ | ------------------------------- |
| `id`       | INT          | Primary key, auto-incremented.  |
| `email`    | VARCHAR(100) | Unique email for login.         |
| `password` | VARCHAR(255) | Hashed password (e.g., BCrypt). |

**Constraints**:

- `email`: UNIQUE

**Why**: Supports secure authentication for admins and teachers. `VARCHAR(255)` accommodates hashed passwords.

---

## Table: `users`

Stores user account information.

| Field        | Type                    | Description                                                                |
| ------------ | ----------------------- | -------------------------------------------------------------------------- |
| `id`         | INT                     | Primary key, foreign key to `auth`.                                        |
| `status`     | ENUM('Active','Banned') | Account status.                                                            |
| `type`       | ENUM('Admin','Teacher') | User role.                                                                 |
| `last_login` | DATETIME                | Last login time. Nullable.                                                 |
| `created_at` | DATETIME                | Record creation time, default CURRENT_TIMESTAMP.                           |
| `updated_at` | DATETIME                | Record update time, default CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP. |

**Constraints**:

- Foreign key: `id` (one-to-one with `auth`)

**Why**: Manages user roles and status for access control.

---

## Table: `admins`

Stores admin-specific information.

| Field        | Type         | Description                                                                |
| ------------ | ------------ | -------------------------------------------------------------------------- |
| `id`         | INT          | Primary key, foreign key to `auth`.                                        |
| `name`       | VARCHAR(100) | Admin’s full name.                                                         |
| `last_login` | DATETIME     | Last login time. Nullable.                                                 |
| `created_at` | DATETIME     | Record creation time, default CURRENT_TIMESTAMP.                           |
| `updated_at` | DATETIME     | Record update time, default CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP. |

**Constraints**:

- Foreign key: `id` (one-to-one with `auth`)

**Why**: Separates admin data for system management.

---

## Indexes

- `students(student_id, qr_token)`: Speeds up QR scanning and student lookups.
- `attendance_log(student_id, attendance_date)`: Optimizes analytics and late/absence queries.
- `notifications(teacher_id)`: Improves notification retrieval.
