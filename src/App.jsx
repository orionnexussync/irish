import React, { useState, useEffect } from 'react';
import { Tablet, Shield, Building2, Lock, Key, X, Check, LogOut, Palette, DollarSign } from 'lucide-react';
import { KioskApp } from './components/KioskApp';
import { AdminPortal } from './components/AdminPortal';
import { PettyCashPortal } from './components/PettyCashPortal';
import { NotificationToastContainer } from './components/NotificationToastContainer';
import { api } from './services/supabase';
import { audioService } from './services/audioService';

const PRESET_THEMES = [
  { id: 'black', name: 'Pitch Black (OLED)', bg: '#000000', text: '#ffffff', isLight: false },
  { id: 'navy', name: 'Deep Executive Navy', bg: '#0b1329', text: '#ffffff', isLight: false },
  { id: 'emerald', name: 'Bio Emerald Dark', bg: '#06231a', text: '#ffffff', isLight: false },
  { id: 'purple', name: 'Royal Purple', bg: '#1e0a38', text: '#ffffff', isLight: false },
  { id: 'light', name: 'High Contrast Light', bg: '#f1f5f9', text: '#0f172a', isLight: true },
];

export function App() {
  // Background Color Customization State
  const [customBgColor, setCustomBgColor] = useState(() => localStorage.getItem('rfap_bg_color') || '#000000');
  const [showThemeModal, setShowThemeModal] = useState(false);

  const applyThemeColor = (colorHex) => {
    setCustomBgColor(colorHex);
    localStorage.setItem('rfap_bg_color', colorHex);

    let hex = colorHex.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    const isLight = brightness > 155;

    // Derived surface color (for sidebar, navbar, and input controls)
    const surfaceR = isLight ? Math.min(255, r + 10) : Math.max(0, Math.round(r * 0.82));
    const surfaceG = isLight ? Math.min(255, g + 10) : Math.max(0, Math.round(g * 0.82));
    const surfaceB = isLight ? Math.min(255, b + 10) : Math.max(0, Math.round(b * 0.82));
    const surfaceBg = `rgb(${surfaceR}, ${surfaceG}, ${surfaceB})`;

    // Derived card background (for form cards, stat cards, & table containers)
    const cardR = isLight ? 255 : Math.min(255, Math.round(r * 1.25) + 12);
    const cardG = isLight ? 255 : Math.min(255, Math.round(g * 1.25) + 12);
    const cardB = isLight ? 255 : Math.min(255, Math.round(b * 1.25) + 12);
    const cardBg = isLight ? '#ffffff' : `rgba(${cardR}, ${cardG}, ${cardB}, 0.75)`;
    const cardBorder = isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.18)';

    const textColor = isLight ? '#0f172a' : '#ffffff';
    const subTextColor = isLight ? '#475569' : '#cbd5e1';

    document.documentElement.style.setProperty('--app-bg', colorHex);
    document.documentElement.style.setProperty('--app-surface-bg', surfaceBg);
    document.documentElement.style.setProperty('--app-card-bg', cardBg);
    document.documentElement.style.setProperty('--app-card-border', cardBorder);
    document.documentElement.style.setProperty('--bg-black', colorHex);
    document.documentElement.style.setProperty('--bg-dark-surface', surfaceBg);
    document.documentElement.style.setProperty('--bg-dark-card', cardBg);
    document.documentElement.style.setProperty('--text-white', textColor);
    document.documentElement.style.setProperty('--text-gray', subTextColor);

    if (document.body) {
      document.body.style.backgroundColor = colorHex;
      document.body.style.color = textColor;
    }
  };

  useEffect(() => {
    applyThemeColor(customBgColor);
  }, []);
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
      audioService.notify(`Connected to ${active.company_name}`);
    } catch (err) {
      setCompanyCodeError(err.message);
      audioService.notify(err.message, 'error');
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
      audioService.notify('Admin Portal Unlocked');
    } else {
      const errMsg = 'Invalid Security Password. Please try again.';
      setPinError(errMsg);
      audioService.notify(errMsg, 'error');
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
          <button
            className={`nav-mode-btn ${viewMode === 'PETTY_CASH' ? 'active' : ''}`}
            onClick={() => setViewMode('PETTY_CASH')}
          >
            <DollarSign size={18} style={{ color: '#10b981' }} /> {isNativeMobile ? 'Petty Cash Initiator' : 'Petty Cash Approver'}
          </button>
        </div>

        <div className="header-controls-group">
          {/* Background Theme Customizer Button */}
          <button
            onClick={() => setShowThemeModal(true)}
            className="branch-select-pill"
            style={{
              background: 'rgba(168, 85, 247, 0.15)',
              border: '1px solid #a855f7',
              color: '#c084fc',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
            title="Customize Background Color & Theme"
          >
            <Palette size={16} />
            <span>Theme</span>
          </button>

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
      ) : viewMode === 'PETTY_CASH' ? (
        <PettyCashPortal
          platformMode={isNativeMobile ? 'MOBILE_INITIATOR' : 'WEB_APPROVER'}
          selectedBranchId={selectedBranchId}
          onBackToAdmin={() => setViewMode('ADMIN')}
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

      {/* Background Color Customization Modal */}
      {showThemeModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="modal-card" style={{ background: '#1e293b', color: '#fff', borderRadius: 20, padding: 28, maxWidth: 460, width: '100%', border: '1px solid #0284c7', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.9)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Palette size={22} style={{ color: '#c084fc' }} />
                <h3 style={{ margin: 0, fontSize: 18 }}>Customize Background Color</h3>
              </div>
              <button onClick={() => setShowThemeModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20, lineHeight: 1.5 }}>
              Select a preset background theme or pick any custom color to adjust contrast and readability for your environment.
            </p>

            {/* Presets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Preset Color Themes
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {PRESET_THEMES.map(theme => (
                  <button
                    key={theme.id}
                    onClick={() => applyThemeColor(theme.bg)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 12,
                      border: customBgColor.toLowerCase() === theme.bg.toLowerCase() ? '2px solid #38bdf8' : '1px solid #475569',
                      background: theme.bg,
                      color: theme.text,
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      textAlign: 'left'
                    }}
                  >
                    <span style={{ width: 14, height: 14, borderRadius: '50%', background: theme.bg, border: '1px solid #fff' }}></span>
                    <span>{theme.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Color Picker */}
            <div style={{ background: '#0f172a', padding: 16, borderRadius: 12, border: '1px solid #334155', marginBottom: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
                  Pick Custom Color:
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="color"
                    value={customBgColor}
                    onChange={(e) => applyThemeColor(e.target.value)}
                    style={{ width: 44, height: 34, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'transparent' }}
                  />
                  <span style={{ fontSize: 13, fontFamily: 'monospace', color: '#38bdf8', fontWeight: 800 }}>
                    {customBgColor.toUpperCase()}
                  </span>
                </div>
              </label>
            </div>

            <button
              onClick={() => setShowThemeModal(false)}
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Apply Theme & Close
            </button>
          </div>
        </div>
      )}

      {/* Global In-App Floating Popup Notification Toast Container */}
      <NotificationToastContainer />
    </div>
  );
}

export default App;
