import React, { useState, useEffect } from 'react';
import { Tablet, Shield, Building2, Lock, Key, X, Check, LogOut } from 'lucide-react';
import { KioskApp } from './components/KioskApp';
import { AdminPortal } from './components/AdminPortal';
import { api } from './services/supabase';

export function App() {
  // Platform Detection: Native Mobile APK (Capacitor) vs Web App Browser
  const isNativeMobile = !!(
    window.Capacitor &&
    typeof window.Capacitor.isNativePlatform === 'function' &&
    window.Capacitor.isNativePlatform()
  );

  // Mode Switch: Default to 'KIOSK' on Mobile APK, 'ADMIN' on Web App
  const [viewMode, setViewMode] = useState(() => (isNativeMobile ? 'KIOSK' : 'ADMIN'));
  const [selectedBranchId, setSelectedBranchId] = useState('1');
  const [activeBranches, setActiveBranches] = useState([]);

  // Admin PIN Protection State
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Company Code Login State & First Launcher Screen
  const [isCompanyLoggedIn, setIsCompanyLoggedIn] = useState(() => !!localStorage.getItem('rfap_active_company'));
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [companyCodeInput, setCompanyCodeInput] = useState('');
  const [companyCodeError, setCompanyCodeError] = useState('');

  const handleCompanyCodeSubmit = async (e) => {
    e.preventDefault();
    setCompanyCodeError('');
    try {
      const active = await api.loginCompanyWithCode(companyCodeInput);
      setIsCompanyLoggedIn(true);
      setShowCompanyModal(false);
      setCompanyCodeInput('');
      loadBranches();
    } catch (err) {
      setCompanyCodeError(err.message);
    }
  };

  const handleCompanyLogout = async () => {
    const activeComp = api.getActiveCompany();
    if (window.confirm(`Are you sure you want to sign out of "${activeComp.company_name || 'Company'}" database session?`)) {
      await api.logoutCompany();
      setIsCompanyLoggedIn(false);
      setViewMode('KIOSK');
      setIsAdminUnlocked(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = () => {
    const list = api.getActiveBranches();
    setActiveBranches(list);
    if (list.length > 0 && !list.find(b => String(b.branch_id) === String(selectedBranchId))) {
      setSelectedBranchId(String(list[0].branch_id));
    }
  };

  const handleAdminModeClick = () => {
    if (isAdminUnlocked) {
      setViewMode('ADMIN');
    } else {
      setPinInput('');
      setPinError('');
      setShowPinModal(true);
    }
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pinInput === 'tech') {
      setIsAdminUnlocked(true);
      setShowPinModal(false);
      setViewMode('ADMIN');
    } else {
      setPinError('Invalid Security Password. Please try again.');
    }
  };

  const handleLockAdmin = () => {
    setIsAdminUnlocked(false);
    setViewMode('KIOSK');
  };

  return (
    <div className="app-container">
      {/* FIRST LANDING SCREEN: COMPANY ACCESS CODE LOGIN */}
      {!isCompanyLoggedIn ? (
        <div className="kiosk-viewport" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#090d16', minHeight: '100vh', padding: 20, boxSizing: 'border-box' }}>
          <div className="kiosk-card minimal-ios-card" style={{ maxWidth: 420, width: '100%', padding: '2.5rem 1.8rem', textAlign: 'center', borderRadius: 24, background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(56, 189, 248, 0.3)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)' }}>
            {/* Biometric Shield Badge */}
            <div style={{ width: 68, height: 68, margin: '0 auto 1.25rem auto', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(2,132,199,0.3), rgba(56,189,248,0.15))', border: '1.5px solid #0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(56,189,248,0.2)' }}>
              <Shield size={36} style={{ color: '#38bdf8' }} />
            </div>

            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 0.4rem 0', letterSpacing: '-0.02em' }}>
              IRISH 24/7 KIOSK
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0 0 1.75rem 0', lineHeight: 1.5 }}>
              Enter your assigned <strong>Company Access Code</strong> to connect to your company database:
            </p>

            <form onSubmit={handleCompanyCodeSubmit}>
              <div style={{ marginBottom: 18 }}>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="ENTER COMPANY CODE (e.g. TM)"
                  value={companyCodeInput}
                  onChange={(e) => setCompanyCodeInput(e.target.value.toUpperCase())}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    fontSize: '1.3rem',
                    letterSpacing: '4px',
                    textAlign: 'center',
                    textTransform: 'uppercase',
                    background: '#090d16',
                    border: '1.5px solid #0284c7',
                    borderRadius: 12,
                    color: '#38bdf8',
                    fontWeight: 800,
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              {companyCodeError && (
                <div style={{ color: '#f87171', fontSize: '0.82rem', marginBottom: 16, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)' }}>
                  {companyCodeError}
                </div>
              )}

              <button
                type="submit"
                className="btn-minimal-pill btn-white-primary"
                style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 800, borderRadius: 12, background: 'linear-gradient(135deg, #0284c7, #38bdf8)', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(2,132,199,0.4)' }}
              >
                <span>Connect Company Database ➔</span>
              </button>
            </form>

            <div style={{ marginTop: '2rem', fontSize: '0.75rem', color: '#64748b' }}>
              IRISH 24/7 Orion Nexis Sync System v2.5
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Global Top Navbar */}
          <header className="top-navbar">
        <div className="brand-title">
          <div className="brand-icon-shield">
            <Shield size={18} />
          </div>
          <div className="brand-text-block">
            <span className="brand-main">IRISH 24/7</span>
            <span className="brand-sub">Orion Nexis Sync</span>
          </div>
        </div>

        <div className="nav-mode-switcher">
          {isNativeMobile && (
            <button
              className={`nav-mode-btn ${viewMode === 'KIOSK' ? 'active' : ''}`}
              onClick={() => setViewMode('KIOSK')}
            >
              <Tablet size={18} /> Reception Kiosk App
            </button>
          )}
          <button
            className={`nav-mode-btn ${viewMode === 'ADMIN' ? 'active' : ''}`}
            onClick={handleAdminModeClick}
          >
            <Shield size={18} /> System Admin Portal
            {isAdminUnlocked ? (
              <span className="unlocked-pill" style={{ marginLeft: 6, fontSize: 11, background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '2px 6px', borderRadius: 4 }}>Unlocked</span>
            ) : (
              <Lock size={14} style={{ marginLeft: 6, opacity: 0.7 }} />
            )}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            className="branch-select-pill"
            style={{ background: 'rgba(2, 132, 199, 0.15)', border: '1px solid #0284c7', cursor: 'default' }}
            title={`Active Session: ${api.getActiveCompany().company_name || 'Enterprise'}`}
          >
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#38bdf8' }}>
              🏢 {api.getActiveCompany().company_name || 'Primary Enterprise'}
            </span>
          </div>

          <div className="branch-select-pill">
            <Building2 size={16} />
            <select value={selectedBranchId} onChange={(e) => setSelectedBranchId(e.target.value)}>
              {activeBranches.map(b => (
                <option key={b.branch_id} value={b.branch_id}>
                  {b.branch_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Viewport render based on active mode */}
      {isNativeMobile && viewMode === 'KIOSK' ? (
        <KioskApp
          selectedBranchId={selectedBranchId}
          onBranchChange={setSelectedBranchId}
          onCompanyLogout={handleCompanyLogout}
        />
      ) : (
        <AdminPortal
          selectedBranchId={selectedBranchId}
          onLockAdmin={handleLockAdmin}
          onBranchesUpdated={loadBranches}
          onCompanyLogout={handleCompanyLogout}
        />
      )}

      {/* Admin Security PIN Modal */}
      {showPinModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-card" style={{ background: '#1e293b', color: '#fff', borderRadius: 12, padding: 28, width: 380, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Lock size={22} style={{ color: '#38bdf8' }} />
                <h3 style={{ margin: 0, fontSize: 18 }}>System Admin Verification</h3>
              </div>
              <button onClick={() => setShowPinModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 20 }}>
              Enter System Admin password to access portal:
            </p>

            <form onSubmit={handlePinSubmit}>
              <input
                type="password"
                autoFocus
                placeholder="Enter Admin Password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: 18,
                  letterSpacing: 4,
                  textAlign: 'center',
                  background: '#0f172a',
                  border: '1px solid #475569',
                  borderRadius: 8,
                  color: '#fff',
                  marginBottom: 14
                }}
              />

              {pinError && (
                <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 14, textAlign: 'center' }}>
                  {pinError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  style={{ flex: 1, padding: 10, background: '#334155', border: 'none', borderRadius: 6, color: '#cbd5e1', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: 10, background: '#0284c7', border: 'none', borderRadius: 6, color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  Unlock Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Company Code Login Modal */}
      {showCompanyModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-card" style={{ background: '#1e293b', color: '#fff', borderRadius: 12, padding: 28, width: 400, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)', border: '1px solid #0284c7' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Building2 size={22} style={{ color: '#38bdf8' }} />
                <h3 style={{ margin: 0, fontSize: 18 }}>Company Access Code Login</h3>
              </div>
              <button onClick={() => setShowCompanyModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>
              Enter your assigned <strong>Company Access Code</strong> (e.g. <code>DEMO</code>, <code>ACME</code>) to connect to your company database:
            </p>

            <form onSubmit={handleCompanyCodeSubmit}>
              <input
                type="text"
                autoFocus
                placeholder="e.g. DEMO"
                value={companyCodeInput}
                onChange={(e) => setCompanyCodeInput(e.target.value.toUpperCase())}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: 20,
                  letterSpacing: 4,
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  background: '#0f172a',
                  border: '1px solid #0284c7',
                  borderRadius: 8,
                  color: '#38bdf8',
                  fontWeight: 800,
                  marginBottom: 14
                }}
              />

              {companyCodeError && (
                <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 14, textAlign: 'center' }}>
                  {companyCodeError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowCompanyModal(false)}
                  style={{ flex: 1, padding: 10, background: '#334155', border: 'none', borderRadius: 6, color: '#cbd5e1', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: 10, background: '#0284c7', border: 'none', borderRadius: 6, color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                >
                  Connect Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}

export default App;
