import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  Award,
  CalendarDays,
  Check,
  CircleDot,
  Compass,
  Crown,
  Dumbbell,
  Flame,
  Hammer,
  Hand,
  Layers3,
  Lock,
  Medal,
  Play,
  Repeat2,
  Shield,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient.js';

const CATEGORY_ORDER = [
  'Ball Handling',
  'Consistency',
  'Levels',
  'Training Circles',
];

const CATEGORY_LABELS = {
  'Ball Handling': 'BALL HANDLING',
  Consistency: 'STREAKS',
  Levels: 'PLAYER LEVELS',
  'Training Circles': 'TRAINING CIRCLES',
};

const CATEGORY_ICONS = {
  'Ball Handling': Target,
  Consistency: Flame,
  Levels: Award,
  'Training Circles': Users,
};

const LEGACY_CATEGORIES = {
  Training: 'Ball Handling',
  Milestone: 'Levels',
  XP: 'Levels',
};

const ACHIEVEMENT_ICONS = {
  activity: Zap,
  award: Award,
  basketball: CircleDot,
  bolt: Zap,
  calendar: CalendarDays,
  circuit: CircleDot,
  clipboard: Medal,
  compass: Compass,
  crown: Crown,
  crosshair: Target,
  dumbbell: Dumbbell,
  five: Hand,
  flame: Flame,
  hammer: Hammer,
  hand: Hand,
  layers: Layers3,
  lock: Lock,
  percent: Activity,
  play: Play,
  repeat: Repeat2,
  shield: Shield,
  shuffle: Repeat2,
  sparkles: Sparkles,
  star: Star,
  target: Target,
  ten: Hand,
  tools: Hammer,
  trophy: Trophy,
  'user-plus': Users,
  users: Users,
  zap: Zap,
};

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

