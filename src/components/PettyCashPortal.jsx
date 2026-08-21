import React, { useState, useEffect, useRef } from 'react';
import {
  DollarSign, FileText, Plus, CheckCircle2, XCircle, AlertCircle, RotateCcw, Clock, Eye,
  Building, Filter, Download, ArrowLeft, Upload, Camera, Shield, Check, X, Layers, Settings, ChevronRight, UserCheck, Lock, RefreshCw
} from 'lucide-react';
import { api } from '../services/supabase';
import { audioService } from '../services/audioService';
import { notificationService } from '../services/notificationService';
import { detectFaceInVideo, extractFaceVectorFromVideo, matchFaceEmbedding } from '../services/faceEngine';

export function PettyCashPortal({ selectedBranchId, onBackToAdmin, platformMode = 'ALL' }) {
  // Determine Platform Isolation: 'MOBILE_INITIATOR' vs 'WEB_APPROVER' vs 'ALL'
  const isNativeMobile = !!(
    window.Capacitor &&
    typeof window.Capacitor.isNativePlatform === 'function' &&
    window.Capacitor.isNativePlatform()
  );

  const activePlatformMode = platformMode !== 'ALL' 
    ? platformMode 
    : (isNativeMobile ? 'MOBILE_INITIATOR' : 'WEB_APPROVER');

  // Active User Role Simulation: 'INITIATOR' | 'APPROVER_L1' | 'APPROVER_L2' | 'ADMIN'
  const [userRole, setUserRole] = useState(activePlatformMode === 'MOBILE_INITIATOR' ? 'INITIATOR' : 'APPROVER_L1');
  
  // Biometric Facial Authentication Gateway State
  const [isBiometricVerified, setIsBiometricVerified] = useState(activePlatformMode !== 'MOBILE_INITIATOR');
  const [isScanningFace, setIsScanningFace] = useState(false);
  const [scanStatus, setScanStatus] = useState('Position face inside camera frame');
  const videoRef = useRef(null);

  const [currentUser, setCurrentUser] = useState({
    emp_id: 'EMP-1042',
    name: 'Sarah Connor',
    role: 'Initiator',
    branch_id: selectedBranchId || 1
  });

  // Active View Mode: 'DASHBOARD' | 'CLAIM_ENTRY' | 'APPROVER_QUEUE' | 'APPROVER_REVIEW' | 'SETUP' | 'LEDGER'
  const [viewMode, setViewMode] = useState(activePlatformMode === 'MOBILE_INITIATOR' ? 'DASHBOARD' : 'APPROVER_QUEUE');

  // Master Data States
  const [projects, setProjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [claims, setClaims] = useState([]);
  const [approvalHistory, setApprovalHistory] = useState([]);
  const [approvalMatrix, setApprovalMatrix] = useState([]);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [branches, setBranches] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Selected Item States
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Form States (Claim Entry / Edit)
  const [claimForm, setClaimForm] = useState({
    claim_no: '',
    project_id: '',
    branch_id: selectedBranchId || '1',
    category_code: '',
    expense_date: new Date().toISOString().split('T')[0],
    invoice_no: '',
    amount: '',
    reasons: '',
    attachment_name: '',
    attachment_data: null
  });

  // Approver Action Form
  const [approverRemarks, setApproverRemarks] = useState('');

  // Maintenance Setup Forms
  const [setupTab, setSetupTab] = useState('MATRIX'); // 'MATRIX' | 'CATEGORIES' | 'PROJECTS'
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectBranchId, setNewProjectBranchId] = useState('1');
  const [matrixForm, setMatrixForm] = useState({
    project_scope: 'ALL',
    amount_constraint: 'GREATER_THAN',
    threshold_value: '5000.00',
    target_approver: 'Approver_L2'
  });

  // Ledger Filter States
  const [ledgerFilterProject, setLedgerFilterProject] = useState('ALL');
  const [ledgerFilterBranch, setLedgerFilterBranch] = useState('ALL');
  const [ledgerFilterYear, setLedgerFilterYear] = useState('2026');

  // Initial Data Load
  useEffect(() => {
    loadPettyCashData();
  }, [selectedBranchId]);

  const loadPettyCashData = () => {
    const pList = api.getPettyCashProjects();
    const cList = api.getPettyCashCategories();
    const clList = api.getPettyCashClaims();
    const hList = api.getPettyCashHistory();
    const mList = api.getPettyCashMatrix();
    const lList = api.getPettyCashLedger();
    const bList = api.getActiveBranches();
    const empList = api.getEmployees();

    setProjects(pList);
    setCategories(cList);
    setClaims(clList);
    setApprovalHistory(hList);
    setApprovalMatrix(mList);
    setLedgerEntries(lList);
    setBranches(bList);
    setEmployees(empList);

    if (pList.length > 0 && !claimForm.project_id) {
      setClaimForm(prev => ({ ...prev, project_id: String(pList[0].project_id) }));
    }
    if (cList.length > 0 && !claimForm.category_code) {
      setClaimForm(prev => ({ ...prev, category_code: cList[0].category_code }));
    }
  };

  // Face Biometric Camera Scanner Handler
  const startCameraScanner = async () => {
    setIsScanningFace(true);
    setScanStatus('Initializing biometric camera feed...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setScanStatus('Align face inside frame for biometric verification...');
    } catch (err) {
      console.error('Camera access error:', err);
      setScanStatus('Camera error: Unable to access camera feed.');
      audioService.notify('Camera permission denied or camera unavailable', 'error');
    }
  };

  const stopCameraScanner = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanningFace(false);
  };

  // Execute Face Biometric Scan Verification
  const handlePerformFaceScan = async () => {
    if (!videoRef.current) return;
    setScanStatus('Scanning face vectors & matching database...');

    try {
      const detectResult = await detectFaceInVideo(videoRef.current);
      if (!detectResult.hasFace) {
        setScanStatus('No face detected in camera frame. Align face clearly.');
        audioService.speak('No face detected. Align face inside frame.');
        return;
      }

      const scannedVector = await extractFaceVectorFromVideo(videoRef.current, detectResult.faceBox);
      if (!scannedVector) {
        setScanStatus('Unable to extract 128D face vector. Hold still.');
        return;
      }

      // Match face against enrolled employee database
      const matched = matchFaceEmbedding(scannedVector, employees, 65);

      if (matched && matched.employee) {
        const emp = matched.employee;
        const fullName = `${emp.first_name} ${emp.last_name}`;
        setCurrentUser({
          emp_id: emp.emp_id,
          name: fullName,
          role: 'Initiator',
          branch_id: emp.branch_id || selectedBranchId || 1
        });
        setIsBiometricVerified(true);
        stopCameraScanner();
        audioService.playBeep('success');
        audioService.speak(`Facial biometric verified. Welcome ${emp.first_name}.`);
        alert(`✅ FACIAL BIOMETRIC VERIFIED!\n\nAuthenticated Employee: ${fullName} (${emp.emp_id})\nRole: Petty Cash Initiator`);
        setViewMode('DASHBOARD');
      } else {
        setScanStatus('FACIAL BIOMETRIC NOT VERIFIED. UNENROLLED OR UNRECOGNIZED USER.');
        audioService.playBeep('error');
        audioService.speak('Facial biometric not verified. Access denied.');
        alert('❌ FACIAL BIOMETRIC NOT VERIFIED!\n\nUnrecognized or un-enrolled employee face. Access to Petty Cash Initiator is blocked.');
      }
    } catch (err) {
      console.error('Face verification error:', err);
      setScanStatus('Scan error: ' + err.message);
    }
  };

  // Demo Authentication Fallback (for immediate testing without physical camera faces)
  const handleDemoAuthenticate = (empId = 'EMP-1042', name = 'Sarah Connor') => {
    setCurrentUser({
      emp_id: empId,
      name: name,
      role: 'Initiator',
      branch_id: selectedBranchId || 1
    });
    setIsBiometricVerified(true);
    stopCameraScanner();
    audioService.playBeep('success');
    audioService.speak(`Identity verified for ${name}. Welcome to Petty Cash Portal.`);
    alert(`✅ FACIAL BIOMETRIC VERIFIED (DEMO AUTH)!\n\nEmployee: ${name} (${empId})\nRole: Petty Cash Initiator`);
    setViewMode('DASHBOARD');
  };

  // Switch User Role Simulation (Web Mode)
  const handleRoleChange = (role) => {
    setUserRole(role);
    if (role === 'INITIATOR') {
      setCurrentUser({ emp_id: 'EMP-1042', name: 'Sarah Connor', role: 'Initiator', branch_id: selectedBranchId || 1 });
      if (!isBiometricVerified && activePlatformMode === 'MOBILE_INITIATOR') {
        // Enforce face scan gateway
      } else {
        setViewMode('DASHBOARD');
      }
    } else if (role === 'APPROVER_L1') {
      setCurrentUser({ emp_id: 'EMP-1001', name: 'Anita Roy (Respective Manager - Approver 01)', role: 'Approver_L1', branch_id: selectedBranchId || 1 });
      setViewMode('APPROVER_QUEUE');
    } else if (role === 'APPROVER_L2') {
      setCurrentUser({ emp_id: 'EMP-1002', name: 'David Miller (Superior Manager - Approver 02)', role: 'Approver_L2', branch_id: selectedBranchId || 1 });
      setViewMode('APPROVER_QUEUE');
    } else if (role === 'ADMIN') {
      setCurrentUser({ emp_id: 'EMP-ADMIN', name: 'System Administrator', role: 'Admin', branch_id: selectedBranchId || 1 });
      setViewMode('SETUP');
    }
    audioService.notify(`Switched session to ${role === 'APPROVER_L1' ? 'Approver 01 (Respective Manager)' : role === 'APPROVER_L2' ? 'Approver 02 (Superior Manager)' : role}`);
  };

  // Compute Account Ledger Metrics for Current Month (August 2026)
  const computeLedgerMetrics = (projectId, branchId) => {
    const monthLedger = ledgerEntries.find(l =>
      String(l.year) === '2026' &&
      l.month === 'August' &&
      (projectId === 'ALL' || String(l.project_id) === String(projectId))
    ) || {
      monthly_limit: 0,
      opening_balance: 0,
      spend: 0,
      claim_raised: 0,
      ending_balance: 0
    };

    // Calculate sum of approved claims in August 2026
    const approvedSum = claims
      .filter(c => c.current_status === 'Approved')
      .reduce((sum, c) => sum + Number(c.amount || 0), 0);

    // Calculate sum of pending / in-progress claims
    const pendingSum = claims
      .filter(c => c.current_status === 'Pending' || c.current_status === 'In-Progress')
      .reduce((sum, c) => sum + Number(c.amount || 0), 0);

    const openingBal = Number(monthLedger.opening_balance || 0);
    const spend = approvedSum || Number(monthLedger.spend || 0);
    const raised = pendingSum;
    const currentBal = openingBal - spend - raised;

    return {
      opening_balance: openingBal,
      claim_raised: raised,
      spend: spend,
      current_balance: currentBal
    };
  };

  const metrics = computeLedgerMetrics(claimForm.project_id || 'ALL', claimForm.branch_id);

  // Generate Unique Claim ID: EmployeeID + DDMMYYHHMMSS
  const generateClaimNo = (empId) => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const cleanEmp = (empId || 'EMP1042').replace(/[^a-zA-Z0-9]/g, '');
    return `${cleanEmp}${dd}${mm}${yy}${hh}${min}${ss}`;
  };

  // Open Claim Entry Form
  const handleOpenNewClaim = () => {
    const newNo = generateClaimNo(currentUser.emp_id);
    setClaimForm({
      claim_no: newNo,
      project_id: projects.length > 0 ? String(projects[0].project_id) : '1',
      branch_id: selectedBranchId || '1',
      category_code: categories.length > 0 ? categories[0].category_code : 'C001',
      expense_date: new Date().toISOString().split('T')[0],
      invoice_no: '',
      amount: '',
      reasons: '',
      attachment_name: 'receipt_sample.pdf',
      attachment_data: null
    });
    setSelectedClaim(null);
    setViewMode('CLAIM_ENTRY');
  };

  // Edit / View Existing Claim
  const handleEditClaim = (claimObj) => {
    setSelectedClaim(claimObj);
    setClaimForm({
      claim_no: claimObj.claim_no,
      project_id: String(claimObj.project_id || 1),
      branch_id: String(claimObj.branch_id || 1),
      category_code: claimObj.category_code,
      expense_date: claimObj.expense_date,
      invoice_no: claimObj.invoice_no,
      amount: String(claimObj.amount),
      reasons: claimObj.reasons,
      attachment_name: claimObj.attachment_path || 'receipt.pdf',
      attachment_data: null
    });
    setViewMode('CLAIM_ENTRY');
  };

  // Submit Claim (Create or Update)
  const handleSubmitClaim = (e) => {
    e.preventDefault();

    if (!claimForm.amount || Number(claimForm.amount) <= 0) {
      alert('Enter a valid positive amount.');
      return;
    }
    if (!claimForm.invoice_no) {
      alert('Invoice / Bill Number is mandatory.');
      return;
    }
    if (!claimForm.reasons) {
      alert('Expense Reasons / Remarks are mandatory.');
      return;
    }

    // Check future date constraint
    const today = new Date().toISOString().split('T')[0];
    if (claimForm.expense_date > today) {
      alert('Expense date cannot be in the future.');
      return;
    }

    try {
      const savedClaim = api.savePettyCashClaim({
        ...claimForm,
        emp_id: currentUser.emp_id,
        current_status: 'Pending', // New claims start as Pending
        created_at: new Date().toISOString()
      });

      // Add to audit history
      api.addClaimHistory({
        claim_no: savedClaim.claim_no,
        approver_id: currentUser.emp_id,
        approver_name: currentUser.name,
        approval_level: 'Level 0',
        action_taken: 'Initiated',
        remarks: 'Expense Claim Submitted by Initiator',
        action_timestamp: new Date().toLocaleString()
      });

      loadPettyCashData();
      setViewMode('DASHBOARD');
      audioService.playPettyCashVoiceover(savedClaim.amount, 'SUBMITTED');
      alert(`✅ Expense Claim ${savedClaim.claim_no} submitted successfully!`);
    } catch (err) {
      alert('Error submitting claim: ' + err.message);
    }
  };

  // Approver Action Handler (Approver 01: Respective Mgr -> Approver 02: Superior Mgr)
  const handleApproverDecision = (actionType) => {
    if (!selectedClaim) return;

    if ((actionType === 'Reject' || actionType === 'Send Back') && !approverRemarks.trim()) {
      alert('Approver remarks are required for rejection or send-back.');
      return;
    }

    try {
      const isL1 = userRole === 'APPROVER_L1';
      const isL2 = userRole === 'APPROVER_L2';

      const claimBranchId = Number(selectedClaim.branch_id || 1);
      const claimBranch = branches.find(b => Number(b.branch_id) === claimBranchId);
      const hasSuperiorManager = !!(claimBranch && claimBranch.superior_manager_id && claimBranch.superior_manager_id.trim() !== '');

      let newStatus = selectedClaim.current_status;
      let historyLevel = isL1 ? 'Approver 01 (Respective Manager)' : 'Approver 02 (Superior Manager)';
      let historyRemarks = approverRemarks;

      if (actionType === 'Approve') {
        if (isL1) {
          // Rule 2 & 3: If Superior Manager is configured, route to Superior Manager (Pending L2 / In-Progress)
          if (hasSuperiorManager) {
            newStatus = 'In-Progress'; // Moves to Approver 02 (Superior Manager) queue
            if (!historyRemarks) historyRemarks = `Approved by Approver 01 (Respective Manager) - Routed to Approver 02 (Superior Manager: ${claimBranch.superior_manager_name || claimBranch.superior_manager_id})`;
          } else {
            // Rule 4: If Approver 02 is not configured, completed after approval by Approver 01
            newStatus = 'Approved';
            if (!historyRemarks) historyRemarks = 'Fully Approved by Approver 01 (Respective Manager - Single Tier)';
          }
        } else if (isL2) {
          // Approver 02 approval -> Completed!
          newStatus = 'Approved';
          if (!historyRemarks) historyRemarks = 'Final Approval Completed by Approver 02 (Superior Manager)';
        }
      } else if (actionType === 'Send Back') {
        newStatus = 'Send Back';
        if (!historyRemarks) historyRemarks = 'Sent back for revisions';
      } else if (actionType === 'Reject') {
        newStatus = 'Rejected';
        if (!historyRemarks) historyRemarks = 'Rejected by approver';
      }

      // Update Claim Status
      api.updateClaimStatus(selectedClaim.claim_no, newStatus);

      // Add History Log
      api.addClaimHistory({
        claim_no: selectedClaim.claim_no,
        approver_id: currentUser.emp_id,
        approver_name: currentUser.name,
        approval_level: historyLevel,
        action_taken: actionType === 'Approve' ? (newStatus === 'Approved' ? 'Approved (Completed)' : 'Approved (Routed to L2)') : actionType,
        remarks: historyRemarks,
        action_timestamp: new Date().toLocaleString()
      });

      // Trigger Mobile APK & Web In-App Pop-up Notification
      let notifAction = 'APPROVED';
      if (actionType === 'Approve') {
        notifAction = newStatus === 'Approved' ? 'APPROVED' : 'APPROVED_L1';
      } else if (actionType === 'Reject') {
        notifAction = 'REJECTED';
      } else if (actionType === 'Send Back') {
        notifAction = 'SEND_BACK';
      }

      notificationService.notifyPettyCash({
        action: notifAction,
        claimNo: selectedClaim.claim_no,
        empId: selectedClaim.emp_id,
        empName: selectedClaim.emp_name,
        amount: selectedClaim.amount,
        approverName: currentUser.name,
        branchName: claimBranch ? claimBranch.branch_name : 'MAIN'
      });

      setApproverRemarks('');
      loadPettyCashData();
      setViewMode('APPROVER_QUEUE');
      alert(`✅ Claim ${selectedClaim.claim_no} status updated to [${newStatus}]!`);
    } catch (err) {
      alert('Error updating claim status: ' + err.message);
    }
  };

  // Master Setup Handlers
  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    api.savePettyCashCategory(newCategoryName.trim());
    setNewCategoryName('');
    loadPettyCashData();
    alert('✅ New Expense Category added successfully!');
  };

  const handleToggleCategory = (code, isEnabled) => {
    api.toggleCategoryStatus(code, isEnabled);
    loadPettyCashData();
  };

  const handleAddProject = (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    api.savePettyCashProject(newProjectName.trim(), newProjectBranchId);
    setNewProjectName('');
    loadPettyCashData();
    alert('✅ New Project created successfully!');
  };

  const handleToggleProject = (id, isActive) => {
    api.toggleProjectStatus(id, isActive);
    loadPettyCashData();
  };

  const handleSaveMatrixRule = (e) => {
    e.preventDefault();
    api.saveApprovalMatrixRule(matrixForm);
    loadPettyCashData();
    alert('✅ Approval Matrix rule saved!');
  };

  const handleClearPettyCash = async () => {
    if (window.confirm('Are you sure you want to clear ALL petty cash claims, history, and ledger logs?')) {
      await api.clearPettyCashData();
      loadPettyCashData();
      alert('🎉 All sample petty cash claims and logs cleared successfully!');
    }
  };

  // Filter Claims for Approver 01 (Respective Manager) vs Approver 02 (Superior Manager)
  const l1PendingClaims = claims.filter(c => c.current_status === 'Pending' || c.current_status === 'Pending L1');
  const l2PendingClaims = claims.filter(c => c.current_status === 'In-Progress' || c.current_status === 'Pending L2');

  const pendingApprovalsList = userRole === 'APPROVER_L1' ? l1PendingClaims : l2PendingClaims;

  // Filter History for Selected Claim
  const currentClaimHistory = approvalHistory.filter(h =>
    selectedClaim && h.claim_no === selectedClaim.claim_no
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--app-bg, #000000)', color: 'var(--text-white, #ffffff)', minHeight: '100vh' }}>
      
      {/* TOP PORTAL ROLE & NAVIGATION BAR */}
      <div style={{ background: 'var(--app-surface-bg, #0f172a)', borderBottom: '1px solid var(--border-subtle)', padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={onBackToAdmin}
            className="branch-select-pill"
            style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid var(--border-subtle)', padding: '6px 12px', whiteSpace: 'nowrap' }}
          >
            <ArrowLeft size={16} /> <span>Back</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <DollarSign size={24} style={{ color: '#10b981' }} />
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}>
                {activePlatformMode === 'MOBILE_INITIATOR' ? '📱 PETTY CASH INITIATOR (MOBILE APK)' : '🖥️ PETTY CASH APPROVER PORTAL (WEB APP)'}
              </h2>
              <span style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: 700, letterSpacing: '0.08em' }}>
                {activePlatformMode === 'MOBILE_INITIATOR' ? 'FACE BIOMETRIC AUTHENTICATED ENTRY' : 'LEVEL 1 & LEVEL 2 MANAGEMENT WORKFLOW'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECONDARY NAVIGATION MENU BAR */}
      <div style={{ background: 'var(--app-card-bg, #1e293b)', borderBottom: '1px solid var(--border-subtle)', padding: '0.5rem 1.25rem', display: 'flex', gap: 10, overflowX: 'auto' }}>
        
        {/* INITIATOR MENU TABS (MOBILE APK ONLY) */}
        {activePlatformMode === 'MOBILE_INITIATOR' && isBiometricVerified && (
          <>
            <button
              onClick={() => setViewMode('DASHBOARD')}
              style={{
                padding: '8px 16px', borderRadius: 8, border: 'none',
                background: viewMode === 'DASHBOARD' ? '#0284c7' : 'transparent',
                color: viewMode === 'DASHBOARD' ? '#fff' : '#94a3b8',
                fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
              }}
            >
              <FileText size={16} /> My Dashboard
            </button>
            <button
              onClick={handleOpenNewClaim}
              style={{
                padding: '8px 16px', borderRadius: 8, border: 'none',
                background: viewMode === 'CLAIM_ENTRY' ? '#0284c7' : 'transparent',
                color: viewMode === 'CLAIM_ENTRY' ? '#fff' : '#94a3b8',
                fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
              }}
            >
              <Plus size={16} /> Raise Expense Claim
            </button>
            <button
              onClick={() => {
                setIsBiometricVerified(false);
                setViewMode('FACE_GATEWAY');
              }}
              style={{
                padding: '8px 14px', borderRadius: 8, border: '1px solid #ef4444',
                background: 'rgba(239, 68, 68, 0.15)', color: '#f87171',
                fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', marginLeft: 'auto'
              }}
            >
              <Lock size={16} /> Lock Session
            </button>
          </>
        )}

        {/* APPROVER & MANAGER MENU TABS (WEB APP ONLY) */}
        {activePlatformMode !== 'MOBILE_INITIATOR' && (
          <>
            <button
              onClick={() => {
                setUserRole('APPROVER_L1');
                setViewMode('APPROVER_QUEUE');
              }}
              style={{
                padding: '8px 16px', borderRadius: 8, border: 'none',
                background: (userRole === 'APPROVER_L1' && viewMode === 'APPROVER_QUEUE') ? '#059669' : 'transparent',
                color: (userRole === 'APPROVER_L1' && viewMode === 'APPROVER_QUEUE') ? '#fff' : '#94a3b8',
                fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
              }}
            >
              <Clock size={16} /> 🛡️ Approver 01: Respective Manager Queue ({l1PendingClaims.length})
            </button>

            <button
              onClick={() => {
                setUserRole('APPROVER_L2');
                setViewMode('APPROVER_QUEUE');
              }}
              style={{
                padding: '8px 16px', borderRadius: 8, border: 'none',
                background: (userRole === 'APPROVER_L2' && viewMode === 'APPROVER_QUEUE') ? '#7c3aed' : 'transparent',
                color: (userRole === 'APPROVER_L2' && viewMode === 'APPROVER_QUEUE') ? '#fff' : '#94a3b8',
                fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
              }}
            >
              <Clock size={16} /> ⚖️ Approver 02: Superior Manager Queue ({l2PendingClaims.length})
            </button>

            <button
              onClick={() => setViewMode('LEDGER')}
              style={{
                padding: '8px 16px', borderRadius: 8, border: 'none',
                background: viewMode === 'LEDGER' ? '#0284c7' : 'transparent',
                color: viewMode === 'LEDGER' ? '#fff' : '#94a3b8',
                fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
              }}
            >
              <Layers size={16} /> Account Ledger Engine
            </button>

            <button
              onClick={() => setViewMode('SETUP')}
              style={{
                padding: '8px 16px', borderRadius: 8, border: 'none',
                background: viewMode === 'SETUP' ? '#d97706' : 'transparent',
                color: viewMode === 'SETUP' ? '#fff' : '#94a3b8',
                fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
              }}
            >
              <Settings size={16} /> Master Setup
            </button>
          </>
        )}
      </div>

      {/* PORTAL MAIN CONTENT BODY */}
      <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>

        {/* =========================================================================
           FACE BIOMETRIC SCANNER VERIFICATION GATEWAY (MOBILE APK ENTRY)
           ========================================================================= */}
        {(!isBiometricVerified && userRole === 'INITIATOR') && (
          <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
            <div className="form-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', border: '1.5px solid #0284c7' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(2, 132, 199, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
                <Camera size={32} />
              </div>

              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>FACE BIOMETRIC VERIFICATION GATEWAY</h3>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', color: 'var(--text-gray, #94a3b8)' }}>
                  Scan face to verify identity before entering Petty Cash Initiator
                </p>
              </div>

              {/* CAMERA FEED SCANNER BOX */}
              <div style={{ position: 'relative', width: '100%', height: 260, background: '#000', borderRadius: 16, overflow: 'hidden', border: '2px solid #0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {!isScanningFace && (
                  <div style={{ position: 'absolute', color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: 20 }}>
                    Camera feed idle. Tap [Start Camera Scanner] below.
                  </div>
                )}
                {/* SCANNER GUIDELINE OVERLAY */}
                <div style={{ position: 'absolute', width: 170, height: 210, border: '2px dashed #0284c7', borderRadius: '50%', pointerEvents: 'none' }} />
              </div>

              <div style={{ fontSize: '0.82rem', color: '#0284c7', fontWeight: 700, padding: '8px 14px', background: 'rgba(2,132,199,0.1)', borderRadius: 8, width: '100%' }}>
                Status: {scanStatus}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
                {!isScanningFace ? (
                  <button
                    onClick={startCameraScanner}
                    style={{ width: '100%', padding: 12, background: 'linear-gradient(135deg, #0284c7, #38bdf8)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    <Camera size={18} /> Start Camera Scanner
                  </button>
                ) : (
                  <button
                    onClick={handlePerformFaceScan}
                    style={{ width: '100%', padding: 12, background: 'linear-gradient(135deg, #059669, #10b981)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    <UserCheck size={18} /> Verify Face Biometric
                  </button>
                )}

                <button
                  onClick={() => handleDemoAuthenticate('EMP-1042', 'Sarah Connor')}
                  style={{ width: '100%', padding: 10, background: '#334155', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}
                >
                  ⚡ Demo Instant Verification (Sarah Connor - EMP-1042)
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* =========================================================================
           SCREEN 01: PETTY CASH INITIATOR DASHBOARD (MOBILE APK)
           ========================================================================= */}
        {(isBiometricVerified && userRole === 'INITIATOR' && viewMode === 'DASHBOARD') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>Petty Cash Initiator Dashboard</h3>
                <span style={{ fontSize: '0.82rem', color: '#10b981', fontWeight: 700 }}>
                  Biometric Authenticated User: <strong>{currentUser.name} ({currentUser.emp_id})</strong>
                </span>
              </div>
              <button
                onClick={handleOpenNewClaim}
                style={{
                  padding: '10px 18px', background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                  color: '#fff', border: 'none', borderRadius: 10, fontWeight: 800,
                  fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.4)'
                }}
              >
                <Plus size={18} /> Raise Expense
              </button>
            </div>

            {/* SUMMARY METRICS CARDS (CURRENT MONTH: AUGUST 2026) */}
            <div className="form-card" style={{ padding: '1.25rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#0284c7' }}>
                Summary Metrics (Current Month: August 2026)
              </h4>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Branch</th>
                      <th>Opening Bal (A)</th>
                      <th>Claim Raised (B)</th>
                      <th>Current Bal (A - B)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 700 }}>
                        {projects.find(p => String(p.project_id) === String(claimForm.project_id))?.project_name || 'Orion'}
                      </td>
                      <td>Downtown HQ (#001)</td>
                      <td style={{ color: '#0284c7', fontWeight: 700 }}>₹ {metrics.opening_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td style={{ color: '#f59e0b', fontWeight: 700 }}>₹ {metrics.claim_raised.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td style={{ color: '#10b981', fontWeight: 800, fontSize: '1rem' }}>₹ {metrics.current_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* MY RECENT CLAIMS TABLE */}
            <div className="form-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>My Recent Claims</h4>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-gray, #94a3b8)' }}>Total Claims: {claims.length}</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Claim No</th>
                      <th>Category</th>
                      <th>Amount (Rs.)</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {claims.map((c) => {
                      let statusBg = 'rgba(255, 255, 255, 0.1)';
                      let statusColor = '#fff';
                      if (c.current_status === 'Approved') { statusBg = 'rgba(16, 185, 129, 0.2)'; statusColor = '#10b981'; }
                      else if (c.current_status === 'In-Progress') { statusBg = 'rgba(245, 158, 11, 0.2)'; statusColor = '#f59e0b'; }
                      else if (c.current_status === 'Send Back') { statusBg = 'rgba(234, 179, 8, 0.2)'; statusColor = '#eab308'; }
                      else if (c.current_status === 'Pending') { statusBg = 'rgba(56, 189, 248, 0.2)'; statusColor = '#0284c7'; }
                      else if (c.current_status === 'Rejected') { statusBg = 'rgba(239, 68, 68, 0.2)'; statusColor = '#ef4444'; }

                      const catObj = categories.find(cat => cat.category_code === c.category_code);

                      return (
                        <tr key={c.claim_no}>
                          <td style={{ fontWeight: 700, fontFamily: 'monospace', color: '#0284c7' }}>{c.claim_no}</td>
                          <td>{catObj ? catObj.category_name : c.category_code}</td>
                          <td style={{ fontWeight: 700 }}>₹ {Number(c.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td>
                            <span style={{ padding: '4px 10px', borderRadius: 9999, background: statusBg, color: statusColor, fontSize: '0.75rem', fontWeight: 800 }}>
                              {c.current_status}
                            </span>
                          </td>
                          <td>
                            <button
                              onClick={() => handleEditClaim(c)}
                              style={{ padding: '4px 10px', background: 'var(--app-surface-bg, #0f172a)', color: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 6, cursor: 'pointer', fontSize: '0.78rem' }}
                            >
                              {c.current_status === 'Send Back' ? '✏️ Edit & Resubmit' : '👁️ View'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {claims.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                          No expense claims submitted yet. Click [Raise Expense] to create your first claim!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
           SCREEN 02: PETTY CASH CLAIM ENTRY / EDIT PAGE
           ========================================================================= */}
        {viewMode === 'CLAIM_ENTRY' && (
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem' }}>
              <button
                onClick={() => setViewMode('DASHBOARD')}
                style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                &lt; Back to Dashboard
              </button>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                {selectedClaim ? `EDIT CLAIM: ${selectedClaim.claim_no}` : 'PETTY CASH CLAIM ENTRY'}
              </h3>
            </div>

            <div className="form-card">
              <form onSubmit={handleSubmitClaim} className="grid-form">
                
                <div className="form-group">
                  <label>Project*</label>
                  <select
                    value={claimForm.project_id}
                    onChange={(e) => setClaimForm({ ...claimForm, project_id: e.target.value })}
                    required
                  >
                    {projects.map(p => (
                      <option key={p.project_id} value={p.project_id}>{p.project_name}</option>
                    ))}
                    {projects.length === 0 && <option value="1">Orion Main Project</option>}
                  </select>
                </div>

                <div className="form-group">
                  <label>Branch*</label>
                  <select
                    value={claimForm.branch_id}
                    onChange={(e) => setClaimForm({ ...claimForm, branch_id: e.target.value })}
                    required
                  >
                    {branches.map(b => (
                      <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group full-width" style={{ background: 'var(--app-surface-bg, #0f172a)', padding: 12, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-gray, #94a3b8)' }}>Current Month Balance (Auto-calculated):</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#10b981' }}>
                    ₹ {metrics.current_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="form-group">
                  <label>Date of Expense*</label>
                  <input
                    type="date"
                    max={new Date().toISOString().split('T')[0]}
                    value={claimForm.expense_date}
                    onChange={(e) => setClaimForm({ ...claimForm, expense_date: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Category*</label>
                  <select
                    value={claimForm.category_code}
                    onChange={(e) => setClaimForm({ ...claimForm, category_code: e.target.value })}
                    required
                  >
                    {categories.filter(c => c.is_enabled !== false).map(c => (
                      <option key={c.category_code} value={c.category_code}>{c.category_name}</option>
                    ))}
                    {categories.length === 0 && (
                      <>
                        <option value="C001">Mobile Claim</option>
                        <option value="C003">Food Expense</option>
                        <option value="C004">Travel Expense</option>
                        <option value="C005">Material Purchase</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label>Invoice / Bill No*</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-882910"
                    value={claimForm.invoice_no}
                    onChange={(e) => setClaimForm({ ...claimForm, invoice_no: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Amount (Rs.)*</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 8000.00"
                    value={claimForm.amount}
                    onChange={(e) => setClaimForm({ ...claimForm, amount: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label>Reasons / Remarks*</label>
                  <textarea
                    rows={3}
                    placeholder="Enter details about transportation, material, or bill details..."
                    value={claimForm.reasons}
                    onChange={(e) => setClaimForm({ ...claimForm, reasons: e.target.value })}
                    required
                    style={{ padding: 10, background: 'var(--app-surface-bg, #0f172a)', border: '1px solid var(--border-subtle)', borderRadius: 6, color: '#fff' }}
                  />
                </div>

                <div className="form-group full-width">
                  <label>File Attachment (PDF, Word, JPEG, PNG ≤ 5MB)</label>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input
                      type="text"
                      readOnly
                      value={claimForm.attachment_name || 'No file selected'}
                      style={{ flex: 1 }}
                    />
                    <label style={{ padding: '9px 14px', background: '#334155', color: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Upload size={14} /> Choose File
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setClaimForm({ ...claimForm, attachment_name: e.target.files[0].name });
                          }
                        }}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                </div>

                {/* READ-ONLY APPROVER AUDIT BOX */}
                {selectedClaim && (
                  <div className="form-group full-width" style={{ background: 'var(--app-surface-bg, #0f172a)', padding: 14, borderRadius: 8, border: '1px solid var(--border-subtle)', marginTop: 8 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase' }}>
                      READ-ONLY APPROVER AUDIT
                    </span>
                    <div style={{ marginTop: 8, fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {currentClaimHistory.map((h, i) => (
                        <div key={i} style={{ borderBottom: '1px borderless #334155', paddingBottom: 4 }}>
                          <strong>{h.approval_level} ({h.approver_name}):</strong> <span style={{ color: '#f59e0b' }}>[{h.action_taken}]</span> {h.remarks || 'No comments'}
                        </div>
                      ))}
                      {currentClaimHistory.length === 0 && <span style={{ color: '#94a3b8' }}>No approver actions logged yet.</span>}
                    </div>
                  </div>
                )}

                {/* VIEW APPROVAL HISTORY LINK */}
                {selectedClaim && (
                  <div className="form-group full-width">
                    <button
                      type="button"
                      onClick={() => setShowHistoryModal(true)}
                      style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', textAlign: 'left', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'underline' }}
                    >
                      🔗 View Approval History Link
                    </button>
                  </div>
                )}

                <div className="form-group full-width" style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                  {(!selectedClaim || selectedClaim.current_status === 'Pending' || selectedClaim.current_status === 'Send Back') && (
                    <button
                      type="submit"
                      style={{ flex: 1, padding: 12, background: 'linear-gradient(135deg, #0284c7, #38bdf8)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}
                    >
                      💾 SUBMIT
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setViewMode('DASHBOARD')}
                    style={{ flex: 1, padding: 12, background: '#334155', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
                  >
                    ❌ CLOSE
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
           SCREEN 03: APPROVAL STATUS HISTORY MODAL OVERLAY
           ========================================================================= */}
        {showHistoryModal && selectedClaim && (
          <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div className="modal-card" style={{ background: '#1e293b', color: '#fff', borderRadius: 16, padding: 24, maxWidth: 680, width: '100%', border: '1px solid #0284c7' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 18 }}>APPROVAL STATUS HISTORY</h3>
                <button onClick={() => setShowHistoryModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              <p style={{ fontSize: 13, color: '#0284c7', marginBottom: 16, fontFamily: 'monospace' }}>
                Claim No: {selectedClaim.claim_no}
              </p>

              <div style={{ overflowX: 'auto', marginBottom: 20 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Sl#</th>
                      <th>Request Raised On</th>
                      <th>Approver ID / Name</th>
                      <th>Level</th>
                      <th>Status</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentClaimHistory.map((h, index) => (
                      <tr key={index}>
                        <td>{String(index + 1).padStart(2, '0')}</td>
                        <td>{h.action_timestamp}</td>
                        <td>{h.approver_name} ({h.approver_id})</td>
                        <td>{h.approval_level}</td>
                        <td>
                          <span style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(56,189,248,0.2)', color: '#0284c7', fontSize: '0.75rem', fontWeight: 700 }}>
                            {h.action_taken}
                          </span>
                        </td>
                        <td>{h.remarks || '-'}</td>
                      </tr>
                    ))}
                    {currentClaimHistory.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8' }}>No approval history recorded.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <button
                onClick={() => setShowHistoryModal(false)}
                style={{ width: '100%', padding: 10, background: '#334155', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
              >
                ❌ Close
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
           SCREEN 04: PETTY CASH APPROVER DASHBOARD QUEUE (WEB APP)
           ========================================================================= */}
        {viewMode === 'APPROVER_QUEUE' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>Petty Cash Approver Portal</h3>
                <span style={{ fontSize: '0.82rem', color: userRole === 'APPROVER_L1' ? '#10b981' : '#c084fc', fontWeight: 700 }}>
                  {userRole === 'APPROVER_L1'
                    ? 'Active Queue: Approver 01 (Respective Manager - Mandatory)'
                    : 'Active Queue: Approver 02 (Superior Manager - Conditional/Optional)'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', color: '#10b981', padding: '6px 14px', borderRadius: 9999, fontWeight: 800, fontSize: '0.82rem' }}>
                  L1 Pending: {l1PendingClaims.length}
                </div>
                <div style={{ background: 'rgba(192, 132, 252, 0.2)', border: '1px solid #c084fc', color: '#c084fc', padding: '6px 14px', borderRadius: 9999, fontWeight: 800, fontSize: '0.82rem' }}>
                  L2 Pending: {l2PendingClaims.length}
                </div>
              </div>
            </div>

            <div className="form-card">
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 800, textTransform: 'uppercase', color: '#0284c7' }}>
                {userRole === 'APPROVER_L1' ? 'Pending Approver 01 (Respective Manager) Queue' : 'Pending Approver 02 (Superior Manager) Queue'}
              </h4>

              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Claim No</th>
                      <th>Raised By & Branch</th>
                      <th>Project & Category</th>
                      <th>Amount</th>
                      <th>Approval Routing Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingApprovalsList.map(c => {
                      const projectObj = projects.find(p => p.project_id === c.project_id);
                      const catObj = categories.find(cat => cat.category_code === c.category_code);
                      const claimBranch = branches.find(b => Number(b.branch_id) === Number(c.branch_id || 1));
                      const branchName = claimBranch ? claimBranch.branch_name : 'MAIN';

                      return (
                        <tr key={c.claim_no}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0284c7' }}>{c.claim_no}</td>
                          <td>
                            <strong>{c.emp_name || c.emp_id}</strong>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>{c.emp_id}</div>
                            <div style={{ fontSize: '0.75rem', color: '#38bdf8' }}>🏢 {branchName}</div>
                          </td>
                          <td>
                            <div><strong>{projectObj ? projectObj.project_name : 'Orion'}</strong></div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{catObj ? catObj.category_name : c.category_code}</div>
                          </td>
                          <td style={{ fontWeight: 800, color: '#10b981' }}>₹ {Number(c.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td>
                            {userRole === 'APPROVER_L1' ? (
                              <div>
                                <span style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(245,158,11,0.2)', color: '#f59e0b', fontSize: '0.75rem', fontWeight: 800 }}>
                                  ⏳ Pending Approver 01
                                </span>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>
                                  Respective Mgr: <strong>{claimBranch ? (claimBranch.manager_name || claimBranch.respective_manager_id) : 'Branch Mgr'}</strong>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <span style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(192,132,252,0.2)', color: '#c084fc', fontSize: '0.75rem', fontWeight: 800 }}>
                                  ⏳ Pending Approver 02
                                </span>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>
                                  Superior Mgr: <strong>{claimBranch ? (claimBranch.superior_manager_name || claimBranch.superior_manager_id) : 'Superior Mgr'}</strong>
                                </div>
                              </div>
                            )}
                          </td>
                          <td>
                            <button
                              onClick={() => {
                                setSelectedClaim(c);
                                setViewMode('APPROVER_REVIEW');
                              }}
                              style={{ padding: '6px 14px', background: 'linear-gradient(135deg, #059669, #10b981)', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}
                            >
                              [Review & Action]
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {pendingApprovalsList.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                          🎉 No pending claims awaiting your approval in this queue!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
           SCREEN 05: PETTY CASH APPROVER REVIEW SCREEN (WEB APP)
           ========================================================================= */}
        {viewMode === 'APPROVER_REVIEW' && selectedClaim && (() => {
          const claimBranch = branches.find(b => Number(b.branch_id) === Number(selectedClaim.branch_id || 1));
          const hasSuperiorManager = !!(claimBranch && claimBranch.superior_manager_id && claimBranch.superior_manager_id.trim() !== '');

          return (
            <div style={{ maxWidth: 760, margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem' }}>
                <button
                  onClick={() => setViewMode('APPROVER_QUEUE')}
                  style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  &lt; Back to Approvals
                </button>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>CLAIM REVIEW & APPROVAL MATRIX</h3>
              </div>

              <div className="form-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ background: 'var(--app-surface-bg, #0f172a)', padding: 16, borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0284c7' }}>Claim No: {selectedClaim.claim_no}</span>
                    <span style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>Raised By: <strong>{selectedClaim.emp_id}</strong></span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, fontSize: '0.85rem' }}>
                    <div>Assigned Branch: <strong>{claimBranch ? claimBranch.branch_name : 'MAIN'}</strong></div>
                    <div>Expense Date: <strong>{selectedClaim.expense_date}</strong></div>
                    <div>Project: <strong>{projects.find(p => p.project_id === selectedClaim.project_id)?.project_name || 'Orion'}</strong></div>
                    <div>Category: <strong>{categories.find(c => c.category_code === selectedClaim.category_code)?.category_name || selectedClaim.category_code}</strong></div>
                    <div>Invoice No: <strong>{selectedClaim.invoice_no}</strong></div>
                  </div>

                  {/* BRANCH MANAGER APPROVAL MATRIX ROUTING DISPLAY */}
                  <div style={{ marginTop: 12, padding: 12, background: 'rgba(2, 132, 199, 0.1)', border: '1px solid rgba(2, 132, 199, 0.3)', borderRadius: 8, fontSize: '0.82rem' }}>
                    <div style={{ color: '#38bdf8', fontWeight: 800, marginBottom: 4 }}>📋 Multi-Tier Approval Matrix Configuration:</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div>• <strong>Approver 01 (Respective Manager - Mandatory):</strong> <span style={{ color: '#38bdf8' }}>{claimBranch?.respective_manager_id ? `${claimBranch.respective_manager_id} - ${claimBranch.manager_name}` : (claimBranch?.manager_name || 'Assigned Branch Manager')}</span></div>
                      <div>• <strong>Approver 02 (Superior Manager - Optional):</strong> <span style={{ color: '#c084fc' }}>{hasSuperiorManager ? `${claimBranch.superior_manager_id} - ${claimBranch.superior_manager_name}` : 'Not Configured (Single-Tier Direct Approval)'}</span></div>
                    </div>
                  </div>

                  <div style={{ marginTop: 12, fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>
                    Claim Amount: ₹ {Number(selectedClaim.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ marginTop: 8, fontSize: '0.85rem', color: '#cbd5e1' }}>
                    Reason: {selectedClaim.reasons}
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Attachment: </span>
                    <button
                      onClick={() => alert(`Opening receipt document: ${selectedClaim.attachment_path || 'receipt.pdf'}`)}
                      style={{ padding: '4px 10px', background: '#334155', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}
                    >
                      📄 View_Receipt.pdf
                    </button>
                  </div>
                </div>

                {/* APPROVER DECISION SECTION */}
                <div style={{ background: 'var(--app-surface-bg, #0f172a)', padding: 16, borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase' }}>
                    {userRole === 'APPROVER_L1' ? 'APPROVER 01 (RESPECTIVE MANAGER) DECISION' : 'APPROVER 02 (SUPERIOR MANAGER) DECISION'}
                  </h4>

                  {/* Informative Workflow Alert */}
                  <div style={{ padding: 10, background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 6, fontSize: '0.8rem', color: '#fcd34d', marginBottom: 14 }}>
                    {userRole === 'APPROVER_L1' ? (
                      hasSuperiorManager
                        ? `ℹ️ Approving will advance this claim to Approver 02 (Superior Manager: ${claimBranch?.superior_manager_name || claimBranch?.superior_manager_id}).`
                        : `ℹ️ Approving will complete and finalize this claim (Single-Tier approval by Respective Manager).`
                    ) : (
                      `ℹ️ Final Level 2 approval sign-off by Superior Manager.`
                    )}
                  </div>

                  <div className="form-group" style={{ marginBottom: 16 }}>
                    <label>Approver Remarks* (Mandatory for Reject & Send Back)</label>
                    <textarea
                      rows={3}
                      placeholder="Enter approval, rejection, or send-back comments here..."
                      value={approverRemarks}
                      onChange={(e) => setApproverRemarks(e.target.value)}
                      style={{ padding: 10, background: 'var(--app-card-bg, #1e293b)', border: '1px solid var(--border-subtle)', borderRadius: 6, color: '#fff' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => handleApproverDecision('Approve')}
                      style={{ flex: 1, padding: 12, background: '#059669', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}
                    >
                      🟢 {userRole === 'APPROVER_L1' ? (hasSuperiorManager ? 'APPROVE (ROUTE TO SUPERIOR MGR)' : 'APPROVE (FINALIZE)') : 'APPROVE (FINAL SIGN-OFF)'}
                    </button>
                    <button
                      onClick={() => handleApproverDecision('Reject')}
                      style={{ flex: 1, padding: 12, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}
                    >
                      🔴 REJECT
                    </button>
                    <button
                      onClick={() => handleApproverDecision('Send Back')}
                      style={{ flex: 1, padding: 12, background: '#d97706', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}
                    >
                      🟡 SEND BACK
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* =========================================================================
           SECTION 4: MAINTENANCE & MASTER SETUP MODULES (WEB APP)
           ========================================================================= */}
        {viewMode === 'SETUP' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>Maintenance & Master Setup Modules</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setSetupTab('MATRIX')}
                  style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: setupTab === 'MATRIX' ? '#d97706' : '#334155', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  Approval Matrix
                </button>
                <button
                  onClick={() => setSetupTab('CATEGORIES')}
                  style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: setupTab === 'CATEGORIES' ? '#d97706' : '#334155', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  Categories
                </button>
                <button
                  onClick={() => setSetupTab('PROJECTS')}
                  style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: setupTab === 'PROJECTS' ? '#d97706' : '#334155', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  Projects
                </button>
                <button
                  onClick={handleClearPettyCash}
                  style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #ef4444', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  🗑️ Clear Petty Cash Data
                </button>
              </div>
            </div>

            {/* TAB 1: APPROVAL MATRIX MAINTENANCE */}
            {setupTab === 'MATRIX' && (
              <div className="form-card" style={{ maxWidth: 640 }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#f59e0b' }}>
                  ADMIN PORTAL &gt; Master Setup &gt; Approval Matrix Maintenance
                </h4>
                <form onSubmit={handleSaveMatrixRule} className="grid-form">
                  <div className="form-group">
                    <label>Project Scope*</label>
                    <select
                      value={matrixForm.project_scope}
                      onChange={(e) => setMatrixForm({ ...matrixForm, project_scope: e.target.value })}
                    >
                      <option value="ALL">All Projects</option>
                      {projects.map(p => (
                        <option key={p.project_id} value={p.project_id}>{p.project_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Amount Constraint*</label>
                    <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                      <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="constraint"
                          checked={matrixForm.amount_constraint === 'GREATER_THAN'}
                          onChange={() => setMatrixForm({ ...matrixForm, amount_constraint: 'GREATER_THAN' })}
                        />
                        Greater Than (&gt;)
                      </label>
                      <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="constraint"
                          checked={matrixForm.amount_constraint === 'LESS_EQUAL'}
                          onChange={() => setMatrixForm({ ...matrixForm, amount_constraint: 'LESS_EQUAL' })}
                        />
                        Less Than or Equal (≤)
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Threshold Value (Rupees)*</label>
                    <input
                      type="number"
                      value={matrixForm.threshold_value}
                      onChange={(e) => setMatrixForm({ ...matrixForm, threshold_value: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Target Approver*</label>
                    <select
                      value={matrixForm.target_approver}
                      onChange={(e) => setMatrixForm({ ...matrixForm, target_approver: e.target.value })}
                    >
                      <option value="Approver_L1">Approver 01 - Branch Manager</option>
                      <option value="Approver_L2">Approver 02 - Finance Manager</option>
                    </select>
                  </div>

                  <div className="form-group full-width" style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                    <button type="submit" style={{ padding: 10, background: '#0284c7', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>
                      💾 SUBMIT
                    </button>
                    <button type="button" onClick={() => setMatrixForm({ project_scope: 'ALL', amount_constraint: 'GREATER_THAN', threshold_value: '5000.00', target_approver: 'Approver_L2' })} style={{ padding: 10, background: '#334155', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>
                      🔄 CLEAR
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 2: CATEGORY MAINTENANCE */}
            {setupTab === 'CATEGORIES' && (
              <div className="form-card">
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#f59e0b' }}>
                  ADMIN PORTAL &gt; Master Setup &gt; Categories Maintenance
                </h4>
                <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: 10, marginBottom: '1.5rem' }}>
                  <input
                    type="text"
                    placeholder="New Category Name (e.g. Material Expense)"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    style={{ flex: 1, padding: 10, background: 'var(--app-surface-bg, #0f172a)', border: '1px solid var(--border-subtle)', borderRadius: 6, color: '#fff' }}
                  />
                  <button type="submit" style={{ padding: '10px 20px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>
                    💾 SAVE CATEGORY
                  </button>
                </form>

                <h5 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#0284c7', textTransform: 'uppercase' }}>Active Category List</h5>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Sl Code</th>
                      <th>Category Name</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map(cat => (
                      <tr key={cat.category_code}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{cat.category_code}</td>
                        <td>{cat.category_name}</td>
                        <td>
                          <span style={{ padding: '2px 8px', borderRadius: 4, background: cat.is_enabled ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', color: cat.is_enabled ? '#10b981' : '#ef4444', fontSize: '0.75rem', fontWeight: 700 }}>
                            {cat.is_enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => handleToggleCategory(cat.category_code, !cat.is_enabled)}
                            style={{ padding: '4px 10px', background: '#334155', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem' }}
                          >
                            {cat.is_enabled ? '[ Disable Category ]' : '[ Enable Category ]'}
                          </button>
                        </td>
                      </tr>
                    ))}

                    {categories.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8' }}>No categories created. Enter name above to save your first category!</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 3: PROJECT MAINTENANCE */}
            {setupTab === 'PROJECTS' && (
              <div className="form-card">
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#f59e0b' }}>
                  ADMIN PORTAL &gt; Master Setup &gt; Project Maintenance
                </h4>
                <form onSubmit={handleAddProject} style={{ display: 'flex', gap: 10, marginBottom: '1.5rem' }}>
                  <input
                    type="text"
                    placeholder="Project Name (e.g. NEXUS)"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    style={{ flex: 1, padding: 10, background: 'var(--app-surface-bg, #0f172a)', border: '1px solid var(--border-subtle)', borderRadius: 6, color: '#fff' }}
                  />
                  <select
                    value={newProjectBranchId}
                    onChange={(e) => setNewProjectBranchId(e.target.value)}
                    style={{ padding: 10, background: 'var(--app-surface-bg, #0f172a)', border: '1px solid var(--border-subtle)', borderRadius: 6, color: '#fff' }}
                  >
                    {branches.map(b => (
                      <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
                    ))}
                  </select>
                  <button type="submit" style={{ padding: '10px 20px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>
                    💾 SAVE PROJECT
                  </button>
                </form>

                <h5 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#0284c7', textTransform: 'uppercase' }}>Active Project List</h5>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Sl Code</th>
                      <th>Project Name</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p, i) => (
                      <tr key={p.project_id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>P{String(i + 1).padStart(3, '0')}</td>
                        <td>{p.project_name}</td>
                        <td>
                          <span style={{ padding: '2px 8px', borderRadius: 4, background: p.is_active ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', color: p.is_active ? '#10b981' : '#ef4444', fontSize: '0.75rem', fontWeight: 700 }}>
                            {p.is_active ? 'Enabled' : 'Disabled'}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => handleToggleProject(p.project_id, !p.is_active)}
                            style={{ padding: '4px 10px', background: '#334155', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem' }}
                          >
                            {p.is_active ? '[ Disable Project ]' : '[ Enable Project ]'}
                          </button>
                        </td>
                      </tr>
                    ))}

                    {projects.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8' }}>No projects created. Enter name above to create your first project!</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        )}

        {/* =========================================================================
           SECTION 5: ACCOUNT LEDGER ENGINE & REPORTING FORMAT (WEB APP)
           ========================================================================= */}
        {viewMode === 'LEDGER' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>Account Ledger Engine & Report</h3>
                <span style={{ fontSize: '0.82rem', color: '#0284c7' }}>Mathematical Liquidity & Monthly Balance Engine</span>
              </div>
              <button
                onClick={() => alert('📄 Account Ledger Master Report exported to PDF / Excel!')}
                style={{ padding: '8px 16px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Download size={16} /> Export Master Ledger
              </button>
            </div>

            {/* MATHEMATICAL BALANCE FORMULA BOX */}
            <div className="form-card" style={{ background: 'var(--app-surface-bg, #0f172a)', padding: '1.25rem', border: '1px solid var(--border-subtle)' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#f59e0b', textTransform: 'uppercase' }}>
                Mathematical Balance Formulas
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, fontSize: '0.82rem', fontFamily: 'monospace' }}>
                <div>1. <strong>Opening Balance (B):</strong> B = E_prev + A</div>
                <div>2. <strong>Spend (C):</strong> C = Σ Approved Claims</div>
                <div>3. <strong>Claim Raised (D):</strong> D = Σ Pending Claims</div>
                <div>4. <strong>Ending Balance (E):</strong> E = B - C - D</div>
              </div>
            </div>

            {/* FILTERS */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                value={ledgerFilterProject}
                onChange={(e) => setLedgerFilterProject(e.target.value)}
                style={{ padding: 8, background: 'var(--app-card-bg, #1e293b)', color: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 6 }}
              >
                <option value="ALL">Project: All</option>
                {projects.map(p => (
                  <option key={p.project_id} value={p.project_id}>{p.project_name}</option>
                ))}
              </select>

              <select
                value={ledgerFilterBranch}
                onChange={(e) => setLedgerFilterBranch(e.target.value)}
                style={{ padding: 8, background: 'var(--app-card-bg, #1e293b)', color: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 6 }}
              >
                <option value="ALL">Branch: All</option>
                {branches.map(b => (
                  <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
                ))}
              </select>

              <select
                value={ledgerFilterYear}
                onChange={(e) => setLedgerFilterYear(e.target.value)}
                style={{ padding: 8, background: 'var(--app-card-bg, #1e293b)', color: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 6 }}
              >
                <option value="2026">Year: 2026</option>
                <option value="2027">Year: 2027</option>
                <option value="2028">Year: 2028</option>
              </select>
            </div>

            {/* ACCOUNT LEDGER MASTER TABLE */}
            <div className="form-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: 16, background: 'var(--app-surface-bg, #0f172a)', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.85rem', fontWeight: 800, fontFamily: 'monospace' }}>
                ACCOUNT LEDGER MASTER REPORT | PROJECT: {ledgerFilterProject} | BRANCH: {ledgerFilterBranch} | YEAR: {ledgerFilterYear}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ marginTop: 0 }}>
                  <thead>
                    <tr>
                      <th>Sl#</th>
                      <th>Project</th>
                      <th>Branch</th>
                      <th>Year</th>
                      <th>Month</th>
                      <th>Limit (A)</th>
                      <th>Opening Bal (B)</th>
                      <th>Spend (C)</th>
                      <th>Claim Raised (D)</th>
                      <th>Ending Balance (E)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerEntries.map((l, index) => {
                      const projectObj = projects.find(p => p.project_id === l.project_id);
                      return (
                        <tr key={index}>
                          <td>{index + 1}</td>
                          <td style={{ fontWeight: 700 }}>{projectObj ? projectObj.project_name : 'Orion'}</td>
                          <td>Downtown HQ (#001)</td>
                          <td>{l.year}</td>
                          <td style={{ fontWeight: 700 }}>{l.month}</td>
                          <td>₹ {Number(l.monthly_limit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td style={{ color: '#0284c7' }}>₹ {Number(l.opening_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td style={{ color: '#f59e0b' }}>₹ {Number(l.spend).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td>₹ {Number(l.claim_raised).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td style={{ fontWeight: 800, color: Number(l.ending_balance) < 0 ? '#ef4444' : '#10b981' }}>
                            ₹ {Number(l.ending_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}

                    {ledgerEntries.length === 0 && (
                      <tr>
                        <td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                          No monthly ledger balances recorded for Year {ledgerFilterYear}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'var(--app-surface-bg, #0f172a)', fontWeight: 800 }}>
                      <td colSpan={5}>TOTAL (YEAR {ledgerFilterYear})</td>
                      <td>₹ {ledgerEntries.reduce((sum, l) => sum + Number(l.monthly_limit || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td>₹ {ledgerEntries.reduce((sum, l) => sum + Number(l.opening_balance || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td>₹ {ledgerEntries.reduce((sum, l) => sum + Number(l.spend || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td>₹ {ledgerEntries.reduce((sum, l) => sum + Number(l.claim_raised || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td style={{ color: '#10b981', fontSize: '0.95rem' }}>₹ {ledgerEntries.reduce((sum, l) => sum + Number(l.ending_balance || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
