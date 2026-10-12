import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';
import {
  ArrowLeft,
  ChevronRight,
  Flame,
  Plus,
  Trophy,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react';

const previewMembers = [
  { id: 1, initials: 'TR' },
  { id: 2, initials: 'ZA' },
  { id: 3, initials: 'IS' },
  { id: 4, initials: 'MA' },
];

export default function TrainingCircles() {
  const navigate = useNavigate();
const [showCreateCircle, setShowCreateCircle] = useState(false);
const [circleName, setCircleName] = useState('');
const [circleType, setCircleType] = useState('Friends');
const [creatingCircle, setCreatingCircle] = useState(false);
const [createCircleError, setCreateCircleError] = useState('');
const [circles, setCircles] = useState([]);
const [loadingCircles, setLoadingCircles] = useState(true);
  const weeklyGoal = 20;
  const weeklyCompleted = 14;

  const weeklyProgress = Math.min(
    (weeklyCompleted / weeklyGoal) * 100,
    100
  );
  async function loadCircles() {
  if (!supabase) {
    setLoadingCircles(false);
    return;
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error('Could not load current user:', userError);
    setLoadingCircles(false);
    return;
  }

  const { data, error } = await supabase
    .from('training_circle_members')
    .select(`
      role,
      joined_at,
      training_circles (
        id,
        name,
        circle_type,
        owner_id,
        is_private,
        weekly_workout_goal,
        created_at
      )
    `)
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false });

  if (error) {
    console.error('Could not load Training Circles:', error);
    setLoadingCircles(false);
    return;
  }

  const loadedCircles = (data ?? [])
    .map((membership) => ({
      ...membership.training_circles,
      membershipRole: membership.role,
    }))
    .filter((circle) => circle?.id);

  setCircles(loadedCircles);
  setLoadingCircles(false);
}
useEffect(() => {
  loadCircles();
}, []);
async function handleCreateCircle() {
  const trimmedName = circleName.trim();

  if (!trimmedName || creatingCircle) {
    return;
  }

  if (!supabase) {
    setCreateCircleError(
      'CourtStreak could not connect to Supabase.'
    );
    return;
  }

  setCreatingCircle(true);
  setCreateCircleError('');

  const { data, error } = await supabase.rpc(
    'create_training_circle',
    {
      p_name: trimmedName,
      p_circle_type: circleType,
    }
  );

  if (error) {
    console.error('Could not create Training Circle:', error);

    setCreateCircleError(
      'CourtStreak could not create your Circle right now.'
    );

    setCreatingCircle(false);
    return;
  }

  const createdCircle = data?.[0];

  setCreatingCircle(false);
  setShowCreateCircle(false);
  setCircleName('');
  setCircleType('Friends');

  if (createdCircle?.circle_id) {
    navigate(
      `/training-circles/${createdCircle.circle_id}`
    );
  }
}
  return (
    <main className="cs-circles-page">
      <header className="cs-circles-topbar">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft size={19} />
          Dashboard
        </button>

        <strong>CourtStreak</strong>

        <span />
      </header>

      <div className="cs-circles-shell">

        {/* SIMPLE HERO */}

        <section className="cs-circles-hero">
          <div className="cs-circles-hero-copy">
            <span className="cs-circles-eyebrow">
              TRAINING CIRCLES
            </span>

            <h1>
              Train with the people
              <br />
              <strong>who push you.</strong>
            </h1>

            <p>
              Private groups for friends, teammates, coaches,
              trainers, and family to stay accountable and
              compete together.
            </p>
          </div>

          <div className="cs-circles-hero-actions">
           <button
  type="button"
  className="cs-circles-primary"
  onClick={() => setShowCreateCircle(true)}
>
              <Plus size={18} />
              Create Circle
            </button>

            <button
              type="button"
              className="cs-circles-secondary"
            >
              <UserPlus size={18} />
              Join Circle
            </button>
          </div>
        </section>

        {/* YOUR CIRCLES */}

        <section className="cs-circles-section">
          <div className="cs-circles-heading">
            <div>
              <span>YOUR CIRCLES</span>
              <h2>Your Training Community</h2>

              <p>
                Everything important at a glance.
              </p>
            </div>
          </div>

          <div className="cs-circles-simple-grid">

   {loadingCircles ? (
  <div className="cs-circle-loading-card">
    Loading your Training Circles...
  </div>
) : circles.length > 0 ? (
  circles.map((circle) => (
    <article
      className="cs-circle-showcase"
      key={circle.id}
    >
      <div className="cs-circle-showcase-top">
        <div>
          <span className="cs-circle-showcase-label">
            {(circle.circle_type || 'Circle').toUpperCase()}
            {' · '}
            {circle.is_private ? 'PRIVATE' : 'OPEN'}
          </span>

          <h2>{circle.name}</h2>

          <p>
            Your people. Your progress. Your standard.
          </p>
        </div>

        <div className="cs-circle-showcase-members">
          <div className="cs-circle-showcase-avatars">
            <span>YOU</span>
          </div>

          <small>
            {circle.membershipRole === 'owner'
              ? 'You created this Circle'
              : 'Member'}
          </small>
        </div>
      </div>

      <div className="cs-circle-showcase-main">

        <div className="cs-circle-showcase-progress">
          <span>WEEKLY TEAM GOAL</span>

          <strong>
            0
            <small>%</small>
          </strong>

          <p>
            0 of {circle.weekly_workout_goal ?? 20} workouts completed
          </p>

          <div className="cs-circle-showcase-track">
            <div style={{ width: '0%' }} />
          </div>

          <div className="cs-circle-showcase-streak">
            <Flame size={16} />
            <strong>Circle streak starts here</strong>
          </div>
        </div>

        <div className="cs-circle-showcase-leaders">
          <span>THIS WEEK&apos;S LEADERS</span>

          <div className="cs-circle-empty-leaderboard">
            <Trophy size={24} />

            <strong>No leaderboard yet</strong>

            <p>
              Train with your Circle and weekly rankings
              will appear here.
            </p>
          </div>
        </div>

      </div>

      <button
        type="button"
        className="cs-circle-showcase-open"
        onClick={() =>
          navigate(`/training-circles/${circle.id}`)
        }
      >
        <span>
          <Users size={17} />
          Enter {circle.name}
        </span>

        <ChevronRight size={18} />
      </button>
    </article>
  ))
) : (
  <div className="cs-circle-empty-state">
    <Users size={28} />

    <h3>No Training Circles yet</h3>

    <p>
      Create your first Circle or join one with an invite.
    </p>
  </div>
)}

            {/* CREATE ANOTHER */}

            <button
              type="button"
              className="cs-circle-simple-create"
            >
              <div>
                <Plus size={22} />
              </div>

              <span>
                <strong>Create another Circle</strong>
                Team, friends, trainer, or family
              </span>

              <ChevronRight size={18} />
            </button>

          </div>
        </section>

        {/* SMALL BOTTOM MESSAGE */}

        <section className="cs-circles-simple-footer">
          <div className="cs-circles-simple-footer-icon">
            <Flame size={20} />
          </div>

          <div>
            <strong>Consistency is easier together.</strong>

            <span>
              Your Circle celebrates workouts, streaks,
              personal records, and weekly leaders.
            </span>
          </div>
        </section>
{showCreateCircle && (
  <div
    className="cs-circle-modal-backdrop"
    onClick={() => setShowCreateCircle(false)}
  >
    <section
      className="cs-circle-modal"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="cs-circle-modal-header">
        <div>
          <span>NEW TRAINING CIRCLE</span>
          <h2>Create your Circle</h2>

          <p>
            Build a private training group for the people
            who help push your game forward.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateCircle(false)}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <label className="cs-circle-field">
        <span>Circle Name</span>

        <input
          type="text"
          value={circleName}
          onChange={(event) =>
            setCircleName(event.target.value)
          }
          placeholder="Example: My Hoop Group"
          maxLength={40}
        />
      </label>

      <div className="cs-circle-field">
        <span>Circle Type</span>

        <div className="cs-circle-type-options">
          {[
            'Friends',
            'Team',
            'AAU',
            'Trainer',
            'Family',
          ].map((type) => (
            <button
              type="button"
              key={type}
              className={
                circleType === type ? 'active' : ''
              }
              onClick={() => setCircleType(type)}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="cs-circle-modal-note">
        <Users size={18} />

        <div>
          <strong>Private by default</strong>

          <span>
            Only players you invite can enter this
            Training Circle.
          </span>
        </div>
      </div>

      {createCircleError && (
  <p className="cs-circle-create-error">
    {createCircleError}
  </p>
)}

<button
  type="button"
  className="cs-circle-create-submit"
  disabled={!circleName.trim() || creatingCircle}
  onClick={handleCreateCircle}
>
  {creatingCircle
    ? 'Creating Circle...'
    : 'Create Training Circle'}

  <ChevronRight size={17} />
</button>
    </section>
  </div>
)}
      </div>
    </main>
  );
}