import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiActivity,
  FiAward,
  FiBarChart2,
  FiChevronRight,
  FiClock,
  FiLogOut,
  FiPlay,
  FiTarget,
  FiTrendingUp,
  FiUsers,
} from 'react-icons/fi';
import { FaFire } from 'react-icons/fa';
import { supabase } from '../lib/supabaseClient.js';

export default function Dashboard() {
  const navigate = useNavigate();

  async function handleLogout() {
    if (supabase) {
      await supabase.auth.signOut();
    }

    navigate('/login');
  }

  function handleStartWorkout() {
  navigate('/workout');

  }

  return (
    <main className="cs-dashboard-page">
      <header className="cs-dashboard-header">
        <Link to="/" className="cs-auth-logo">
          CourtStreak
        </Link>

        <button
          type="button"
          className="cs-dashboard-logout"
          onClick={handleLogout}
        >
          <FiLogOut />
          Log Out
        </button>
      </header>

      <section className="cs-dashboard-content">
        <div className="cs-dashboard-welcome">
          <div>
            <p className="cs-auth-eyebrow">PLAYER DASHBOARD</p>
            <h1>Welcome back, Trey.</h1>
            <p>
              Keep your momentum going. Complete today&apos;s workout and build
              a streak you do not want to lose.
            </p>
          </div>

          <div className="cs-dashboard-date">
            <FiClock />
            <span>Today&apos;s Training</span>
          </div>
        </div>

        <section className="cs-dashboard-hero-grid">
          <article className="cs-streak-card">
            <div className="cs-streak-top">
              <div>
                <span className="cs-card-label">CURRENT STREAK</span>
                <div className="cs-streak-number">
                  <FaFire />
                  <strong>7</strong>
                </div>
                <p>days in a row</p>
              </div>

              <div className="cs-streak-best">
                <span>Personal best</span>
                <strong>12 days</strong>
              </div>
            </div>

            <div className="cs-week-row">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                <div key={`${day}-${index}`} className="cs-week-day">
                  <span>{day}</span>
                  <div className={index < 5 ? 'complete' : ''}>
                    {index < 5 ? '✓' : ''}
                  </div>
                </div>
              ))}
            </div>

            <p className="cs-streak-message">
              Complete today&apos;s workout to protect your streak.
            </p>
          </article>

          <article className="cs-today-card">
            <div className="cs-card-heading">
              <div className="cs-card-icon">
                <FiTarget />
              </div>

              <div>
                <span className="cs-card-label">TODAY&apos;S WORKOUT</span>
                <h2>Guard Skill Builder</h2>
              </div>
            </div>

            <div className="cs-workout-details">
              <span>
                <FiClock />
                35 minutes
              </span>

              <span>
                <FiActivity />
                Intermediate
              </span>

              <span>
                <FiTarget />
                6 drills
              </span>
            </div>

            <div className="cs-workout-focus">
              <span>Today&apos;s focus</span>
              <strong>Ball handling, finishing and footwork</strong>
            </div>

            <button
              type="button"
              className="cs-start-workout"
              onClick={handleStartWorkout}
            >
              <FiPlay />
              Start Today&apos;s Workout
            </button>
          </article>
        </section>

        <section className="cs-dashboard-stats">
          <article>
            <div className="cs-stat-icon">
              <FiActivity />
            </div>
            <div>
              <strong>18</strong>
              <span>Workouts completed</span>
            </div>
          </article>

          <article>
            <div className="cs-stat-icon">
              <FiTrendingUp />
            </div>
            <div>
              <strong>4</strong>
              <span>Workouts this week</span>
            </div>
          </article>

          <article>
            <div className="cs-stat-icon">
              <FiAward />
            </div>
            <div>
              <strong>6</strong>
              <span>Badges earned</span>
            </div>
          </article>

          <article>
            <div className="cs-stat-icon">
              <FiUsers />
            </div>
            <div>
              <strong>3</strong>
              <span>Training Circles</span>
            </div>
          </article>
        </section>

        <section className="cs-dashboard-lower-grid">
          <article className="cs-dashboard-panel">
            <div className="cs-panel-heading">
              <div>
                <span className="cs-card-label">WEEKLY PROGRESS</span>
                <h2>Your consistency</h2>
              </div>

              <FiBarChart2 />
            </div>

            <div className="cs-progress-summary">
              <strong>4 of 5</strong>
              <span>weekly workouts completed</span>
            </div>

            <div className="cs-dashboard-progress">
              <div />
            </div>

            <p>One more workout will complete your weekly goal.</p>
          </article>

          <article className="cs-dashboard-panel">
            <div className="cs-panel-heading">
              <div>
                <span className="cs-card-label">TRAINING CIRCLES</span>
                <h2>Your accountability team</h2>
              </div>

              <FiUsers />
            </div>

            <div className="cs-circle-list">
              <div>
                <span className="cs-circle-avatar">FR</span>
                <div>
                  <strong>Friends</strong>
                  <span>8 members</span>
                </div>
                <FiChevronRight />
              </div>

              <div>
                <span className="cs-circle-avatar">TM</span>
                <div>
                  <strong>My Team</strong>
                  <span>14 members</span>
                </div>
                <FiChevronRight />
              </div>

              <div>
                <span className="cs-circle-avatar">FM</span>
                <div>
                  <strong>Family</strong>
                  <span>3 members</span>
                </div>
                <FiChevronRight />
              </div>
            </div>
          </article>

          <article className="cs-dashboard-panel">
            <div className="cs-panel-heading">
              <div>
                <span className="cs-card-label">RECENT BADGES</span>
                <h2>Keep earning</h2>
              </div>

              <FiAward />
            </div>

            <div className="cs-badge-list">
              <div>
                <span>🔥</span>
                <div>
                  <strong>7-Day Streak</strong>
                  <small>Trained seven days in a row</small>
                </div>
              </div>

              <div>
                <span>🎯</span>
                <div>
                  <strong>Finishing Specialist</strong>
                  <small>Completed five finishing workouts</small>
                </div>
              </div>

              <div>
                <span>⚡</span>
                <div>
                  <strong>Quick Start</strong>
                  <small>Completed your first workout</small>
                </div>
              </div>
            </div>
          </article>

          <article className="cs-dashboard-panel cs-leaderboard-panel">
            <div className="cs-panel-heading">
              <div>
                <span className="cs-card-label">FRIENDS LEADERBOARD</span>
                <h2>This week</h2>
              </div>

              <FiTrendingUp />
            </div>

            <div className="cs-leaderboard-list">
              <div>
                <span>1</span>
                <strong>Marcus</strong>
                <small>6 workouts</small>
              </div>

              <div className="current-player">
                <span>2</span>
                <strong>You</strong>
                <small>4 workouts</small>
              </div>

              <div>
                <span>3</span>
                <strong>Jayden</strong>
                <small>3 workouts</small>
              </div>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}