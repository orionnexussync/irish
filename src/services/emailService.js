/**
 * Resend Email API Integration Service
 * Website: https://resend.com
 * API Endpoint: https://api.resend.com/emails
 */

const RESEND_API_KEY_STORAGE = 'rfap_resend_api_key';
const RESEND_FROM_EMAIL_STORAGE = 'rfap_resend_from_email';

export const emailService = {
  // Get stored Resend API Key
  getApiKey: () => {
    return localStorage.getItem(RESEND_API_KEY_STORAGE) || '';
  },

  // Save Resend API Key
  saveApiKey: (key) => {
    if (key) {
      localStorage.setItem(RESEND_API_KEY_STORAGE, key.trim());
    } else {
      localStorage.removeItem(RESEND_API_KEY_STORAGE);
    }
  },

  // Get stored Sender Email (From)
  getFromEmail: () => {
    return localStorage.getItem(RESEND_FROM_EMAIL_STORAGE) || 'Orion Enterprise <onboarding@resend.dev>';
  },

  // Save Sender Email
  saveFromEmail: (fromEmail) => {
    if (fromEmail) {
      localStorage.setItem(RESEND_FROM_EMAIL_STORAGE, fromEmail.trim());
    }
  },

  /**
   * Send Email via Resend REST API (https://api.resend.com/emails)
   */
  sendEmail: async ({ to, subject, html, text, from, apiKeyOverride }) => {
    const apiKey = apiKeyOverride || emailService.getApiKey();
    if (!apiKey) {
      throw new Error('Resend API Key is missing. Please configure your Resend API Key (re_...) in Admin Portal -> Email Schedule Config.');
    }

    const sender = from || emailService.getFromEmail();
    const recipientList = Array.isArray(to) ? to : to.split(',').map(e => e.trim()).filter(Boolean);

    if (recipientList.length === 0) {
      throw new Error('Recipient email address is required.');
    }

    const payload = {
      from: sender,
      to: recipientList,
      subject: subject || 'Orion Enterprise System Notification',
      html: html || `<p>${text || 'System notification'}</p>`
    };

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();

      if (!response.ok) {
        const errorMsg = resData.message || resData.name || 'Resend API dispatch failed';
        throw new Error(`Resend API Error (${response.status}): ${errorMsg}`);
      }

      console.log('✅ Email successfully dispatched via Resend API:', resData);
      return { success: true, id: resData.id, data: resData };
    } catch (err) {
      console.error('Resend email dispatch error:', err);
      throw err;
    }
  },

  /**
   * Send Test Email via Resend
   */
  sendTestEmail: async (testRecipient, apiKey, fromEmail) => {
    return await emailService.sendEmail({
      apiKeyOverride: apiKey,
      from: fromEmail,
      to: testRecipient,
      subject: '🧪 Orion Enterprise - Resend Integration Test Email',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0f172a; color: #ffffff; border-radius: 12px;">
          <h2 style="color: #38bdf8; margin-top: 0;">✅ Resend Email Integration Verified!</h2>
          <p>This is a live test email dispatched from your <strong>Orion Enterprise Biometric Suite</strong> using <strong>Resend API</strong>.</p>
          <hr style="border: 1px solid #334155;" />
          <ul style="color: #cbd5e1; font-size: 14px;">
            <li><strong>Timestamp:</strong> ${new Date().toLocaleString()}</li>
            <li><strong>Sender:</strong> ${fromEmail || 'Orion Enterprise'}</li>
            <li><strong>Status:</strong> Dispatched & Verified</li>
          </ul>
          <p style="font-size: 12px; color: #94a3b8;">Orion Nexus Sync - Automated Notification Engine</p>
        </div>
      `
    });
  },

  /**
   * Send Daily Attendance Summary Report via Email
   */
  sendAttendanceReportEmail: async (recipients, reportDate, summaryStats) => {
    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 24px; background: #0f172a; color: #ffffff; border-radius: 16px;">
        <h2 style="color: #38bdf8; margin: 0 0 10px 0;">📊 Daily Attendance Summary Report</h2>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">Report Date: <strong>${reportDate}</strong></p>

        <table style="width: 100%; border-collapse: collapse; background: #1e293b; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
          <thead>
            <tr style="background: #334155; color: #38bdf8; text-align: left;">
              <th style="padding: 12px;">Metric</th>
              <th style="padding: 12px;">Count</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #334155;">
              <td style="padding: 12px;">Total Employees</td>
              <td style="padding: 12px; font-weight: bold;">${summaryStats.totalStaff || 0}</td>
            </tr>
            <tr style="border-bottom: 1px solid #334155;">
              <td style="padding: 12px; color: #10b981;">Present Today</td>
              <td style="padding: 12px; font-weight: bold; color: #10b981;">${summaryStats.presentCount || 0}</td>
            </tr>
            <tr style="border-bottom: 1px solid #334155;">
              <td style="padding: 12px; color: #ef4444;">Absent / No Punch</td>
              <td style="padding: 12px; font-weight: bold; color: #ef4444;">${summaryStats.absentCount || 0}</td>
            </tr>
            <tr>
              <td style="padding: 12px; color: #c084fc;">On Approved Leave</td>
              <td style="padding: 12px; font-weight: bold; color: #c084fc;">${summaryStats.leaveCount || 0}</td>
            </tr>
          </tbody>
        </table>

        <p style="font-size: 13px; color: #94a3b8;">Logged in to view complete employee details in your Orion System Admin Portal.</p>
      </div>
    `;

    return await emailService.sendEmail({
      to: recipients,
      subject: `📊 Daily Attendance Report - ${reportDate}`,
      html: htmlContent
    });
  }
};