export default function TrophyCollection() {
  const navigate = useNavigate();
  const [achievements, setAchievements] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadCollection() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        navigate('/login');
        return;
      }

      const { error: unlockError } = await supabase.rpc(
        'check_and_unlock_achievements'
      );

      if (unlockError) {
        console.error('Could not check achievements:', unlockError);
      }

      const { data, error } = await supabase.rpc(
        'get_my_achievement_progress'
      );

      if (!isMounted) return;

      if (error) {
        console.error('Could not load collection:', error);
        setErrorMessage('CourtStreak could not open your collection.');
      } else {
        setAchievements(
          (data || []).map((achievement) => ({
            ...achievement,
            achievement_category:
              LEGACY_CATEGORIES[achievement.achievement_category] ||
              achievement.achievement_category,
            unlocked:
              Boolean(achievement.unlocked) ||
              Number(achievement.progress_percent) >= 100,
          }))
        );
      }

      setLoading(false);
    }

    loadCollection();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (!selected) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setSelected(null);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [selected]);

  const shelves = useMemo(() => {
    const additionalCategories = achievements
      .map((achievement) => achievement.achievement_category)
      .filter(
        (category, index, categories) =>
          category &&
          !CATEGORY_ORDER.includes(category) &&
          categories.indexOf(category) === index
      );

    return [...CATEGORY_ORDER, ...additionalCategories]
      .map((category) => ({
        category,
        achievements: achievements
          .filter((achievement) => achievement.achievement_category === category)
          .sort((a, b) => a.display_order - b.display_order),
      }))
      .filter((shelf) => shelf.achievements.length > 0);
  }, [achievements]);

  const earnedCount = achievements.filter(
    (achievement) => achievement.unlocked
  ).length;

  if (loading) {
    return (
      <main className="cs-cabinet-page cs-cabinet-state">
        <Trophy />
        <strong>Unlocking the cabinet...</strong>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="cs-cabinet-page cs-cabinet-state">
        <Trophy />
        <strong>{errorMessage}</strong>
        <button type="button" onClick={() => window.location.reload()}>
          Try Again
        </button>
      </main>
    );
  }

  return (
    <main className="cs-cabinet-page">
      <header className="cs-cabinet-topbar">
        <button type="button" onClick={() => navigate('/trophies')}>
          <ArrowLeft />
          <span>Trophy Case</span>
        </button>
        <strong>THE COLLECTION</strong>
        <span>{earnedCount} / {achievements.length} EARNED</span>
      </header>

      <section className="cs-cabinet-intro">
        <span>COURTSTREAK OFFICIAL TROPHY CASE</span>
        <h1>Your work.<br />On display.</h1>
        <p>
          Every trophy is tied to real training, consistency, improvement,
          and the people who push you forward.
        </p>
      </section>

      <section className="cs-cabinet-frame">
        <div className="cs-cabinet-crown">
          <span>COURTSTREAK</span>
        </div>

        <div className="cs-cabinet-lamp"><i /></div>

        <div className="cs-cabinet-glass">
          {shelves.map(({ category, achievements: categoryAchievements }) => {
            const CategoryIcon = CATEGORY_ICONS[category] || Trophy;

            return (
              <section className="cs-cabinet-shelf" key={category}>
                <div className="cs-cabinet-awards">
                  {categoryAchievements.map((achievement) => (
                    (() => {
                      const DisplayIcon =
                        achievement.is_trophy
                          ? Trophy
                          : ACHIEVEMENT_ICONS[achievement.achievement_icon] || Medal;

                      return <button
                      type="button"
                      className={`cs-cabinet-trophy ${achievement.unlocked ? 'unlocked' : 'locked'} ${achievement.achievement_tier || 'bronze'} ${achievement.is_trophy ? 'major' : 'badge'}`}
                      onClick={() => setSelected(achievement)}
                      aria-label={`View ${achievement.achievement_name}`}
                      key={achievement.achievement_id}
                    >
                      <span className="cs-cabinet-trophy-cup">
                        <DisplayIcon />
                        <CategoryIcon className="cs-cabinet-trophy-mark" />
                      </span>
                      <span className="cs-cabinet-trophy-base">
                        <small>{achievement.unlocked ? achievement.achievement_name : 'LOCKED'}</small>
                      </span>
                      {!achievement.unlocked && <Lock className="cs-cabinet-lock" />}
                    </button>;
                    })()
                  ))}
                </div>

                <div className="cs-cabinet-wood-shelf">
                  <span>{CATEGORY_LABELS[category] || category.toUpperCase()}</span>
                </div>
              </section>
            );
          })}
        </div>

        <div className="cs-cabinet-base">
          <div className="cs-cabinet-ball" aria-hidden="true">
            <span /><i />
          </div>
          <p>BUILD THE STREAK. EARN THE HARDWARE.</p>
        </div>
      </section>

      <p className="cs-cabinet-help">
        Select any trophy to view its requirements and your current progress.
      </p>

      {selected && (
        <div
          className="cs-cabinet-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelected(null);
          }}
        >
          <section
            className="cs-cabinet-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cs-cabinet-modal-title"
          >
            <button
              type="button"
              className="cs-cabinet-modal-close"
              aria-label="Close trophy details"
              onClick={() => setSelected(null)}
            >
              <X />
            </button>

            <div className={`cs-cabinet-modal-trophy ${selected.unlocked ? 'unlocked' : 'locked'} ${selected.achievement_tier || 'bronze'}`}>
              <Trophy />
            </div>
            <span className="cs-cabinet-modal-category">
              {selected.achievement_category}
            </span>
            <h2 id="cs-cabinet-modal-title">{selected.achievement_name}</h2>
            <p>{selected.achievement_description}</p>

            <div className="cs-cabinet-modal-progress">
              <div>
                <span>{selected.unlocked ? 'COMPLETED' : 'YOUR PROGRESS'}</span>
                <strong>
                  {Math.min(selected.current_value, selected.target_value)} /{' '}
                  {selected.target_value}
                </strong>
              </div>
              <div className="cs-cabinet-progress-track">
                <span style={{ width: `${selected.progress_percent}%` }} />
              </div>
            </div>

            <div className="cs-cabinet-modal-reward">
              <Zap />
              <span>Achievement reward</span>
              <strong>+{selected.xp_reward} XP</strong>
            </div>

            {selected.unlocked && (
              <div className="cs-cabinet-modal-earned">
                <Check /> Earned {formatDate(selected.unlocked_at)}
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
