-- Row Level Security (optional layer — Electron main process uses postgres role which bypasses RLS)
-- Enable for future web/mobile clients using Supabase Auth + anon key

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE coa_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- Service role / postgres connection bypasses RLS.
-- Authenticated desktop sessions use main-process postgres — same bypass.

CREATE POLICY IF NOT EXISTS "service_role_all_employees" ON employees
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "service_role_all_attendance" ON attendance_logs
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "service_role_all_users" ON users
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "service_role_all_payroll_periods" ON payroll_periods
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "service_role_all_payroll_records" ON payroll_records
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "service_role_all_coa" ON coa_accounts
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "service_role_all_vouchers" ON journal_vouchers
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "service_role_all_entries" ON journal_entries
  FOR ALL USING (true) WITH CHECK (true);

-- Realtime for attendance (Supabase dashboard: enable replication on attendance_logs if needed)
-- ALTER PUBLICATION supabase_realtime ADD TABLE attendance_logs;
