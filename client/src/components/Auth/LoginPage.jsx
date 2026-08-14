import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Code2, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="auth-page">
      {/* Animated background orbs */}
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)',
        top: '10%',
        right: '15%',
        animation: 'float 8s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        width: '300px',
        height: '300px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 70%)',
        bottom: '20%',
        left: '10%',
        animation: 'float 10s ease-in-out infinite reverse',
        pointerEvents: 'none',
      }} />

      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <Code2 size={22} />
          </div>
          <h1>Synapse AI</h1>
        </div>

        <p style={{
          textAlign: 'center',
          color: 'var(--text-tertiary)',
          fontSize: 'var(--text-sm)',
          marginTop: '-1rem',
          marginBottom: '2rem',
        }}>
          Sign in to your workspace
        </p>

        {error && (
          <div className="auth-error">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-wrapper">
            <Mail size={16} className="input-icon" style={{ left: '12px', top: '50%', transform: 'translateY(-50%)', position: 'absolute', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              type="email"
              className="input input-with-icon"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="input-wrapper">
            <Lock size={16} className="input-icon" style={{ left: '12px', top: '50%', transform: 'translateY(-50%)', position: 'absolute', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              type="password"
              className="input input-with-icon"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={loading}
            style={{ marginTop: 'var(--space-2)', height: '44px', fontSize: 'var(--text-base)' }}
          >
            {loading ? (
              <>
                <Loader2 size={18} style={{ animation: 'spin 0.7s linear infinite' }} />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account?{' '}
          <Link to="/signup">Create one</Link>
        </div>
      </div>
    </div>
  );
}
