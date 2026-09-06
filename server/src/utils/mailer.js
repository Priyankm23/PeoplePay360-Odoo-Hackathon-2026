const nodemailer = require('nodemailer');
const config = require('../config/env');

const isConfigured = Boolean(config.EMAIL_USER && config.EMAIL_PASS);
const transporter = isConfigured
  ? nodemailer.createTransport({
      host: config.SMTP_SERVER,
      port: config.SMTP_PORT,
      secure: config.SMTP_PORT === 465,
      auth: { user: config.EMAIL_USER, pass: config.EMAIL_PASS },
    })
  : null;

async function sendInitialAccessEmail({ email, password }) {
  if (!transporter) {
    throw new Error('SMTP email delivery is not configured');
  }

  await transporter.sendMail({
    from: config.EMAIL_USER,
    to: email,
    subject: 'Your PeoplePay360 account',
    text: [
      'Your PeoplePay360 account has been created.',
      '',
      `Email: ${email}`,
      `Temporary password: ${password}`,
      '',
      'Sign in and change this password immediately. Do not forward this email.',
    ].join('\n'),
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function sendPayslipStatementEmail({ email, employeeName, payrunName, periodStart, periodEnd, reference, grossSalary, deductions, netSalary, lines }) {
  if (!transporter) {
    throw new Error('SMTP email delivery is not configured');
  }

  const lineRows = (lines || []).map((line) => `
    <tr><td style="padding:8px 0;border-bottom:1px solid #e5e7e4">${escapeHtml(line.name)}</td>
    <td style="padding:8px 0;border-bottom:1px solid #e5e7e4;text-align:right">${escapeHtml(line.amount)}</td></tr>`).join('');

  await transporter.sendMail({
    from: config.EMAIL_USER,
    to: email,
    subject: `Payroll statement – ${payrunName}`,
    text: `Hello ${employeeName}, your payroll statement for ${periodStart} to ${periodEnd} is ready. Net salary: ${netSalary}.`,
    html: `<!doctype html><html><body style="margin:0;background:#f4f5f3;font-family:Arial,sans-serif;color:#1c1f1e">
      <div style="max-width:620px;margin:24px auto;background:#fff;border:1px solid #daddd9;border-radius:10px;overflow:hidden">
        <div style="padding:24px 28px;background:#1a2e24;color:#fff"><strong style="font-size:22px">PeoplePay<span style="color:#ecc85e">360</span></strong><div style="margin-top:6px;color:#d8e8dd">Payroll Statement</div></div>
        <div style="padding:28px"><p style="margin-top:0">Hello ${escapeHtml(employeeName)},</p><p>Your payroll statement is ready for the following payroll cycle:</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0"><tr><td style="padding:7px 0;color:#5b615e">Payroll cycle</td><td style="padding:7px 0;text-align:right;font-weight:bold">${escapeHtml(payrunName)}</td></tr><tr><td style="padding:7px 0;color:#5b615e">Pay period</td><td style="padding:7px 0;text-align:right">${escapeHtml(periodStart)} → ${escapeHtml(periodEnd)}</td></tr><tr><td style="padding:7px 0;color:#5b615e">Reference</td><td style="padding:7px 0;text-align:right">${escapeHtml(reference)}</td></tr></table>
          <h3 style="font-size:13px;letter-spacing:.08em;border-bottom:1px solid #daddd9;padding-bottom:10px">PAYSLIP BREAKDOWN</h3>
          <table style="width:100%;border-collapse:collapse">${lineRows}</table>
          <table style="width:100%;border-collapse:collapse;margin-top:18px"><tr><td style="padding:7px 0;color:#5b615e">Gross salary</td><td style="padding:7px 0;text-align:right">${escapeHtml(grossSalary)}</td></tr><tr><td style="padding:7px 0;color:#5b615e">Deductions</td><td style="padding:7px 0;text-align:right">${escapeHtml(deductions)}</td></tr><tr><td style="padding:13px 0;border-top:2px solid #3b8a5c;font-weight:bold">Net salary</td><td style="padding:13px 0;border-top:2px solid #3b8a5c;text-align:right;font-size:20px;font-weight:bold;color:#1d4830">${escapeHtml(netSalary)}</td></tr></table>
          <p style="font-size:12px;color:#5b615e;margin-bottom:0">This is an electronically generated payroll statement. Please contact HR if any details look incorrect.</p>
        </div>
      </div></body></html>`,
  });
}

module.exports = { sendInitialAccessEmail, sendPayslipStatementEmail };
