-- ============================================================================
-- Attendance Management System - Database Schema
-- ============================================================================
-- This schema supports QR code-based attendance tracking, time logging, 
-- analytics, late detection, and notifications for a school environment.
-- Features RBAC with supertype-subtype pattern and soft delete strategy.
-- Uses Supabase's built-in auth.users for authentication.
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- RBAC TABLES (Uses Supabase's built-in auth.users)
-- ============================================================================

-- Users supertype table - drives RBAC and stores common fields
-- References Supabase's built-in auth.users table
CREATE TABLE users (
    auth_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('Teacher', 'Admin', 'Staff')),
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    last_login TIMESTAMP,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin role-specific table
CREATE TABLE admins (
    auth_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- ACADEMIC STRUCTURE TABLES
-- ============================================================================

-- Levels table - stores academic year/grade levels
CREATE TABLE levels (
    id SERIAL PRIMARY KEY,
    level INTEGER NOT NULL,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sections table - stores class section groupings
CREATE TABLE sections (
    id SERIAL PRIMARY KEY,
    section_name VARCHAR(20) NOT NULL,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Specializations table - stores academic tracks (e.g., STEM, ABM)
CREATE TABLE specializations (
    id SERIAL PRIMARY KEY,
    specialization_name VARCHAR(50) NOT NULL,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Staff role-specific table
CREATE TABLE staff (
    auth_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teachers role-specific table
CREATE TABLE teachers (
    auth_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    middle_name VARCHAR(50),
    advisory_level_id INTEGER REFERENCES levels(id),
    advisory_specialization_id INTEGER REFERENCES specializations(id),
    advisory_section_id INTEGER REFERENCES sections(id),
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- STUDENT AND ATTENDANCE TABLES
-- ============================================================================

-- Students table - stores student information and QR tokens
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(20) UNIQUE NOT NULL,
    qr_token VARCHAR(36) UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    middle_name VARCHAR(50),
    level_id INTEGER REFERENCES levels(id),
    specialization_id INTEGER REFERENCES specializations(id),
    section_id INTEGER REFERENCES sections(id),
    adviser_id UUID REFERENCES teachers(auth_id),
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quarters table - defines academic periods for late calculations
CREATE TABLE quarters (
    id SERIAL PRIMARY KEY,
    quarter_name VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    school_start_time TIME NOT NULL,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attendance log table - core table for time tracking and analytics
CREATE TABLE attendance_log (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    time_in TIME NOT NULL,
    time_out TIME,
    is_late BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table - stores alerts for teachers
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES teachers(auth_id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('Alert', 'Reminder')),
    message VARCHAR(255) NOT NULL,
    sent_at TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Sent' CHECK (status IN ('Sent', 'Delivered', 'Read')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- School calendar table - filters non-school days from calculations
CREATE TABLE school_calendar (
    id SERIAL PRIMARY KEY,
    calendar_date DATE NOT NULL,
    is_school_day BOOLEAN DEFAULT TRUE,
    description VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- QR scanning and student lookup optimization
CREATE INDEX idx_students_student_id ON students(student_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_students_qr_token ON students(qr_token) WHERE deleted_at IS NULL;

-- Attendance analytics optimization
CREATE INDEX idx_attendance_log_student_date ON attendance_log(student_id, attendance_date) WHERE deleted_at IS NULL;

-- Notification queries optimization
CREATE INDEX idx_notifications_teacher ON notifications(teacher_id);

-- RBAC and user management optimization
CREATE INDEX idx_users_type_status ON users(type, status) WHERE deleted_at IS NULL;

-- Teacher advisory relationship optimization
CREATE INDEX idx_teachers_advisory ON teachers(advisory_level_id, advisory_specialization_id, advisory_section_id) WHERE deleted_at IS NULL;

-- Active record filtering for soft delete tables
CREATE INDEX idx_levels_deleted_at ON levels(id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sections_deleted_at ON sections(id) WHERE deleted_at IS NULL;
CREATE INDEX idx_specializations_deleted_at ON specializations(id) WHERE deleted_at IS NULL;
CREATE INDEX idx_quarters_deleted_at ON quarters(id) WHERE deleted_at IS NULL;

-- ============================================================================
-- AUTOMATIC TIMESTAMP UPDATES
-- ============================================================================

-- Function to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Apply update triggers to all tables with updated_at columns
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admins_updated_at 
    BEFORE UPDATE ON admins 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teachers_updated_at 
    BEFORE UPDATE ON teachers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_updated_at 
    BEFORE UPDATE ON staff 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at 
    BEFORE UPDATE ON students 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_levels_updated_at 
    BEFORE UPDATE ON levels 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sections_updated_at 
    BEFORE UPDATE ON sections 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_specializations_updated_at 
    BEFORE UPDATE ON specializations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quarters_updated_at 
    BEFORE UPDATE ON quarters 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_log_updated_at 
    BEFORE UPDATE ON attendance_log 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at 
    BEFORE UPDATE ON notifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_school_calendar_updated_at 
    BEFORE UPDATE ON school_calendar 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SAMPLE DATA FOR TESTING
-- ============================================================================

-- Insert sample levels
INSERT INTO levels (level) VALUES 
(11), (12);

-- Insert sample sections
INSERT INTO sections (section_name) VALUES 
('A'), ('B'), ('C');

-- Insert sample specializations
INSERT INTO specializations (specialization_name) VALUES 
('STEM'), ('ABM'), ('HUMSS'), ('GAS');

-- Insert sample quarter
INSERT INTO quarters (quarter_name, start_date, end_date, school_start_time) VALUES 
('Q1 2024-2025', '2024-08-15', '2024-10-31', '08:00:00');

