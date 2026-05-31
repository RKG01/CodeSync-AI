/**
 * @module services/emailService
 * @description Email service for sending OTP verification emails.
 * Uses Ethereal (test) by default if no SMTP credentials are configured.
 * In production, configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env.
 */

import nodemailer from 'nodemailer';
import env from '../config/env.js';

let transporter = null;

/**
 * Initializes the email transporter.
 * If SMTP credentials are provided in env, uses them.
 * Otherwise, creates an Ethereal test account and logs the preview URL.
 */
async function getTransporter() {
  if (transporter) return transporter;

  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    // Production SMTP
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT),
      secure: Number(env.SMTP_PORT) === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
      connectionTimeout: 10000, // Fail fast if blocked
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
    console.log('📧 Email service: Using configured SMTP server');
  } else {
    // Development — use Ethereal test account
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('📧 Email service: Using Ethereal test account');
    console.log(`   User: ${testAccount.user}`);
  }

  return transporter;
}

/**
 * Sends an OTP verification email.
 * @param {string} to - Recipient email address.
 * @param {string} otp - The 6-digit OTP code.
 * @param {string} username - The user's chosen username (for personalization).
 * @returns {Promise<{success: boolean, previewUrl?: string}>}
 */
export async function sendOtpEmail(to, otp, username) {
  const transport = await getTransporter();

  const htmlContent = `
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

  const info = await transport.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: `${otp} — Your CodeSync AI Verification Code`,
    text: `Your CodeSync AI verification code is: ${otp}\n\nThis code expires in 5 minutes.\n\nIf you didn't request this, ignore this email.`,
    html: htmlContent,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`📧 OTP Email Preview URL: ${previewUrl}`);
  }

  return { success: true, previewUrl: previewUrl || null };
}

export default { sendOtpEmail };
