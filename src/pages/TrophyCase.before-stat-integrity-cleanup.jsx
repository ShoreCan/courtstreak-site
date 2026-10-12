import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  Award,
  CalendarDays,
  Check,
  ChevronRight,
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
  UserPlus,
  Users,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient.js';

const FILTERS = [
  ['all', 'All'],
  ['Ball Handling', 'Ball Handling'],
  ['Consistency', 'Streaks'],
  ['Levels', 'Levels'],
  ['Training Circles', 'Circles'],
];

const ICONS = {
  activity: Activity,
  award: Award,
  calendar: CalendarDays,
  circuit: CircleDot,
  clipboard: Award,
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
  tools: Wrench,
  trophy: Trophy,
  'user-plus': UserPlus,
  users: Users,
  zap: Zap,
};

const CATEGORY_COPY = {
  'Ball Handling': 'Build a complete handle through measurable work.',
  Consistency: 'Keep showing up and protect your streak.',
  Levels: 'Turn earned XP into long-term CourtStreak status.',
  'Training Circles': 'Train, compete, and improve with your people.',
};

function achievementIcon(iconName, isTrophy) {
  if (isTrophy) return Trophy;
  return ICONS[iconName] || Medal;
}

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

export default function TrophyCase() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadTrophyCase() {
      if (!supabase) {
        if (isMounted) {
          setErrorMessage('CourtStreak could not connect to Supabase.');
          setLoading(false);
        }
        return;
      }

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

      const [profileResult, achievementResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('first_name, xp, level, workouts_completed, best_training_streak')
          .eq('id', user.id)
          .single(),
        supabase.rpc('get_my_achievement_progress'),
      ]);

      if (!isMounted) return;

      if (profileResult.error || achievementResult.error) {
        console.error(
          'Could not load Trophy Case:',
          profileResult.error || achievementResult.error
        );
        setErrorMessage('CourtStreak could not load your Trophy Case.');
      } else {
        setProfile(profileResult.data);
        setAchievements(achievementResult.data || []);
      }

      setLoading(false);
    }

    loadTrophyCase();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (!selectedAchievement && !collectionOpen) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        if (selectedAchievement) setSelectedAchievement(null);
        else setCollectionOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [selectedAchievement, collectionOpen]);

  const earnedAchievements = useMemo(
    () => achievements.filter((achievement) => achievement.unlocked),
    [achievements]
  );

  const visibleAchievements = useMemo(() => {
    const filtered = achievements.filter(
      (achievement) =>
        activeFilter === 'all' || achievement.achievement_category === activeFilter
    );

    return [...filtered].sort((a, b) => {
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
      if (!a.unlocked && a.progress_percent !== b.progress_percent) {
        return b.progress_percent - a.progress_percent;
      }
      return a.display_order - b.display_order;
    });
  }, [achievements, activeFilter]);

  const nextAchievement = useMemo(
    () =>
      achievements
        .filter((achievement) => !achievement.unlocked)
        .sort((a, b) => {
          if (a.progress_percent !== b.progress_percent) {
            return b.progress_percent - a.progress_percent;
          }
          return a.display_order - b.display_order;
        })[0] || null,
    [achievements]
  );

  const completion = achievements.length
    ? Math.round((earnedAchievements.length / achievements.length) * 100)
    : 0;

  if (loading) {
    return (
      <main className="cs-vault-page cs-vault-state">
        <div className="cs-vault-loader"><Trophy /></div>
        <strong>Opening your Trophy Case...</strong>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="cs-vault-page cs-vault-state">
        <Trophy size={38} />
        <strong>{errorMessage}</strong>
        <button type="button" onClick={() => window.location.reload()}>
          Try Again
        </button>
      </main>
    );
  }

  const firstName = profile?.first_name || 'Player';

  return (
    <main className="cs-vault-page">
      <header className="cs-vault-topbar">
        <button type="button" onClick={() => navigate('/profile')}>
          <ArrowLeft />
          <span>Profile</span>
        </button>
        <strong>CourtStreak</strong>
        <span className="cs-vault-level">LVL {profile?.level || 1}</span>
      </header>

      <div className="cs-vault-shell">
        <section className="cs-vault-hero">
          <div className="cs-vault-hero-copy">
            <span className="cs-vault-eyebrow">{firstName.toUpperCase()}&apos;S TROPHY CASE</span>
            <h1>Proof of the<br /><em>work you put in.</em></h1>
            <p>
              Every piece in this case is earned through training, consistency,
              and measurable improvement.
            </p>
            <button type="button" onClick={() => navigate('/workout')}>
              Keep Earning <ChevronRight />
            </button>
          </div>

          <div className="cs-vault-hero-display">
            <div className="cs-vault-spotlight" />
            <div className="cs-vault-hero-trophy"><Trophy /></div>
            <strong>{earnedAchievements.length}</strong>
            <span>trophies &amp; achievements earned</span>
          </div>
        </section>

        <section className="cs-vault-overview" aria-label="Trophy Case overview">
          <div><span>COLLECTION</span><strong>{earnedAchievements.length}<small> / {achievements.length}</small></strong></div>
          <div><span>COMPLETION</span><strong>{completion}%</strong></div>
          <div><span>PLAYER LEVEL</span><strong>{profile?.level || 1}</strong></div>
          <div><span>LIFETIME XP</span><strong>{Number(profile?.xp || 0).toLocaleString()}</strong></div>
        </section>

        {nextAchievement && (
          <section className="cs-vault-next">
            <div className="cs-vault-next-icon"><Target /></div>
            <div className="cs-vault-next-copy">
              <span>CLOSEST TO UNLOCKING</span>
              <h2>{nextAchievement.achievement_name}</h2>
              <p>{nextAchievement.achievement_description}</p>
            </div>
            <div className="cs-vault-next-progress">
              <strong>{nextAchievement.progress_percent}%</strong>
              <div><span style={{ width: `${nextAchievement.progress_percent}%` }} /></div>
              <small>
                {Math.min(nextAchievement.current_value, nextAchievement.target_value)} of{' '}
                {nextAchievement.target_value}
              </small>
            </div>
          </section>
        )}

        <button
          type="button"
          className="cs-vault-collection-door"
          onClick={() => navigate('/trophies/collection')}
        >
          <div className="cs-vault-cabinet" aria-hidden="true">
            <div className="cs-vault-cabinet-light" />
            <div className="cs-vault-display-row">
              <div className="cs-vault-cabinet-item medal"><Award /></div>
              <div className="cs-vault-cabinet-item trophy"><Trophy /></div>
              <div className="cs-vault-basketball"><span /><i /></div>
            </div>
            <div className="cs-vault-cabinet-shelf one" />
            <div className="cs-vault-cabinet-shelf two" />
          </div>

          <div className="cs-vault-door-copy">
            <span>THE COLLECTION</span>
            <h2>Step inside your Trophy Case.</h2>
            <p>
              Explore every earned award, locked milestone, and the progress
              separating you from what comes next.
            </p>
            <div className="cs-vault-door-stats">
              <strong>{earnedAchievements.length}<small> earned</small></strong>
              <strong>{achievements.length - earnedAchievements.length}<small> to unlock</small></strong>
            </div>
            <span className="cs-vault-door-action">Open Collection <ChevronRight /></span>
          </div>
        </button>

        <section className="cs-vault-cta">
          <div><Flame /><span><strong>The next one is earned today.</strong> Every legitimate rep moves your game forward.</span></div>
          <button type="button" onClick={() => navigate('/workout')}>Train Now</button>
        </section>
      </div>

      {collectionOpen && (
        <section className="cs-vault-gallery" aria-label="Achievement collection">
          <header className="cs-vault-gallery-topbar">
            <button type="button" onClick={() => setCollectionOpen(false)}>
              <ArrowLeft /> Back to Trophy Case
            </button>
            <strong>The Collection</strong>
            <span>{earnedAchievements.length} / {achievements.length} EARNED</span>
          </header>

          <div className="cs-vault-gallery-shell">
            <div className="cs-vault-heading">
              <div>
                <span>YOUR TROPHY CABINET</span>
                <h2>Earned, not given.</h2>
                <p>{CATEGORY_COPY[activeFilter] || 'See every milestone on your CourtStreak journey.'}</p>
              </div>
              <Trophy />
            </div>

            <div className="cs-vault-filters" role="tablist" aria-label="Achievement categories">
              {FILTERS.map(([value, label]) => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeFilter === value}
                  className={activeFilter === value ? 'active' : ''}
                  onClick={() => setActiveFilter(value)}
                  key={value}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="cs-vault-gallery-cabinet">
              <div className="cs-vault-gallery-grid cs-vault-grid">
                {visibleAchievements.map((achievement) => {
                  const Icon = achievementIcon(achievement.achievement_icon, achievement.is_trophy);
                  const hidden = achievement.is_secret && !achievement.unlocked;

                  return (
                    <button
                      type="button"
                      className={`cs-vault-card ${achievement.unlocked ? 'unlocked' : 'locked'} ${achievement.achievement_tier || 'bronze'}`}
                      onClick={() => setSelectedAchievement(achievement)}
                      key={achievement.achievement_id}
                    >
                      <div className="cs-vault-card-status">
                        <span>{achievement.achievement_rarity || 'common'}</span>
                        {achievement.unlocked ? <Check /> : <Lock />}
                      </div>
                      <div className={`cs-vault-award ${achievement.is_trophy ? 'major' : ''}`}>
                        <div className="cs-vault-award-glow" />
                        <Icon />
                      </div>
                      <div className="cs-vault-card-copy">
                        <span>{achievement.achievement_category}</span>
                        <h3>{hidden ? 'Secret Achievement' : achievement.achievement_name}</h3>
                        <p>{hidden ? 'Keep training to reveal this achievement.' : achievement.achievement_description}</p>
                      </div>
                      <div className="cs-vault-card-footer">
                        {achievement.unlocked ? (
                          <span className="cs-vault-earned"><Check /> Earned {formatDate(achievement.unlocked_at)}</span>
                        ) : (
                          <div className="cs-vault-mini-progress">
                            <div><span style={{ width: `${achievement.progress_percent}%` }} /></div>
                            <small>{achievement.progress_percent}%</small>
                          </div>
                        )}
                        <strong>+{achievement.xp_reward} XP</strong>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {selectedAchievement && (
        <div
          className="cs-vault-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedAchievement(null);
          }}
        >
          <section className="cs-vault-modal" role="dialog" aria-modal="true" aria-labelledby="cs-vault-modal-title">
            <button className="cs-vault-modal-close" type="button" aria-label="Close achievement details" onClick={() => setSelectedAchievement(null)}>
              <X />
            </button>
            {(() => {
              const Icon = achievementIcon(selectedAchievement.achievement_icon, selectedAchievement.is_trophy);
              return (
                <>
                  <div className={`cs-vault-modal-award ${selectedAchievement.unlocked ? 'unlocked' : 'locked'} ${selectedAchievement.achievement_tier || 'bronze'}`}>
                    <Icon />
                  </div>
                  <span className="cs-vault-modal-category">{selectedAchievement.achievement_category}</span>
                  <h2 id="cs-vault-modal-title">{selectedAchievement.achievement_name}</h2>
                  <p>{selectedAchievement.achievement_description}</p>
                  <div className="cs-vault-modal-progress">
                    <div>
                      <span>{selectedAchievement.unlocked ? 'COMPLETED' : 'YOUR PROGRESS'}</span>
                      <strong>
                        {Math.min(selectedAchievement.current_value, selectedAchievement.target_value)} / {selectedAchievement.target_value}
                      </strong>
                    </div>
                    <div className="cs-vault-modal-track"><span style={{ width: `${selectedAchievement.progress_percent}%` }} /></div>
                  </div>
                  <div className="cs-vault-modal-reward">
                    <Zap />
                    <span>Achievement reward</span>
                    <strong>+{selectedAchievement.xp_reward} XP</strong>
                  </div>
                  {selectedAchievement.unlocked ? (
                    <div className="cs-vault-modal-earned"><Check /> Earned {formatDate(selectedAchievement.unlocked_at)}</div>
                  ) : (
                    <button className="cs-vault-modal-train" type="button" onClick={() => navigate('/workout')}>
                      Continue Training <ChevronRight />
                    </button>
                  )}
                </>
              );
            })()}
          </section>
        </div>
      )}
    </main>
  );
}
