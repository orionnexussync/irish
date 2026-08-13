import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, UserPlus, Users, CalendarOff, Edit3, Clock, Calendar,
  Mail, Cake, ShieldAlert, CheckCircle2, XCircle, Search, Trash2, Download, Send, Plus, RefreshCw, FileText,
  MapPin, ToggleLeft, ToggleRight, Lock, Printer, Eye, FileSpreadsheet, RotateCcw, Archive, Building, LogOut
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { api } from '../services/supabase';

export function AdminPortal({ selectedBranchId, onLockAdmin, onBranchesUpdated, onCompanyLogout }) {
  // Admin Tabs: 'DASHBOARD' | 'REPORTS' | 'ONBOARDING' | 'DIRECTORY' | 'LEAVES' | 'REGULARIZATION' | 'SHIFTS' | 'HOLIDAYS' | 'LOCATIONS' | 'EMAIL_SCHEDULES' | 'BIRTHDAYS' | 'SOS_LOGS' | 'COMPANIES'
  const [activeTab, setActiveTab] = useState('DASHBOARD');

  // Master Data States
  const [branches, setBranches] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [sosLogs, setSosLogs] = useState([]);
  const [emailSchedules, setEmailSchedules] = useState([]);
  const [regularizationReqs, setRegularizationReqs] = useState([]);
  const [bdaySettings, setBdaySettings] = useState({});

  // Multi-Company Connection States (Option 2)
  const [companyProfiles, setCompanyProfiles] = useState([]);
  const [activeCompany, setActiveCompanyState] = useState({});
  const [companyForm, setCompanyForm] = useState({
    company_id: null,
    company_name: '',
    supabase_url: '',
    supabase_anon_key: ''
  });
  const [testingConn, setTestingConn] = useState(false);
  const [connResult, setConnResult] = useState(null);

  // Filter States
  const [branchFilter, setBranchFilter] = useState(selectedBranchId || 'ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'
  const [searchQuery, setSearchQuery] = useState('');

  // Report Filter States
  const [reportType, setReportType] = useState('DAILY'); // 'DAILY' | 'MONTHLY' | 'LATE' | 'LEAVE'
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().substring(0, 7));
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Form States (Onboarding)
  const [onboardForm, setOnboardForm] = useState({
    emp_id: '', first_name: '', last_name: '', email: '', mobile_no: '',
    branch_id: 1, department: 'Engineering', designation: 'Software Engineer',
    date_of_birth: '1995-05-15', date_of_joining: new Date().toISOString().split('T')[0],
    is_active: true
  });
  const [onboardError, setOnboardError] = useState('');

  // Form States (Direct Leave Entry)
  const [leaveForm, setLeaveForm] = useState({
    emp_id: '', leave_type: 'Sick Leave',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    duration_days: 1,
    reason: ''
  });

  // Form States (Location / Branch Management)
  const [branchForm, setBranchForm] = useState({
    branch_id: null,
    branch_name: '',
    location_code: '',
    address: '',
    manager_name: '',
    manager_phone: '',
    is_active: true
  });

  // Form States (Direct Regularization)
  const [regForm, setRegForm] = useState({
    emp_id: '', date_stamp: new Date().toISOString().split('T')[0], shift_id: 1,
    action: 'PRESENT', in_time: '09:00:00', out_time: '18:00:00', remarks: ''
  });

  // Form States (Shift Maintenance)
  const [shiftForm, setShiftForm] = useState({
    shift_id: null, shift_name: 'Custom Shift', start_time: '09:00', end_time: '18:00',
    grace_period_m: 15, half_day_threshold_h: 4, branch_scope: 'ALL'
  });

  // Form States (Holiday Maintenance)
  const [holidayForm, setHolidayForm] = useState({
    holiday_date: new Date().toISOString().split('T')[0],
    holiday_description: '',
    recurring_type: 'YEARLY',
    branch_id: 'ALL'
  });

  // Form States (Email Schedule)
  const [emailForm, setEmailForm] = useState({
    schedule_id: null, config_name: 'Daily Operations Report', recipient_emails: 'manager1@company.com',
    target_branch_id: 1, report_type: 'DAILY_ATTENDANCE', export_format: 'XLSX',
    dispatch_frequency: 'Daily', dispatch_time: '07:00 PM', is_active: true
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    await api.syncWithSupabase();
    setBranches(api.getBranches());
    setShifts(api.getShifts());
    setEmployees(api.getEmployees());
    setAttendanceLogs(api.getAttendanceLogs());
    setLeaves(api.getLeaves());
    setHolidays(api.getHolidays());
    setSosLogs(api.getSosLogs());
    setEmailSchedules(api.getEmailSchedules());
    setRegularizationReqs(api.getRegularizationRequests());
    setBdaySettings(api.getBdaySettings());
    setCompanyProfiles(api.getCompanyProfiles());
    setActiveCompanyState(api.getActiveCompany());
  };

  // Handlers for Multi-Company Connections (Option 2)
  const handleTestCompanyConnection = async () => {
    if (!companyForm.supabase_url || !companyForm.supabase_anon_key) {
      alert('Supabase Project URL and Anon API Key are required to test connection');
      return;
    }
    setTestingConn(true);
    setConnResult(null);
    const res = await api.testCompanyConnection(companyForm.supabase_url, companyForm.supabase_anon_key);
    setTestingConn(false);
    setConnResult(res);
  };

  const handleSaveCompanyProfile = async (e) => {
    e.preventDefault();
    if (!companyForm.company_name || !companyForm.supabase_url || !companyForm.supabase_anon_key) {
      alert('Company Name, Supabase URL, and Anon API Key are required');
      return;
    }
    try {
      const updated = await api.saveCompanyProfile(companyForm);
      setCompanyProfiles(updated);
      const active = api.getActiveCompany();
      setActiveCompanyState(active);
      setCompanyForm({ company_id: null, company_name: '', supabase_url: '', supabase_anon_key: '' });
      setConnResult(null);
      await loadAllData();
      if (onBranchesUpdated) onBranchesUpdated();
      alert(`✅ Company Connection saved! Connected to database for ${active.company_name}.`);
    } catch (err) {
      alert('Error saving company profile: ' + err.message);
    }
  };

  const handleSelectActiveCompany = async (companyObj) => {
    try {
      await api.setActiveCompany(companyObj);
      setActiveCompanyState(companyObj);
      await loadAllData();
      if (onBranchesUpdated) onBranchesUpdated();
      alert(`🔄 Switched active database connection to ${companyObj.company_name}!`);
    } catch (err) {
      alert('Error switching company: ' + err.message);
    }
  };

  const handleDeleteCompanyProfile = async (companyId) => {
    if (!window.confirm('Are you sure you want to remove this company connection profile?')) return;
    try {
      const updated = await api.deleteCompanyProfile(companyId);
      setCompanyProfiles(updated);
      setActiveCompanyState(api.getActiveCompany());
      await loadAllData();
      if (onBranchesUpdated) onBranchesUpdated();
      alert('Company connection profile removed.');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCopySqlScript = () => {
    const sqlText = `-- RFAP SUPABASE DATABASE DDL SCHEMA SCRIPT
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS tbl_branches (
    branch_id SERIAL PRIMARY KEY,
    branch_name VARCHAR(150) NOT NULL,
    location_code VARCHAR(50) NOT NULL UNIQUE,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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
    face_embedding JSONB DEFAULT NULL,
    send_bday_wish BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tbl_shifts (
    shift_id SERIAL PRIMARY KEY,
    shift_name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    grace_period_m INT DEFAULT 15,
    half_day_threshold_h INT DEFAULT 4,
    branch_scope VARCHAR(50) DEFAULT 'ALL',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tbl_attendance_logs (
    log_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    emp_id VARCHAR(50) NOT NULL REFERENCES tbl_employees(emp_id) ON DELETE CASCADE,
    branch_id INT NOT NULL REFERENCES tbl_branches(branch_id),
    shift_id INT REFERENCES tbl_shifts(shift_id),
    date_stamp DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in_time TIME,
    check_out_time TIME,
    in_face_confidence DECIMAL(5,2),
    out_face_confidence DECIMAL(5,2),
    gps_lat DECIMAL(10,8),
    gps_long DECIMAL(11,8),
    is_late BOOLEAN DEFAULT FALSE,
    is_half_day BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'PRESENT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tbl_leave_entries (
    leave_id SERIAL PRIMARY KEY,
    emp_id VARCHAR(50) NOT NULL REFERENCES tbl_employees(emp_id) ON DELETE CASCADE,
    leave_date DATE NOT NULL,
    leave_type VARCHAR(50) NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tbl_holidays (
    holiday_id SERIAL PRIMARY KEY,
    holiday_date DATE NOT NULL,
    holiday_description VARCHAR(255) NOT NULL,
    recurring_type VARCHAR(20) DEFAULT 'YEARLY',
    branch_id VARCHAR(50) DEFAULT 'ALL',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tbl_sos_events (
    event_id SERIAL PRIMARY KEY,
    emp_id VARCHAR(50),
    emp_name VARCHAR(150),
    raised_by VARCHAR(50) DEFAULT 'KIOSK_PANIC_BUTTON',
    branch_id INT REFERENCES tbl_branches(branch_id),
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    location_gps TEXT,
    reason TEXT DEFAULT 'Reception Kiosk Emergency SOS Hold Triggered',
    status VARCHAR(20) DEFAULT 'OPEN'
);

-- ENABLE ROW LEVEL SECURITY (RLS) & SET PERMISSIVE ANON POLICIES
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
`;
    navigator.clipboard.writeText(sqlText);
    alert('📋 1-Click Supabase DDL SQL Schema script with RLS ENABLED copied to clipboard!');
  };

  // Helper to calculate leave duration days automatically
  const updateLeaveDates = (start, end) => {
    let validEnd = end;
    if (start && end && end < start) {
      validEnd = start;
    }
    const d1 = new Date(start);
    const d2 = new Date(validEnd);
    let diffDays = 1;
    if (!isNaN(d1) && !isNaN(d2) && d2 >= d1) {
      diffDays = Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
    }
    setLeaveForm(prev => ({
      ...prev,
      start_date: start,
      end_date: validEnd,
      duration_days: diffDays
    }));
  };

  // =============================================================================
  // ACTION HANDLERS
  // =============================================================================

  // Location / Branch Actions (Instant Refetch & State Refresh)
  const handleToggleBranchActive = async (branchId) => {
    const updated = await api.toggleBranchActive(branchId);
    const freshBranches = updated || api.getBranches();
    setBranches([...freshBranches]);
    await loadAllData();
    if (onBranchesUpdated) onBranchesUpdated();
  };

  const handleSaveBranch = async (e) => {
    e.preventDefault();
    if (!branchForm.branch_name || !branchForm.location_code) {
      alert('Branch Name and Location Code are required');
      return;
    }
    try {
      const updated = await api.saveBranch(branchForm);
      const freshBranches = updated || api.getBranches();
      setBranches([...freshBranches]);
      setBranchForm({
        branch_id: null, branch_name: '', location_code: '', address: '', manager_name: '', manager_phone: '', is_active: true
      });
      await loadAllData();
      if (onBranchesUpdated) onBranchesUpdated();
      alert('✅ Branch location saved successfully! Data table refreshed instantly.');
    } catch (err) {
      alert('Error saving branch: ' + err.message);
    }
  };

  // Onboarding Submit
  const handleOnboardSubmit = async (e) => {
    e.preventDefault();
    setOnboardError('');

    const dob = new Date(onboardForm.date_of_birth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;

    if (age < 18) {
      setOnboardError('Validation Error: Employee age must be at least 18 years old.');
      return;
    }

    try {
      await api.saveEmployee({ ...onboardForm, face_embedding: null });
      alert('Employee Profile successfully saved! Pending face scan enrollment at Kiosk.');
      setOnboardForm({
        emp_id: '', first_name: '', last_name: '', email: '', mobile_no: '',
        branch_id: 1, department: 'Engineering', designation: 'Software Engineer',
        date_of_birth: '1995-05-15', date_of_joining: new Date().toISOString().split('T')[0],
        is_active: true
      });
      await loadAllData();
      setActiveTab('DIRECTORY');
    } catch (err) {
      setOnboardError(err.message);
    }
  };

  // Helper for Native Mobile APK & Web Excel File Downloads
  const downloadExcelWorkbook = async (wb, fileName) => {
    try {
      const b64Data = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });

      if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        try {
          const res = await Filesystem.writeFile({
            path: fileName,
            data: b64Data,
            directory: Directory.Documents,
            recursive: true
          });
          alert(`✅ File Saved to Mobile Documents Folder!\n\nFile Name: ${fileName}\nPath: ${res.uri || 'Documents/' + fileName}`);
          return;
        } catch (fsErr) {
          console.warn('Filesystem.writeFile Documents error, trying Cache:', fsErr);
          const cacheRes = await Filesystem.writeFile({
            path: fileName,
            data: b64Data,
            directory: Directory.Cache,
            recursive: true
          });
          alert(`✅ File Saved to Mobile Storage:\n${cacheRes.uri || fileName}`);
          return;
        }
      }

      const dataUri = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${b64Data}`;
      const link = document.createElement('a');
      link.href = dataUri;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      alert(`✅ Sample Excel Template Downloaded: ${fileName}`);
    } catch (err) {
      console.error('Mobile Excel export error:', err);
      try {
        XLSX.writeFile(wb, fileName);
      } catch (e) {
        alert('Error saving Excel file: ' + err.message);
      }
    }
  };

  // Test Case 04: Excel Bulk Upload & Sample Template Generator (Mobile APK Native Filesystem Compatible)
  const handleDownloadSampleExcel = async () => {
    const sampleData = [
      {
        emp_id: 'EMP-2001',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@company.com',
        mobile_no: '+1 555-019-1001',
        department: 'Operations',
        designation: 'Executive',
        date_of_birth: '1996-04-12',
        date_of_joining: '2024-01-15'
      },
      {
        emp_id: 'EMP-2002',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane.smith@company.com',
        mobile_no: '+1 555-019-1002',
        department: 'Sales',
        designation: 'Manager',
        date_of_birth: '1992-08-22',
        date_of_joining: '2023-06-10'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sample_Employees');
    const fileName = 'RFAP_Employee_Import_Template.xlsx';
    await downloadExcelWorkbook(wb, fileName);
  };

  const handleAdminExcelBulkUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rows = XLSX.utils.sheet_to_json(ws);

        let count = 0;
        let errors = [];

        for (const row of rows) {
          if (row.emp_id && row.first_name && row.last_name) {
            await api.saveEmployee({
              emp_id: String(row.emp_id).trim(),
              first_name: String(row.first_name).trim(),
              last_name: String(row.last_name).trim(),
              email: row.email || `${row.emp_id.toLowerCase()}@company.com`,
              mobile_no: row.mobile_no || '',
              department: row.department || 'Operations',
              designation: row.designation || 'Staff',
              date_of_birth: row.date_of_birth || '1995-01-01',
              date_of_joining: row.date_of_joining || new Date().toISOString().split('T')[0],
              branch_id: Number(selectedBranchId || 1),
              is_active: true,
              face_embedding: null
            });
            count++;
          } else {
            errors.push(row.emp_id || 'Invalid Row');
          }
        }

        alert(`Bulk Import Complete!\n- Successfully imported ${count} employee records.\n${errors.length > 0 ? `- Skipped ${errors.length} invalid rows.` : ''}`);
        await loadAllData();
        setActiveTab('DIRECTORY');
      } catch (err) {
        alert('Failed to parse Excel file: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Direct Leave Submit
  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    if (!leaveForm.emp_id) {
      alert('Please select an employee');
      return;
    }

    const startDate = leaveForm.start_date || new Date().toISOString().split('T')[0];
    let endDate = leaveForm.end_date || startDate;
    if (endDate < startDate) {
      endDate = startDate;
    }

    try {
      await api.addLeaveEntry({
        ...leaveForm,
        start_date: startDate,
        end_date: endDate,
        duration_days: Number(leaveForm.duration_days || 1)
      });
      alert('Direct Leave entry saved successfully!');
      setLeaveForm({
        emp_id: '', leave_type: 'Sick Leave',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        duration_days: 1, reason: ''
      });
      await loadAllData();
    } catch (err) {
      alert('Error saving leave entry: ' + err.message);
    }
  };

  // Holiday Actions
  const handleSaveHoliday = async (e) => {
    e.preventDefault();
    if (!holidayForm.holiday_description) {
      alert('Holiday Description is required');
      return;
    }
    try {
      await api.saveHoliday(holidayForm);
      alert('Holiday saved successfully!');
      setHolidayForm({
        holiday_date: new Date().toISOString().split('T')[0],
        holiday_description: '',
        recurring_type: 'YEARLY',
        branch_id: 'ALL'
      });
      await loadAllData();
    } catch (err) {
      alert('Error saving holiday: ' + err.message);
    }
  };

  const handleUpdateWeeklyOff = async (id, newScope) => {
    try {
      await api.updateWeeklyOffRule(id, newScope);
      alert('Weekly Off rule updated!');
      await loadAllData();
    } catch (err) {
      alert('Error updating rule: ' + err.message);
    }
  };

  const handleDeleteHoliday = async (id) => {
    if (!window.confirm('Delete this holiday rule?')) return;
    await api.deleteHoliday(id);
    await loadAllData();
  };

  // Direct Regularization Submit
  const handleRegSubmit = async (e) => {
    e.preventDefault();
    if (!regForm.emp_id || !regForm.remarks.trim()) {
      alert('Mandatory Remark is required for direct regularization audit trail.');
      return;
    }
    try {
      await api.directRegularize(regForm);
      alert('Direct Attendance Regularization applied!');
      setRegForm({ emp_id: '', date_stamp: new Date().toISOString().split('T')[0], shift_id: 1, action: 'PRESENT', in_time: '09:00:00', out_time: '18:00:00', remarks: '' });
      await loadAllData();
    } catch (err) {
      alert('Error applying regularization: ' + err.message);
    }
  };

  // Shift Maintenance Handlers (Add, Edit, Delete — Min 1, Max 10 Shifts)
  const handleShiftSubmit = async (e) => {
    e.preventDefault();
    if (!shiftForm.shift_name || !shiftForm.start_time || !shiftForm.end_time) {
      alert('Shift Name, Start Time, and End Time are mandatory.');
      return;
    }
    if (!shiftForm.shift_id && shifts.length >= 10) {
      alert('Shift Limit Reached: System allows a maximum of 10 shifts. Please edit or delete an existing shift.');
      return;
    }
    try {
      const updatedShifts = await api.saveShift(shiftForm);
      setShifts(updatedShifts || api.getShifts());
      alert(shiftForm.shift_id ? 'Shift updated successfully!' : 'New Shift added successfully!');
      setShiftForm({ shift_id: null, shift_name: '', start_time: '09:00', end_time: '18:00', grace_period_m: 15, half_day_threshold_h: 4, branch_scope: 'ALL' });
      await loadAllData();
    } catch (err) {
      alert('Error saving shift: ' + err.message);
    }
  };

  const handleEditShift = (shift) => {
    setShiftForm({
      shift_id: shift.shift_id,
      shift_name: shift.shift_name,
      start_time: shift.start_time ? shift.start_time.substring(0, 5) : '09:00',
      end_time: shift.end_time ? shift.end_time.substring(0, 5) : '18:00',
      grace_period_m: shift.grace_period_m || 15,
      half_day_threshold_h: shift.half_day_threshold_h || 4,
      branch_scope: shift.branch_scope || 'ALL'
    });
  };

  const handleDeleteShift = async (shiftId) => {
    if (shifts.length <= 1) {
      alert('Minimum Limit Reached: At least 1 shift schedule must remain configured in the system.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this shift configuration?')) return;
    try {
      const updatedShifts = await api.deleteShift(shiftId);
      setShifts(updatedShifts || api.getShifts());
      await loadAllData();
      alert('Shift deleted successfully!');
    } catch (err) {
      alert('Error deleting shift: ' + err.message);
    }
  };

  // Email Schedule Submit
  const handleEmailScheduleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.saveEmailSchedule(emailForm);
      alert('Email report schedule configured successfully!');
      await loadAllData();
    } catch (err) {
      alert('Error saving schedule: ' + err.message);
    }
  };

  // SOS Resolve
  const handleResolveSos = async (eventId) => {
    if (window.confirm('Mark this Emergency SOS Alert as RESOLVED?')) {
      const updatedLogs = await api.resolveSos(eventId);
      setSosLogs(updatedLogs || api.getSosLogs());
      await loadAllData();
      alert('✅ SOS Incident status updated to RESOLVED.');
    }
  };

  // Filtered lists
  const filteredEmployees = employees.filter(e => {
    const matchesBranch = branchFilter === 'ALL' || String(e.branch_id) === String(branchFilter);
    const matchesSearch = searchQuery === '' ||
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.emp_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.email && e.email.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && e.is_active !== false) ||
      (statusFilter === 'INACTIVE' && e.is_active === false);
    return matchesBranch && matchesSearch && matchesStatus;
  });

  // Report Generator Helpers (Test Case 10: Duration Hours & Test Case 05: Inactive Archiving)
  const generateReportData = () => {
    if (reportType === 'DAILY') {
      // Include active employees AND archived/inactive employees who had logs on reportDate
      const targetEmployees = employees.filter(emp => {
        if (emp.is_active !== false) return true;
        return attendanceLogs.some(a => a.emp_id === emp.emp_id && a.date_stamp === reportDate);
      });

      const dailyRows = [];
      targetEmployees.forEach(emp => {
        const empLogsRaw = attendanceLogs.filter(a => a.emp_id === emp.emp_id && a.date_stamp === reportDate);
        // Deduplicate logs by shift_id and check_in_time to prevent duplicate rows in reports
        const seenKeys = new Set();
        const empLogs = [];
        empLogsRaw.forEach(log => {
          const timeStr = log.check_in_time ? new Date(log.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '---';
          const key = `${log.shift_id}_${timeStr}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            empLogs.push(log);
          }
        });
        const branch = branches.find(b => b.branch_id === emp.branch_id);

        if (empLogs.length === 0) {
          dailyRows.push({
            'Date': reportDate,
            'Employee ID': emp.emp_id,
            'Employee Name': `${emp.first_name} ${emp.last_name}`,
            'Department': emp.department || 'Operations',
            'Branch': branch ? branch.branch_name : 'Default HQ',
            'Check-In': '---',
            'Check-Out': '---',
            'Duration Hours': '---',
            'Attendance Status': 'ABSENT',
            'Active Status': emp.is_active !== false ? 'ACTIVE' : 'INACTIVE (ARCHIVED)',
            'Remarks': 'No Punch Log'
          });
        } else {
          empLogs.forEach(log => {
            let durationHoursStr = '---';
            if (log.check_in_time && log.check_out_time) {
              const inTime = new Date(log.check_in_time);
              const outTime = new Date(log.check_out_time);
              if (!isNaN(inTime) && !isNaN(outTime) && outTime >= inTime) {
                const diffMs = outTime - inTime;
                const hours = (diffMs / (1000 * 60 * 60)).toFixed(1);
                durationHoursStr = `${hours} hrs`;
              }
            }
            const shiftObj = shifts.find(s => Number(s.shift_id) === Number(log.shift_id));
            const shiftTitle = shiftObj ? shiftObj.shift_name : 'Standard Shift';

            dailyRows.push({
              'Date': reportDate,
              'Employee ID': emp.emp_id,
              'Employee Name': `${emp.first_name} ${emp.last_name}`,
              'Department': emp.department || 'Operations',
              'Branch': branch ? branch.branch_name : 'Default HQ',
              'Check-In': log.check_in_time ? new Date(log.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '---',
              'Check-Out': log.check_out_time ? new Date(log.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '---',
              'Duration Hours': durationHoursStr,
              'Attendance Status': log.attendance_status || 'PRESENT',
              'Active Status': emp.is_active !== false ? 'ACTIVE' : 'INACTIVE (ARCHIVED)',
              'Remarks': log.remarks ? `${shiftTitle}: ${log.remarks}` : shiftTitle
            });
          });
        }
      });
      return dailyRows;
    } else if (reportType === 'MONTHLY') {
      // Include active employees AND archived/inactive employees who had logs or leaves in reportMonth
      const targetEmployees = employees.filter(emp => {
        if (emp.is_active !== false) return true;
        const hasLogsInMonth = attendanceLogs.some(a => a.emp_id === emp.emp_id && a.date_stamp && a.date_stamp.startsWith(reportMonth));
        const hasLeavesInMonth = leaves.some(l => l.emp_id === emp.emp_id && l.start_date && l.start_date.startsWith(reportMonth));
        return hasLogsInMonth || hasLeavesInMonth;
      });

      return targetEmployees.map(emp => {
        const empLogs = attendanceLogs.filter(a => a.emp_id === emp.emp_id && a.date_stamp && a.date_stamp.startsWith(reportMonth));
        const presentCount = empLogs.filter(a => a.attendance_status === 'PRESENT' || a.attendance_status === 'REGULARIZED').length;
        const empLeaves = leaves.filter(l => l.emp_id === emp.emp_id && l.start_date && l.start_date.startsWith(reportMonth));
        const totalLeaveDays = empLeaves.reduce((acc, l) => acc + (Number(l.duration_days) || 1), 0);
        const branch = branches.find(b => b.branch_id === emp.branch_id);

        return {
          'Month': reportMonth,
          'Employee ID': emp.emp_id,
          'Employee Name': `${emp.first_name} ${emp.last_name}`,
          'Department': emp.department || 'Operations',
          'Branch': branch ? branch.branch_name : 'Default HQ',
          'Total Present Days': presentCount,
          'Total Leave Days': totalLeaveDays,
          'Active Status': emp.is_active !== false ? 'ACTIVE' : 'INACTIVE (ARCHIVED)'
        };
      });
    } else if (reportType === 'LEAVE') {
      return leaves.map(l => {
        const emp = employees.find(e => e.emp_id === l.emp_id);
        return {
          'Leave ID': l.leave_id,
          'Employee ID': l.emp_id,
          'Employee Name': emp ? `${emp.first_name} ${emp.last_name}` : l.emp_id,
          'Leave Type': l.leave_type,
          'Start Date': l.start_date,
          'End Date': l.end_date,
          'No. of Days': l.duration_days || 1,
          'Reason': l.reason || ''
        };
      });
    }
    return [];
  };

  const handleExportExcel = async () => {
    const data = generateReportData();
    if (data.length === 0) {
      alert('No data available to export.');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${reportType}_Report`);
    const fileName = `RFAP_${reportType}_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    await downloadExcelWorkbook(wb, fileName);
  };

  const handlePrintPdf = () => {
    setShowPrintModal(true);
    try {
      window.print();
    } catch (e) {
      console.warn('Window print notice:', e);
    }
  };

  return (
    <div className="admin-portal-wrapper">
      {/* Sidebar Navigation */}
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <ShieldAlert size={24} style={{ color: '#0284c7' }} />
          <span>System Admin</span>
        </div>

        <nav className="sidebar-menu">
          <button className={activeTab === 'DASHBOARD' ? 'active' : ''} onClick={() => setActiveTab('DASHBOARD')}>
            <LayoutDashboard size={18} /> Executive Dashboard
          </button>
          <button className={activeTab === 'REPORTS' ? 'active' : ''} onClick={() => setActiveTab('REPORTS')}>
            <FileText size={18} /> Attendance Reports
          </button>
          <button className={activeTab === 'LOCATIONS' ? 'active' : ''} onClick={() => setActiveTab('LOCATIONS')}>
            <MapPin size={18} /> Branch Locations
          </button>
          <button className={activeTab === 'ONBOARDING' ? 'active' : ''} onClick={() => setActiveTab('ONBOARDING')}>
            <UserPlus size={18} /> Add Employee Profile
          </button>
          <button className={activeTab === 'DIRECTORY' ? 'active' : ''} onClick={() => setActiveTab('DIRECTORY')}>
            <Users size={18} /> Employee Directory
          </button>
          <button className={activeTab === 'LEAVES' ? 'active' : ''} onClick={() => setActiveTab('LEAVES')}>
            <CalendarOff size={18} /> Direct Leave Entry
          </button>
          <button className={activeTab === 'REGULARIZATION' ? 'active' : ''} onClick={() => setActiveTab('REGULARIZATION')}>
            <Edit3 size={18} /> Missed Punch Approval
          </button>
          <button className={activeTab === 'SHIFTS' ? 'active' : ''} onClick={() => setActiveTab('SHIFTS')}>
            <Clock size={18} /> Shift Maintenance
          </button>
          <button className={activeTab === 'HOLIDAYS' ? 'active' : ''} onClick={() => setActiveTab('HOLIDAYS')}>
            <Calendar size={18} /> Holidays & Off Rules
          </button>
          <button className={activeTab === 'EMAIL_SCHEDULES' ? 'active' : ''} onClick={() => setActiveTab('EMAIL_SCHEDULES')}>
            <Mail size={18} /> Email Schedule Config
          </button>
          <button className={activeTab === 'BIRTHDAYS' ? 'active' : ''} onClick={() => setActiveTab('BIRTHDAYS')}>
            <Cake size={18} /> Birthday Celebrations
          </button>
          <button className={activeTab === 'SOS_LOGS' ? 'active' : ''} onClick={() => setActiveTab('SOS_LOGS')}>
            <ShieldAlert size={18} /> SOS Audit Logs
          </button>
          <button className={activeTab === 'COMPANIES' ? 'active' : ''} onClick={() => setActiveTab('COMPANIES')}>
            <Building size={18} /> Company Connections
          </button>
        </nav>

        {onLockAdmin && (
          <div style={{ padding: '16px', marginTop: 'auto', borderTop: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={onLockAdmin}
              style={{
                width: '100%',
                padding: '10px',
                background: '#475569',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontWeight: 600
              }}
            >
              <Lock size={16} /> Lock Admin Portal
            </button>

            {onCompanyLogout && (
              <button
                onClick={onCompanyLogout}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #ef4444',
                  color: '#f87171',
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontWeight: 600
                }}
              >
                <LogOut size={16} /> Sign Out Company
              </button>
            )}
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="admin-main-content">
        {/* TAB 1: EXECUTIVE DASHBOARD */}
        {activeTab === 'DASHBOARD' && (
          <div className="tab-content">
            <h2>System Executive Overview</h2>
            <div className="dashboard-stats-grid">
              <div className="stat-card">
                <span className="stat-label">Total Employees</span>
                <span className="stat-value">{employees.length}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Active Today</span>
                <span className="stat-value">{attendanceLogs.filter(a => a.date_stamp === new Date().toISOString().split('T')[0]).length}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">On Leave</span>
                <span className="stat-value">{leaves.length}</span>
              </div>
              <div className="stat-card alert">
                <span className="stat-label">Active SOS Alerts</span>
                <span className="stat-value">{sosLogs.filter(s => s.status === 'ACTIVE').length}</span>
              </div>
            </div>

            <div className="card-section" style={{ marginTop: 24 }}>
              <h3>Registered Branch Locations</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Branch ID</th>
                    <th>Branch Name</th>
                    <th>Code</th>
                    <th>Respective Manager</th>
                    <th>Contact Phone</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map(b => (
                    <tr key={b.branch_id}>
                      <td>#{b.branch_id}</td>
                      <td><strong>{b.branch_name}</strong></td>
                      <td>{b.location_code}</td>
                      <td>{b.manager_name}</td>
                      <td>{b.manager_phone}</td>
                      <td>
                        <span className={`status-pill ${b.is_active ? 'active' : 'inactive'}`}>
                          {b.is_active ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: REPORTS VIEWER */}
        {activeTab === 'REPORTS' && (
          <div className="tab-content">
            <h2>Daily & Monthly Attendance Reports</h2>
            <p className="tab-subtitle">Generate, view, and export detailed branch attendance and shift logs.</p>

            <div className="card-section" style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                  <label style={{ fontSize: 13, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Report Type:</label>
                  <select value={reportType} onChange={e => setReportType(e.target.value)} style={{ padding: '8px 12px', background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: 6 }}>
                    <option value="DAILY">Daily Attendance Summary</option>
                    <option value="MONTHLY">Monthly Employee Register</option>
                    <option value="LEAVE">Leave Log Detailed</option>
                  </select>
                </div>

                {reportType === 'DAILY' && (
                  <div>
                    <label style={{ fontSize: 13, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Select Date:</label>
                    <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} style={{ padding: '8px 12px', background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: 6 }} />
                  </div>
                )}

                {reportType === 'MONTHLY' && (
                  <div>
                    <label style={{ fontSize: 13, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Select Month:</label>
                    <input type="month" value={reportMonth} onChange={e => setReportMonth(e.target.value)} style={{ padding: '8px 12px', background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: 6 }} />
                  </div>
                )}

                <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
                  <button onClick={handleExportExcel} style={{ padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Download size={16} /> Export Excel (.xlsx)
                  </button>
                  <button onClick={handlePrintPdf} style={{ padding: '8px 16px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Printer size={16} /> Print / Save PDF
                  </button>
                </div>
              </div>
            </div>

            <div className="card-section">
              <table className="data-table">
                <thead>
                  {reportType === 'DAILY' && (
                    <tr>
                      <th>Date</th>
                      <th>Emp ID</th>
                      <th>Employee Name</th>
                      <th>Department</th>
                      <th>Branch</th>
                      <th>Check-In</th>
                      <th>Check-Out</th>
                      <th>Duration Hours</th>
                      <th>Status</th>
                      <th>Active Status</th>
                      <th>Remarks</th>
                    </tr>
                  )}
                  {reportType === 'MONTHLY' && (
                    <tr>
                      <th>Month</th>
                      <th>Emp ID</th>
                      <th>Employee Name</th>
                      <th>Department</th>
                      <th>Branch</th>
                      <th>Present Days</th>
                      <th>Leave Days</th>
                      <th>Status</th>
                    </tr>
                  )}
                  {reportType === 'LEAVE' && (
                    <tr>
                      <th>Leave ID</th>
                      <th>Emp ID</th>
                      <th>Employee Name</th>
                      <th>Type</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>No. of Days</th>
                      <th>Reason</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {generateReportData().map((row, idx) => (
                    <tr key={idx}>
                      {Object.values(row).map((val, i) => (
                        <td key={i}>{val}</td>
                      ))}
                    </tr>
                  ))}
                  {generateReportData().length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', color: '#94a3b8', padding: 20 }}>No report records found for selected period.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: LOCATION / BRANCH MANAGEMENT */}
        {activeTab === 'LOCATIONS' && (
          <div className="tab-content">
            <h2>Branch Location Configuration</h2>
            <p className="tab-subtitle">Enable or disable company branches and manage respective location managers.</p>

            <div className="form-card" style={{ marginBottom: 24 }}>
              <h3>Add / Edit Branch Location</h3>
              <form onSubmit={handleSaveBranch} className="grid-form">
                <div className="form-group">
                  <label>Branch Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Downtown HQ (#001)"
                    value={branchForm.branch_name}
                    onChange={e => setBranchForm({ ...branchForm, branch_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Location Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HQ-001"
                    value={branchForm.location_code}
                    onChange={e => setBranchForm({ ...branchForm, location_code: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Respective Manager Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Anita Roy"
                    value={branchForm.manager_name}
                    onChange={e => setBranchForm({ ...branchForm, manager_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Manager Contact Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. +1 555-010-1002"
                    value={branchForm.manager_phone}
                    onChange={e => setBranchForm({ ...branchForm, manager_phone: e.target.value })}
                  />
                </div>
                <div className="form-group full-width">
                  <label>Physical Address</label>
                  <input
                    type="text"
                    placeholder="100 Financial Center Blvd, Downtown"
                    value={branchForm.address}
                    onChange={e => setBranchForm({ ...branchForm, address: e.target.value })}
                  />
                </div>
                <div className="form-group full-width" style={{ marginTop: 8 }}>
                  <button type="submit" className="submit-btn" style={{ width: 'auto', padding: '10px 24px' }}>
                    <Plus size={16} /> Save Branch Location
                  </button>
                </div>
              </form>
            </div>

            <div className="card-section">
              <h3>Active Branches List</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Branch Name</th>
                    <th>Location Code</th>
                    <th>Respective Manager</th>
                    <th>Manager Phone</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map(b => (
                    <tr key={b.branch_id}>
                      <td>#{b.branch_id}</td>
                      <td><strong>{b.branch_name}</strong></td>
                      <td>{b.location_code}</td>
                      <td>{b.manager_name}</td>
                      <td>{b.manager_phone}</td>
                      <td>
                        <span className={`status-pill ${b.is_active ? 'active' : 'inactive'}`}>
                          {b.is_active ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleToggleBranchActive(b.branch_id)}
                          style={{
                            padding: '6px 12px',
                            background: b.is_active ? '#ef4444' : '#10b981',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 600
                          }}
                        >
                          {b.is_active ? 'Disable Branch' : 'Enable Branch'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: ADD EMPLOYEE PROFILE */}
        {activeTab === 'ONBOARDING' && (
          <div className="tab-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              <h2>Add Employee Profile</h2>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={handleDownloadSampleExcel} style={{ padding: '8px 16px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <Download size={15} /> Download Sample Excel Template (.xlsx)
                </button>
                <label style={{ padding: '8px 16px', background: '#10b981', color: '#fff', borderRadius: 6, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <FileSpreadsheet size={15} /> Bulk Excel Upload (.xlsx)
                  <input type="file" accept=".xlsx, .xls, .csv" onChange={handleAdminExcelBulkUpload} style={{ display: 'none' }} />
                </label>
              </div>
            </div>

            <div className="form-card">
              <form onSubmit={handleOnboardSubmit} className="grid-form">
                <div className="form-group">
                  <label>Employee ID *</label>
                  <input type="text" required placeholder="EMP-1008" value={onboardForm.emp_id} onChange={e => setOnboardForm({ ...onboardForm, emp_id: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>First Name *</label>
                  <input type="text" required placeholder="Alex" value={onboardForm.first_name} onChange={e => setOnboardForm({ ...onboardForm, first_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input type="text" required placeholder="Morgan" value={onboardForm.last_name} onChange={e => setOnboardForm({ ...onboardForm, last_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Corporate Email *</label>
                  <input type="email" required placeholder="alex.morgan@company.com" value={onboardForm.email} onChange={e => setOnboardForm({ ...onboardForm, email: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Mobile Number</label>
                  <input type="text" placeholder="+1 555-019-9988" value={onboardForm.mobile_no} onChange={e => setOnboardForm({ ...onboardForm, mobile_no: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Assigned Branch *</label>
                  <select value={onboardForm.branch_id} onChange={e => setOnboardForm({ ...onboardForm, branch_id: Number(e.target.value) })}>
                    {branches.map(b => (
                      <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <input type="text" value={onboardForm.department} onChange={e => setOnboardForm({ ...onboardForm, department: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Designation</label>
                  <input type="text" value={onboardForm.designation} onChange={e => setOnboardForm({ ...onboardForm, designation: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Date of Birth * (Age &gt;= 18)</label>
                  <input type="date" required value={onboardForm.date_of_birth} onChange={e => setOnboardForm({ ...onboardForm, date_of_birth: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Date of Joining</label>
                  <input type="date" value={onboardForm.date_of_joining} onChange={e => setOnboardForm({ ...onboardForm, date_of_joining: e.target.value })} />
                </div>

                {onboardError && <div className="error-alert full-width">{onboardError}</div>}

                <div className="form-group full-width" style={{ marginTop: 12 }}>
                  <button type="submit" className="submit-btn">Save Employee Profile</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 5: EMPLOYEE DIRECTORY */}
        {activeTab === 'DIRECTORY' && (
          <div className="tab-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
              <div>
                <h2>Employee Directory</h2>
                <p className="tab-subtitle">Manage company workforce, view biometric face status, and soft-delete/archive staff records.</p>
              </div>
              <div style={{ padding: '6px 14px', background: '#121215', border: '1px solid #334155', borderRadius: 20, fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8' }}>
                Total Active Staff: <strong>{employees.filter(e => e.is_active !== false).length}</strong> | Archived: <strong>{employees.filter(e => e.is_active === false).length}</strong>
              </div>
            </div>

            <div className="filter-bar" style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <input type="text" placeholder="Search by name, ID or email..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ padding: 10, background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: 6, flex: 1, minWidth: 200 }} />
              <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} style={{ padding: 10, background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: 6 }}>
                <option value="ALL">All Branches</option>
                {branches.map(b => (
                  <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
                ))}
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: 10, background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: 6 }}>
                <option value="ALL">All Staff Statuses</option>
                <option value="ACTIVE">Active Staff Only</option>
                <option value="INACTIVE">Archived / Inactive Only</option>
              </select>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Emp ID</th>
                  <th>Name</th>
                  <th>Branch</th>
                  <th>Department</th>
                  <th>Face Status</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map(emp => (
                  <tr key={emp.emp_id} style={{ opacity: emp.is_active !== false ? 1 : 0.65, background: emp.is_active !== false ? 'transparent' : 'rgba(239, 68, 68, 0.05)' }}>
                    <td><strong>{emp.emp_id}</strong></td>
                    <td>{emp.first_name} {emp.last_name}</td>
                    <td>{branches.find(b => b.branch_id === emp.branch_id)?.branch_name || 'Default HQ'}</td>
                    <td>{emp.department || 'Operations'}</td>
                    <td>
                      <span className={`status-pill ${emp.face_embedding ? 'active' : 'inactive'}`}>
                        {emp.face_embedding ? 'Enrolled 128D' : 'Pending'}
                      </span>
                    </td>
                    <td>
                      {emp.is_active !== false ? (
                        <button onClick={async () => { await api.toggleEmployeeActive(emp.emp_id); await loadAllData(); }} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }} title="Click to set Inactive">
                          <CheckCircle2 size={14} /> ACTIVE
                        </button>
                      ) : (
                        <span className="status-pill inactive" style={{ color: '#f87171', border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.1)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Archive size={12} /> INACTIVE (ARCHIVED)
                        </span>
                      )}
                    </td>
                    <td>
                      {emp.is_active !== false ? (
                        <button
                          onClick={async () => {
                            if (window.confirm(`Soft-delete & Archive employee ${emp.first_name} ${emp.last_name}? Status will be updated to Inactive and record migrated to Archive Table while retaining all historical monthly attendance logs.`)) {
                              await api.deleteEmployee(emp.emp_id);
                              await loadAllData();
                              alert(`Employee ${emp.first_name} ${emp.last_name} has been soft-deleted and moved to Archive Table.`);
                            }
                          }}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          title="Soft Delete & Migrate to Archive Table"
                        >
                          <Trash2 size={16} /> Archive / Soft Delete
                        </button>
                      ) : (
                        <button
                          onClick={async () => {
                            if (window.confirm(`Restore employee ${emp.first_name} ${emp.last_name} to Active Staff Directory?`)) {
                              await api.restoreEmployee(emp.emp_id);
                              await loadAllData();
                              alert(`Employee ${emp.first_name} ${emp.last_name} restored to Active Staff Directory.`);
                            }
                          }}
                          style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700 }}
                          title="Restore Employee to Active Directory"
                        >
                          <RotateCcw size={16} /> Restore
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredEmployees.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: 24 }}>No employee profiles found matching selected filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 6: DIRECT LEAVE ENTRY */}
        {activeTab === 'LEAVES' && (
          <div className="tab-content">
            <h2>Direct Leave Entry</h2>
            <div className="form-card">
              <form onSubmit={handleLeaveSubmit} className="grid-form">
                <div className="form-group">
                  <label>Select Employee *</label>
                  <select value={leaveForm.emp_id} onChange={e => setLeaveForm({ ...leaveForm, emp_id: e.target.value })}>
                    <option value="">-- Choose Employee --</option>
                    {employees.map(e => (
                      <option key={e.emp_id} value={e.emp_id}>{e.emp_id} - {e.first_name} {e.last_name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Leave Type *</label>
                  <select value={leaveForm.leave_type} onChange={e => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}>
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Casual Leave">Casual Leave</option>
                    <option value="Annual Leave">Annual Leave</option>
                    <option value="Unpaid Leave">Unpaid Leave</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Start Date *</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.start_date}
                    onChange={e => updateLeaveDates(e.target.value, leaveForm.end_date)}
                  />
                </div>
                <div className="form-group">
                  <label>End Date *</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.end_date}
                    onChange={e => updateLeaveDates(leaveForm.start_date, e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>No. of Days *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={leaveForm.duration_days}
                    onChange={e => setLeaveForm({ ...leaveForm, duration_days: Number(e.target.value) })}
                    style={{ background: '#0f172a', color: '#38bdf8', fontWeight: 'bold' }}
                  />
                </div>
                <div className="form-group full-width">
                  <label>Reason / Notes</label>
                  <input type="text" placeholder="Medical or Personal reasons" value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} />
                </div>
                <div className="form-group full-width" style={{ marginTop: 12 }}>
                  <button type="submit" className="submit-btn">Log Direct Leave</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 7: REGULARIZATION */}
        {activeTab === 'REGULARIZATION' && (
          <div className="tab-content">
            <h2>Missed Punch & Regularization Approval</h2>
            <div className="card-section">
              <h3>Pending Employee Kiosk Requests</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Req ID</th>
                    <th>Employee</th>
                    <th>Date</th>
                    <th>Punch Type</th>
                    <th>Time</th>
                    <th>Remarks</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {regularizationReqs.map(r => (
                    <tr key={r.request_id}>
                      <td>#{r.request_id}</td>
                      <td>{r.emp_name} ({r.emp_id})</td>
                      <td>{r.request_date}</td>
                      <td>{r.punch_type}</td>
                      <td>{r.requested_time}</td>
                      <td>{r.remarks}</td>
                      <td>
                        {r.status === 'PENDING' ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={async () => { await api.updateRegularizationStatus(r.request_id, 'APPROVED'); await loadAllData(); }} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 4, cursor: 'pointer' }}>Approve</button>
                            <button onClick={async () => { await api.updateRegularizationStatus(r.request_id, 'REJECTED'); await loadAllData(); }} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 4, cursor: 'pointer' }}>Reject</button>
                          </div>
                        ) : (
                          <span className={`status-pill ${r.status === 'APPROVED' ? 'active' : 'inactive'}`}>{r.status}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {regularizationReqs.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: 16 }}>No regularization requests pending.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 8: SHIFT MAINTENANCE */}
        {activeTab === 'SHIFTS' && (
          <div className="tab-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
              <div>
                <h2>Shift Maintenance</h2>
                <p className="tab-subtitle">Configure, edit, and delete employee work shift windows and late grace periods.</p>
              </div>
              <div style={{ padding: '6px 14px', background: '#121215', border: '1px solid #334155', borderRadius: 20, fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8' }}>
                Configured Shifts: <strong>{shifts.length} / 10</strong> (Min 1, Max 10)
              </div>
            </div>

            <div className="form-card" style={{ marginBottom: 24 }}>
              <h3>{shiftForm.shift_id ? `Edit Shift #${shiftForm.shift_id}` : 'Add New Shift Schedule'}</h3>
              <form onSubmit={handleShiftSubmit} className="grid-form">
                <div className="form-group">
                  <label>Shift Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Morning Shift / General Shift"
                    value={shiftForm.shift_name}
                    onChange={e => setShiftForm({ ...shiftForm, shift_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Start Time (24h) *</label>
                  <input
                    type="time"
                    required
                    value={shiftForm.start_time}
                    onChange={e => setShiftForm({ ...shiftForm, start_time: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>End Time (24h) *</label>
                  <input
                    type="time"
                    required
                    value={shiftForm.end_time}
                    onChange={e => setShiftForm({ ...shiftForm, end_time: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Grace Period (Minutes)</label>
                  <input
                    type="number"
                    min="0"
                    value={shiftForm.grace_period_m}
                    onChange={e => setShiftForm({ ...shiftForm, grace_period_m: Number(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label>Half-Day Threshold (Hours)</label>
                  <input
                    type="number"
                    min="1"
                    value={shiftForm.half_day_threshold_h}
                    onChange={e => setShiftForm({ ...shiftForm, half_day_threshold_h: Number(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label>Branch Scope</label>
                  <select value={shiftForm.branch_scope} onChange={e => setShiftForm({ ...shiftForm, branch_scope: e.target.value })}>
                    <option value="ALL">All Branches (Global)</option>
                    {branches.map(b => (
                      <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group full-width" style={{ marginTop: 8, display: 'flex', gap: 10 }}>
                  <button type="submit" className="submit-btn" style={{ width: 'auto', padding: '10px 24px' }}>
                    {shiftForm.shift_id ? <Edit3 size={16} /> : <Plus size={16} />}
                    {shiftForm.shift_id ? 'Update Shift' : 'Add Shift'}
                  </button>
                  {shiftForm.shift_id && (
                    <button
                      type="button"
                      onClick={() => setShiftForm({ shift_id: null, shift_name: '', start_time: '09:00', end_time: '18:00', grace_period_m: 15, half_day_threshold_h: 4, branch_scope: 'ALL' })}
                      style={{ padding: '10px 18px', background: '#475569', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="card-section">
              <h3>Configured Shift Schedules</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Shift ID</th>
                    <th>Shift Name</th>
                    <th>Start Time</th>
                    <th>End Time</th>
                    <th>Grace Period</th>
                    <th>Half-Day Threshold</th>
                    <th>Branch Scope</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shifts.map(s => (
                    <tr key={s.shift_id}>
                      <td>#{s.shift_id}</td>
                      <td><strong>{s.shift_name}</strong></td>
                      <td>{s.start_time}</td>
                      <td>{s.end_time}</td>
                      <td>{s.grace_period_m} mins</td>
                      <td>{s.half_day_threshold_h} hrs</td>
                      <td>{s.branch_scope === 'ALL' ? 'Global (All Branches)' : `Branch #${s.branch_scope}`}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => handleEditShift(s)}
                            style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer' }}
                            title="Edit Shift"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteShift(s.shift_id)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                            title="Delete Shift"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {shifts.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', color: '#94a3b8', padding: 20 }}>No shifts configured. Add a shift using the form above.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 9: HOLIDAYS & OFF RULES */}
        {activeTab === 'HOLIDAYS' && (
          <div className="tab-content">
            <h2>Holidays Calendar & Weekly Off Rules</h2>

            <div className="form-card" style={{ marginBottom: 24 }}>
              <h3>Add Custom Yearly Holiday Date</h3>
              <form onSubmit={handleSaveHoliday} className="grid-form">
                <div className="form-group">
                  <label>Holiday Date *</label>
                  <input
                    type="date"
                    required
                    value={holidayForm.holiday_date}
                    onChange={e => setHolidayForm({ ...holidayForm, holiday_date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Holiday Description *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Independence Day / Diwali"
                    value={holidayForm.holiday_description}
                    onChange={e => setHolidayForm({ ...holidayForm, holiday_description: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Target Branch</label>
                  <select value={holidayForm.branch_id} onChange={e => setHolidayForm({ ...holidayForm, branch_id: e.target.value })}>
                    <option value="ALL">All Branches (Global)</option>
                    {branches.map(b => (
                      <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group full-width" style={{ marginTop: 8 }}>
                  <button type="submit" className="submit-btn" style={{ width: 'auto', padding: '10px 24px' }}>
                    <Plus size={16} /> Save Holiday Date
                  </button>
                </div>
              </form>
            </div>

            <div className="card-section">
              <h3>Configured Holidays & Weekly Off Rules</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Type</th>
                    <th>Date / Day</th>
                    <th>Description</th>
                    <th>Rule Scope</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {holidays.map(h => (
                    <tr key={h.holiday_id}>
                      <td>#{h.holiday_id}</td>
                      <td><span className="status-pill active">{h.recurring_type}</span></td>
                      <td>{h.holiday_date || (h.day_of_week === 7 ? 'Sunday' : 'Saturday')}</td>
                      <td>{h.holiday_description}</td>
                      <td>
                        {h.recurring_type === 'WEEKLY' ? (
                          <select
                            value={h.rule_scope || 'ALL_SAT'}
                            onChange={e => handleUpdateWeeklyOff(h.holiday_id, e.target.value)}
                            style={{ padding: '4px 8px', background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: 4 }}
                          >
                            <option value="ALL_SUN">All Sundays Off</option>
                            <option value="ALL_SAT">All Saturdays Off</option>
                            <option value="SAT_2_4">2nd & 4th Saturday Off</option>
                          </select>
                        ) : 'Yearly Date'}
                      </td>
                      <td>
                        <button onClick={() => handleDeleteHoliday(h.holiday_id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 10: EMAIL SCHEDULES */}
        {activeTab === 'EMAIL_SCHEDULES' && (
          <div className="tab-content">
            <h2>Automated Email Report Dispatches</h2>
            <div className="form-card">
              <form onSubmit={handleEmailScheduleSubmit} className="grid-form">
                <div className="form-group">
                  <label>Config Name *</label>
                  <input type="text" required value={emailForm.config_name} onChange={e => setEmailForm({ ...emailForm, config_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Recipient Emails (Comma separated) *</label>
                  <input type="text" required value={emailForm.recipient_emails} onChange={e => setEmailForm({ ...emailForm, recipient_emails: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Dispatch Frequency</label>
                  <select value={emailForm.dispatch_frequency} onChange={e => setEmailForm({ ...emailForm, dispatch_frequency: e.target.value })}>
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Dispatch Time</label>
                  <input type="text" value={emailForm.dispatch_time} onChange={e => setEmailForm({ ...emailForm, dispatch_time: e.target.value })} />
                </div>
                <div className="form-group full-width" style={{ marginTop: 12 }}>
                  <button type="submit" className="submit-btn">Save Email Config</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 11: BIRTHDAYS */}
        {activeTab === 'BIRTHDAYS' && (
          <div className="tab-content">
            <h2>Birthday Greetings Settings</h2>
            <div className="card-section">
              <p>Configure automated birthday banner greetings for kiosk scans.</p>
            </div>
          </div>
        )}

        {/* TAB 12: SOS LOGS */}
        {activeTab === 'SOS_LOGS' && (
          <div className="tab-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
              <div>
                <h2>SOS Emergency Panic Audit</h2>
                <p className="tab-subtitle">Real-time emergency incident event log and panic alert audit trail.</p>
              </div>
              <div style={{ padding: '6px 14px', background: '#121215', border: '1px solid #ef4444', borderRadius: 20, fontSize: '0.85rem', fontWeight: 700, color: '#f87171' }}>
                Open Incidents: <strong>{sosLogs.filter(s => s.status === 'OPEN' || s.status === 'ACTIVE').length}</strong> | Total Logged: <strong>{sosLogs.length}</strong>
              </div>
            </div>

            <div className="card-section">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Alert ID</th>
                    <th>Branch</th>
                    <th>SOS Raised By</th>
                    <th>Location / GPS</th>
                    <th>Incident Reason</th>
                    <th>Timestamp</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sosLogs.map((s, idx) => {
                    const alertId = s.alert_id || s.event_id || idx + 1;
                    const branch = branches.find(b => Number(b.branch_id) === Number(s.branch_id));
                    const isOpen = s.status === 'OPEN' || s.status === 'ACTIVE';

                    return (
                      <tr key={alertId} style={{ background: isOpen ? 'rgba(239, 68, 68, 0.08)' : 'transparent' }}>
                        <td><strong>#{alertId}</strong></td>
                        <td>{branch ? branch.branch_name : `Branch #${s.branch_id || 1}`}</td>
                        <td>
                          <div><strong>{s.emp_name || s.emp_id || 'Kiosk Terminal'}</strong></div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ID: {s.emp_id || 'KIOSK'}</div>
                        </td>
                        <td>{s.location_gps || (branch ? branch.branch_name : 'HQ Entrance')}</td>
                        <td>{s.reason || 'Emergency SOS Triggered'}</td>
                        <td>{new Date(s.triggered_at || Date.now()).toLocaleString()}</td>
                        <td>
                          <span className={`status-pill ${isOpen ? 'inactive' : 'active'}`} style={{ color: isOpen ? '#f87171' : '#34d399', border: isOpen ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(16,185,129,0.5)' }}>
                            {isOpen ? '🚨 OPEN ALERT' : '✅ RESOLVED'}
                          </span>
                        </td>
                        <td>
                          {isOpen ? (
                            <button
                              onClick={() => handleResolveSos(alertId)}
                              style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
                            >
                              Resolve Alert
                            </button>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Resolved</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {sosLogs.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', color: '#94a3b8', padding: 24 }}>
                        No emergency SOS incident alerts logged.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 13: COMPANY CONNECTIONS (Option 2: Dedicated DB per Company) */}
        {activeTab === 'COMPANIES' && (
          <div className="tab-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
              <div>
                <h2>🏢 Multi-Company Database Connections</h2>
                <p className="tab-subtitle">Manage dedicated Supabase Database credentials for each subscriber company (Option 2 Architecture).</p>
              </div>
              <button
                onClick={handleCopySqlScript}
                style={{ padding: '10px 18px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Download size={16} /> Copy 1-Click Supabase DDL SQL Schema
              </button>
            </div>

            {/* Active Connected Database Banner */}
            <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', padding: 18, borderRadius: 12, border: '1px solid #0284c7', marginBottom: 20 }}>
              <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#38bdf8', fontWeight: 800 }}>
                Active Connected Company Database
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', marginTop: 4 }}>
                🏢 {activeCompany.company_name || 'Primary Enterprise'}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 4, fontFamily: 'monospace' }}>
                URL: {activeCompany.supabase_url}
              </div>
            </div>

            {/* Add / Edit Connection Form */}
            <div className="form-card" style={{ marginBottom: 24 }}>
              <h3>Add / Edit Subscriber Company Connection</h3>
              <form onSubmit={handleSaveCompanyProfile} className="grid-form" style={{ marginTop: 12 }}>
                <div className="form-group">
                  <label>Company Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Corporation"
                    value={companyForm.company_name}
                    onChange={e => setCompanyForm({ ...companyForm, company_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Company Access Code (Login Code for Client) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ACME"
                    style={{ textTransform: 'uppercase', fontWeight: 700 }}
                    value={companyForm.company_code || ''}
                    onChange={e => setCompanyForm({ ...companyForm, company_code: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="form-group full-width">
                  <label>Supabase Project URL *</label>
                  <input
                    type="url"
                    required
                    placeholder="https://your-project.supabase.co"
                    value={companyForm.supabase_url}
                    onChange={e => setCompanyForm({ ...companyForm, supabase_url: e.target.value })}
                  />
                </div>
                <div className="form-group full-width">
                  <label>Supabase Anon API Key *</label>
                  <input
                    type="text"
                    required
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={companyForm.supabase_anon_key}
                    onChange={e => setCompanyForm({ ...companyForm, supabase_anon_key: e.target.value })}
                  />
                </div>

                {connResult && (
                  <div className="form-group full-width" style={{ padding: 12, borderRadius: 8, background: connResult.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: connResult.success ? '#34d399' : '#f87171', border: connResult.success ? '1px solid #10b981' : '1px solid #ef4444', fontWeight: 600, fontSize: '0.9rem' }}>
                    {connResult.message}
                  </div>
                )}

                <div className="form-group full-width" style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={handleTestCompanyConnection}
                    disabled={testingConn}
                    style={{ padding: '10px 18px', background: '#334155', color: '#fff', border: '1px solid #475569', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {testingConn ? 'Testing Connection...' : '🔌 Test Database Connection'}
                  </button>
                  <button type="submit" className="submit-btn" style={{ flex: 1 }}>
                    Save & Activate Company Database
                  </button>
                </div>
              </form>
            </div>

            {/* Configured Companies List Table */}
            <div className="card-section">
              <h3>Configured Subscriber Companies ({companyProfiles.length})</h3>
              <table className="data-table" style={{ marginTop: 12 }}>
                <thead>
                  <tr>
                    <th>Login Code</th>
                    <th>Company Name</th>
                    <th>Supabase URL</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {companyProfiles.map(comp => {
                    const isActive = comp.company_id === activeCompany.company_id;
                    const code = comp.company_code || comp.company_id;
                    return (
                      <tr key={comp.company_id} style={{ background: isActive ? 'rgba(2, 132, 199, 0.08)' : 'transparent' }}>
                        <td><span style={{ background: '#0284c7', color: '#fff', padding: '4px 10px', borderRadius: 6, fontWeight: 800, fontFamily: 'monospace' }}>{code}</span></td>
                        <td><strong>{comp.company_name}</strong></td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{comp.supabase_url}</td>
                        <td>
                          <span className={`status-pill ${isActive ? 'active' : ''}`} style={{ color: isActive ? '#38bdf8' : '#94a3b8', border: isActive ? '1px solid #0284c7' : '1px solid #475569' }}>
                            {isActive ? '🟢 ACTIVE DATABASE' : '⚪ STANDBY'}
                          </span>
                        </td>
                        <td style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          {!isActive && (
                            <button
                              onClick={() => handleSelectActiveCompany(comp)}
                              style={{ padding: '6px 12px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
                            >
                              Switch To Database
                            </button>
                          )}
                          <button
                            onClick={() => setCompanyForm({
                              company_id: comp.company_id,
                              company_name: comp.company_name,
                              supabase_url: comp.supabase_url,
                              supabase_anon_key: comp.supabase_anon_key
                            })}
                            style={{ padding: '6px 12px', background: '#334155', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}
                          >
                            Edit
                          </button>
                          {companyProfiles.length > 1 && !isActive && (
                            <button
                              onClick={() => handleDeleteCompanyProfile(comp.company_id)}
                              style={{ padding: '6px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* MOBILE APK PRINTABLE PDF REPORT MODAL */}
      {showPrintModal && (
        <div className="printable-modal-overlay">
          <div className="printable-report-card">
            <div className="printable-header">
              <div>
                <h2 style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 800 }}>RFAP BIOMETRIC ATTENDANCE SYSTEM</h2>
                <p style={{ fontSize: '0.85rem', color: '#475569', marginTop: 2 }}>
                  Official {reportType} Attendance Audit Report — {reportType === 'DAILY' ? reportDate : reportMonth}
                </p>
              </div>
              <button
                onClick={() => setShowPrintModal(false)}
                style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}
              >
                ✕ Close
              </button>
            </div>

            <div style={{ display: 'flex', gap: 16, fontSize: '0.85rem', background: '#f8fafc', padding: '10px 14px', borderRadius: 8 }}>
              <div><strong>Generated Date:</strong> {new Date().toLocaleString()}</div>
              <div><strong>Total Records:</strong> {generateReportData().length}</div>
              <div><strong>Scope:</strong> {branchFilter === 'ALL' ? 'All Company Branches' : `Branch #${branchFilter}`}</div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="printable-table">
                <thead>
                  {reportType === 'DAILY' && (
                    <tr>
                      <th>Date</th>
                      <th>Emp ID</th>
                      <th>Employee Name</th>
                      <th>Department</th>
                      <th>Branch</th>
                      <th>Check-In</th>
                      <th>Check-Out</th>
                      <th>Duration Hours</th>
                      <th>Status</th>
                      <th>Active Status</th>
                      <th>Remarks</th>
                    </tr>
                  )}
                  {reportType === 'MONTHLY' && (
                    <tr>
                      <th>Month</th>
                      <th>Emp ID</th>
                      <th>Employee Name</th>
                      <th>Department</th>
                      <th>Branch</th>
                      <th>Present Days</th>
                      <th>Leave Days</th>
                      <th>Active Status</th>
                    </tr>
                  )}
                  {reportType === 'LEAVE' && (
                    <tr>
                      <th>Leave ID</th>
                      <th>Emp ID</th>
                      <th>Employee Name</th>
                      <th>Type</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>No. of Days</th>
                      <th>Reason</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {generateReportData().map((row, idx) => (
                    <tr key={idx}>
                      {Object.values(row).map((val, i) => (
                        <td key={i}>{val}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12, borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
              <button
                onClick={handleExportExcel}
                style={{ padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
              >
                <Download size={15} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Export Excel (.xlsx)
              </button>
              <button
                onClick={() => {
                  try {
                    const fileName = `RFAP_${reportType}_Report_${new Date().toISOString().split('T')[0]}.html`;
                    const cardContent = document.querySelector('.printable-report-card')?.outerHTML || '';
                    const fullHtml = `<!DOCTYPE html><html><head><title>RFAP Report</title><style>body{font-family:sans-serif;padding:24px;background:#f8fafc;color:#0f172a} .printable-table{width:100%;border-collapse:collapse;margin-top:16px} .printable-table th, .printable-table td{border:1px solid #cbd5e1;padding:8px 12px;text-align:left} .printable-table th{background:#f1f5f9;font-weight:700}</style></head><body>${cardContent}</body></html>`;
                    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = fileName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    alert(`✅ Report Saved as HTML: ${fileName}`);
                  } catch (e) {
                    window.print();
                  }
                }}
                style={{ padding: '8px 16px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}
              >
                <Printer size={15} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Save Document / PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
