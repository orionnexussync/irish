import { createClient } from '@supabase/supabase-js';
import { DEFAULT_COMPANIES } from '../config/companies';

const DEFAULT_COMPANY = DEFAULT_COMPANIES[0] || {
  company_code: 'DEMO',
  company_id: 'COMP-PRIMARY',
  company_name: 'Primary Enterprise',
  supabase_url: import.meta.env.VITE_SUPABASE_URL || 'https://jvwuyrydfzufyxtswwis.supabase.co',
  supabase_anon_key: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2d3V5cnlkZnp1Znl4dHN3d2lzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MTk1MjQsImV4cCI6MjEwMDI5NTUyNH0.l-cOdn7nWmfxBYaCIR2Ow9gfAjVtz90_qhlp5o7WJIw'
};

const getStoredActiveCompany = () => {
  try {
    const item = localStorage.getItem('rfap_active_company');
    if (!item || item === 'undefined' || item === 'null') return DEFAULT_COMPANY;
    const parsed = JSON.parse(item);
    return parsed && parsed.supabase_url ? parsed : DEFAULT_COMPANY;
  } catch (e) {
    return DEFAULT_COMPANY;
  }
};

let activeCompany = getStoredActiveCompany() || DEFAULT_COMPANY;
export let supabase = createClient(activeCompany.supabase_url, activeCompany.supabase_anon_key);

export const rebindSupabaseClient = (url, key) => {
  if (url && key) {
    supabase = createClient(url, key);
  }
};

export const isSupabaseConfigured = () => {
  return (
    activeCompany &&
    activeCompany.supabase_url &&
    activeCompany.supabase_anon_key &&
    activeCompany.supabase_url.startsWith('http') &&
    activeCompany.supabase_anon_key.length > 20
  );
};

// =============================================================================
// LOCAL PERSISTENT STORE ENGINE (Seeded Data Fallback)
// =============================================================================

const STORAGE_KEYS = {
  COMPANY_PROFILES: 'rfap_company_profiles',
  ACTIVE_COMPANY: 'rfap_active_company',
  BRANCHES: 'rfap_branches',
  SHIFTS: 'rfap_shifts',
  EMPLOYEES: 'rfap_employees',
  ARCHIVED_EMPLOYEES: 'rfap_archived_employees',
  ATTENDANCE: 'rfap_attendance',
  LEAVES: 'rfap_leaves',
  HOLIDAYS: 'rfap_holidays',
  SOS_LOGS: 'rfap_sos_logs',
  EMAIL_SCHEDULES: 'rfap_email_schedules',
  REGULARIZATION: 'rfap_regularization',
  BDAY_SETTINGS: 'rfap_bday_settings',
  PETTY_CASH_PROJECTS: 'rfap_petty_cash_projects',
  PETTY_CASH_CATEGORIES: 'rfap_petty_cash_categories',
  PETTY_CASH_CLAIMS: 'rfap_petty_cash_claims',
  PETTY_CASH_HISTORY: 'rfap_petty_cash_history',
  PETTY_CASH_MATRIX: 'rfap_petty_cash_matrix',
  PETTY_CASH_LEDGER: 'rfap_petty_cash_ledger'
};

// Initial Seed Data
const initialSeed = {
  branches: [
    { branch_id: 1, branch_name: 'Downtown HQ (#001)', location_code: 'HQ-001', address: '100 Financial Center Blvd', respective_manager_id: 'EMP-1001', manager_name: 'Anita Roy', manager_phone: '+1 555-010-1002', superior_manager_id: 'EMP-1002', superior_manager_name: 'David Miller', superior_manager_phone: '+1 555-010-1003', is_active: true },
    { branch_id: 2, branch_name: 'North Branch (#002)', location_code: 'NB-002', address: '45 Innovation Way', respective_manager_id: 'EMP-1003', manager_name: 'Sarah Connor', manager_phone: '+1 555-010-1003', superior_manager_id: 'EMP-1001', superior_manager_name: 'Anita Roy', superior_manager_phone: '+1 555-010-1002', is_active: true }
  ],
  shifts: [],
  employees: [],
  attendance: [],
  leaves: [],
  holidays: [],
  sos_logs: [],
  email_schedules: [],
  regularization: [],
  bday_settings: {
    auto_email: true,
    email_time: '08:00 AM',
    show_kiosk_banner: true,
    include_daily_report: true
  },
  petty_cash_projects: [],
  petty_cash_categories: [],
  petty_cash_claims: [],
  petty_cash_history: [],
  petty_cash_matrix: [],
  petty_cash_ledger: []
};

function getLocalData(key, defaultVal) {
  try {
    const item = localStorage.getItem(key);
    if (!item || item === 'undefined' || item === 'null') return defaultVal;
    const parsed = JSON.parse(item);
    return parsed !== null && parsed !== undefined ? parsed : defaultVal;
  } catch (e) {
    return defaultVal;
  }
}

function setLocalData(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error('LocalStorage write error:', e);
  }
}

export function initStore() {
  // Purge legacy dummy sample data from browser cache
  const DUMMY_PURGED_KEY = 'rfap_dummy_data_purged_v4';
  if (!localStorage.getItem(DUMMY_PURGED_KEY)) {
    localStorage.removeItem(STORAGE_KEYS.SHIFTS);
    localStorage.removeItem(STORAGE_KEYS.HOLIDAYS);
    localStorage.removeItem(STORAGE_KEYS.EMAIL_SCHEDULES);
    localStorage.removeItem(STORAGE_KEYS.PETTY_CASH_PROJECTS);
    localStorage.removeItem(STORAGE_KEYS.PETTY_CASH_CATEGORIES);
    localStorage.removeItem(STORAGE_KEYS.PETTY_CASH_CLAIMS);
    localStorage.removeItem(STORAGE_KEYS.PETTY_CASH_HISTORY);
    localStorage.removeItem(STORAGE_KEYS.PETTY_CASH_MATRIX);
    localStorage.removeItem(STORAGE_KEYS.PETTY_CASH_LEDGER);
    localStorage.setItem(DUMMY_PURGED_KEY, 'true');
  }

  if (!localStorage.getItem(STORAGE_KEYS.BRANCHES)) setLocalData(STORAGE_KEYS.BRANCHES, initialSeed.branches);
  if (!localStorage.getItem(STORAGE_KEYS.SHIFTS)) setLocalData(STORAGE_KEYS.SHIFTS, []);
  if (!localStorage.getItem(STORAGE_KEYS.EMPLOYEES)) setLocalData(STORAGE_KEYS.EMPLOYEES, []);
  if (!localStorage.getItem(STORAGE_KEYS.ATTENDANCE)) setLocalData(STORAGE_KEYS.ATTENDANCE, []);
  if (!localStorage.getItem(STORAGE_KEYS.LEAVES)) setLocalData(STORAGE_KEYS.LEAVES, []);
  if (!localStorage.getItem(STORAGE_KEYS.HOLIDAYS)) setLocalData(STORAGE_KEYS.HOLIDAYS, []);
  if (!localStorage.getItem(STORAGE_KEYS.SOS_LOGS)) setLocalData(STORAGE_KEYS.SOS_LOGS, []);
  if (!localStorage.getItem(STORAGE_KEYS.EMAIL_SCHEDULES)) setLocalData(STORAGE_KEYS.EMAIL_SCHEDULES, []);
  if (!localStorage.getItem(STORAGE_KEYS.REGULARIZATION)) setLocalData(STORAGE_KEYS.REGULARIZATION, []);
  if (!localStorage.getItem(STORAGE_KEYS.BDAY_SETTINGS)) setLocalData(STORAGE_KEYS.BDAY_SETTINGS, initialSeed.bday_settings);
  if (!localStorage.getItem(STORAGE_KEYS.PETTY_CASH_PROJECTS)) setLocalData(STORAGE_KEYS.PETTY_CASH_PROJECTS, []);
  if (!localStorage.getItem(STORAGE_KEYS.PETTY_CASH_CATEGORIES)) setLocalData(STORAGE_KEYS.PETTY_CASH_CATEGORIES, []);
  if (!localStorage.getItem(STORAGE_KEYS.PETTY_CASH_CLAIMS)) setLocalData(STORAGE_KEYS.PETTY_CASH_CLAIMS, []);
  if (!localStorage.getItem(STORAGE_KEYS.PETTY_CASH_HISTORY)) setLocalData(STORAGE_KEYS.PETTY_CASH_HISTORY, []);
  if (!localStorage.getItem(STORAGE_KEYS.PETTY_CASH_MATRIX)) setLocalData(STORAGE_KEYS.PETTY_CASH_MATRIX, []);
  if (!localStorage.getItem(STORAGE_KEYS.PETTY_CASH_LEDGER)) setLocalData(STORAGE_KEYS.PETTY_CASH_LEDGER, []);
}

