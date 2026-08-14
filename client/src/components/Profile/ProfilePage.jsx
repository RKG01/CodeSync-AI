import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getUserProfile } from '../../services/duelService';
import { useAuth } from '../../hooks/useAuth';
import Navbar from '../Layout/Navbar';
import { Swords, Trophy, Activity, Skull, Shield, Zap } from 'lucide-react';

export default function ProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [recentDuels, setRecentDuels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isOwnProfile = user?.id === userId;

  useEffect(() => {
    setLoading(true);
    getUserProfile(userId)
      .then((data) => {
        setProfile(data.profile);
        setRecentDuels(data.recentDuels || []);
      })
      .catch((err) => setError('Failed to load profile details'))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="profile-page blood-theme" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <Navbar />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-red)', flexDirection: 'column', gap: '20px' }}>
          <div className="queue-pulse" style={{ width: '20px', height: '20px' }}></div>
          <h2 style={{ letterSpacing: '2px', fontWeight: 600 }}>ACCESSING DATABASE...</h2>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="profile-page blood-theme" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <Navbar />
        <div className="profile-error" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
          <Skull size={64} color="var(--accent-red)" />
          <h2 style={{ color: 'var(--accent-red)', fontSize: '1.25rem', fontWeight: 600 }}>PROFILE NOT FOUND</h2>
          <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
          <button className="results-action-btn primary" onClick={() => navigate('/dashboard')}>RETURN TO HQ</button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page blood-theme" style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-primary)', overflowY: 'auto' }}>
      <Navbar />

      <main style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', padding: 'var(--space-8)' }}>
        
        {/* Navigation back */}
        <button 
          className="arena-back-btn" 
          onClick={() => navigate('/dashboard')} 
          style={{ marginBottom: 'var(--space-6)' }}
        >
          â† BACK TO HQ
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-8)' }}>
          
          {/* Left Column: Player ID Card */}
          <section className="profile-id-card" style={{ 
            background: 'var(--bg-secondary)', 
            border: '1px solid rgba(255,0,0,0.3)', 
            padding: '2rem', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            boxShadow: '0 0 40px rgba(255,0,0,0.1)'
          }}>
            <div className="profile-avatar" style={{ 
              width: '150px', height: '150px', 
              borderRadius: '50%', 
              background: 'var(--bg-tertiary)',
              border: '4px solid var(--accent-red)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.25rem', color: 'var(--accent-red)',
              marginBottom: '1rem',
              boxShadow: '0 0 30px rgba(255,0,0,0.3)'
            }}>
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.username} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                profile.username[0].toUpperCase()
              )}
            </div>

            <h1 className="profile-username" style={{ 
              fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', 
              marginBottom: '0.5rem'
            }}>
              {profile.username}
            </h1>

            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', 
              background: 'rgba(255,0,0,0.1)', padding: '8px 16px', 
              border: '1px solid var(--accent-red)', color: 'var(--accent-red)',
              fontWeight: 600, letterSpacing: '1px', marginBottom: '2rem'
            }}>
              <span style={{ fontSize: '1.5rem' }}>{profile.tier?.badge}</span>
              {profile.tier?.name.toUpperCase()}
            </div>

            <div style={{ width: '100%', borderTop: '1px solid rgba(255,0,0,0.2)', paddingTop: '2rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500, letterSpacing: '2px', marginBottom: '8px' }}>COMBAT RATING (ELO)</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)',  }}>
                  {profile.elo_rating}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <StatBox icon={<Swords size={20} />} label="MATCHES" value={profile.matches_played} />
                <StatBox icon={<Trophy size={20} />} label="VICTORIES" value={profile.matches_won} color="#00ff66" />
                <StatBox icon={<Activity size={20} />} label="WIN RATE" value={`${profile.winRate}%`} color={profile.winRate >= 50 ? '#00ff66' : 'var(--accent-red)'} />
                <StatBox icon={<Zap size={20} />} label="JOINED" value={new Date(profile.created_at).getFullYear()} />
              </div>
            </div>
          </section>

          {/* Right Column: Combat History */}
          <section className="profile-history">
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '12px', 
              borderBottom: '2px solid var(--accent-red)', paddingBottom: '1rem',
              marginBottom: '1.5rem'
            }}>
              <Shield size={32} color="var(--accent-red)" />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '2px' }}>
                COMBAT LOGS
              </h2>
            </div>

            {recentDuels.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {recentDuels.map((duel) => {
                  const isP1 = duel.player1_id === userId;
                  const opponentName = isP1 ? duel.player2_username : duel.player1_username;
                  const eloChange = isP1 ? duel.elo_change_p1 : duel.elo_change_p2;
                  const isWinner = duel.winner_id === userId;
                  const isDraw = !duel.winner_id;
                  
                  let rowColor = 'var(--text-secondary)';
                  let rowBorder = 'rgba(255,255,255,0.1)';
                  let icon = 'ðŸ¤';
                  
                  if (isWinner) {
                    rowColor = '#00ff66';
                    rowBorder = '#00ff66';
                    icon = 'ðŸ†';
                  } else if (!isDraw) {
                    rowColor = 'var(--accent-red)';
                    rowBorder = 'var(--accent-red)';
                    icon = 'ðŸ’€';
                  }

                  return (
                    <div
                      key={duel.id}
                      onClick={() => navigate(`/duel/${duel.id}`)}
                      style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid rgba(255,0,0,0.1)',
                        borderLeft: `4px solid ${rowBorder}`,
                        padding: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateX(10px)';
                        e.currentTarget.style.borderColor = 'var(--accent-red)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateX(0)';
                        e.currentTarget.style.borderColor = 'rgba(255,0,0,0.1)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ fontSize: '1.25rem' }}>{icon}</div>
                        <div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                            VS {opponentName.toUpperCase()}
                          </div>
                          <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 700 }}>
                            <span style={{ color: 'var(--accent-purple)' }}>{duel.language.toUpperCase()}</span>
                            <span>â€¢</span>
                            <span>{new Date(duel.ended_at || duel.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ 
                          fontSize: '1.15rem', fontWeight: 600, 
                          color: rowColor, textShadow: `0 0 10px ${rowColor}40`
                        }}>
                          {eloChange > 0 ? '+' : ''}{eloChange || 0} ELO
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500 }}>
                          RATING CHANGE
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ 
                background: 'var(--bg-secondary)', border: '1px dashed rgba(255,0,0,0.3)',
                padding: '4rem', textAlign: 'center'
              }}>
                <Skull size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>NO COMBAT DATA FOUND</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>This warrior has not entered the arena yet.</p>
                {isOwnProfile && (
                  <button className="results-action-btn primary" onClick={() => navigate('/arena')}>
                    ENTER MATCHMAKING
                  </button>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function StatBox({ icon, label, value, color = 'var(--text-primary)' }) {
  return (
    <div style={{ 
      background: 'var(--bg-primary)', 
      border: '1px solid rgba(255,0,0,0.15)', 
      padding: '1rem',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'
    }}>
      <div style={{ color: 'var(--text-secondary)' }}>{icon}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 600, color }}>{value}</div>
      <div style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '1px' }}>{label}</div>
    </div>
  );
}
