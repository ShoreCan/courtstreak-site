import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { supabase } from '../lib/supabaseClient.js';

const skillLevels = ['Beginner', 'Intermediate', 'Advanced'];
const trainingDurations = ['10 minutes', '20 minutes', '30 minutes'];
const dominantHands = ['Right', 'Left', 'Both'];

export default function Settings() {
  const navigate = useNavigate();

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
  const [allowChallenges, setAllowChallenges] = useState(true);

  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      if (!supabase) {
        setErrorMessage('CourtStreak could not connect to Supabase.');
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
        metadata.preferred_training_duration || '20 minutes'
      );
      setDominantHand(metadata.dominant_hand || 'Right');
      setDefaultSharing(
        metadata.default_circle_sharing || 'Ask every time'
      );
      setAllowChallenges(metadata.allow_friend_challenges !== false);

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

      setLoading(false);
    }

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  function clearMessages() {
    setMessage('');
    setErrorMessage('');
  }

  async function handleSavePreferences(event) {
    event.preventDefault();
    clearMessages();
    setSaving(true);

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        weekly_goal: Number(weeklyGoal),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (profileError) {
      console.error(profileError);
      setErrorMessage('CourtStreak could not save your weekly goal.');
      setSaving(false);
      return;
    }

    const { error: metadataError } = await supabase.auth.updateUser({
      data: {
        skill_level: skillLevel,
        preferred_training_duration: trainingDuration,
        dominant_hand: dominantHand,
        default_circle_sharing: defaultSharing,
        allow_friend_challenges: allowChallenges,
      },
    });

    if (metadataError) {
      console.error(metadataError);
      setErrorMessage('CourtStreak could not save all your preferences.');
      setSaving(false);
      return;
    }

    setMessage('Your CourtStreak settings have been saved.');
setSaving(false);

window.setTimeout(() => {
  setMessage('');
}, 3500);
  }

  async function handlePasswordChange(event) {
    event.preventDefault();
    clearMessages();

    if (newPassword.length < 8) {
      setErrorMessage('Your new password must be at least 8 characters.');
      return;
    }

    setPasswordSaving(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.error(error);
      setErrorMessage(error.message || 'Your password could not be updated.');
      setPasswordSaving(false);
      return;
    }

    setNewPassword('');
    setMessage('Your password has been updated securely.');
    setPasswordSaving(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
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
            <a href="#training-settings">
              <FiTarget />
              Training
            </a>

            <a href="#privacy-settings">
              <FiShield />
              Privacy
            </a>

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
            Set up CourtStreak around your goals, your training, and
            the people who help you improve.
          </p>
        </aside>

        <section className="cs-settings-content">
          <div className="cs-settings-heading">
            <p>SETTINGS</p>
            <h1>Make CourtStreak work for you.</h1>
            <span>
              Keep your training focused, your progress private, and
              your account secure.
            </span>
          </div>

          {message ? (
            <div className="cs-settings-message success">
              <FiCheck />
              {message}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="cs-settings-message error">
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
                      <h2>Train around your game.</h2>
                      <p>
                        These preferences help CourtStreak understand
                        how you want to train.
                      </p>
                    </div>
                  </div>

                  <div className="cs-settings-field-grid">
                    <label>
                      <span>Current skill level</span>
                      <select
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
                        value={weeklyGoal}
                        onChange={(event) =>
                          setWeeklyGoal(event.target.value)
                        }
                      >
                        <option value="2">2 days per week</option>
                        <option value="3">3 days per week</option>
                        <option value="4">4 days per week</option>
                        <option value="5">5 days per week</option>
                        <option value="6">6 days per week</option>
                        <option value="7">Every day</option>
                      </select>
                    </label>

                    <label>
                      <span>Preferred training time</span>
                      <select
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
                      <h2>You control who sees your work.</h2>
                      <p>
                        CourtStreak keeps training social without
                        making player activity public.
                      </p>
                    </div>
                  </div>

                  <div className="cs-settings-field-grid">
                    <label>
                      <span>Completed training visibility</span>
                      <select
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

                    <div className="cs-settings-toggle-row">
                      <span>
                        <strong>Friend challenges</strong>
                        <small>
                          Allow accepted Training Circle members to
                          challenge you.
                        </small>
                      </span>

                      <button
                        type="button"
                        className={allowChallenges ? 'active' : ''}
                        aria-pressed={allowChallenges}
                        onClick={() =>
                          setAllowChallenges((current) => !current)
                        }
                      >
                        <i />
                        <span>{allowChallenges ? 'On' : 'Off'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="cs-settings-privacy-note">
                    <FiUsers />
                    Only people in Training Circles you accept can see
                    shared progress or send challenges.
                  </div>
                </section>

                <div className="cs-settings-save-row">
                  <span>
                    Your preferences are securely connected to your
                    CourtStreak account.
                  </span>

                  <button type="submit" disabled={saving}>
                    <FiSave />
                    {saving ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </form>

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
                    <h2>Keep your account secure.</h2>
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
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(event) =>
                          setNewPassword(event.target.value)
                        }
                        placeholder="Enter a new password"
                        minLength="8"
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

                  <button type="submit" disabled={passwordSaving}>
                    {passwordSaving
                      ? 'Updating...'
                      : 'Update Password'}
                  </button>
                </form>

                <Link
                  to="/membership"
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
                  to="/profile"
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
                Log Out of CourtStreak
              </button>
            </>
          )}
        </section>
      </div>
    </main>
  );
}