export function clearCompanyCache() {
  try {
    localStorage.removeItem(STORAGE_KEYS.BRANCHES);
    localStorage.removeItem(STORAGE_KEYS.SHIFTS);
    localStorage.removeItem(STORAGE_KEYS.EMPLOYEES);
    localStorage.removeItem(STORAGE_KEYS.ATTENDANCE);
    localStorage.removeItem(STORAGE_KEYS.LEAVES);
    localStorage.removeItem(STORAGE_KEYS.HOLIDAYS);
    localStorage.removeItem(STORAGE_KEYS.SOS_LOGS);
    localStorage.removeItem(STORAGE_KEYS.EMAIL_SCHEDULES);
    localStorage.removeItem(STORAGE_KEYS.REGULARIZATION);
    localStorage.removeItem(STORAGE_KEYS.BDAY_SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.PETTY_CASH_PROJECTS);
    localStorage.removeItem(STORAGE_KEYS.PETTY_CASH_CATEGORIES);
    localStorage.removeItem(STORAGE_KEYS.PETTY_CASH_CLAIMS);
    localStorage.removeItem(STORAGE_KEYS.PETTY_CASH_HISTORY);
    localStorage.removeItem(STORAGE_KEYS.PETTY_CASH_MATRIX);
    localStorage.removeItem(STORAGE_KEYS.PETTY_CASH_LEDGER);
  } catch (e) {
    console.warn('clearCompanyCache error:', e);
  }
}

export function deduplicateAttendanceLogs() {
  const attendance = getLocalData(STORAGE_KEYS.ATTENDANCE, []);
  if (!attendance || attendance.length === 0) return;

  const seen = new Set();
  const cleanLogs = [];

  for (const log of attendance) {
    const timeStr = log.check_in_time ? log.check_in_time.substring(0, 16) : '';
    const key = `${log.emp_id}_${log.date_stamp}_${Number(log.shift_id)}_${timeStr}`;
    if (!seen.has(key)) {
      seen.add(key);
      cleanLogs.push(log);
    }
  }

  if (cleanLogs.length !== attendance.length) {
    console.log(`🧹 Cleaned up ${attendance.length - cleanLogs.length} duplicate attendance logs.`);
    setLocalData(STORAGE_KEYS.ATTENDANCE, cleanLogs);
  }
}

// Initial Sync from Supabase to Local Storage with Strict Enterprise Isolation
export async function syncFromSupabase() {
  if (!isSupabaseConfigured()) return;
  try {
    const [bRes, sRes, eRes, aRes, lRes, hRes, sosRes, emRes, rRes] = await Promise.all([
      supabase.from('tbl_branches').select('*'),
      supabase.from('tbl_shifts').select('*'),
      supabase.from('tbl_employees').select('*'),
      supabase.from('tbl_attendance_logs').select('*'),
      supabase.from('tbl_leave_entries').select('*'),
      supabase.from('tbl_holidays').select('*'),
      supabase.from('tbl_sos_events').select('*'),
      supabase.from('tbl_email_schedules').select('*'),
      supabase.from('tbl_regularization_requests').select('*')
    ]);

    // Branches Sync
    if (bRes.data && bRes.data.length > 0) {
      setLocalData(STORAGE_KEYS.BRANCHES, bRes.data);
    } else if (!localStorage.getItem(STORAGE_KEYS.BRANCHES)) {
      setLocalData(STORAGE_KEYS.BRANCHES, initialSeed.branches);
    }

    // Shifts Sync
    if (sRes.data && sRes.data.length > 0) {
      setLocalData(STORAGE_KEYS.SHIFTS, sRes.data);
    } else if (!localStorage.getItem(STORAGE_KEYS.SHIFTS)) {
      setLocalData(STORAGE_KEYS.SHIFTS, initialSeed.shifts);
    }

    // Employees Sync
    if (eRes.data) {
      setLocalData(STORAGE_KEYS.EMPLOYEES, eRes.data);
    } else if (!localStorage.getItem(STORAGE_KEYS.EMPLOYEES)) {
      setLocalData(STORAGE_KEYS.EMPLOYEES, []);
    }

    // Attendance Logs Sync
    if (aRes.data) {
      setLocalData(STORAGE_KEYS.ATTENDANCE, aRes.data);
      deduplicateAttendanceLogs();
    } else if (!localStorage.getItem(STORAGE_KEYS.ATTENDANCE)) {
      setLocalData(STORAGE_KEYS.ATTENDANCE, []);
    }

    // Leave Entries Sync
    if (lRes.data) {
      setLocalData(STORAGE_KEYS.LEAVES, lRes.data);
    } else if (!localStorage.getItem(STORAGE_KEYS.LEAVES)) {
      setLocalData(STORAGE_KEYS.LEAVES, []);
    }

    // Holidays Sync
    if (hRes.data && hRes.data.length > 0) {
      setLocalData(STORAGE_KEYS.HOLIDAYS, hRes.data);
    } else if (!localStorage.getItem(STORAGE_KEYS.HOLIDAYS)) {
      setLocalData(STORAGE_KEYS.HOLIDAYS, initialSeed.holidays);
    }

    // SOS Logs Sync
    if (sosRes.data) {
      setLocalData(STORAGE_KEYS.SOS_LOGS, sosRes.data);
    } else if (!localStorage.getItem(STORAGE_KEYS.SOS_LOGS)) {
      setLocalData(STORAGE_KEYS.SOS_LOGS, []);
    }

    // Email Schedules Sync
    if (emRes.data && emRes.data.length > 0) {
      setLocalData(STORAGE_KEYS.EMAIL_SCHEDULES, emRes.data);
    } else if (!localStorage.getItem(STORAGE_KEYS.EMAIL_SCHEDULES)) {
      setLocalData(STORAGE_KEYS.EMAIL_SCHEDULES, initialSeed.email_schedules);
    }

    // Regularization Requests Sync
    if (rRes.data) {
      setLocalData(STORAGE_KEYS.REGULARIZATION, rRes.data);
    } else if (!localStorage.getItem(STORAGE_KEYS.REGULARIZATION)) {
      setLocalData(STORAGE_KEYS.REGULARIZATION, []);
    }
  } catch (e) {
    console.warn('Supabase fetch sync failed, using local offline store:', e);
  }
}

