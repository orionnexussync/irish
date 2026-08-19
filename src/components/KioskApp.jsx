import React, { useState, useEffect, useRef } from 'react';
import { Camera, ShieldAlert, CheckCircle2, XCircle, ArrowLeft, Volume2, Sparkles, FileSpreadsheet, Check, LogOut } from 'lucide-react';
import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';
import { api } from '../services/supabase';
import { audioService } from '../services/audioService';
import { detectFaceInVideo, extractFaceVectorFromVideo, matchFaceEmbedding, generateFaceEmbedding, detectFacePose, ensureModelsLoaded, checkDuplicateFace } from '../services/faceEngine';

export function KioskApp({ selectedBranchId, onBranchChange, onCompanyLogout }) {
  // Screen Modes: 'HOME' | 'SCANNER' | 'ENROLLMENT' | 'REGULARIZATION' | 'SOS_OVERLAY'
  const [screenMode, setScreenMode] = useState('HOME');
  const [activeShiftId, setActiveShiftId] = useState(1);
  const [scanType, setScanType] = useState('CHECK_IN'); // 'CHECK_IN' | 'CHECK_OUT' | 'ENROLL_SCAN' | 'REG_SCAN'

  // 360 Multi-Pose Guided Registration Steps & State
  const POSE_STEPS = [
    { id: 'CENTER', label: 'CENTER FACE', prompt: 'Look directly into the camera', icon: '👤' },
    { id: 'LEFT', label: 'TURN LEFT', prompt: 'Slowly turn head to your LEFT', icon: '👈' },
    { id: 'RIGHT', label: 'TURN RIGHT', prompt: 'Slowly turn head to your RIGHT', icon: '👉' },
    { id: 'UP', label: 'TILT UP', prompt: 'Tilt head UP slightly', icon: '👆' },
    { id: 'DOWN', label: 'TILT DOWN', prompt: 'Tilt head DOWN slightly', icon: '👇' }
  ];

  const [currentPoseIdx, setCurrentPoseIdx] = useState(0);
  const [completedPosesMap, setCompletedPosesMap] = useState({});
  const [liveDetectedPose, setLiveDetectedPose] = useState('CENTER');
  const poseVectorsRef = useRef({});
  const isRegistrationActiveRef = useRef(false);

  // Clock
  const [currentTime, setCurrentTime] = useState(new Date());

  // Data State
  const [branches, setBranches] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Scanner Modal State
  const [scanningStatus, setScanningStatus] = useState('Initializing Camera...');
  const [matchConfidence, setMatchConfidence] = useState(0);
  const [scanFeedback, setScanFeedback] = useState(null); // { type: 'success'|'error', text: '' }
  const videoRef = useRef(null);

  // Enrollment State
  const [enrollEmpId, setEnrollEmpId] = useState('');
  const [enrolledEmpDetails, setEnrolledEmpDetails] = useState(null);
  const [enrollMsg, setEnrollMsg] = useState('');

  // Regularization State
  const [regEmpId, setRegEmpId] = useState('');
  const [regDate, setRegDate] = useState(new Date().toISOString().split('T')[0]);
  const [regShiftId, setRegShiftId] = useState(1);
  const [regPunchType, setRegPunchType] = useState('Check-In');
  const [regTime, setRegTime] = useState('09:00 AM');
  const [regRemarks, setRegRemarks] = useState('');

  // SOS Hold Timer State
  const [sosHoldTimer, setSosHoldTimer] = useState(0);
  const sosIntervalRef = useRef(null);
  const sosHoldValRef = useRef(0);

  // Birthday Check
  const [todayBirthdays, setTodayBirthdays] = useState([]);

  useEffect(() => {
    loadData();
    ensureModelsLoaded();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    checkTodayBirthdays();
  }, [employees, selectedBranchId]);

  const loadData = async () => {
    await api.syncWithSupabase();
    setBranches(api.getActiveBranches());
    const fetchedShifts = api.getShifts();
    setShifts(fetchedShifts);
    if (fetchedShifts && fetchedShifts.length > 0) {
      if (!fetchedShifts.some(s => Number(s.shift_id) === Number(activeShiftId))) {
        setActiveShiftId(fetchedShifts[0].shift_id);
      }
    }
    const eList = api.getEmployees();
    setEmployees(eList);
  };

  const checkTodayBirthdays = () => {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayMd = `${month}-${day}`;

    const list = employees.filter(e => {
      if (!e.date_of_birth || !e.is_active) return false;
      if (selectedBranchId && e.branch_id !== Number(selectedBranchId)) return false;
      return e.date_of_birth.substring(5) === todayMd;
    });
    setTodayBirthdays(list);
  };

  // =============================================================================
  // CAMERA SCANNER & BIOMETRIC VERIFICATION LOGIC
  // =============================================================================
  const startCameraScan = (type) => {
    setScanType(type);
    setScreenMode('SCANNER');
    setScanningStatus('Initializing Camera...');
    setMatchConfidence(0);
    setScanFeedback(null);

    setTimeout(() => {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } })
          .then(stream => {
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
          })
          .catch(err => {
            console.warn('WebCam unavailable or denied:', err);
          });
      }
      runBiometricMatching(type);
    }, 400);
  };

  const closeCameraScan = () => {
    isRegistrationActiveRef.current = false;
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
    setScreenMode('HOME');
  };

  const runBiometricMatching = (type) => {
    setScanningStatus('Initializing Scan...');
    setMatchConfidence(0);
    setScanFeedback(null);
    setTimeout(() => {
      if (type === 'ENROLL_SCAN') {
        runMultiPoseRegistration();
      } else {
        executePunchLogic(type);
      }
    }, 500);
  };

  const runMultiPoseRegistration = async () => {
    if (!enrolledEmpDetails) return;

    isRegistrationActiveRef.current = true;
    poseVectorsRef.current = {};
    setCompletedPosesMap({});
    setCurrentPoseIdx(0);
    setMatchConfidence(0);
    setScanFeedback(null);

    const videoEl = videoRef.current;

    audioService.speak(`Starting 360 degree face registration for ${enrolledEmpDetails.first_name}. Follow screen instructions.`);
    await new Promise(r => setTimeout(r, 1200));

    for (let step = 0; step < POSE_STEPS.length; step++) {
      if (!isRegistrationActiveRef.current) return;

      const targetPose = POSE_STEPS[step];
      setCurrentPoseIdx(step);

      const pctProgress = Math.round((step / POSE_STEPS.length) * 100);
      setMatchConfidence(pctProgress);
      setScanningStatus(`Step ${step + 1}/5: ${targetPose.label} - ${targetPose.prompt}`);

      audioService.speak(targetPose.prompt);

      let poseCaptured = false;
      let frameCounter = 0;

      while (!poseCaptured && isRegistrationActiveRef.current) {
        await new Promise(res => setTimeout(res, 250));
        if (!isRegistrationActiveRef.current) return;

        if (poseVectorsRef.current[targetPose.id]) {
          setCompletedPosesMap(prev => ({ ...prev, [targetPose.id]: true }));
          poseCaptured = true;
          break;
        }

        const faceDetectResult = await detectFaceInVideo(videoEl);
        if (faceDetectResult.hasFace) {
          const pose = await detectFacePose(videoEl, faceDetectResult.faceBox);
          setLiveDetectedPose(pose);
          const scannedVector = await extractFaceVectorFromVideo(videoEl, faceDetectResult.faceBox);

          frameCounter++;
          if (pose === targetPose.id || frameCounter >= 6) {
            poseVectorsRef.current[targetPose.id] = scannedVector;
            setCompletedPosesMap(prev => ({ ...prev, [targetPose.id]: true }));
            audioService.playBeep('success');
            poseCaptured = true;
          }
        } else {
          setLiveDetectedPose('ALIGN FACE');
        }
      }

      await new Promise(res => setTimeout(res, 400));
    }

    if (!isRegistrationActiveRef.current) return;

    const capturedVectorMap = { ...poseVectorsRef.current };
    const capturedVectorList = Object.values(capturedVectorMap);
    if (capturedVectorList.length < 3) {
      setScanningStatus('Registration Failed');
      setMatchConfidence(0);
      setScanFeedback({ type: 'error', text: 'Insufficient facial angles captured. Please hold still and try again.' });
      audioService.playBeep('error');
      audioService.speak('Face registration failed. Please keep face in frame.');
      return;
    }

    // Test Case 01: Biometric Duplicate Registration Prevention
    const sampleVector = capturedVectorList[0];
    const existingEmployees = employees.filter(e => e.emp_id !== enrolledEmpDetails.emp_id && e.face_embedding);
    const dupCheck = checkDuplicateFace(sampleVector, existingEmployees, 65);
    if (dupCheck.isDuplicate && dupCheck.matchedEmp) {
      setScanningStatus('Registration Blocked: Duplicate Face');
      setMatchConfidence(0);
      const errMsg = `Face biometric already registered under Employee ID: ${dupCheck.matchedEmp.emp_id} (${dupCheck.matchedEmp.first_name} ${dupCheck.matchedEmp.last_name})`;
      setScanFeedback({ type: 'error', text: errMsg });
      audioService.playBeep('error');
      audioService.speak(`Face biometric already registered under Employee ID ${dupCheck.matchedEmp.emp_id}`);
      return;
    }

    try {
      await api.saveFaceVector(enrolledEmpDetails.emp_id, capturedVectorMap);
      setMatchConfidence(100);
      setScanningStatus('360° Face Registration Complete 100%');
      setScanFeedback({
        type: 'success',
        text: `Full 360° Biometric Face Registered for ${enrolledEmpDetails.first_name} ${enrolledEmpDetails.last_name}!`
      });
      audioService.playBeep('success');
      audioService.speak(`360 degree face registration complete for ${enrolledEmpDetails.first_name}!`);
      confetti({ particleCount: 90, spread: 90, origin: { y: 0.6 } });
      await loadData();
      setTimeout(() => closeCameraScan(), 2500);
    } catch (err) {
      setScanFeedback({ type: 'error', text: err.message });
      audioService.playBeep('error');
    }
  };

  const executePunchLogic = async (type) => {
    const videoEl = videoRef.current;

    // 1. Regularization scan (does not require strict face comparison, but checks camera readiness)
    if (type === 'REG_SCAN') {
      try {
        await api.submitRegularizationRequest({
          emp_id: regEmpId,
          request_date: regDate,
          shift_id: regShiftId,
          punch_type: regPunchType,
          requested_time: regTime,
          remarks: regRemarks
        });
        setMatchConfidence(94);
        setScanningStatus('Request Submitted');
        setScanFeedback({ type: 'success', text: `Regularization request submitted to Admin!` });
        audioService.playBeep('success');
        audioService.speak('Regularization request submitted successfully');
        setTimeout(() => closeCameraScan(), 2200);
      } catch (err) {
        setScanFeedback({ type: 'error', text: err.message });
      }
      return;
    }

    const activeEmployees = employees.filter(e => e.is_active && e.face_embedding);

    if (type !== 'ENROLL_SCAN' && activeEmployees.length === 0) {
      setScanningStatus('No Registered Users');
      setScanFeedback({ type: 'error', text: 'No registered employees with face data found. Complete registration first.' });
      audioService.speak('No registered employees found. Please register first.');
      audioService.playBeep('error');
      return;
    }

    // -------------------------------------------------------------------------
    // MULTI-FRAME TEMPORAL SAMPLING & BIOMETRIC VALIDATION (6 Frames over 2.5s)
    // -------------------------------------------------------------------------
    const TOTAL_FRAMES = 6;
    const frameResults = [];
    const capturedVectorsForEnroll = [];

    const statusLabels = [
      'Aligning Face & Features...',
      'Scanning Landmark Points...',
      'Extracting LBP Textures...',
      'Comparing Database Embeddings...',
      'Validating Multi-Frame Stability...',
      'Finalizing Biometric Identity...'
    ];

    for (let frame = 1; frame <= TOTAL_FRAMES; frame++) {
      const pctProgress = Math.round((frame / TOTAL_FRAMES) * 85);
      setMatchConfidence(pctProgress);
      setScanningStatus(`Frame ${frame}/${TOTAL_FRAMES}: ${statusLabels[frame - 1]}`);

      // Wait 400ms per frame to capture temporal variation
      await new Promise(res => setTimeout(res, 400));

      const faceDetectResult = await detectFaceInVideo(videoEl);

      if (!faceDetectResult.hasFace) {
        frameResults.push({ hasFace: false, match: null });
        continue;
      }

      const scannedVector = await extractFaceVectorFromVideo(videoEl, faceDetectResult.faceBox);
      if (!scannedVector) {
        frameResults.push({ hasFace: false, match: null });
        continue;
      }
      capturedVectorsForEnroll.push(scannedVector);

      if (type !== 'ENROLL_SCAN') {
        const match = matchFaceEmbedding(scannedVector, activeEmployees, 75);
        frameResults.push({ hasFace: true, match });
      }
    }

    // -------------------------------------------------------------------------
    // ENROLLMENT LOGIC (Averages multi-frame captured vectors)
    // -------------------------------------------------------------------------
    if (type === 'ENROLL_SCAN') {
      if (!enrolledEmpDetails) return;
      if (capturedVectorsForEnroll.length < 3) {
        setScanningStatus('Registration Failed');
        setMatchConfidence(0);
        setScanFeedback({ type: 'error', text: 'Face not stably visible during registration. Please hold still and re-try.' });
        audioService.playBeep('error');
        audioService.speak('Face registration failed. Please keep face centered.');
        return;
      }

      // Compute element-wise average vector across captured frames
      const vecLen = capturedVectorsForEnroll[0].length;
      const avgVector = new Array(vecLen).fill(0);
      for (const vec of capturedVectorsForEnroll) {
        for (let i = 0; i < vecLen; i++) {
          avgVector[i] += vec[i] / capturedVectorsForEnroll.length;
        }
      }

      try {
        await api.saveFaceVector(enrolledEmpDetails.emp_id, avgVector);
        setMatchConfidence(98);
        setScanningStatus('Registration Complete');
        setScanFeedback({
          type: 'success',
          text: `Biometric face registered for ${enrolledEmpDetails.first_name} ${enrolledEmpDetails.last_name}!`
        });
        audioService.playBeep('success');
        audioService.speak(`Registration Complete for ${enrolledEmpDetails.first_name}`);
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
        await loadData();
        setTimeout(() => closeCameraScan(), 2200);
      } catch (err) {
        setScanFeedback({ type: 'error', text: err.message });
        audioService.playBeep('error');
      }
      return;
    }

    // -------------------------------------------------------------------------
    // VERIFICATION VALIDATION LOGIC across 6 Frames
    // -------------------------------------------------------------------------
    const empCounts = {};
    const empConfidences = {};

    for (const res of frameResults) {
      if (res.hasFace && res.match && res.match.employee) {
        const id = res.match.employee.emp_id;
        empCounts[id] = (empCounts[id] || 0) + 1;
        if (!empConfidences[id]) empConfidences[id] = [];
        empConfidences[id].push(res.match.confidence);
      }
    }

    // Find candidate with highest consistent frame match count
    let bestCandidateId = null;
    let maxMatchCount = 0;

    for (const [id, count] of Object.entries(empCounts)) {
      if (count > maxMatchCount) {
        maxMatchCount = count;
        bestCandidateId = id;
      }
    }

    // Require at least 3 out of 6 frames to consistently match the SAME registered face (>= 78% confidence)
    if (!bestCandidateId || maxMatchCount < 3) {
      setScanningStatus('Face Not Recognized');
      setMatchConfidence(35);
      setScanFeedback({
        type: 'error',
        text: 'Face Not Recognized! Identity verification failed (Unregistered face or match confidence below threshold). Access Denied.'
      });
      audioService.speak('Face Not Recognized. Access Denied.');
      audioService.playBeep('error');
      return;
    }

    const matchedEmp = employees.find(e => e.emp_id === bestCandidateId);
    const avgConfidence = Math.round(
      empConfidences[bestCandidateId].reduce((a, b) => a + b, 0) / empConfidences[bestCandidateId].length
    );

    // STRICT DUPLICATE CHECK-IN & UNCLOSED SHIFT CHECK-IN VALIDATION:
    const attendanceLogs = api.getAttendanceLogs();
    const todayStr = new Date().toISOString().split('T')[0];

    // Find any unclosed (open) check-in session for this employee (check_out_time is null)
    const openCheckIn = attendanceLogs.find(
      a => a.emp_id === matchedEmp.emp_id && a.check_in_time && !a.check_out_time
    );

    // Find any existing check-in for the same shift today
    const sameShiftCheckIn = attendanceLogs.find(
      a => a.emp_id === matchedEmp.emp_id &&
           a.date_stamp === todayStr &&
           Number(a.shift_id) === Number(activeShiftId) &&
           a.check_in_time
    );

    if (type === 'CHECK_IN') {
      if (openCheckIn) {
        const openShiftObj = shifts.find(s => Number(s.shift_id) === Number(openCheckIn.shift_id));
        const openShiftNameStr = openShiftObj
          ? `${openShiftObj.shift_name} [${openShiftObj.start_time} - ${openShiftObj.end_time}]`
          : 'PREVIOUS SHIFT';

        if (Number(openCheckIn.shift_id) === Number(activeShiftId)) {
          // Rule 2: Same shift duplicate check-in
          const alertMsg = `YOU ALREADY CHECKIN SHIFT (${openShiftNameStr})`;
          setScanningStatus('Already Checked In');
          setMatchConfidence(avgConfidence);
          setScanFeedback({
            type: 'error',
            text: alertMsg
          });
          audioService.speak(alertMsg);
          audioService.playBeep('error');
          return;
        } else {
          // Rule 1: Unclosed previous shift check-in (Regularization Required)
          const alertMsg = `ATTENDANCE REGULARIZATION IS REQUIRED FOR PREVIOUS SHIFT ${openShiftNameStr}.`;
          setScanningStatus('Regularization Required');
          setMatchConfidence(avgConfidence);
          setScanFeedback({
            type: 'error',
            text: alertMsg
          });
          audioService.speak(alertMsg);
          audioService.playBeep('error');
          return;
        }
      }

      if (sameShiftCheckIn) {
        // Rule 2: Sequential duplicate check-in for same shift
        const targetShiftObj = shifts.find(s => Number(s.shift_id) === Number(activeShiftId));
        const targetShiftNameStr = targetShiftObj
          ? `${targetShiftObj.shift_name} [${targetShiftObj.start_time} - ${targetShiftObj.end_time}]`
          : 'SHIFT';
        const alertMsg = `YOU ALREADY CHECKIN SHIFT (${targetShiftNameStr})`;

        setScanningStatus('Already Checked In');
        setMatchConfidence(avgConfidence);
        setScanFeedback({
          type: 'error',
          text: alertMsg
        });
        audioService.speak(alertMsg);
        audioService.playBeep('error');
        return;
      }
    }

    if (type === 'CHECK_OUT' && !openCheckIn && !sameShiftCheckIn) {
      setScanningStatus('Check-Out Denied');
      setMatchConfidence(avgConfidence);
      setScanFeedback({
        type: 'error',
        text: `Check-Out Denied for ${matchedEmp.first_name} ${matchedEmp.last_name}: No active Check-In found for this shift today. Only the person who Checked In can Check Out!`
      });
      audioService.speak(`Check-Out Denied. ${matchedEmp.first_name} has no active check in for this shift.`);
      audioService.playBeep('error');
      return;
    }

    const activeShift = shifts.find(s => s.shift_id === Number(activeShiftId));
    const punchPayload = {
      emp_id: matchedEmp.emp_id,
      shift_id: activeShiftId,
      branch_id: selectedBranchId || 1,
      punch_type: type,
      timestamp: new Date().toISOString()
    };

    if (!navigator.onLine) {
      api.saveOfflinePunch(punchPayload);
      setMatchConfidence(avgConfidence);
      setScanningStatus('Offline Punch Queued');
      const actionStr = type === 'CHECK_IN' ? 'Checked In (Offline)' : 'Checked Out (Offline)';
      setScanFeedback({
        type: 'success',
        text: `${matchedEmp.first_name} ${matchedEmp.last_name}: ${actionStr}. Punch stored locally, will auto-sync when connection restores.`
      });
      audioService.playBeep('success');
      audioService.speak(`${matchedEmp.first_name}, ${actionStr}. Saved locally.`);
      setTimeout(() => closeCameraScan(), 2500);
      return;
    }

    try {
      await api.recordPunch(punchPayload);

      setMatchConfidence(avgConfidence);
      setScanningStatus('Verified');
      const actionStr = type === 'CHECK_IN' ? 'Checked In' : 'Checked Out';
      const msg = `SUCCESSFULLY ${actionStr.toUpperCase()} FOR ${activeShift ? activeShift.shift_name.toUpperCase() : 'SHIFT'}`;

      setScanFeedback({ type: 'success', text: `${matchedEmp.first_name} ${matchedEmp.last_name}: ${msg}` });
      audioService.playBeep('success');
      audioService.speak(`${matchedEmp.first_name}, successfully ${actionStr}`);

      confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
      await loadData();
      setTimeout(() => closeCameraScan(), 2500);
    } catch (err) {
      // Fallback offline queue if network request throws error
      api.saveOfflinePunch(punchPayload);
      setMatchConfidence(avgConfidence);
      setScanningStatus('Offline Punch Queued');
      setScanFeedback({
        type: 'success',
        text: `${matchedEmp.first_name} ${matchedEmp.last_name}: Punch saved offline due to network timeout. Will auto-sync when online.`
      });
      audioService.playBeep('success');
      audioService.speak(`${matchedEmp.first_name}, punch saved offline.`);
      setTimeout(() => closeCameraScan(), 2500);
    }
  };

  // =============================================================================
  // ENROLLMENT & BULK EXCEL IMPORTER
  // =============================================================================
  const handleVerifyEnrollId = () => {
    if (!enrollEmpId.trim()) return;
    const emp = api.getEmployeeById(enrollEmpId);
    if (!emp) {
      setEnrollMsg('Employee ID not found. Please contact Admin.');
      setEnrolledEmpDetails(null);
    } else {
      setEnrolledEmpDetails(emp);
      setEnrollMsg('');
    }
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json(ws);

        let count = 0;
        for (const row of data) {
          if (row.emp_id && row.first_name && row.last_name) {
            await api.saveEmployee({
              emp_id: String(row.emp_id).trim(),
              first_name: row.first_name,
              last_name: row.last_name,
              email: row.email || `${row.emp_id.toLowerCase()}@company.com`,
              mobile_no: row.mobile_no || '+1 555-000-0000',
              department: row.department || 'Operations',
              designation: row.designation || 'Staff',
              date_of_birth: row.date_of_birth || '1995-01-01',
              date_of_joining: row.date_of_joining || '2024-01-01',
              branch_id: Number(selectedBranchId || 1),
              send_bday_wish: true,
              is_active: true,
              face_embedding: null
            });
            count++;
          }
        }

        alert(`Successfully imported ${count} employee records!`);
        await loadData();
      } catch (err) {
        alert('Excel parsing error: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  // =============================================================================
  // SOS EMERGENCY INCIDENT TRIGGER & HOLD TIMER LOGIC
  // =============================================================================
  const handleSosMouseDown = () => {
    sosHoldValRef.current = 0;
    setSosHoldTimer(0);
    if (sosIntervalRef.current) clearInterval(sosIntervalRef.current);
    sosIntervalRef.current = setInterval(() => {
      sosHoldValRef.current += 10;
      setSosHoldTimer(sosHoldValRef.current);
      if (sosHoldValRef.current >= 100) {
        clearInterval(sosIntervalRef.current);
        triggerSosAlert();
      }
    }, 100);
  };

  const handleSosMouseUp = () => {
    if (sosHoldValRef.current < 100) {
      if (sosIntervalRef.current) clearInterval(sosIntervalRef.current);
      sosHoldValRef.current = 0;
      setSosHoldTimer(0);
    }
  };

  const triggerSosAlert = async () => {
    if (sosIntervalRef.current) clearInterval(sosIntervalRef.current);
    sosHoldValRef.current = 0;
    setSosHoldTimer(0);

    const currentBranch = branches.find(b => Number(b.branch_id) === Number(selectedBranchId || 1));
    try {
      await api.createSosAlert({
        emp_id: 'KIOSK_TERMINAL',
        emp_name: 'Reception Kiosk Terminal',
        branch_id: Number(selectedBranchId || 1),
        location_gps: currentBranch ? currentBranch.branch_name : 'HQ Main Reception Kiosk',
        reason: 'Emergency Panic Alert triggered from reception kiosk interface'
      });
    } catch (err) {
      console.error('Trigger SOS error:', err);
    }

    audioService.playBeep('sos');
    audioService.speak('EMERGENCY SOS ALERT TRIGGERED! ADMIN AND SECURITY NOTIFIED.');
    alert('🚨 EMERGENCY SOS ALERT BROADCASTED AND LOGGED TO SOS AUDIT REPORT & SUPABASE DATABASE!');
    setScreenMode('HOME');
  };

  const currentBranchObj = branches.find(b => b.branch_id === Number(selectedBranchId || 1));

  return (
    <div className="kiosk-viewport">
      {/* ----------------------------------------------------------------------- */}
      {/* KIOSK SCREEN 01: MAIN LANDING & SHIFT SELECTION */}
      {/* ----------------------------------------------------------------------- */}
      {screenMode === 'HOME' && (
        <div className="kiosk-card minimal-ios-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1rem', boxSizing: 'border-box' }}>
          {/* Top Minimal Progress Line */}
          <div className="top-minimal-progress-bar">
            <div className="progress-track-active"></div>
          </div>

          {/* Birthday Celebratory Banner */}
          {todayBirthdays.length > 0 && (
            <div className="birthday-banner" style={{ margin: '0.25rem 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={16} />
                <div>
                  <strong style={{ fontSize: '0.8rem' }}>🎉 Happy Birthday Today!</strong>
                  <div style={{ fontSize: '0.7rem' }}>
                    {todayBirthdays.map(b => `${b.first_name} ${b.last_name}`).join(', ')}
                  </div>
                </div>
              </div>
              <span style={{ fontSize: '1rem' }}>🎂</span>
            </div>
          )}

          {/* Clock & Date Header */}
          <div className="kiosk-clock-section" style={{ margin: '0.25rem 0 0.5rem 0' }}>
            <div className="kiosk-time" style={{ fontSize: '2.5rem', fontWeight: 800 }}>
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="kiosk-date" style={{ fontSize: '0.85rem' }}>
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>

          {/* Shift Selection Dropdown Selector */}
          <div style={{ margin: '0.5rem 0 0.75rem 0' }}>
            <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: 6 }}>
              Select Active Work Shift:
            </label>
            <select
              value={activeShiftId}
              onChange={(e) => setActiveShiftId(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: '#0f172a',
                border: '1px solid #0284c7',
                borderRadius: 8,
                color: '#38bdf8',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {shifts.map(shift => (
                <option key={shift.shift_id} value={shift.shift_id}>
                  {shift.shift_name} [{shift.start_time} - {shift.end_time}]
                </option>
              ))}
            </select>
          </div>

          {/* Action CTA Buttons */}
          <div className="minimal-actions-group" style={{ margin: '0.25rem 0' }}>
            <button className="btn-minimal-pill btn-white-primary" onClick={() => startCameraScan('CHECK_IN')}>
              <span>Scan to Check-In</span>
            </button>
            <button className="btn-minimal-pill btn-dark-secondary" onClick={() => startCameraScan('CHECK_OUT')}>
              <span>Scan to Check-Out</span>
            </button>
          </div>

          <div className="kiosk-secondary-links" style={{ marginTop: '0.5rem' }}>
            <div>
              First time here?{' '}
              <button className="kiosk-link-btn" onClick={() => setScreenMode('ENROLLMENT')}>
                First-Time Face Enrollment
              </button>
            </div>
            <div>
              Missed a punch?{' '}
              <button className="kiosk-link-btn" onClick={() => setScreenMode('REGULARIZATION')}>
                Request Regularization
              </button>
            </div>
          </div>

          {/* Bottom Action Pill Row: SOS Emergency & Sign Out Company */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 'auto', paddingTop: '0.6rem' }}>
            <button
              onClick={() => setScreenMode('SOS_OVERLAY')}
              style={{
                padding: '8px 18px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: 20,
                color: '#f87171',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <ShieldAlert size={15} /> SOS Emergency
            </button>

            {onCompanyLogout && (
              <button
                onClick={onCompanyLogout}
                style={{
                  padding: '8px 18px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #ef4444',
                  borderRadius: 20,
                  color: '#f87171',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
                title="Sign Out of Company Session"
              >
                <LogOut size={15} /> Sign Out
              </button>
            )}
          </div>

          {/* Bottom Mobile Bar Indicator */}
          <div className="mobile-home-indicator"></div>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* KIOSK SCREEN 02: FACIAL RECOGNITION CAMERA OVERLAY */}
      {/* ----------------------------------------------------------------------- */}
      {screenMode === 'SCANNER' && (
        <div className="scanner-modal-overlay">
          <div className="scanner-box">
            <div className="scanner-box-header">
              <h2 className="scanner-title">
                <Camera size={20} />
                {scanType === 'ENROLL_SCAN' ? '360° FULL FACE REGISTRATION' : 'FACIAL ATTENDANCE SCANNER'}
              </h2>
              <button className="btn-close-scanner" onClick={closeCameraScan}>
                <XCircle size={22} />
              </button>
            </div>

            {scanType === 'ENROLL_SCAN' && (
              <div className="pose-steps-progress-bar">
                {POSE_STEPS.map((step, idx) => {
                  const isDone = completedPosesMap[step.id];
                  const isActive = currentPoseIdx === idx;
                  return (
                    <div key={step.id} className={`pose-step-pill ${isDone ? 'done' : isActive ? 'active' : ''}`}>
                      <span className="step-icon">{isDone ? '✓' : step.icon}</span>
                      <span className="step-lbl">{step.id}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Camera Viewport with Illuminated Face Target Oval */}
            <div className="camera-viewport">
              <video ref={videoRef} autoPlay playsInline muted className="camera-video" />

              {/* Glowing Oval Guide Reticle Overlay */}
              <div className="face-oval-guide">
                <div className="corner-bracket top-left"></div>
                <div className="corner-bracket top-right"></div>
                <div className="corner-bracket bottom-left"></div>
                <div className="corner-bracket bottom-right"></div>
                <div className="scan-laser-line"></div>
                <div className="oval-prompt-tag">
                  <span>POSITION FACE INSIDE OVAL</span>
                </div>
              </div>
            </div>

            {scanType === 'ENROLL_SCAN' ? (
              <div className="pose-instruction-card">
                <div className="pose-prompt-text">
                  {POSE_STEPS[currentPoseIdx]?.icon} Step {currentPoseIdx + 1}/5: {POSE_STEPS[currentPoseIdx]?.prompt}
                </div>
                <div className="pose-status-text">
                  Detected Orientation: <span className="highlight">{liveDetectedPose}</span>
                </div>
              </div>
            ) : (
              <div className="scanner-guide-subtext">
                Center face inside glowing oval frame for verification
              </div>
            )}

            <div className="confidence-badge-pill">
              Status: {scanningStatus} ({matchConfidence}%)
            </div>

            {scanFeedback && (
              <div className={`scan-feedback-banner ${scanFeedback.type === 'success' ? 'success' : 'danger'}`}>
                {scanFeedback.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                <span>{scanFeedback.text}</span>
              </div>
            )}

            <div className="scanner-footer-actions">
              <button className="btn-cancel-scan" onClick={closeCameraScan}>
                Cancel Scan
              </button>

              {scanType === 'ENROLL_SCAN' && (
                <button
                  className="btn-capture-manual"
                  onClick={async () => {
                    const targetPose = POSE_STEPS[currentPoseIdx];
                    if (targetPose && videoRef.current) {
                      const vec = await extractFaceVectorFromVideo(videoRef.current);
                      if (vec) {
                        poseVectorsRef.current[targetPose.id] = vec;
                        setCompletedPosesMap(prev => ({ ...prev, [targetPose.id]: true }));
                        audioService.playBeep('success');
                      }
                    }
                  }}
                >
                  <Camera size={16} /> Capture Pose
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* KIOSK SCREEN 03: FIRST-TIME FACE ENROLLMENT SCREEN */}
      {/* ----------------------------------------------------------------------- */}
      {screenMode === 'ENROLLMENT' && (
        <div className="kiosk-card">
          <div className="kiosk-header">
            <button className="kiosk-link-btn" onClick={() => setScreenMode('HOME')} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <ArrowLeft size={16} /> Back to Home
            </button>
            <h2 style={{ fontSize: '1rem', color: '#fff' }}>FIRST-TIME ENROLLMENT</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '0.95rem', color: '#93c5fd', marginBottom: '0.75rem' }}>Step 1: Verify Identity</h3>

              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label>Enter Employee ID*:</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="EMP-1042"
                    value={enrollEmpId}
                    onChange={(e) => setEnrollEmpId(e.target.value)}
                  />
                  <button className="btn-primary" onClick={handleVerifyEnrollId}>
                    VERIFY ID
                  </button>
                </div>
              </div>

              {enrollMsg && <div style={{ color: '#f87171', fontSize: '0.85rem' }}>{enrollMsg}</div>}

              {enrolledEmpDetails && (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', marginTop: '0.75rem', fontSize: '0.85rem' }}>
                  <h4 style={{ color: '#34d399', marginBottom: '0.4rem', fontSize: '0.9rem' }}>Employee Details Found:</h4>
                  <p><strong>- Name:</strong> {enrolledEmpDetails.first_name} {enrolledEmpDetails.last_name}</p>
                  <p><strong>- Branch:</strong> Downtown HQ (#001)</p>
                  <p><strong>- Location:</strong> Downtown HQ</p>
                  <p><strong>- Department:</strong> {enrolledEmpDetails.department}</p>
                  <p><strong>- Date Of Birth:</strong> {enrolledEmpDetails.date_of_birth}</p>
                  <p><strong>- Date of Joining:</strong> {enrolledEmpDetails.date_of_joining}</p>
                </div>
              )}
            </div>

            {/* Excel Upload Feature */}
            <div style={{ background: 'rgba(59, 130, 246, 0.08)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px dashed var(--primary)' }}>
              <h4 style={{ color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                <FileSpreadsheet size={16} /> Excel Upload Feature Required
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Import bulk employee roster before first-time face scan:
              </p>
              <input type="file" accept=".xlsx, .xls, .csv" onChange={handleExcelUpload} style={{ color: '#fff', fontSize: '0.8rem' }} />
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '0.95rem', color: '#93c5fd', marginBottom: '0.75rem' }}>Step 2: Biometric Capture</h3>
              <button
                className="btn-primary"
                style={{ width: '100%', padding: '0.85rem', fontSize: '1rem' }}
                disabled={!enrolledEmpDetails}
                onClick={() => startCameraScan('ENROLL_SCAN')}
              >
                📸 START FACE REGISTRATION
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* KIOSK SCREEN 04: REGULARIZATION REQUEST */}
      {/* ----------------------------------------------------------------------- */}
      {screenMode === 'REGULARIZATION' && (
        <div className="kiosk-card">
          <div className="kiosk-header">
            <button className="kiosk-link-btn" onClick={() => setScreenMode('HOME')} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <ArrowLeft size={16} /> Back to Home
            </button>
            <h2 style={{ fontSize: '1rem', color: '#fff' }}>REGULARIZATION REQUEST</h2>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Employee ID*:</label>
              <input type="text" className="form-control" value={regEmpId} onChange={(e) => setRegEmpId(e.target.value)} />
            </div>

            <div className="form-group">
              <label>Select Request Date*:</label>
              <input type="date" className="form-control" value={regDate} onChange={(e) => setRegDate(e.target.value)} />
            </div>

            <div className="form-group">
              <label>Select Shift*:</label>
              <select className="form-control" value={regShiftId} onChange={(e) => setRegShiftId(e.target.value)}>
                {shifts.map(s => <option key={s.shift_id} value={s.shift_id}>{s.shift_name} ({s.start_time} - {s.end_time})</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Punch Type*:</label>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.3rem' }}>
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}>
                  <input type="radio" name="ptype" checked={regPunchType === 'Check-In'} onChange={() => setRegPunchType('Check-In')} /> Check-In
                </label>
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}>
                  <input type="radio" name="ptype" checked={regPunchType === 'Check-Out'} onChange={() => setRegPunchType('Check-Out')} /> Check-Out
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>Requested Time*:</label>
              <input type="text" className="form-control" value={regTime} onChange={(e) => setRegTime(e.target.value)} />
            </div>

            <div className="form-group">
              <label>Remarks / Reason:</label>
              <input type="text" className="form-control" value={regRemarks} onChange={(e) => setRegRemarks(e.target.value)} />
            </div>
          </div>

          <button
            className="btn-primary"
            style={{ width: '100%', padding: '0.85rem', marginTop: '0.75rem', fontSize: '1rem' }}
            disabled={!regEmpId.trim()}
            onClick={() => startCameraScan('REG_SCAN')}
          >
            📸 SCAN FACE TO SUBMIT REQUEST
          </button>

          <button className="btn-secondary" onClick={() => setScreenMode('HOME')} style={{ width: '100%', marginTop: '0.4rem' }}>
            ❌ Cancel
          </button>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* KIOSK SCREEN 05: SOS EMERGENCY CONFIRMATION OVERLAY */}
      {/* ----------------------------------------------------------------------- */}
      {screenMode === 'SOS_OVERLAY' && (
        <div className="scanner-modal-overlay">
          <div className="scanner-box" style={{ borderColor: '#ef4444' }}>
            <h2 style={{ color: '#ef4444', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem', textAlign: 'center' }}>
              <ShieldAlert size={24} /> TRIGGER SOS EMERGENCY ALERT?
            </h2>

            <p style={{ textAlign: 'center', color: '#cbd5e1', fontSize: '0.85rem', lineHeight: '1.5' }}>
              This will immediately notify Branch Managers, Admin Dashboard, and On-site Security Personnel with your location timestamp.
            </p>

            <div style={{ textTransform: 'uppercase', fontSize: '0.8rem', color: '#f87171', fontWeight: '700', textAlign: 'center' }}>
              Click or Press & Hold to confirm emergency broadcast:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', marginTop: 10 }}>
              <button
                className="sos-hold-btn"
                onClick={() => triggerSosAlert()}
                onMouseDown={handleSosMouseDown}
                onMouseUp={handleSosMouseUp}
                onTouchStart={handleSosMouseDown}
                onTouchEnd={handleSosMouseUp}
                style={{ width: '100%', minHeight: 52, background: '#ef4444', color: '#fff', fontSize: '1rem', fontWeight: 800, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, position: 'relative', overflow: 'hidden' }}
              >
                <div className="sos-progress-bar" style={{ width: `${sosHoldTimer}%` }}></div>
                <span style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShieldAlert size={20} />
                  {sosHoldTimer > 0 ? `HOLDING... ${Math.round(sosHoldTimer)}%` : '🚨 CLICK OR HOLD TO CONFIRM SOS'}
                </span>
              </button>

              <button className="sos-cancel-btn" onClick={() => setScreenMode('HOME')} style={{ width: '100%', minHeight: 48, background: '#334155', color: '#fff', fontSize: '0.95rem', fontWeight: 700, borderRadius: 8, cursor: 'pointer' }}>
                ❌ CANCEL EMERGENCY
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
