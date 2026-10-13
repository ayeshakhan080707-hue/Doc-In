import nodemailer, { Transporter } from 'nodemailer';

/**
 * Email Service using Nodemailer.
 * Add to .env:
 *   EMAIL_FROM=noreply@docin.com
 *   EMAIL_HOST=smtp.sendgrid.net        (or smtp.gmail.com)
 *   EMAIL_PORT=587
 *   EMAIL_USER=apikey                   (SendGrid) or your Gmail address
 *   EMAIL_PASS=your_sendgrid_api_key    (SendGrid) or Gmail app password
 *
 * For development without real SMTP, emails are logged to console.
 */

let transporter: Transporter | null = null;

const getTransporter = (): Transporter => {
  if (transporter) return transporter;

  if (!process.env.EMAIL_HOST || !process.env.EMAIL_PASS) {
    // Dev mode: use Ethereal fake SMTP (logs to console)
    console.warn('[EmailService] No SMTP config found. Emails will be logged only.');
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: { user: 'dev@docin.com', pass: 'devpass' },
    });
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_PORT === '465',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  return transporter;
};

const FROM = process.env.EMAIL_FROM || 'DocIn Platform <noreply@docin.com>';

// ── HTML email base template ──────────────────────────────────────────────────
const wrapHtml = (title: string, body: string): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F3F2EF; margin: 0; padding: 20px; }
    .container { max-width: 540px; margin: 0 auto; background: #fff; border-radius: 12px; border: 1px solid #e0e0e0; overflow: hidden; }
    .header { background: linear-gradient(135deg, #0A66C2, #0D9488); padding: 28px 32px; text-align: center; }
    .header h1 { color: #fff; font-size: 22px; margin: 0; font-weight: 700; letter-spacing: -0.5px; }
    .header span { color: #CCFBF1; }
    .body { padding: 28px 32px; color: #333; font-size: 14px; line-height: 1.6; }
    .body h2 { font-size: 18px; color: #0A66C2; margin-top: 0; }
    .btn { display: inline-block; margin: 16px 0; padding: 12px 28px; background: #0A66C2; color: #fff; text-decoration: none; border-radius: 24px; font-weight: 600; font-size: 14px; }
    .code { background: #F3F2EF; border-radius: 8px; padding: 14px 20px; font-family: monospace; font-size: 22px; letter-spacing: 4px; text-align: center; color: #0A66C2; font-weight: 700; margin: 16px 0; }
    .footer { padding: 16px 32px; background: #F9F9F9; border-top: 1px solid #eee; font-size: 11px; color: #999; text-align: center; }
    .badge { display: inline-block; padding: 3px 10px; background: #E6F4EA; color: #137333; border-radius: 12px; font-size: 12px; font-weight: 600; border: 1px solid #CEEAD6; }
    .warn { display: inline-block; padding: 3px 10px; background: #FEF3F2; color: #C62828; border-radius: 12px; font-size: 12px; font-weight: 600; border: 1px solid #FFCDD2; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Doc<span>In</span>™ Healthcare Platform</h1>
    </div>
    <div class="body">
      <h2>${title}</h2>
      ${body}
    </div>
    <div class="footer">
      © 2026 DocIn™ Corporation. All rights reserved.<br/>
      This email was sent by the DocIn Platform. Please do not reply to this email.
    </div>
  </div>
</body>
</html>
`;

// ── Send helper ───────────────────────────────────────────────────────────────
const sendEmail = async (to: string, subject: string, html: string): Promise<void> => {
  if (process.env.NODE_ENV === 'test') return; // skip in tests

  try {
    const t = getTransporter();
    const info = await t.sendMail({ from: FROM, to, subject, html });
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[EmailService] Sent to ${to}: ${subject}`);
      // Ethereal preview URL in dev
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) console.log(`[EmailService] Preview: ${previewUrl}`);
    }
  } catch (err: any) {
    // Log but don't throw — email failure shouldn't crash the API
    console.error(`[EmailService] Failed to send to ${to}:`, err.message);
  }
};

// ── Email Templates ───────────────────────────────────────────────────────────

export const sendWelcomeEmail = async (to: string, fullName: string, role: string): Promise<void> => {
  const html = wrapHtml(
    `Welcome to DocIn, ${fullName}! 👋`,
    `
    <p>Your account has been created successfully.</p>
    <p><strong>Role:</strong> ${role.replace(/_/g, ' ')}</p>
    <p>Start building your professional healthcare network — connect with verified doctors, explore clinical case studies, and discover job opportunities.</p>
    <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/feed" class="btn">Go to DocIn Feed →</a>
    <p style="margin-top:20px; color:#666; font-size:13px;">
      If you are a doctor, upload your medical credentials to get the <span class="badge">✓ Verified Practitioner</span> badge.
    </p>
    `
  );
  await sendEmail(to, 'Welcome to DocIn™ Healthcare Platform', html);
};

export const sendPasswordResetEmail = async (
  to: string,
  fullName: string,
  resetToken: string
): Promise<void> => {
  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
  const html = wrapHtml(
    'Password Reset Request',
    `
    <p>Hi <strong>${fullName}</strong>,</p>
    <p>We received a request to reset the password for your DocIn account. Click the button below to set a new password:</p>
    <a href="${resetUrl}" class="btn">Reset My Password →</a>
    <p>Or copy this link into your browser:</p>
    <p style="font-size:12px; color:#666; word-break:break-all;">${resetUrl}</p>
    <p style="margin-top:20px; padding:12px; background:#FFF8E1; border-radius:8px; font-size:13px; color:#856404;">
      ⚠️ This link expires in <strong>15 minutes</strong>. If you didn't request a password reset, please ignore this email.
    </p>
    `
  );
  await sendEmail(to, 'DocIn — Password Reset Request', html);
};

export const sendCredentialApprovedEmail = async (
  to: string,
  fullName: string,
  licenseNumber: string
): Promise<void> => {
  const html = wrapHtml(
    '🎉 Clinical Verification Approved!',
    `
    <p>Congratulations, <strong>Dr. ${fullName}</strong>!</p>
    <p>Your medical credentials have been reviewed and <strong>approved</strong> by our Credentialing Officer.</p>
    <p><strong>License Number:</strong> <code>${licenseNumber}</code></p>
    <p>You now carry the official <span class="badge">✓ DocIn Verified Medical Practitioner</span> badge on your profile.</p>
    <p>This badge signals your verified status to hospitals, recruiters, and colleagues on the platform.</p>
    <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/profile" class="btn">View Your Profile →</a>
    `
  );
  await sendEmail(to, 'DocIn — Clinical Verification Approved ✓', html);
};

export const sendCredentialRejectedEmail = async (
  to: string,
  fullName: string,
  rejectionReason: string
): Promise<void> => {
  const html = wrapHtml(
    'Credential Review — Action Required',
    `
    <p>Hi <strong>${fullName}</strong>,</p>
    <p>Your credential document was reviewed by our Credentialing Officer. Unfortunately, it could not be verified at this time.</p>
    <p style="padding:12px; background:#FFF8E1; border-radius:8px;"><strong>Reason:</strong> ${rejectionReason}</p>
    <p>Please upload a clearer scan or the correct document to proceed with verification.</p>
    <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/profile" class="btn">Re-upload Credentials →</a>
    `
  );
  await sendEmail(to, 'DocIn — Credential Verification Requires Re-submission', html);
};

export const sendJobApplicationEmail = async (
  to: string,
  fullName: string,
  jobTitle: string,
  institutionName: string,
  status: string
): Promise<void> => {
  const statusColors: Record<string, { label: string; color: string }> = {
    PENDING:     { label: 'Under Review',  color: '#856404' },
    REVIEWED:    { label: 'Being Reviewed', color: '#0A66C2' },
    SHORTLISTED: { label: 'Shortlisted 🎉', color: '#137333' },
    REJECTED:    { label: 'Not Selected',   color: '#C62828' },
  };
  const s = statusColors[status] || { label: status, color: '#333' };
  const html = wrapHtml(
    `Job Application Update`,
    `
    <p>Hi <strong>${fullName}</strong>,</p>
    <p>There is an update on your application for:</p>
    <p><strong>${jobTitle}</strong> at <strong>${institutionName}</strong></p>
    <p>Application Status: <strong style="color:${s.color}">${s.label}</strong></p>
    <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/jobs" class="btn">View My Applications →</a>
    `
  );
  await sendEmail(to, `DocIn — Application Update: ${jobTitle}`, html);
};

export const sendConnectionRequestEmail = async (
  to: string,
  recipientName: string,
  senderName: string
): Promise<void> => {
  const html = wrapHtml(
    'New Connection Request',
    `
    <p>Hi <strong>${recipientName}</strong>,</p>
    <p><strong>${senderName}</strong> has sent you a connection request on DocIn.</p>
    <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/network" class="btn">View Request →</a>
    `
  );
  await sendEmail(to, `DocIn — ${senderName} wants to connect`, html);
};