// Data API Object
export const api = {
  syncWithSupabase: syncFromSupabase,
  clearCompanyCache: clearCompanyCache,

  // Multi-Company Connection Management (Option 2: Dedicated DB per Company)
  getCompanyProfiles: () => {
    const raw = getLocalData(STORAGE_KEYS.COMPANY_PROFILES, DEFAULT_COMPANIES);
    const list = Array.isArray(raw) ? [...raw] : [...DEFAULT_COMPANIES];
    DEFAULT_COMPANIES.forEach(def => {
      if (!list.some(c => c && (c.company_code || c.company_id) === (def.company_code || def.company_id))) {
        list.unshift(def);
      }
    });
    return list;
  },
  getActiveCompany: () => getLocalData(STORAGE_KEYS.ACTIVE_COMPANY, DEFAULT_COMPANY),
  setActiveCompany: async (companyObj) => {
    clearCompanyCache();
    setLocalData(STORAGE_KEYS.ACTIVE_COMPANY, companyObj);
    activeCompany = companyObj;
    rebindSupabaseClient(companyObj.supabase_url, companyObj.supabase_anon_key);
    await syncFromSupabase();
    return companyObj;
  },
  logoutCompany: async () => {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_COMPANY);
    clearCompanyCache();
    activeCompany = DEFAULT_COMPANY;
    rebindSupabaseClient(DEFAULT_COMPANY.supabase_url, DEFAULT_COMPANY.supabase_anon_key);
  },
  loginCompanyWithCode: async (code) => {
    const list = api.getCompanyProfiles();
    const cleanCode = String(code || '').trim().toUpperCase();
    const target = list.find(c => {
      if (!c) return false;
      const mainMatch = String(c.company_code || '').toUpperCase() === cleanCode ||
        String(c.company_id || '').toUpperCase() === cleanCode;
      const aliasMatch = Array.isArray(c.aliases) && c.aliases.some(a => String(a).toUpperCase() === cleanCode);
      return mainMatch || aliasMatch;
    });
    if (!target) {
      throw new Error(`Invalid Company Code "${code}". Please check your company code and try again.`);
    }
    await api.setActiveCompany(target);
    return target;
  },
  saveCompanyProfile: async (companyData) => {
    const list = api.getCompanyProfiles();
    const id = companyData.company_id || `COMP-${Date.now()}`;
    const code = (companyData.company_code || companyData.company_name.substring(0, 4)).toUpperCase();
    const newProfile = { ...companyData, company_id: id, company_code: code, updated_at: new Date().toISOString() };
    const updated = [newProfile, ...list.filter(c => c.company_id !== id)];
    setLocalData(STORAGE_KEYS.COMPANY_PROFILES, updated);
    await api.setActiveCompany(newProfile);
    return updated;
  },
  deleteCompanyProfile: async (companyId) => {
    const list = api.getCompanyProfiles();
    if (list.length <= 1) throw new Error('Cannot delete the last remaining company connection profile');
    const updated = list.filter(c => c.company_id !== companyId);
    setLocalData(STORAGE_KEYS.COMPANY_PROFILES, updated);
    const active = api.getActiveCompany();
    if (active.company_id === companyId) {
      await api.setActiveCompany(updated[0]);
    }
    return updated;
  },
  testCompanyConnection: async (url, anonKey) => {
    try {
      const testClient = createClient(url, anonKey);
      const res = await testClient.from('tbl_branches').select('*').limit(1);
      if (res.error) throw new Error(res.error.message);
      return { success: true, message: '✅ Connection successful! Connected to Supabase DB.' };
    } catch (err) {
      return { success: false, message: '❌ Connection error: ' + err.message };
    }
  },

  // Branches
  getBranches: () => {
    const branches = getLocalData(STORAGE_KEYS.BRANCHES, initialSeed.branches);
    return branches.map(b => ({
      ...b,
      is_active: b.is_active !== false,
      manager_name: b.manager_name || 'Branch Manager',
      manager_phone: b.manager_phone || '+1 555-000-0000'
    }));
  },
  getActiveBranches: () => {
    const branches = api.getBranches();
    return branches.filter(b => b.is_active !== false);
  },
  toggleBranchActive: async (branchId) => {
    const branches = api.getBranches();
    const updated = branches.map(b => b.branch_id === Number(branchId) ? { ...b, is_active: !b.is_active } : b);
    setLocalData(STORAGE_KEYS.BRANCHES, updated);
    if (isSupabaseConfigured()) {
      const target = updated.find(b => b.branch_id === Number(branchId));
      await supabase.from('tbl_branches').update({ is_active: target.is_active }).eq('branch_id', branchId);
    }
    return updated;
  },
  saveBranch: async (branchData) => {
    const branches = api.getBranches();
    const employees = getLocalData(STORAGE_KEYS.EMPLOYEES, initialSeed.employees);

    // Auto-resolve manager names if employee IDs provided
    let managerName = branchData.manager_name || '';
    if (branchData.respective_manager_id) {
      const mEmp = employees.find(e => e.emp_id === branchData.respective_manager_id);
      if (mEmp) managerName = `${mEmp.first_name} ${mEmp.last_name}`;
    }

    let superiorName = branchData.superior_manager_name || '';
    if (branchData.superior_manager_id) {
      const sEmp = employees.find(e => e.emp_id === branchData.superior_manager_id);
      if (sEmp) superiorName = `${sEmp.first_name} ${sEmp.last_name}`;
    }

    const payloadObj = {
      ...branchData,
      manager_name: managerName,
      superior_manager_name: superiorName
    };

    let updated;
    let target;
    if (branchData.branch_id) {
      updated = branches.map(b => Number(b.branch_id) === Number(branchData.branch_id) ? { ...b, ...payloadObj, branch_id: Number(branchData.branch_id) } : b);
      target = { ...payloadObj, branch_id: Number(branchData.branch_id) };
    } else {
      const maxId = branches.length > 0 ? Math.max(...branches.map(b => Number(b.branch_id) || 0)) : 0;
      const newId = maxId + 1;
      target = { ...payloadObj, branch_id: newId, is_active: true };
      updated = [...branches, target];
    }
    setLocalData(STORAGE_KEYS.BRANCHES, updated);

    if (isSupabaseConfigured()) {
      try {
        const dbPayload = {
          branch_id: Number(target.branch_id),
          branch_name: String(target.branch_name || ''),
          location_code: String(target.location_code || ''),
          address: String(target.address || ''),
          respective_manager_id: target.respective_manager_id || null,
          manager_name: String(target.manager_name || ''),
          manager_phone: String(target.manager_phone || ''),
          superior_manager_id: target.superior_manager_id || null,
          superior_manager_name: String(target.superior_manager_name || ''),
          superior_manager_phone: String(target.superior_manager_phone || '')
        };

        const { error } = await supabase.from('tbl_branches').upsert(dbPayload, { onConflict: 'branch_id' });
        if (error) {
          console.error('Supabase saveBranch DB error:', error.message || error);
        } else {
          console.log('✅ Successfully upserted branch location to Supabase tbl_branches table:', dbPayload);
        }
      } catch (e) {
        console.error('Supabase saveBranch exception:', e);
      }
    }
    return updated;
  },

  // Shifts (Min 1 Shift, Max 10 Shifts)
  getShifts: () => getLocalData(STORAGE_KEYS.SHIFTS, initialSeed.shifts),
  saveShift: async (shiftData) => {
    const shifts = getLocalData(STORAGE_KEYS.SHIFTS, initialSeed.shifts);
    let updated;
    let targetObj;
    if (shiftData.shift_id) {
      updated = shifts.map(s => Number(s.shift_id) === Number(shiftData.shift_id) ? { ...s, ...shiftData } : s);
      targetObj = { ...shiftData };
    } else {
      if (shifts.length >= 10) {
        throw new Error('Maximum limit reached: You can configure a maximum of 10 shift schedules.');
      }
      const newId = shifts.length > 0 ? Math.max(...shifts.map(s => Number(s.shift_id))) + 1 : 1;
      targetObj = { ...shiftData, shift_id: newId };
      updated = [...shifts, targetObj];
    }
    setLocalData(STORAGE_KEYS.SHIFTS, updated);

    if (isSupabaseConfigured()) {
      try {
        const payload = {
          shift_name: targetObj.shift_name,
          start_time: targetObj.start_time.length === 5 ? `${targetObj.start_time}:00` : targetObj.start_time,
          end_time: targetObj.end_time.length === 5 ? `${targetObj.end_time}:00` : targetObj.end_time,
          grace_period_m: Number(targetObj.grace_period_m || 15),
          half_day_threshold_h: Number(targetObj.half_day_threshold_h || 4),
          branch_scope: targetObj.branch_scope || 'ALL'
        };
        if (shiftData.shift_id) payload.shift_id = Number(shiftData.shift_id);
        await supabase.from('tbl_shifts').upsert(payload);
      } catch (e) {
        console.error('Supabase saveShift error:', e);
      }
    }
    return updated;
  },
  addShift: async (shiftData) => api.saveShift(shiftData),
  deleteShift: async (shiftId) => {
    const shifts = api.getShifts();
    if (shifts.length <= 1) {
      throw new Error('Minimum limit reached: At least 1 active shift schedule must remain in the system.');
    }
    const updated = shifts.filter(s => Number(s.shift_id) !== Number(shiftId));
    setLocalData(STORAGE_KEYS.SHIFTS, updated);
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('tbl_shifts').delete().eq('shift_id', shiftId);
      } catch (e) {
        console.error('Supabase deleteShift error:', e);
      }
    }
    return updated;
  },

  // Employees
  getEmployees: () => getLocalData(STORAGE_KEYS.EMPLOYEES, []),
  getEmployeeById: (empId) => {
    const list = api.getEmployees();
    return list.find(e => e.emp_id === empId);
  },
  saveEmployee: async (empData) => {
    const list = getLocalData(STORAGE_KEYS.EMPLOYEES, initialSeed.employees);
    const existingIdx = list.findIndex(e => e.emp_id === empData.emp_id);

    let updated;
    if (existingIdx >= 0) {
      updated = [...list];
      updated[existingIdx] = { ...updated[existingIdx], ...empData };
    } else {
      updated = [...list, { ...empData, created_at: new Date().toISOString() }];
    }
    setLocalData(STORAGE_KEYS.EMPLOYEES, updated);

    if (isSupabaseConfigured()) {
      const payload = {
        emp_id: empData.emp_id,
        branch_id: Number(empData.branch_id),
        first_name: empData.first_name,
        last_name: empData.last_name,
        email: empData.email,
        mobile_no: empData.mobile_no || '',
        department: empData.department || '',
        designation: empData.designation || '',
        date_of_birth: empData.date_of_birth,
        date_of_joining: empData.date_of_joining || new Date().toISOString().split('T')[0],
        face_embedding: empData.face_embedding || null,
        is_active: empData.is_active !== false
      };
      const { error } = await supabase.from('tbl_employees').upsert(payload, { onConflict: 'emp_id' });
      if (error) {
        console.error('Supabase saveEmployee error:', error);
        throw new Error(error.message || 'Failed to save employee to Supabase');
      }
    }
    return updated;
  },
  saveFaceVector: async (empId, faceEmbedding) => {
    const list = getLocalData(STORAGE_KEYS.EMPLOYEES, []);
    const idx = list.findIndex(e => e.emp_id === empId);
    if (idx < 0) throw new Error('Employee not found');

    const updated = [...list];
    updated[idx].face_embedding = faceEmbedding;
    setLocalData(STORAGE_KEYS.EMPLOYEES, updated);

    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('tbl_employees')
        .update({ face_embedding: faceEmbedding })
        .eq('emp_id', empId);
      if (error) {
        console.error('Supabase saveFaceVector error:', error);
        throw new Error(error.message || 'Failed to update face vector in Supabase');
      }
    }
    return updated[idx];
  },
  toggleEmployeeActive: async (empId) => {
    const list = getLocalData(STORAGE_KEYS.EMPLOYEES, []);
    const updated = list.map(e => e.emp_id === empId ? { ...e, is_active: !e.is_active } : e);
    setLocalData(STORAGE_KEYS.EMPLOYEES, updated);

    if (isSupabaseConfigured()) {
      const target = updated.find(e => e.emp_id === empId);
      await supabase.from('tbl_employees').update({ is_active: target.is_active }).eq('emp_id', empId);
    }
    return updated;
  },
  getArchivedEmployees: () => getLocalData(STORAGE_KEYS.ARCHIVED_EMPLOYEES, []),
  softDeleteEmployee: async (empId) => {
    const list = getLocalData(STORAGE_KEYS.EMPLOYEES, []);
    const targetEmp = list.find(e => e.emp_id === empId);
    if (!targetEmp) return list;

    const archivedRecord = {
      ...targetEmp,
      is_active: false,
      status: 'Inactive',
      archived_at: new Date().toISOString()
    };

    // Update employees list with Inactive status
    const updatedEmployees = list.map(e => e.emp_id === empId ? archivedRecord : e);
    setLocalData(STORAGE_KEYS.EMPLOYEES, updatedEmployees);

    // Save to Archive Table
    const archives = getLocalData(STORAGE_KEYS.ARCHIVED_EMPLOYEES, []);
    const updatedArchives = [archivedRecord, ...archives.filter(a => a.emp_id !== empId)];
    setLocalData(STORAGE_KEYS.ARCHIVED_EMPLOYEES, updatedArchives);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('tbl_employees').update({ is_active: false, status: 'Inactive' }).eq('emp_id', empId);
        await supabase.from('tbl_archived_employees').upsert({
          emp_id: targetEmp.emp_id,
          first_name: targetEmp.first_name,
          last_name: targetEmp.last_name,
          email: targetEmp.email,
          mobile_no: targetEmp.mobile_no || '',
          branch_id: Number(targetEmp.branch_id),
          department: targetEmp.department || '',
          designation: targetEmp.designation || '',
          status: 'Inactive',
          is_active: false,
          archived_at: archivedRecord.archived_at
        }, { onConflict: 'emp_id' });
      } catch (e) {
        console.error('Supabase softDeleteEmployee error:', e);
      }
    }
    return updatedEmployees;
  },
  deleteEmployee: async (empId) => {
    return api.softDeleteEmployee(empId);
  },
  restoreEmployee: async (empId) => {
    const list = getLocalData(STORAGE_KEYS.EMPLOYEES, []);
    const updatedEmployees = list.map(e => e.emp_id === empId ? { ...e, is_active: true, status: 'Active', archived_at: null } : e);
    setLocalData(STORAGE_KEYS.EMPLOYEES, updatedEmployees);

    const archives = getLocalData(STORAGE_KEYS.ARCHIVED_EMPLOYEES, []);
    const updatedArchives = archives.filter(a => a.emp_id !== empId);
    setLocalData(STORAGE_KEYS.ARCHIVED_EMPLOYEES, updatedArchives);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('tbl_employees').update({ is_active: true, status: 'Active' }).eq('emp_id', empId);
        await supabase.from('tbl_archived_employees').delete().eq('emp_id', empId);
      } catch (e) {
        console.error('Supabase restoreEmployee error:', e);
      }
    }
    return updatedEmployees;
  },

  // Test Case 07: Offline Attendance Storage & Auto-Sync
  saveOfflinePunch: (punchData) => {
    const queue = getLocalData('rfap_offline_punches', []);
    const newQueue = [...queue, { ...punchData, queued_at: new Date().toISOString() }];
    setLocalData('rfap_offline_punches', newQueue);
    return newQueue;
  },
  getOfflinePunches: () => getLocalData('rfap_offline_punches', []),
  syncOfflinePunches: async () => {
    const queue = getLocalData('rfap_offline_punches', []);
    if (!queue || queue.length === 0) return { synced: 0 };

    let successCount = 0;
    const remainingQueue = [];

    for (const punch of queue) {
      try {
        await api.recordPunch(punch);
        successCount++;
      } catch (err) {
        if (err.message && (err.message.includes('already Checked In') || err.message.includes('Duplicate'))) {
          console.log('Skipped duplicate offline punch:', punch);
          successCount++;
        } else {
          console.warn('Failed to sync offline punch:', punch, err);
          remainingQueue.push(punch);
        }
      }
    }

    setLocalData('rfap_offline_punches', remainingQueue);
    return { synced: successCount, remaining: remainingQueue.length };
  },

  // Test Case 12: SOS Incident Event Audit Logging
  createSosAlert: async ({ emp_id, emp_name, branch_id, location_gps, reason }) => {
    const logs = getLocalData(STORAGE_KEYS.SOS_LOGS, []);
    const alertId = Date.now();
    const newAlert = {
      alert_id: alertId,
      event_id: alertId,
      emp_id: emp_id || 'KIOSK_TERMINAL',
      emp_name: emp_name || 'Kiosk Terminal User',
      raised_by: emp_name || 'Kiosk Terminal User',
      branch_id: Number(branch_id || 1),
      triggered_at: new Date().toISOString(),
      location_gps: location_gps || 'HQ Main Entrance Kiosk',
      reason: reason || 'Emergency SOS Triggered by Terminal User',
      status: 'OPEN'
    };

    const updated = [newAlert, ...logs];
    setLocalData(STORAGE_KEYS.SOS_LOGS, updated);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('tbl_sos_events').insert({
          alert_id: newAlert.alert_id,
          event_id: newAlert.event_id,
          emp_id: newAlert.emp_id,
          emp_name: newAlert.emp_name,
          raised_by: newAlert.raised_by,
          branch_id: newAlert.branch_id,
          triggered_at: newAlert.triggered_at,
          location_gps: newAlert.location_gps,
          reason: newAlert.reason,
          status: 'OPEN'
        });
      } catch (e) {
        console.error('Supabase SOS alert insert error:', e);
      }
    }
    return updated;
  },
  getSosAlerts: () => getLocalData(STORAGE_KEYS.SOS_LOGS, []),
  getSosLogs: () => api.getSosAlerts(),
  resolveSos: async (alertId) => {
    const logs = getLocalData(STORAGE_KEYS.SOS_LOGS, []);
    const updated = logs.map(s => Number(s.alert_id) === Number(alertId) ? { ...s, status: 'RESOLVED', resolved_at: new Date().toISOString() } : s);
    setLocalData(STORAGE_KEYS.SOS_LOGS, updated);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('tbl_sos_events').update({ status: 'RESOLVED', resolved_at: new Date().toISOString() }).eq('alert_id', alertId);
      } catch (e) {
        console.error('Supabase resolveSos error:', e);
      }
    }
    return updated;
  },

  // Attendance Punch & Logs (Supports Multiple Daily Check-Ins & Check-Outs Across Shifts)
  getAttendanceLogs: () => getLocalData(STORAGE_KEYS.ATTENDANCE, []),
  recordPunch: async ({ emp_id, shift_id, branch_id, punch_type, timestamp }) => {
    const attendance = getLocalData(STORAGE_KEYS.ATTENDANCE, initialSeed.attendance);
    const employees = getLocalData(STORAGE_KEYS.EMPLOYEES, initialSeed.employees);
    const emp = employees.find(e => e.emp_id === emp_id);
    if (!emp) throw new Error('Employee record not found');

    const dateStamp = new Date(timestamp || Date.now()).toISOString().split('T')[0];

    // Find any un-closed (open) check-in session for this employee
    const openIndex = attendance.findIndex(
      a => a.emp_id === emp_id && a.check_in_time && !a.check_out_time
    );

    let updated;
    if (punch_type === 'CHECK_IN') {
      const shifts = api.getShifts();
      const openCheckIn = attendance.find(
        a => a.emp_id === emp_id && a.check_in_time && !a.check_out_time
      );

      if (openCheckIn) {
        const openShiftObj = shifts.find(s => Number(s.shift_id) === Number(openCheckIn.shift_id));
        const openShiftNameStr = openShiftObj
          ? `${openShiftObj.shift_name} [${openShiftObj.start_time} - ${openShiftObj.end_time}]`
          : 'PREVIOUS SHIFT';

        if (Number(openCheckIn.shift_id) === Number(shift_id || 1)) {
          throw new Error(`YOU ALREADY CHECKIN SHIFT (${openShiftNameStr})`);
        } else {
          throw new Error(`ATTENDANCE REGULARIZATION IS REQUIRED FOR PREVIOUS SHIFT ${openShiftNameStr}.`);
        }
      }

      const sameShiftCheckIn = attendance.find(
        a => a.emp_id === emp_id &&
             a.date_stamp === dateStamp &&
             Number(a.shift_id) === Number(shift_id || 1) &&
             a.check_in_time
      );

      if (sameShiftCheckIn) {
        const targetShiftObj = shifts.find(s => Number(s.shift_id) === Number(shift_id || 1));
        const targetShiftNameStr = targetShiftObj
          ? `${targetShiftObj.shift_name} [${targetShiftObj.start_time} - ${targetShiftObj.end_time}]`
          : 'SHIFT';
        throw new Error(`YOU ALREADY CHECKIN SHIFT (${targetShiftNameStr})`);
      }

      const checkInIso = new Date(timestamp || Date.now()).toISOString();
      const newLog = {
        log_id: Date.now(),
        emp_id,
        shift_id: Number(shift_id || 1),
        branch_id: Number(branch_id || emp.branch_id || 1),
        date_stamp: dateStamp,
        check_in_time: checkInIso,
        check_out_time: null,
        attendance_status: 'PRESENT',
        is_worked_on_leave: false,
        is_worked_holiday: false,
        remarks: 'Biometric Face Verified Punch In'
      };

      updated = [newLog, ...attendance];
      setLocalData(STORAGE_KEYS.ATTENDANCE, updated);

      if (isSupabaseConfigured()) {
        try {
          await supabase.from('tbl_attendance_logs').insert({
            emp_id,
            shift_id: Number(shift_id || 1),
            branch_id: Number(branch_id || emp.branch_id || 1),
            date_stamp: dateStamp,
            check_in_time: checkInIso,
            attendance_status: 'PRESENT',
            remarks: 'Biometric Face Verified Punch In'
          });
        } catch (e) {
          console.error('Supabase recordPunch CHECK_IN insert error:', e);
        }
      }
      return { log: newLog, status: 'CHECKED_IN', emp };
    } else {
      // CHECK_OUT
      let targetIndex = openIndex;
      if (targetIndex < 0) {
        targetIndex = attendance.findIndex(
          a => a.emp_id === emp_id && a.date_stamp === dateStamp && Number(a.shift_id) === Number(shift_id)
        );
      }
      if (targetIndex < 0 || !attendance[targetIndex].check_in_time) {
        throw new Error('No open Check-In session found. Please Check-In first before Checking-Out.');
      }

      updated = [...attendance];
      const checkOutIso = new Date(timestamp || Date.now()).toISOString();
      updated[targetIndex].check_out_time = checkOutIso;
      setLocalData(STORAGE_KEYS.ATTENDANCE, updated);

      if (isSupabaseConfigured()) {
        const target = updated[targetIndex];
        try {
          await supabase.from('tbl_attendance_logs').update({
            check_out_time: checkOutIso
          }).match({
            emp_id: target.emp_id,
            check_in_time: target.check_in_time
          });
        } catch (e) {
          console.error('Supabase recordPunch CHECK_OUT error:', e);
        }
      }
      return { log: updated[targetIndex], status: 'CHECKED_OUT', emp };
    }
  },

  directRegularize: async (regData) => {
    const attendance = getLocalData(STORAGE_KEYS.ATTENDANCE, initialSeed.attendance);
    const newLog = {
      log_id: Date.now(),
      emp_id: regData.emp_id,
      shift_id: Number(regData.shift_id),
      branch_id: 1,
      date_stamp: regData.date_stamp,
      check_in_time: regData.in_time ? `${regData.date_stamp}T${regData.in_time}` : null,
      check_out_time: regData.out_time ? `${regData.date_stamp}T${regData.out_time}` : null,
      attendance_status: regData.action === 'PRESENT' ? 'REGULARIZED' : regData.action,
      is_worked_on_leave: false,
      is_worked_holiday: false,
      remarks: `Direct Regularization: ${regData.remarks}`
    };
    const updated = [newLog, ...attendance.filter(a => !(a.emp_id === regData.emp_id && a.date_stamp === regData.date_stamp && a.shift_id === Number(regData.shift_id)))];
    setLocalData(STORAGE_KEYS.ATTENDANCE, updated);

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('tbl_attendance_logs').upsert({
        emp_id: newLog.emp_id,
        shift_id: newLog.shift_id,
        branch_id: newLog.branch_id,
        date_stamp: newLog.date_stamp,
        check_in_time: newLog.check_in_time,
        check_out_time: newLog.check_out_time,
        attendance_status: newLog.attendance_status,
        is_worked_on_leave: false,
        is_worked_holiday: false,
        remarks: newLog.remarks
      }, { onConflict: 'emp_id,shift_id,date_stamp' });

      if (error) {
        console.error('Supabase directRegularize error:', error);
        throw new Error(error.message || 'Failed to apply direct regularization in Supabase');
      }
    }
    return updated;
  },

  // Leaves
  getLeaves: () => getLocalData(STORAGE_KEYS.LEAVES, []),
  addLeaveEntry: async (leaveData) => {
    const leaves = getLocalData(STORAGE_KEYS.LEAVES, initialSeed.leaves);
    const startDate = leaveData.start_date || new Date().toISOString().split('T')[0];
    let endDate = leaveData.end_date || startDate;
    if (endDate < startDate) endDate = startDate;

    const newEntry = {
      leave_id: Date.now(),
      ...leaveData,
      start_date: startDate,
      end_date: endDate,
      duration_days: Number(leaveData.duration_days || 1)
    };
    const updated = [newEntry, ...leaves];
    setLocalData(STORAGE_KEYS.LEAVES, updated);

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('tbl_leave_entries').insert({
        emp_id: newEntry.emp_id,
        start_date: newEntry.start_date,
        end_date: newEntry.end_date,
        leave_type: newEntry.leave_type,
        duration_days: newEntry.duration_days,
        reason: newEntry.reason || ''
      });
      if (error) {
        console.error('Supabase addLeaveEntry error:', error);
        throw new Error(error.message || 'Failed to save leave entry in Supabase');
      }
    }
    return updated;
  },

  // Holidays
  getHolidays: () => getLocalData(STORAGE_KEYS.HOLIDAYS, initialSeed.holidays),
  saveHoliday: async (holidayData) => {
    const holidays = getLocalData(STORAGE_KEYS.HOLIDAYS, initialSeed.holidays);
    const newEntry = { holiday_id: Date.now(), ...holidayData };
    const updated = [newEntry, ...holidays];
    setLocalData(STORAGE_KEYS.HOLIDAYS, updated);

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('tbl_holidays').insert({
        holiday_date: holidayData.holiday_date || null,
        holiday_description: holidayData.holiday_description,
        recurring_type: holidayData.recurring_type || 'YEARLY',
        day_of_week: holidayData.day_of_week ? Number(holidayData.day_of_week) : null,
        rule_scope: holidayData.rule_scope || null,
        branch_id: holidayData.branch_id && holidayData.branch_id !== 'ALL' ? Number(holidayData.branch_id) : null
      });
      if (error) {
        console.error('Supabase saveHoliday error:', error);
        throw new Error(error.message || 'Failed to save holiday in Supabase');
      }
    }
    return updated;
  },
  updateWeeklyOffRule: async (id, rule_scope) => {
    const holidays = getLocalData(STORAGE_KEYS.HOLIDAYS, initialSeed.holidays);
    const updated = holidays.map(h => h.holiday_id === id ? { ...h, rule_scope } : h);
    setLocalData(STORAGE_KEYS.HOLIDAYS, updated);
    if (isSupabaseConfigured()) {
      await supabase.from('tbl_holidays').update({ rule_scope }).eq('holiday_id', id);
    }
    return updated;
  },
  deleteHoliday: async (id) => {
    const holidays = getLocalData(STORAGE_KEYS.HOLIDAYS, initialSeed.holidays);
    const updated = holidays.filter(h => h.holiday_id !== id);
    setLocalData(STORAGE_KEYS.HOLIDAYS, updated);

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('tbl_holidays').delete().eq('holiday_id', id);
      if (error) {
        console.error('Supabase deleteHoliday error:', error);
        throw new Error(error.message || 'Failed to delete holiday in Supabase');
      }
    }
    return updated;
  },

  // SOS Emergency
  getSosLogs: () => getLocalData(STORAGE_KEYS.SOS_LOGS, []),
  triggerSos: async (branch_id, emp_id = null, notes = null) => {
    const logs = getLocalData(STORAGE_KEYS.SOS_LOGS, initialSeed.sos_logs);
    const branches = api.getBranches();
    const employees = api.getEmployees();
    const branch = branches.find(b => b.branch_id === Number(branch_id));
    const emp = emp_id ? employees.find(e => e.emp_id === emp_id) : null;

    const raisedByName = emp ? `${emp.first_name} ${emp.last_name} (${emp.emp_id})` : (emp_id || 'Terminal User / Receptionist');
    const managerName = branch ? branch.manager_name : 'Default Manager';
    const managerPhone = branch ? branch.manager_phone : '+1 555-000-0000';

    const newEvt = {
      event_id: Date.now(),
      branch_id: Number(branch_id),
      emp_id: emp_id || 'KIOSK_TERMINAL',
      raised_by: raisedByName,
      manager_name: managerName,
      manager_phone: managerPhone,
      triggered_at: new Date().toISOString(),
      status: 'ACTIVE',
      notes: notes || `SOS Panic Emergency Triggered at ${branch ? branch.branch_name : 'Kiosk'}`
    };
    const updated = [newEvt, ...logs];
    setLocalData(STORAGE_KEYS.SOS_LOGS, updated);

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('tbl_sos_events').insert({
        branch_id: newEvt.branch_id,
        emp_id: emp_id && emp_id !== 'KIOSK_TERMINAL' ? emp_id : null,
        status: 'ACTIVE',
        notes: `${newEvt.notes} | Raised By: ${raisedByName} | Manager: ${managerName} (${managerPhone})`
      });
      if (error) {
        console.error('Supabase triggerSos error:', error);
        throw new Error(error.message || 'Failed to trigger SOS event in Supabase');
      }
    }
    return newEvt;
  },
  resolveSos: async (event_id) => {
    const logs = getLocalData(STORAGE_KEYS.SOS_LOGS, initialSeed.sos_logs);
    const updated = logs.map(l => l.event_id === event_id ? { ...l, status: 'RESOLVED' } : l);
    setLocalData(STORAGE_KEYS.SOS_LOGS, updated);

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('tbl_sos_events').update({ status: 'RESOLVED' }).eq('event_id', event_id);
      if (error) {
        console.error('Supabase resolveSos error:', error);
        throw new Error(error.message || 'Failed to resolve SOS event in Supabase');
      }
    }
    return updated;
  },

  // Regularization Requests
  getRegularizationRequests: () => getLocalData(STORAGE_KEYS.REGULARIZATION, []),
  submitRegularizationRequest: async (reqData) => {
    const reqs = getLocalData(STORAGE_KEYS.REGULARIZATION, initialSeed.regularization);
    const employees = getLocalData(STORAGE_KEYS.EMPLOYEES, initialSeed.employees);
    const shifts = getLocalData(STORAGE_KEYS.SHIFTS, initialSeed.shifts);
    const branches = api.getBranches();

    const emp = employees.find(e => e.emp_id === reqData.emp_id);
    const shift = shifts.find(s => s.shift_id === Number(reqData.shift_id));

    // Dynamic Employee-to-Branch Mapping & Multi-Tier Approval Matrix
    const empBranchId = emp ? (emp.branch_id ? Number(emp.branch_id) : 1) : 1;
    const branch = branches.find(b => Number(b.branch_id) === empBranchId);

    const approver1Id = branch ? (branch.respective_manager_id || branch.manager_id || 'MGR-01') : 'MGR-01';
    let approver1Name = branch ? (branch.manager_name || 'Respective Manager') : 'Respective Manager';
    if (approver1Id) {
      const a1Emp = employees.find(e => e.emp_id === approver1Id);
      if (a1Emp) approver1Name = `${a1Emp.first_name} ${a1Emp.last_name}`;
    }

    const approver2Id = branch ? (branch.superior_manager_id || null) : null;
    let approver2Name = branch ? (branch.superior_manager_name || null) : null;
    if (approver2Id) {
      const a2Emp = employees.find(e => e.emp_id === approver2Id);
      if (a2Emp) approver2Name = `${a2Emp.first_name} ${a2Emp.last_name}`;
    }

    const newReq = {
      request_id: Date.now(),
      emp_id: reqData.emp_id,
      emp_name: emp ? `${emp.first_name} ${emp.last_name}` : reqData.emp_id,
      branch_id: empBranchId,
      branch_name: branch ? branch.branch_name : 'MAIN',
      request_date: reqData.request_date,
      shift_id: Number(reqData.shift_id),
      shift_name: shift ? shift.shift_name : 'Default Shift',
      punch_type: reqData.punch_type,
      requested_time: reqData.requested_time,
      remarks: reqData.remarks,

      // Approval Matrix Configuration
      approver_01_emp_id: approver1Id,
      approver_01_name: approver1Name,
      approver_01_status: 'PENDING',
      approver_01_action_at: null,

      approver_02_emp_id: approver2Id,
      approver_02_name: approver2Name,
      approver_02_status: approver2Id ? 'PENDING' : 'NOT_APPLICABLE',
      approver_02_action_at: null,

      current_approval_level: 1,
      status: 'PENDING_L1' // PENDING_L1 | PENDING_L2 | APPROVED | REJECTED
    };

    const updated = [newReq, ...reqs];
    setLocalData(STORAGE_KEYS.REGULARIZATION, updated);

    if (isSupabaseConfigured()) {
      let formattedTime = reqData.requested_time || '09:00';
      if (formattedTime.length === 5) formattedTime += ':00';

      try {
        const { error } = await supabase.from('tbl_regularization_requests').insert({
          emp_id: reqData.emp_id,
          branch_id: empBranchId,
          request_date: reqData.request_date,
          shift_id: Number(reqData.shift_id),
          punch_type: reqData.punch_type,
          requested_time: formattedTime,
          remarks: reqData.remarks || '',
          approver_01_emp_id: approver1Id,
          approver_01_name: approver1Name,
          approver_01_status: 'PENDING',
          approver_02_emp_id: approver2Id,
          approver_02_name: approver2Name,
          approver_02_status: approver2Id ? 'PENDING' : 'NOT_APPLICABLE',
          current_approval_level: 1,
          status: 'PENDING_L1'
        });
        if (error) {
          console.error('Supabase submitRegularizationRequest error:', error);
        }
      } catch (e) {
        console.error('Supabase submitRegularizationRequest exception:', e);
      }
    }
    return newReq;
  },

  // Multi-Tier Regularization Workflow Engine
  processRegularizationAction: async (requestId, action, approverLevel = 1) => {
    const reqs = getLocalData(STORAGE_KEYS.REGULARIZATION, initialSeed.regularization);
    const target = reqs.find(r => r.request_id === requestId);
    if (!target) throw new Error('Regularization request not found');

    const nowIso = new Date().toISOString();
    let updatedReq = { ...target };

    if (action === 'REJECT') {
      if (approverLevel === 1 || target.status === 'PENDING_L1') {
        updatedReq.approver_01_status = 'REJECTED';
        updatedReq.approver_01_action_at = nowIso;
      } else {
        updatedReq.approver_02_status = 'REJECTED';
        updatedReq.approver_02_action_at = nowIso;
      }
      updatedReq.status = 'REJECTED';
    } else if (action === 'APPROVE') {
      if (approverLevel === 1 || target.status === 'PENDING_L1') {
        updatedReq.approver_01_status = 'APPROVED';
        updatedReq.approver_01_action_at = nowIso;

        // Check if Approver 02 (Superior Manager) is configured
        if (target.approver_02_emp_id && target.approver_02_emp_id.trim() !== '') {
          updatedReq.current_approval_level = 2;
          updatedReq.status = 'PENDING_L2'; // Route to Superior Manager!
        } else {
          // No Superior Manager configured -> Complete request!
          updatedReq.status = 'APPROVED';
          await api.directRegularize({
            emp_id: target.emp_id,
            date_stamp: target.request_date,
            shift_id: target.shift_id,
            action: 'PRESENT',
            in_time: target.punch_type === 'Check-In' ? target.requested_time : '09:00 AM',
            out_time: target.punch_type === 'Check-Out' ? target.requested_time : '06:00 PM',
            remarks: `Approved by Respective Manager (${target.approver_01_name || 'Approver 01'}) - Req #${requestId}`
          });
        }
      } else if (approverLevel === 2 || target.status === 'PENDING_L2') {
        updatedReq.approver_02_status = 'APPROVED';
        updatedReq.approver_02_action_at = nowIso;
        updatedReq.status = 'APPROVED'; // Completed!

        await api.directRegularize({
          emp_id: target.emp_id,
          date_stamp: target.request_date,
          shift_id: target.shift_id,
          action: 'PRESENT',
          in_time: target.punch_type === 'Check-In' ? target.requested_time : '09:00 AM',
          out_time: target.punch_type === 'Check-Out' ? target.requested_time : '06:00 PM',
          remarks: `Fully Approved by Superior Manager (${target.approver_02_name || 'Approver 02'}) - Req #${requestId}`
        });
      }
    }

    const updatedList = reqs.map(r => r.request_id === requestId ? updatedReq : r);
    setLocalData(STORAGE_KEYS.REGULARIZATION, updatedList);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('tbl_regularization_requests').update({
          approver_01_status: updatedReq.approver_01_status,
          approver_01_action_at: updatedReq.approver_01_action_at,
          approver_02_status: updatedReq.approver_02_status,
          approver_02_action_at: updatedReq.approver_02_action_at,
          current_approval_level: updatedReq.current_approval_level,
          status: updatedReq.status
        }).eq('request_id', requestId);
      } catch (e) {
        console.error('Supabase processRegularizationAction error:', e);
      }
    }

    return updatedList;
  },

  updateRegularizationStatus: async (requestId, status) => {
    const action = status === 'APPROVED' ? 'APPROVE' : 'REJECT';
    return await api.processRegularizationAction(requestId, action, 1);
  },

  // Email Schedules
  getEmailSchedules: () => getLocalData(STORAGE_KEYS.EMAIL_SCHEDULES, initialSeed.email_schedules),
  saveEmailSchedule: async (schedData) => {
    const list = getLocalData(STORAGE_KEYS.EMAIL_SCHEDULES, initialSeed.email_schedules);
    let updated;
    let targetObj;
    if (schedData.schedule_id) {
      updated = list.map(s => s.schedule_id === schedData.schedule_id ? { ...s, ...schedData } : s);
      targetObj = { ...schedData };
    } else {
      targetObj = { ...schedData, schedule_id: Date.now() };
      updated = [...list, targetObj];
    }
    setLocalData(STORAGE_KEYS.EMAIL_SCHEDULES, updated);

    if (isSupabaseConfigured()) {
      let dispatchTime = targetObj.dispatch_time || '19:00:00';
      if (dispatchTime.length === 5) dispatchTime += ':00';

      const payload = {
        config_name: targetObj.config_name,
        recipient_emails: targetObj.recipient_emails,
        target_branch_id: targetObj.target_branch_id ? Number(targetObj.target_branch_id) : 1,
        report_type: targetObj.report_type || 'DAILY_ATTENDANCE',
        export_format: targetObj.export_format || 'XLSX',
        dispatch_frequency: targetObj.dispatch_frequency || 'DAILY',
        dispatch_time: dispatchTime,
        is_active: targetObj.is_active !== false
      };
      if (schedData.schedule_id) payload.schedule_id = schedData.schedule_id;
      const { error } = await supabase.from('tbl_email_schedules').upsert(payload);
      if (error) {
        console.error('Supabase saveEmailSchedule error:', error);
        throw new Error(error.message || 'Failed to save email schedule in Supabase');
      }
    }
    return updated;
  },

  // Birthday Settings
  getBdaySettings: () => getLocalData(STORAGE_KEYS.BDAY_SETTINGS, initialSeed.bday_settings),
  saveBdaySettings: (settings) => {
    setLocalData(STORAGE_KEYS.BDAY_SETTINGS, settings);
    return settings;
  },

  // Petty Cash API Engine
  getPettyCashProjects: () => getLocalData(STORAGE_KEYS.PETTY_CASH_PROJECTS, initialSeed.petty_cash_projects),
  savePettyCashProject: (projectName, branchId) => {
    const list = getLocalData(STORAGE_KEYS.PETTY_CASH_PROJECTS, initialSeed.petty_cash_projects);
    const newP = {
      project_id: Date.now(),
      project_name: projectName,
      branch_id: Number(branchId || 1),
      is_active: true
    };
    const updated = [...list, newP];
    setLocalData(STORAGE_KEYS.PETTY_CASH_PROJECTS, updated);
    return newP;
  },
  toggleProjectStatus: (id, isActive) => {
    const list = getLocalData(STORAGE_KEYS.PETTY_CASH_PROJECTS, initialSeed.petty_cash_projects);
    const updated = list.map(p => p.project_id === id ? { ...p, is_active: isActive } : p);
    setLocalData(STORAGE_KEYS.PETTY_CASH_PROJECTS, updated);
  },

  getPettyCashCategories: () => getLocalData(STORAGE_KEYS.PETTY_CASH_CATEGORIES, initialSeed.petty_cash_categories),
  savePettyCashCategory: (categoryName) => {
    const list = getLocalData(STORAGE_KEYS.PETTY_CASH_CATEGORIES, initialSeed.petty_cash_categories);
    const code = `C${String(list.length + 1).padStart(3, '0')}`;
    const newCat = { category_code: code, category_name: categoryName, is_enabled: true };
    const updated = [...list, newCat];
    setLocalData(STORAGE_KEYS.PETTY_CASH_CATEGORIES, updated);
    return newCat;
  },
  toggleCategoryStatus: (code, isEnabled) => {
    const list = getLocalData(STORAGE_KEYS.PETTY_CASH_CATEGORIES, initialSeed.petty_cash_categories);
    const updated = list.map(c => c.category_code === code ? { ...c, is_enabled: isEnabled } : c);
    setLocalData(STORAGE_KEYS.PETTY_CASH_CATEGORIES, updated);
  },

  getPettyCashClaims: () => getLocalData(STORAGE_KEYS.PETTY_CASH_CLAIMS, initialSeed.petty_cash_claims),
  savePettyCashClaim: (claimObj) => {
    const list = getLocalData(STORAGE_KEYS.PETTY_CASH_CLAIMS, initialSeed.petty_cash_claims);
    const existingIndex = list.findIndex(c => c.claim_no === claimObj.claim_no);
    let updated;
    if (existingIndex >= 0) {
      updated = [...list];
      updated[existingIndex] = { ...updated[existingIndex], ...claimObj };
    } else {
      updated = [claimObj, ...list];
    }
    setLocalData(STORAGE_KEYS.PETTY_CASH_CLAIMS, updated);
    return claimObj;
  },
  updateClaimStatus: (claimNo, newStatus) => {
    const list = getLocalData(STORAGE_KEYS.PETTY_CASH_CLAIMS, initialSeed.petty_cash_claims);
    const updated = list.map(c => c.claim_no === claimNo ? { ...c, current_status: newStatus } : c);
    setLocalData(STORAGE_KEYS.PETTY_CASH_CLAIMS, updated);
  },

  getPettyCashHistory: () => getLocalData(STORAGE_KEYS.PETTY_CASH_HISTORY, initialSeed.petty_cash_history),
  addClaimHistory: (historyObj) => {
    const list = getLocalData(STORAGE_KEYS.PETTY_CASH_HISTORY, initialSeed.petty_cash_history);
    const updated = [...list, { history_id: Date.now(), ...historyObj }];
    setLocalData(STORAGE_KEYS.PETTY_CASH_HISTORY, updated);
  },

  getPettyCashMatrix: () => getLocalData(STORAGE_KEYS.PETTY_CASH_MATRIX, initialSeed.petty_cash_matrix),
  saveApprovalMatrixRule: (ruleObj) => {
    const list = getLocalData(STORAGE_KEYS.PETTY_CASH_MATRIX, initialSeed.petty_cash_matrix);
    const updated = [...list, { matrix_id: Date.now(), ...ruleObj }];
    setLocalData(STORAGE_KEYS.PETTY_CASH_MATRIX, updated);
  },

  getPettyCashLedger: () => getLocalData(STORAGE_KEYS.PETTY_CASH_LEDGER, initialSeed.petty_cash_ledger),

  clearPettyCashData: async () => {
    setLocalData(STORAGE_KEYS.PETTY_CASH_CLAIMS, []);
    setLocalData(STORAGE_KEYS.PETTY_CASH_HISTORY, []);
    setLocalData(STORAGE_KEYS.PETTY_CASH_LEDGER, []);

    if (isSupabaseConfigured()) {
      await supabase.from('tbl_claim_approval_history').delete().neq('history_id', -999);
      await supabase.from('tbl_petty_cash_claims').delete().neq('claim_no', '___NON_EXISTENT___');
      await supabase.from('tbl_account_ledger').delete().neq('ledger_id', -999);
    }
  },

  // Clear All Employee & Attendance Data
  clearAllDatabaseData: async () => {
    setLocalData(STORAGE_KEYS.EMPLOYEES, []);
    setLocalData(STORAGE_KEYS.ATTENDANCE, []);
    setLocalData(STORAGE_KEYS.LEAVES, []);
    setLocalData(STORAGE_KEYS.REGULARIZATION, []);
    setLocalData(STORAGE_KEYS.SOS_LOGS, []);
    setLocalData(STORAGE_KEYS.PETTY_CASH_CLAIMS, []);
    setLocalData(STORAGE_KEYS.PETTY_CASH_HISTORY, []);
    setLocalData(STORAGE_KEYS.PETTY_CASH_LEDGER, []);

    if (isSupabaseConfigured()) {
      await supabase.from('tbl_attendance_logs').delete().neq('emp_id', '___NON_EXISTENT___');
      await supabase.from('tbl_regularization_requests').delete().neq('emp_id', '___NON_EXISTENT___');
      await supabase.from('tbl_leave_entries').delete().neq('emp_id', '___NON_EXISTENT___');
      await supabase.from('tbl_sos_events').delete().neq('branch_id', -999);
      await supabase.from('tbl_employees').delete().neq('emp_id', '___NON_EXISTENT___');
      await supabase.from('tbl_claim_approval_history').delete().neq('history_id', -999);
      await supabase.from('tbl_petty_cash_claims').delete().neq('claim_no', '___NON_EXISTENT___');
      await supabase.from('tbl_account_ledger').delete().neq('ledger_id', -999);
    }
  }
};

// Initialize local store on module load
initStore();
