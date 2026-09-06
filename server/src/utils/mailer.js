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

async function sendInitialAccessEmail({ Receiver, Emailsubject, EmailBody }) {
  if (!transporter) {
    throw new Error('SMTP email delivery is not configured');
  }

  await transporter.sendMail({
    from: config.EMAIL_USER,
    to: Receiver,
    subject: Emailsubject,
    text: EmailBody
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
    
  });
}

module.exports = { sendInitialAccessEmail, sendPayslipStatementEmail };
