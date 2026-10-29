import '../courtstreak-mobile-settings-fix.css';
// CourtStreak quality update v1
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiArrowLeft,
  FiCheck,
  FiChevronRight,
  FiEye,
  FiEyeOff,
  FiHelpCircle,
  FiLock,
  FiLogOut,
  FiMail,
  FiSave,
  FiSettings,
  FiShield,
  FiTarget,
  FiUser,
  FiUsers,
} from 'react-icons/fi';
import usePreviewNavigate from '../lib/usePreviewNavigate.js';
import {authErrorMessage} from '../lib/accountFlow.mjs';
import { supabase } from '../lib/supabaseClient.js';
import { AppearanceSettings } from '../components/AppearanceControl.jsx';

const skillLevels = ['Beginner', 'Intermediate', 'Advanced'];
const trainingDurations = ['10 minutes', '20 minutes'];
const dominantHands = ['Right', 'Left', 'Both'];

export default function Settings({ previewOnly = false }) {
  const navigate = usePreviewNavigate(previewOnly);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [weeklyGoal, setWeeklyGoal] = useState(4);
  const [skillLevel, setSkillLevel] = useState('Intermediate');
  const [trainingDuration, setTrainingDuration] = useState('20 minutes');
  const [dominantHand, setDominantHand] = useState('Right');
  const [defaultSharing, setDefaultSharing] = useState('Ask every time');

  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    if (previewOnly) { setUser({id:'sample-player',email:'jordan@example.test'}); setLoading(false); return undefined; }
    let isMounted = true;

    async function loadSettings() {
      try {
      if (!supabase) {
        setErrorMessage('Settings are temporarily unavailable.');
        setLoading(false);
        return;
      }

      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (userError || !currentUser) {
        navigate('/login', { replace: true });
        return;
      }

      setUser(currentUser);

      const metadata = currentUser.user_metadata || {};

      setSkillLevel(metadata.skill_level || 'Intermediate');
      setTrainingDuration(
        ['10 minutes', '20 minutes'].includes(metadata.preferred_training_duration) ? metadata.preferred_training_duration : '20 minutes'
      );
      setDominantHand(metadata.dominant_hand || 'Right');
      setDefaultSharing(
        metadata.default_circle_sharing || 'Ask every time'
      );

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('weekly_goal')
        .eq('id', currentUser.id)
        .single();

      if (!isMounted) return;

      if (profileError) {
        console.error('Could not load settings:', profileError);
        setErrorMessage('Some settings could not be loaded.');
      } else {
        setWeeklyGoal(profile?.weekly_goal || 4);
      }

      } catch { if (isMounted) setErrorMessage('Settings could not load. Please refresh and try again.'); }
      finally { if (isMounted) setLoading(false); }
    }

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, [navigate, previewOnly]);

  function clearMessages() {
    setMessage('');
    setErrorMessage('');
  }

  async function handleSavePreferences(event) {
    event.preventDefault();
    if (previewOnly) { navigate('/preview/membership'); return; }
    if (saving || !supabase || !user) return;
    clearMessages(); setSaving(true);
    let goalSaved = false;
    try {
      const { error: profileError } = await supabase.from('profiles').update({
        weekly_goal: Number(weeklyGoal), updated_at: new Date().toISOString(),
      }).eq('id', user.id);
      if (profileError) throw profileError;
      goalSaved = true;
      const { error } = await supabase.auth.updateUser({ data: {
        skill_level: skillLevel, preferred_training_duration: trainingDuration,
        dominant_hand: dominantHand, default_circle_sharing: defaultSharing,
      }});
      if (error) throw error;
      setMessage('Preferences saved.');
    } catch {
      setErrorMessage(goalSaved ? 'Weekly goal saved. Other preferences could not save; please retry.' : 'Preferences could not save. Please try again.');
    } finally { setSaving(false); }
  }

  async function handlePasswordChange(event) {
    event.preventDefault();
    if (previewOnly) { navigate('/preview/membership'); return; }
    if (passwordSaving || !supabase || !user) return;
    clearMessages();
    if (newPassword.length < 8) { setErrorMessage('Use at least 8 characters.'); return; }
    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({password: newPassword});
      if (error) throw error;
      setNewPassword(''); setMessage('Password updated.');
    } catch (error) { setErrorMessage(authErrorMessage(error, 'Password could not update. Please try again.')); }
    finally { setPasswordSaving(false); }
  }

  async function handleLogout() {
    if (previewOnly) { navigate('/'); return; }
    clearMessages();
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/login', { replace: true });
    } catch { setErrorMessage('Could not log out. Check your connection and try again.'); }
  }

  return (
    <main className="cs-settings-page">
      <header className="cs-settings-topbar">
        <button type="button" onClick={() => navigate('/dashboard')}>
          <FiArrowLeft />
          Dashboard
        </button>

        <Link to="/" className="cs-settings-brand">
          COURT<strong>STREAK</strong>
        </Link>

        <span className="cs-settings-topbar-label">
          <FiSettings />
          Settings
        </span>
      </header>

      <div className="cs-settings-layout">
        <aside className="cs-settings-sidebar">
          <div className="cs-settings-sidebar-heading">
            <span>
              <FiSettings />
            </span>

            <div>
              <small>PLAYER SETTINGS</small>
              <strong>Your CourtStreak</strong>
            </div>
          </div>

          <nav aria-label="Settings sections">
            <a href="#appearance-settings"><FiEye /> Appearance</a>
            <a href="#training-settings">
              <FiTarget />
              Training
            </a>

            <a href="#privacy-settings">
              <FiShield />
              Privacy
            </a>

            <a href="#player-access"><FiUsers /> Parent &amp; coach access</a>
            <a href="#account-settings">
              <FiUser />
              Account
            </a>

            <a href="#support-settings">
              <FiHelpCircle />
              Support
            </a>
          </nav>

          <p>
            Your game. Your preferences.
          </p>
        </aside>

        <section className="cs-settings-content">
          <div className="cs-settings-heading">
            <p>SETTINGS</p>
            <h1>Your settings.</h1>
            <span>
              Training, privacy, and account.
            </span>
          </div>

          {previewOnly && <p className="cs-settings-preview-note">Sample player settings. Appearance works on this device; account preferences are disabled in this preview.</p>}

          <AppearanceSettings />

          {message ? (
            <div className="cs-settings-message success" role="status">
              <FiCheck />
              {message}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="cs-settings-message error" role="alert">
              {errorMessage}
            </div>
          ) : null}

          {loading ? (
            <div className="cs-settings-loading">
              Loading your settings...
            </div>
          ) : (
            <>
              <form onSubmit={handleSavePreferences}>
                <section
                  className="cs-settings-card"
                  id="training-settings"
                >
                  <div className="cs-settings-card-heading">
                    <span className="cs-settings-card-icon">
                      <FiTarget />
                    </span>

                    <div>
                      <small>TRAINING PREFERENCES</small>
                      <h2>Training</h2>
                      <p>
                        Choose your usual setup.
                      </p>
                    </div>
                  </div>

                  <div className="cs-settings-field-grid">
                    <label>
                      <span>Current skill level</span>
                      <select
                        disabled={previewOnly}
                        value={skillLevel}
                        onChange={(event) =>
                          setSkillLevel(event.target.value)
                        }
                      >
                        {skillLevels.map((level) => (
                          <option value={level} key={level}>
                            {level}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <span>Weekly training goal</span>
                      <select
                        disabled={previewOnly}
                        value={weeklyGoal}
                        onChange={(event) =>
                          setWeeklyGoal(event.target.value)
                        }
                      >
                        <option value="2">2 workouts per week</option>
                        <option value="3">3 workouts per week</option>
                        <option value="4">4 workouts per week</option>
                        <option value="5">5 workouts per week</option>
                        <option value="6">6 workouts per week</option>
                        <option value="7">7 workouts per week</option>
                      </select>
                    </label>

                    <label>
                      <span>Preferred training time</span>
                      <select
                        disabled={previewOnly}
                        value={trainingDuration}
                        onChange={(event) =>
                          setTrainingDuration(event.target.value)
                        }
                      >
                        {trainingDurations.map((duration) => (
                          <option value={duration} key={duration}>
                            {duration}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <span>Dominant hand</span>
                      <select
                        disabled={previewOnly}
                        value={dominantHand}
                        onChange={(event) =>
                          setDominantHand(event.target.value)
                        }
                      >
                        {dominantHands.map((hand) => (
                          <option value={hand} key={hand}>
                            {hand}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </section>

                <section
                  className="cs-settings-card"
                  id="privacy-settings"
                >
                  <div className="cs-settings-card-heading">
                    <span className="cs-settings-card-icon">
                      <FiShield />
                    </span>

                    <div>
                      <small>PRIVACY & CIRCLES</small>
                      <h2>Sharing</h2>
                      <p>
                        Choose who sees completed sessions.
                      </p>
                    </div>
                  </div>

                  <div className="cs-settings-field-grid">
                    <label>
                      <span>Completed training visibility</span>
                      <select
                        disabled={previewOnly}
                        value={defaultSharing}
                        onChange={(event) =>
                          setDefaultSharing(event.target.value)
                        }
                      >
                        <option value="Ask every time">
                          Ask every time
                        </option>
                        <option value="Private">
                          Keep private
                        </option>
                        <option value="Training Circles">
                          Accepted Training Circles
                        </option>
                      </select>
                    </label>


                  </div>

                  <div className="cs-settings-privacy-note">
                    <FiUsers />
                    Change sharing before any session. Circle challenges always post to their Circle.
                  </div>
                </section>

                <div className="cs-settings-save-row">
                  <span>
                    Saved to your account.
                  </span>

                  <button type="submit" disabled={previewOnly || saving || !user}>
                    <FiSave />
                    {saving ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </form>

              <section className="cs-settings-card" id="player-access">
                <div className="cs-settings-card-heading"><span className="cs-settings-card-icon"><FiUsers /></span><div><small>YOU CONTROL WHO CAN SEE YOUR PROGRESS</small><h2>Parent &amp; coach access</h2></div></div>
                <p>Invite a parent or coach to follow your progress and assign work. They use their own account. You can remove access at any time.</p>
                <Link className="cs-settings-link-row" to={previewOnly ? '/preview/hub?view=parent' : '/connections'}><FiShield /><span><strong>{previewOnly ? 'See a sample Family Hub' : 'Manage invitations & access'}</strong><small>{previewOnly ? 'Sample data only. Previewing never grants access.' : 'Invite someone, review connections, or remove access.'}</small></span><FiChevronRight /></Link>
              </section>
              <section
                className="cs-settings-card"
                id="account-settings"
              >
                <div className="cs-settings-card-heading">
                  <span className="cs-settings-card-icon">
                    <FiUser />
                  </span>

                  <div>
                    <small>ACCOUNT & SECURITY</small>
                    <h2>Account</h2>
                  </div>
                </div>

                <div className="cs-settings-account-email">
                  <FiMail />

                  <span>
                    <small>ACCOUNT EMAIL</small>
                    <strong>{user?.email}</strong>
                  </span>
                </div>

                <form
                  className="cs-settings-password-form"
                  onSubmit={handlePasswordChange}
                >
                  <label>
                    <span>Change password</span>

                    <div>
                      <FiLock />

                      <input
                        disabled={previewOnly}
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(event) =>
                          setNewPassword(event.target.value)
                        }
                        placeholder="Enter a new password"
                        minLength="8"
                        autoComplete="new-password"
                        required
                      />

                      <button
                        type="button"
                        aria-label={
                          showPassword
                            ? 'Hide password'
                            : 'Show password'
                        }
                        onClick={() =>
                          setShowPassword((current) => !current)
                        }
                      >
                        {showPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </label>

                  <button type="submit" disabled={previewOnly || passwordSaving || !user}>
                    {passwordSaving
                      ? 'Updating...'
                      : 'Update Password'}
                  </button>
                </form>

                <Link
                  to={previewOnly ? "/preview/membership" : "/membership"}
                  className="cs-settings-link-row"
                >
                  <span>
                    <strong>Membership and billing</strong>
                    <small>
                      View your plan, payments, invoices, or cancel
                      your membership.
                    </small>
                  </span>

                  <FiChevronRight />
                </Link>

                <Link
                  to={previewOnly ? "/preview/profile" : "/profile"}
                  className="cs-settings-link-row"
                >
                  <span>
                    <strong>Player profile</strong>
                    <small>
                      View your player information, level, and
                      achievements.
                    </small>
                  </span>

                  <FiChevronRight />
                </Link>
              </section>

              <section
                className="cs-settings-card"
                id="support-settings"
              >
                <div className="cs-settings-card-heading">
                  <span className="cs-settings-card-icon">
                    <FiHelpCircle />
                  </span>

                  <div>
                    <small>HELP & SUPPORT</small>
                    <h2>We’re here when you need us.</h2>
                  </div>
                </div>

                <Link to="/contact" className="cs-settings-link-row">
                  <span>
                    <strong>Contact CourtStreak Support</strong>
                    <small>
                      Ask a question, report a problem, or request
                      help.
                    </small>
                  </span>

                  <FiChevronRight />
                </Link>

                <Link to="/faq" className="cs-settings-link-row">
                  <span>
                    <strong>Frequently asked questions</strong>
                    <small>
                      Get answers about training, accounts, and
                      membership.
                    </small>
                  </span>

                  <FiChevronRight />
                </Link>

                <a
                  href="mailto:courtstreaksupport@gmail.com?subject=CourtStreak Account Deletion Request"
                  onClick={previewOnly ? (event) => { event.preventDefault(); navigate("/preview/membership"); } : undefined}
                  className="cs-settings-link-row danger"
                >
                  <span>
                    <strong>Request account deletion</strong>
                    <small>
                      Contact support to permanently delete your
                      CourtStreak account and data.
                    </small>
                  </span>

                  <FiChevronRight />
                </a>
              </section>

              <button
                type="button"
                className="cs-settings-logout"
                onClick={handleLogout}
              >
                <FiLogOut />
                {previewOnly ? "Exit Preview" : "Log Out of CourtStreak"}
              </button>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
