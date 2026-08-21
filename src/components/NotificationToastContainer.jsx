import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Clock, DollarSign, FileText, X, Bell } from 'lucide-react';

export function NotificationToastContainer() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const handleNotification = (e) => {
      const notif = e.detail;
      setNotifications(prev => [notif, ...prev.slice(0, 4)]);

      // Auto dismiss after 6 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notif.id));
      }, 6000);
    };

    window.addEventListener('rfap-popup-notification', handleNotification);
    return () => window.removeEventListener('rfap-popup-notification', handleNotification);
  }, []);

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (notifications.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 20,
      right: 20,
      zIndex: 999999,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      maxWidth: 420,
      width: 'calc(100vw - 40px)',
      pointerEvents: 'none'
    }}>
      {notifications.map(n => {
        let borderColor = '#10b981';
        let bgGradient = 'linear-gradient(135deg, rgba(6, 78, 59, 0.95), rgba(15, 23, 42, 0.95))';
        let IconComp = CheckCircle2;
        let iconColor = '#34d399';

        if (n.type === 'REGULARIZATION') {
          borderColor = '#0284c7';
          bgGradient = 'linear-gradient(135deg, rgba(7, 89, 133, 0.95), rgba(15, 23, 42, 0.95))';
          IconComp = Clock;
          iconColor = '#38bdf8';
        } else if (n.type === 'PETTY_CASH') {
          borderColor = '#10b981';
          bgGradient = 'linear-gradient(135deg, rgba(6, 78, 59, 0.95), rgba(15, 23, 42, 0.95))';
          IconComp = DollarSign;
          iconColor = '#10b981';
        } else if (n.type === 'ERROR') {
          borderColor = '#ef4444';
          bgGradient = 'linear-gradient(135deg, rgba(127, 29, 29, 0.95), rgba(15, 23, 42, 0.95))';
          IconComp = AlertCircle;
          iconColor = '#f87171';
        }

        return (
          <div
            key={n.id}
            style={{
              background: bgGradient,
              border: `1.5px solid ${borderColor}`,
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 0, 0, 0.3)',
              borderRadius: 14,
              padding: '14px 16px',
              color: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              backdropFilter: 'blur(12px)',
              pointerEvents: 'auto',
              animation: 'slideInTop 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  padding: 8,
                  borderRadius: 10,
                  background: 'rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <IconComp size={20} style={{ color: iconColor }} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}>
                    {n.title}
                  </h4>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
                    {n.timestamp} • Mobile APK & Cloud Alert
                  </span>
                </div>
              </div>

              <button
                onClick={() => removeNotification(n.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 6
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#f1f5f9', lineHeight: 1.45, paddingLeft: 38 }}>
              {n.body}
            </p>

            {/* Progress bar animation */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              height: 3,
              background: borderColor,
              width: '100%',
              animation: 'shrinkWidth 6s linear forwards'
            }} />
          </div>
        );
      })}

      <style>{`
        @keyframes slideInTop {
          from {
            transform: translateY(-30px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes shrinkWidth {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
