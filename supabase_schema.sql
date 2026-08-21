-- =============================================================================
-- FACIAL RECOGNITION ATTENDANCE & SHIFT MANAGEMENT SYSTEM (RFAP)
-- SUPABASE POSTGRESQL DDL & MIGRATION SCHEMA
-- =============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. BRANCHES MASTER TABLE
CREATE TABLE IF NOT EXISTS tbl_branches (
    branch_id SERIAL PRIMARY KEY,
    branch_name VARCHAR(150) NOT NULL,
    location_code VARCHAR(50) NOT NULL UNIQUE,
    address TEXT,
    respective_manager_id VARCHAR(50), -- Mandatory in Branch Management form (Approver 01)
    manager_name VARCHAR(150),
    manager_phone VARCHAR(50),
    superior_manager_id VARCHAR(50), -- Mandatory in Branch Management form (Approver 02)
    superior_manager_name VARCHAR(150),
    superior_manager_phone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. EMPLOYEES MASTER TABLE
CREATE TABLE IF NOT EXISTS tbl_employees (
    emp_id VARCHAR(50) PRIMARY KEY,
    branch_id INT NOT NULL REFERENCES tbl_branches(branch_id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    mobile_no VARCHAR(20),
    department VARCHAR(100),
    designation VARCHAR(100),
    date_of_birth DATE NOT NULL,
    date_of_joining DATE DEFAULT CURRENT_DATE,
    face_embedding JSONB DEFAULT NULL, -- Stores 128d vector array [0.12, -0.45, ...]
    send_bday_wish BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_employee_age CHECK (date_of_birth <= CURRENT_DATE - INTERVAL '18 years')
);

-- 3. SHIFTS MASTER TABLE
CREATE TABLE IF NOT EXISTS tbl_shifts (
    shift_id SERIAL PRIMARY KEY,
    shift_name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    grace_period_m INT DEFAULT 15,
    half_day_threshold_h INT DEFAULT 4,
    branch_scope VARCHAR(50) DEFAULT 'ALL', -- 'ALL' or specific branch_id
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. ATTENDANCE LOGS TABLE
CREATE TABLE IF NOT EXISTS tbl_attendance_logs (
    log_id BIGSERIAL PRIMARY KEY,
    emp_id VARCHAR(50) NOT NULL REFERENCES tbl_employees(emp_id) ON DELETE CASCADE,
    shift_id INT NOT NULL REFERENCES tbl_shifts(shift_id),
    branch_id INT NOT NULL REFERENCES tbl_branches(branch_id),
    date_stamp DATE NOT NULL,
    check_in_time TIMESTAMP WITH TIME ZONE,
    check_out_time TIMESTAMP WITH TIME ZONE,
    attendance_status VARCHAR(30) NOT NULL DEFAULT 'PRESENT', -- PRESENT, PRESENT_GRACE, LATE_ARRIVAL, ABSENT, REGULARIZED
    is_worked_on_leave BOOLEAN DEFAULT FALSE,
    is_worked_holiday BOOLEAN DEFAULT FALSE,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unq_emp_shift_date UNIQUE (emp_id, shift_id, date_stamp)
);

-- 5. LEAVE ENTRIES TABLE (DIRECT ENTRY - NO APPROVAL WORKFLOW)
CREATE TABLE IF NOT EXISTS tbl_leave_entries (
    leave_id BIGSERIAL PRIMARY KEY,
    emp_id VARCHAR(50) NOT NULL REFERENCES tbl_employees(emp_id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    leave_type VARCHAR(50) NOT NULL, -- Casual, Sick, Unpaid, Annual
    duration_days INT DEFAULT 1,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_leave_dates CHECK (end_date >= start_date)
);

-- 6. HOLIDAYS MASTER TABLE
CREATE TABLE IF NOT EXISTS tbl_holidays (
    holiday_id SERIAL PRIMARY KEY,
    holiday_date DATE,
    holiday_description VARCHAR(200) NOT NULL,
    recurring_type VARCHAR(20) DEFAULT 'YEARLY', -- WEEKLY, MONTHLY, YEARLY
    day_of_week INT, -- 1=Mon, 7=Sun for recurring weekly off
    rule_scope VARCHAR(50) DEFAULT 'ALL_SAT', -- ALL_SAT or SAT_2_4
    branch_id INT REFERENCES tbl_branches(branch_id) ON DELETE CASCADE, -- NULL for Global
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. SOS EMERGENCY EVENTS TABLE
CREATE TABLE IF NOT EXISTS tbl_sos_events (
    event_id BIGSERIAL PRIMARY KEY,
    branch_id INT NOT NULL REFERENCES tbl_branches(branch_id),
    emp_id VARCHAR(50) REFERENCES tbl_employees(emp_id),
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, ACKNOWLEDGED, RESOLVED
    notes TEXT
);

-- 8. SCHEDULED EMAIL REPORTS TABLE
CREATE TABLE IF NOT EXISTS tbl_email_schedules (
    schedule_id SERIAL PRIMARY KEY,
    config_name VARCHAR(150) NOT NULL,
    recipient_emails TEXT NOT NULL, -- Comma separated
    target_branch_id INT REFERENCES tbl_branches(branch_id),
    report_type VARCHAR(50) NOT NULL, -- DAILY_ATTENDANCE, MONTHLY_SUMMARY, DASHBOARD_SUMMARY
    export_format VARCHAR(20) DEFAULT 'XLSX', -- XLSX, PDF
    dispatch_frequency VARCHAR(20) DEFAULT 'DAILY', -- DAILY, WEEKLY, MONTHLY
    dispatch_time TIME DEFAULT '19:00:00',
    is_active BOOLEAN DEFAULT TRUE,
    last_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. REGULARIZATION REQUESTS TABLE
CREATE TABLE IF NOT EXISTS tbl_regularization_requests (
    request_id BIGSERIAL PRIMARY KEY,
    emp_id VARCHAR(50) NOT NULL REFERENCES tbl_employees(emp_id),
    branch_id INT REFERENCES tbl_branches(branch_id),
    request_date DATE NOT NULL,
    shift_id INT NOT NULL REFERENCES tbl_shifts(shift_id),
    punch_type VARCHAR(20) NOT NULL, -- Check-In, Check-Out
    requested_time TIME NOT NULL,
    remarks TEXT,
    approver_01_emp_id VARCHAR(50), -- Respective Manager (Mandatory Approver 01)
    approver_01_name VARCHAR(150),
    approver_01_status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    approver_01_action_at TIMESTAMP WITH TIME ZONE,
    approver_02_emp_id VARCHAR(50), -- Superior Manager (Optional Approver 02)
    approver_02_name VARCHAR(150),
    approver_02_status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, NOT_APPLICABLE
    approver_02_action_at TIMESTAMP WITH TIME ZONE,
    current_approval_level INT DEFAULT 1, -- 1 = Approver 01 (Respective Mgr), 2 = Approver 02 (Superior Mgr)
    status VARCHAR(30) DEFAULT 'PENDING_L1', -- PENDING_L1, PENDING_L2, APPROVED, REJECTED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY (RLS) & SET PERMISSIVE ANON POLICIES
-- =============================================================================

ALTER TABLE tbl_branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon full access to tbl_branches" ON tbl_branches;
CREATE POLICY "Allow anon full access to tbl_branches" ON tbl_branches FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE tbl_employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon full access to tbl_employees" ON tbl_employees;
CREATE POLICY "Allow anon full access to tbl_employees" ON tbl_employees FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE tbl_shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon full access to tbl_shifts" ON tbl_shifts;
CREATE POLICY "Allow anon full access to tbl_shifts" ON tbl_shifts FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE tbl_attendance_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon full access to tbl_attendance_logs" ON tbl_attendance_logs;
CREATE POLICY "Allow anon full access to tbl_attendance_logs" ON tbl_attendance_logs FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE tbl_leave_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon full access to tbl_leave_entries" ON tbl_leave_entries;
CREATE POLICY "Allow anon full access to tbl_leave_entries" ON tbl_leave_entries FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE tbl_holidays ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon full access to tbl_holidays" ON tbl_holidays;
CREATE POLICY "Allow anon full access to tbl_holidays" ON tbl_holidays FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE tbl_sos_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon full access to tbl_sos_events" ON tbl_sos_events;
CREATE POLICY "Allow anon full access to tbl_sos_events" ON tbl_sos_events FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE tbl_email_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon full access to tbl_email_schedules" ON tbl_email_schedules;
CREATE POLICY "Allow anon full access to tbl_email_schedules" ON tbl_email_schedules FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE tbl_regularization_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon full access to tbl_regularization_requests" ON tbl_regularization_requests;
CREATE POLICY "Allow anon full access to tbl_regularization_requests" ON tbl_regularization_requests FOR ALL USING (true) WITH CHECK (true);

-- =============================================================================
-- PETTY CASH ENTERPRISE SUITE MODULE TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS tbl_petty_cash_projects (
    project_id BIGINT PRIMARY KEY,
    project_name VARCHAR(100) NOT NULL,
    branch_id INT REFERENCES tbl_branches(branch_id),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS tbl_petty_cash_categories (
    category_code VARCHAR(20) PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS tbl_petty_cash_claims (
    claim_no VARCHAR(50) PRIMARY KEY, -- Format: EmployeeID + DDMMYYHHMMSS
    emp_id VARCHAR(50) NOT NULL,
    project_id BIGINT REFERENCES tbl_petty_cash_projects(project_id),
    branch_id INT REFERENCES tbl_branches(branch_id),
    category_code VARCHAR(20) REFERENCES tbl_petty_cash_categories(category_code),
    expense_date DATE NOT NULL,
    invoice_no VARCHAR(100) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    reasons TEXT NOT NULL,
    attachment_path TEXT,
    current_status VARCHAR(30) NOT NULL DEFAULT 'Pending', -- Pending, In-Progress, Approved, Send Back, Rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tbl_claim_approval_history (
    history_id BIGINT PRIMARY KEY,
    claim_no VARCHAR(50) REFERENCES tbl_petty_cash_claims(claim_no) ON DELETE CASCADE,
    approver_id VARCHAR(50) NOT NULL,
    approver_name VARCHAR(100),
    approval_level VARCHAR(20) NOT NULL, -- Level 0, Level 1, Level 2
    action_taken VARCHAR(30) NOT NULL, -- Initiated, Approve, Send Back, Reject
    remarks TEXT,
    action_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tbl_account_ledger (
    ledger_id BIGINT PRIMARY KEY,
    project_id BIGINT REFERENCES tbl_petty_cash_projects(project_id),
    branch_id INT REFERENCES tbl_branches(branch_id),
    year INT NOT NULL,
    month VARCHAR(20) NOT NULL,
    monthly_limit DECIMAL(12,2) NOT NULL,
    opening_balance DECIMAL(12,2) NOT NULL,
    spend DECIMAL(12,2) DEFAULT 0.00,
    claim_raised DECIMAL(12,2) DEFAULT 0.00,
    ending_balance DECIMAL(12,2) NOT NULL
);

ALTER TABLE tbl_petty_cash_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon full access to tbl_petty_cash_projects" ON tbl_petty_cash_projects FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE tbl_petty_cash_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon full access to tbl_petty_cash_categories" ON tbl_petty_cash_categories FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE tbl_petty_cash_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon full access to tbl_petty_cash_claims" ON tbl_petty_cash_claims FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE tbl_claim_approval_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon full access to tbl_claim_approval_history" ON tbl_claim_approval_history FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE tbl_account_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon full access to tbl_account_ledger" ON tbl_account_ledger FOR ALL USING (true) WITH CHECK (true);


