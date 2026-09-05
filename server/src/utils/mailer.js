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

module.exports = { sendInitialAccessEmail };
