import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jvwuyrydfzufyxtswwis.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2d3V5cnlkZnp1Znl4dHN3d2lzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MTk1MjQsImV4cCI6MjEwMDI5NTUyNH0.l-cOdn7nWmfxBYaCIR2Ow9gfAjVtz90_qhlp5o7WJIw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function clearData() {
  console.log('Clearing Supabase tables...');

  // 1. Attendance Logs
  const { error: aErr } = await supabase.from('tbl_attendance_logs').delete().neq('emp_id', '___NON_EXISTENT___');
  console.log('tbl_attendance_logs delete status:', aErr ? aErr.message : 'SUCCESS');

  // 2. Regularization Requests
  const { error: rErr } = await supabase.from('tbl_regularization_requests').delete().neq('emp_id', '___NON_EXISTENT___');
  console.log('tbl_regularization_requests delete status:', rErr ? rErr.message : 'SUCCESS');

  // 3. Leave Entries
  const { error: lErr } = await supabase.from('tbl_leave_entries').delete().neq('emp_id', '___NON_EXISTENT___');
  console.log('tbl_leave_entries delete status:', lErr ? lErr.message : 'SUCCESS');

  // 4. SOS Events
  const { error: sErr } = await supabase.from('tbl_sos_events').delete().neq('branch_id', -999);
  console.log('tbl_sos_events delete status:', sErr ? sErr.message : 'SUCCESS');

  // 5. Employees
  const { error: eErr } = await supabase.from('tbl_employees').delete().neq('emp_id', '___NON_EXISTENT___');
  console.log('tbl_employees delete status:', eErr ? eErr.message : 'SUCCESS');

  console.log('Done clearing database!');
}

clearData();
