import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Code2, Mail, Lock, User, AlertCircle, Loader2, Shield, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter (A-Z)', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter (a-z)', test: (p) => /[a-z]/.test(p) },
  { label: 'One digit (0-9)', test: (p) => /[0-9]/.test(p) },
  { label: 'One special character (!@#$...)', test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(p) },
];

export default function SignupPage() {
  const [step, setStep] = useState(1); // 1 = form, 2 = OTP
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null); // Added for Dev mode Ethereal links
  const { sendOtp: sendOtpApi, register } = useAuth();
  const navigate = useNavigate();

  const passwordChecks = useMemo(
    () => PASSWORD_RULES.map((rule) => ({ ...rule, passed: rule.test(password) })),
    [password]
  );
  const allPasswordChecksPassed = passwordChecks.every((c) => c.passed);

  // Step 1: Send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!username || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (!allPasswordChecksPassed) {
      setError('Password does not meet all requirements');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError('');
    setLoading(true);
    const result = await sendOtpApi(username, email, password);
    setLoading(false);

    if (result.success) {
      setOtpSent(true);
      if (result.previewUrl) setPreviewUrl(result.previewUrl);
      setStep(2);
    } else {
      setError(result.error);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setError('');
    setLoading(true);
    const result = await register(email, otp);
    setLoading(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    setError('');
    setLoading(true);
    const result = await sendOtpApi(username, email, password);
    setLoading(false);
    if (result.success) {
      setError('');
      setOtp('');
      if (result.previewUrl) setPreviewUrl(result.previewUrl);
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="auth-page">
      {/* Animated background orbs */}
      <div style={{
        position: 'absolute',
        width: '450px',
        height: '450px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
        top: '5%',
        left: '10%',
        animation: 'float 9s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        width: '350px',
        height: '350px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(6,182,212,0.04) 0%, transparent 70%)',
        bottom: '10%',
        right: '15%',
        animation: 'float 11s ease-in-out infinite reverse',
        pointerEvents: 'none',
      }} />

      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <Code2 size={22} />
          </div>
          <h1>CodeSync AI</h1>
        </div>

        <p style={{
          textAlign: 'center',
          color: 'var(--text-tertiary)',
          fontSize: 'var(--text-sm)',
          marginTop: '-1rem',
          marginBottom: '2rem',
        }}>
          {step === 1 ? 'Create your account' : 'Verify your email'}
        </p>

        {/* Step indicator */}
        <div className="signup-steps">
          <div className={`signup-step ${step >= 1 ? 'active' : ''}`}>
            <div className="step-circle">1</div>
            <span>Details</span>
          </div>
          <div className="step-connector" />
          <div className={`signup-step ${step >= 2 ? 'active' : ''}`}>
            <div className="step-circle">2</div>
            <span>Verify</span>
          </div>
        </div>

        {error && (
          <div className="auth-error">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* ─── Step 1: Registration Form ────────────────────────────────── */}
        {step === 1 && (
          <form className="auth-form" onSubmit={handleSendOtp}>
            <div className="input-wrapper">
              <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none', zIndex: 1 }} />
              <input
                type="text"
                className="input input-with-icon"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
              />
            </div>

            <div className="input-wrapper">
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none', zIndex: 1 }} />
              <input
                type="email"
                className="input input-with-icon"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="input-wrapper">
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none', zIndex: 1 }} />
              <input
                type="password"
                className="input input-with-icon"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            {/* Password Strength Checklist */}
            {password.length > 0 && (
              <div className="password-rules">
                {passwordChecks.map((rule, i) => (
                  <div key={i} className={`password-rule ${rule.passed ? 'passed' : 'failed'}`}>
                    {rule.passed ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                    <span>{rule.label}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="input-wrapper">
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none', zIndex: 1 }} />
              <input
                type="password"
                className="input input-with-icon"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={loading || !allPasswordChecksPassed}
              style={{ marginTop: 'var(--space-2)', height: '44px', fontSize: 'var(--text-base)' }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 0.7s linear infinite' }} />
                  Sending verification code...
                </>
              ) : (
                <>
                  <Shield size={18} />
                  Send Verification Code
                </>
              )}
            </button>
          </form>
        )}

        {/* ─── Step 2: OTP Verification ─────────────────────────────────── */}
        {step === 2 && (
          <form className="auth-form" onSubmit={handleVerifyOtp}>
            <div className="otp-info">
              <Mail size={20} />
              <div>
                <p style={{ margin: 0 }}>
                  We sent a 6-digit code to <strong>{email}</strong>.
                  Check your inbox (and spam folder).
                </p>
                {previewUrl && (
                  <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: 'var(--accent-blue)' }}>
                    [Dev Mode] <a href={previewUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>Click here to view the mock email and OTP!</a>
                  </p>
                )}
              </div>
            </div>

            <div className="otp-input-container">
              <input
                type="text"
                className="otp-input"
                placeholder="000000"
                value={otp}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtp(val);
                }}
                maxLength={6}
                autoFocus
                style={{ textAlign: 'center', letterSpacing: '12px', fontSize: '2rem', fontFamily: 'var(--font-mono)', fontWeight: 900 }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={loading || otp.length !== 6}
              style={{ marginTop: 'var(--space-2)', height: '44px', fontSize: 'var(--text-base)' }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 0.7s linear infinite' }} />
                  Verifying...
                </>
              ) : (
                'Verify & Create Account'
              )}
            </button>

            <div className="otp-actions">
              <button type="button" className="otp-action-link" onClick={handleResend} disabled={loading}>
                Resend Code
              </button>
              <button type="button" className="otp-action-link" onClick={() => { setStep(1); setOtp(''); setError(''); }}>
                <ArrowLeft size={14} /> Go Back
              </button>
            </div>
          </form>
        )}

        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
