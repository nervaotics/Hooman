-- Hooman HRM — Postgres schema (mirrors Knex MySQL migrations 001–014)
-- Run in Supabase SQL Editor or via scripts/apply-supabase-schema.cjs

CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(255) UNIQUE,
  head_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  employee_code VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  cnic VARCHAR(255) UNIQUE,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(255),
  photo_url VARCHAR(255),
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  designation_id INTEGER,
  employment_type VARCHAR(255) DEFAULT 'full-time',
  status VARCHAR(255) DEFAULT 'active',
  date_of_joining DATE,
  date_of_birth DATE,
  gender VARCHAR(255),
  blood_group VARCHAR(255),
  address TEXT,
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(255),
  basic_salary DECIMAL(12, 2),
  reporting_manager_id INTEGER,
  name VARCHAR(255),
  employee_type VARCHAR(255),
  father_husband_name VARCHAR(255),
  marital_status VARCHAR(255),
  religion VARCHAR(255),
  cnic_number VARCHAR(255),
  cnic_issue_date DATE,
  cnic_expiry_date DATE,
  phone_number VARCHAR(255),
  emergency_contact VARCHAR(255),
  address_street VARCHAR(255),
  address_city VARCHAR(255),
  release_date DATE,
  is_deleted BOOLEAN DEFAULT FALSE,
  punch_code VARCHAR(32) UNIQUE,
  eobi_number VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS areas (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(255) UNIQUE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_postings (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  area_id INTEGER REFERENCES areas(id) ON DELETE SET NULL,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  joining_date DATE,
  release_date DATE,
  is_current BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employment_history (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company VARCHAR(255) NOT NULL,
  period_from DATE NOT NULL,
  period_to DATE,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS salary_structure (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  effective_from DATE NOT NULL,
  effective_to DATE,
  basic_salary DECIMAL(12, 2) NOT NULL,
  house_rent_allowance DECIMAL(12, 2) DEFAULT 0,
  transport_allowance DECIMAL(12, 2) DEFAULT 0,
  medical_allowance DECIMAL(12, 2) DEFAULT 0,
  special_allowance DECIMAL(12, 2) DEFAULT 0,
  gross_salary DECIMAL(12, 2),
  is_current BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance_logs (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(255),
  employee_device_id VARCHAR(255),
  employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
  punch_time TIMESTAMPTZ NOT NULL,
  punch_type INTEGER,
  is_manual_override BOOLEAN DEFAULT FALSE,
  override_reason TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (device_id, employee_device_id, punch_time)
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type VARCHAR(255),
  start_date DATE,
  end_date DATE,
  days_count INTEGER,
  reason TEXT,
  status VARCHAR(255) DEFAULT 'pending',
  approved_by INTEGER,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payroll_runs (
  id SERIAL PRIMARY KEY,
  period_month VARCHAR(255),
  status VARCHAR(255) DEFAULT 'draft',
  processed_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payroll_slips (
  id SERIAL PRIMARY KEY,
  payroll_run_id INTEGER NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  basic_salary DECIMAL(12, 2),
  allowances DECIMAL(12, 2) DEFAULT 0,
  overtime_amount DECIMAL(12, 2) DEFAULT 0,
  deductions DECIMAL(12, 2) DEFAULT 0,
  tax DECIMAL(12, 2) DEFAULT 0,
  net_salary DECIMAL(12, 2),
  days_present INTEGER,
  days_absent INTEGER,
  leaves_taken INTEGER,
  breakdown JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_postings (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  department_id INTEGER,
  description TEXT,
  status VARCHAR(255) DEFAULT 'open',
  closing_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS applicants (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(255),
  resume_url VARCHAR(255),
  stage VARCHAR(255) DEFAULT 'applied',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
  username VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(255) DEFAULT 'hr_staff',
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  permissions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payroll_periods (
  id SERIAL PRIMARY KEY,
  period_name VARCHAR(255) NOT NULL,
  period_month INTEGER NOT NULL,
  period_year INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  payroll_date DATE NOT NULL,
  status VARCHAR(255) DEFAULT 'Draft',
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payroll_records (
  id SERIAL PRIMARY KEY,
  payroll_period_id INTEGER NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  salary_structure_id INTEGER REFERENCES salary_structure(id) ON DELETE SET NULL,
  basic_salary INTEGER DEFAULT 0,
  allowances INTEGER DEFAULT 0,
  gross_salary INTEGER DEFAULT 0,
  provident_fund INTEGER DEFAULT 0,
  income_tax INTEGER DEFAULT 0,
  leave_deduction INTEGER DEFAULT 0,
  working_days INTEGER DEFAULT 26,
  present_days INTEGER DEFAULT 0,
  leave_days INTEGER DEFAULT 0,
  net_salary INTEGER DEFAULT 0,
  total_deductions INTEGER DEFAULT 0,
  arrears INTEGER DEFAULT 0,
  deduction_amount INTEGER DEFAULT 0,
  other_deductions INTEGER DEFAULT 0,
  eobi_employee INTEGER DEFAULT 0,
  eobi_employer INTEGER DEFAULT 0,
  sessi_employer INTEGER DEFAULT 0,
  status VARCHAR(255) DEFAULT 'Draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (payroll_period_id, employee_id)
);

CREATE TABLE IF NOT EXISTS payroll_statutory_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  eobi_wage_ceiling_pkr INTEGER DEFAULT 37000,
  sessi_minimum_wage_pkr INTEGER DEFAULT 40000,
  sessi_maximum_wage_pkr INTEGER DEFAULT 45000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO payroll_statutory_settings (id, eobi_wage_ceiling_pkr, sessi_minimum_wage_pkr, sessi_maximum_wage_pkr)
VALUES (1, 37000, 40000, 45000)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS coa_accounts (
  id SERIAL PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  account_type VARCHAR(32) NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'income', 'expense')),
  parent_id INTEGER REFERENCES coa_accounts(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  opening_balance DECIMAL(14, 2) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journal_vouchers (
  id SERIAL PRIMARY KEY,
  voucher_no VARCHAR(64) NOT NULL UNIQUE,
  voucher_type VARCHAR(8) NOT NULL CHECK (voucher_type IN ('RV', 'PV', 'JV', 'PC')),
  voucher_date DATE NOT NULL,
  narration TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'voided')),
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id SERIAL PRIMARY KEY,
  voucher_id INTEGER NOT NULL REFERENCES journal_vouchers(id) ON DELETE CASCADE,
  account_id INTEGER NOT NULL REFERENCES coa_accounts(id) ON DELETE RESTRICT,
  debit DECIMAL(14, 2) NOT NULL DEFAULT 0,
  credit DECIMAL(14, 2) NOT NULL DEFAULT 0,
  line_narration TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO coa_accounts (code, name, account_type, is_active, opening_balance)
VALUES
  ('1000', 'Cash in Hand', 'asset', TRUE, 0),
  ('1010', 'Bank Account', 'asset', TRUE, 0),
  ('1020', 'Petty Cash', 'asset', TRUE, 0),
  ('1100', 'Accounts Receivable', 'asset', TRUE, 0),
  ('1200', 'Inventory', 'asset', TRUE, 0),
  ('1500', 'Fixed Assets', 'asset', TRUE, 0),
  ('2000', 'Accounts Payable', 'liability', TRUE, 0),
  ('2100', 'Accrued Expenses', 'liability', TRUE, 0),
  ('2200', 'Tax Payable', 'liability', TRUE, 0),
  ('3000', 'Owner''s Equity', 'equity', TRUE, 0),
  ('3100', 'Retained Earnings', 'equity', TRUE, 0),
  ('4000', 'Sales Revenue', 'income', TRUE, 0),
  ('4100', 'Service Revenue', 'income', TRUE, 0),
  ('4200', 'Other Income', 'income', TRUE, 0),
  ('5000', 'Salaries & Wages', 'expense', TRUE, 0),
  ('5100', 'Rent Expense', 'expense', TRUE, 0),
  ('5200', 'Utilities Expense', 'expense', TRUE, 0),
  ('5300', 'Office Supplies', 'expense', TRUE, 0),
  ('5400', 'Miscellaneous Expense', 'expense', TRUE, 0)
ON CONFLICT (code) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_attendance_logs_punch_time ON attendance_logs(punch_time);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_employee_id ON attendance_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_punch_code ON employees(punch_code);
CREATE INDEX IF NOT EXISTS idx_employees_is_deleted ON employees(is_deleted);
