/**
 * @module services/emailService
 * @description Email service for sending OTP verification emails.
 * Uses Resend HTTP API in production (bypasses SMTP port blocking on cloud providers).
 * Falls back to nodemailer with Ethereal for local development.
 * 
 * Production: Set RESEND_API_KEY in environment variables.
 * Local dev:  Leave RESEND_API_KEY empty — uses Ethereal test emails.
 */

import nodemailer from 'nodemailer';
import env from '../config/env.js';

let transporter = null; // Only used for local dev (Ethereal)

/**
 * Builds the HTML email content for the OTP.
 */
function buildOtpHtml(otp, username) {
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0a0a0a; color: #e0e0e0; border: 1px solid #333; border-top: 4px solid #ff0000;">
      <div style="padding: 32px; text-align: center;">
        <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 900; letter-spacing: 2px; color: #ffffff;">
          ⚡ CODESYNC AI
        </h1>
        <p style="color: #888; font-size: 14px; margin: 0 0 32px;">Email Verification</p>
        
        <p style="color: #ccc; font-size: 15px; margin: 0 0 24px;">
          Hey <strong style="color: #fff;">${username}</strong>, use the code below to verify your email:
        </p>
        
        <div style="background: #111; border: 2px solid #ff0000; padding: 20px; margin: 0 0 24px; letter-spacing: 12px; font-size: 36px; font-weight: 900; color: #ff3333; font-family: 'Courier New', monospace;">
          ${otp}
        </div>
        
        <p style="color: #888; font-size: 13px; margin: 0 0 8px;">
          This code expires in <strong style="color: #ff6666;">5 minutes</strong>.
        </p>
        <p style="color: #666; font-size: 12px; margin: 0;">
          If you didn't request this, ignore this email.
        </p>
      </div>
      <div style="padding: 16px; text-align: center; border-top: 1px solid #222; background: #050505;">
        <p style="color: #555; font-size: 11px; margin: 0;">CodeSync AI — Real-time Collaborative Coding</p>
      </div>
    </div>
  `;
}

/**
 * Sends OTP email via Brevo HTTP API (works on all cloud providers, sends to any email).
 * @param {string} to - Recipient email address.
 * @param {string} otp - The 6-digit OTP code.
 * @param {string} username - The user's chosen username.
 * @returns {Promise<{success: boolean}>}
 */
async function sendViaBrevo(to, otp, username) {
  const apiKey = process.env.BREVO_API_KEY;
  // Brevo requires the sender email to be the one you verified on their platform
  const fromEmail = process.env.BREVO_SENDER_EMAIL || 'harshitraj1593@gmail.com';
  const fromName = 'CodeSync AI';

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: fromName, email: fromEmail },
      to: [{ email: to }],
      subject: `${otp} — Your CodeSync AI Verification Code`,
      htmlContent: buildOtpHtml(otp, username),
      textContent: `Your CodeSync AI verification code is: ${otp}\n\nThis code expires in 5 minutes.\n\nIf you didn't request this, ignore this email.`,
    }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    console.error('📧 Brevo API error:', errBody);
    throw new Error(errBody.message || `Email API returned status ${response.status}`);
  }

  const data = await response.json();
  console.log(`📧 OTP email sent via Brevo (messageId: ${data.messageId})`);
  return { success: true };
}

/**
 * Sends OTP email via nodemailer (for local development with Ethereal).
 * @param {string} to - Recipient email address.
 * @param {string} otp - The 6-digit OTP code.
 * @param {string} username - The user's chosen username.
 * @returns {Promise<{success: boolean, previewUrl?: string}>}
 */
async function sendViaNodemailer(to, otp, username) {
  if (!transporter) {
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      // Local SMTP (e.g. Gmail from your machine)
      transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: Number(env.SMTP_PORT),
        secure: Number(env.SMTP_PORT) === 465,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
      });
      console.log('📧 Email service: Using configured SMTP server');
    } else {
      // Ethereal test account
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
      console.log('📧 Email service: Using Ethereal test account');
      console.log(`   User: ${testAccount.user}`);
    }
  }

  const info = await transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: `${otp} — Your CodeSync AI Verification Code`,
    text: `Your CodeSync AI verification code is: ${otp}\n\nThis code expires in 5 minutes.\n\nIf you didn't request this, ignore this email.`,
    html: buildOtpHtml(otp, username),
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`📧 OTP Email Preview URL: ${previewUrl}`);
  }
  return { success: true, previewUrl: previewUrl || null };
}

/**
 * Sends an OTP verification email.
 * Automatically chooses Brevo API (production) or nodemailer (local dev).
 * @param {string} to - Recipient email address.
 * @param {string} otp - The 6-digit OTP code.
 * @param {string} username - The user's chosen username (for personalization).
 * @returns {Promise<{success: boolean, previewUrl?: string}>}
 */
export async function sendOtpEmail(to, otp, username) {
  // Use Brevo HTTP API if the key is configured (recommended for cloud deployments)
  if (process.env.BREVO_API_KEY) {
    return sendViaBrevo(to, otp, username);
  }

  // Otherwise fall back to nodemailer (local development)
  return sendViaNodemailer(to, otp, username);
}

export default { sendOtpEmail };
