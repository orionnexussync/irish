// Notification Service for Mobile APK & Web App
// Supports Native Capacitor Push / Local Notifications, Native Toasts, and In-App Popups

import { LocalNotifications } from '@capacitor/local-notifications';
import { Toast } from '@capacitor/toast';
import { audioService } from './audioService';

class NotificationService {
  constructor() {
    this.isNative = !!(
      typeof window !== 'undefined' &&
      window.Capacitor &&
      typeof window.Capacitor.isNativePlatform === 'function' &&
      window.Capacitor.isNativePlatform()
    );
    this.hasPermission = false;
    this.init();
  }

  async init() {
    if (typeof window === 'undefined') return;

    try {
      if (this.isNative) {
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') {
          const req = await LocalNotifications.requestPermissions();
          this.hasPermission = req.display === 'granted';
        } else {
          this.hasPermission = true;
        }

        // Register default notification channel for Android
        await LocalNotifications.createChannel({
          id: 'rfap_approvals_channel',
          name: 'RFAP Workflow & Approvals',
          description: 'High-priority notifications for Regularization and Petty Cash requests',
          importance: 5,
          visibility: 1,
          vibration: true,
          sound: 'default'
        }).catch(e => console.warn('Channel creation error:', e));
      } else if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission().then(p => {
          this.hasPermission = p === 'granted';
        });
      }
    } catch (err) {
      console.warn('Notification init error:', err);
    }
  }

  // Core Dispatcher
  async triggerPopupNotification({
    title,
    body,
    type = 'SUCCESS', // 'SUCCESS' | 'REGULARIZATION' | 'PETTY_CASH' | 'INFO' | 'ERROR'
    sound = true,
    speech = true,
    data = {}
  }) {
    // 1. In-App Audio & Speech feedback
    if (sound) {
      audioService.playBeep(type === 'ERROR' ? 'error' : 'success');
    }
    if (speech && body) {
      audioService.speak(title + '. ' + body);
    }

    // 2. Native Mobile APK Notification Tray (Capacitor LocalNotifications)
    if (this.isNative) {
      try {
        const notifId = Math.floor(Date.now() % 1000000);
        await LocalNotifications.schedule({
          notifications: [
            {
              id: notifId,
              title: title || 'RFAP Notification',
              body: body || '',
              channelId: 'rfap_approvals_channel',
              schedule: { at: new Date(Date.now() + 100) },
              sound: 'default',
              smallIcon: 'ic_stat_notification',
              extra: data
            }
          ]
        });

        // Also trigger native Android Toast
        await Toast.show({
          text: `🔔 ${title}: ${body}`,
          duration: 'long',
          position: 'top'
        });
      } catch (err) {
        console.warn('Native Local Notification error:', err);
      }
    } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico'
        });
      } catch (e) {
        console.warn('Web notification error:', e);
      }
    }

    // 3. Dispatch In-App Global Event for UI Popup Modal / Banner
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('rfap-popup-notification', {
        detail: {
          id: Date.now() + Math.random(),
          title,
          body,
          type,
          timestamp: new Date().toLocaleTimeString(),
          data
        }
      });
      window.dispatchEvent(event);
    }
  }

  // Specialized: Attendance Regularization Submitted / Approved Pop-up Notification
  async notifyRegularization({
    action = 'SUBMITTED', // 'SUBMITTED' | 'APPROVED_L1' | 'APPROVED_L2' | 'APPROVED' | 'REJECTED'
    empId,
    empName,
    punchType,
    date,
    approverName,
    branchName
  }) {
    let title = '📋 Attendance Regularization';
    let body = '';
    let type = 'REGULARIZATION';

    const empLabel = empName ? `${empName} (${empId})` : empId;

    if (action === 'SUBMITTED') {
      title = '📋 Regularization Request Submitted';
      body = `Request for ${empLabel} (${punchType || 'Punch'}) on ${date || 'today'} is routed to Respective Manager.`;
    } else if (action === 'APPROVED_L1') {
      title = '⏳ Regularization Level 1 Approved';
      body = `Respective Manager (${approverName || 'Approver 01'}) approved request for ${empLabel}. Routed to Superior Manager.`;
    } else if (action === 'APPROVED' || action === 'APPROVED_L2') {
      title = '✅ Regularization Approved & Completed';
      body = `Attendance regularized for ${empLabel} by ${approverName || 'Manager'}. Log updated to PRESENT.`;
    } else if (action === 'REJECTED') {
      title = '🔴 Regularization Rejected';
      body = `Request for ${empLabel} was rejected by ${approverName || 'Manager'}.`;
      type = 'ERROR';
    }

    await this.triggerPopupNotification({
      title,
      body,
      type,
      data: { module: 'REGULARIZATION', empId, action }
    });
  }

  // Specialized: Petty Cash Claim Submitted / Approved Pop-up Notification
  async notifyPettyCash({
    action = 'SUBMITTED', // 'SUBMITTED' | 'APPROVED_L1' | 'APPROVED_L2' | 'APPROVED' | 'REJECTED' | 'SEND_BACK'
    claimNo,
    empId,
    empName,
    amount,
    approverName,
    branchName
  }) {
    let title = '💵 Petty Cash Request';
    let body = '';
    let type = 'PETTY_CASH';

    const formattedAmount = amount ? `₹ ${Number(amount).toLocaleString('en-IN')}` : '';
    const empLabel = empName ? `${empName}` : (empId || 'Initiator');

    if (action === 'SUBMITTED') {
      title = '💵 Petty Cash Claim Raised';
      body = `Claim #${claimNo} (${formattedAmount}) submitted by ${empLabel}. Awaiting Approver 01 (Respective Manager).`;
    } else if (action === 'APPROVED_L1') {
      title = '⏳ Petty Cash Level 1 Approved';
      body = `Claim #${claimNo} (${formattedAmount}) approved by Respective Manager (${approverName || 'Approver 01'}). Routed to Superior Manager.`;
    } else if (action === 'APPROVED' || action === 'APPROVED_L2') {
      title = '✅ Petty Cash Claim Approved';
      body = `Claim #${claimNo} (${formattedAmount}) has been fully approved by ${approverName || 'Manager'}!`;
    } else if (action === 'REJECTED') {
      title = '🔴 Petty Cash Claim Rejected';
      body = `Claim #${claimNo} was rejected by ${approverName || 'Manager'}.`;
      type = 'ERROR';
    } else if (action === 'SEND_BACK') {
      title = '🟡 Petty Cash Claim Sent Back';
      body = `Claim #${claimNo} was sent back for revision by ${approverName || 'Manager'}.`;
    }

    await this.triggerPopupNotification({
      title,
      body,
      type,
      data: { module: 'PETTY_CASH', claimNo, action }
    });
  }
}

export const notificationService = new NotificationService();
