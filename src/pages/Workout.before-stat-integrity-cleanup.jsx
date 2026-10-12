import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';
import '../workout-results.css';
import {
  FiActivity,
  FiArrowLeft,
  FiAward,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiPlay,
  FiTarget,
  FiTrendingUp,
  FiZap,
} from 'react-icons/fi';

const workoutDrills = [
  {
    key: 'pound-dribbles',
    name: 'Pound Dribbles',
    category: 'Ball Handling',
    difficulty: 'Quick',
    duration: '45 seconds',
    durationSeconds: 45,
    metricType: 'reps',
    metricLabel: 'Dribbles completed',
    xp: 5,
    instructions:
      'Stay low, keep your chest up, and pound the basketball below your waist using your right hand. Keep your eyes forward and maintain control.',
  },
  {
    key: 'left-hand-pound-dribbles',
    name: 'Left-Hand Pound Dribbles',
    category: 'Ball Handling',
    difficulty: 'Standard',
    duration: '45 seconds',
    durationSeconds: 45,
    metricType: 'reps',
    metricLabel: 'Dribbles completed',
    xp: 10,
    instructions:
      'Stay low and pound the basketball firmly with your left hand. Keep your eyes forward, stay balanced, and focus on maintaining control.',
  },
  {
    key: 'crossovers',
    name: 'Crossovers',
    category: 'Ball Handling',
    difficulty: 'Standard',
    duration: '60 seconds',
    durationSeconds: 60,
    metricType: 'reps',
    metricLabel: 'Crossovers completed',
    xp: 10,
    instructions:
      'Move the ball quickly from one hand to the other while staying low and balanced. Keep the crossover tight and controlled while maintaining rhythm.',
  },
];

const workoutDurationMinutes = Math.max(
  1,
  Math.round(
    workoutDrills.reduce(
      (total, workoutDrill) => total + workoutDrill.durationSeconds,
      0
    ) / 60
  )
);
  
   

export default function Workout() {
  const navigate = useNavigate();
  const [currentDrill, setCurrentDrill] = useState(0);
  const [completedDrills, setCompletedDrills] = useState([]);
  const [workoutFinished, setWorkoutFinished] = useState(false);
  const [showRepEntry, setShowRepEntry] = useState(false);
const [pendingRepTotal, setPendingRepTotal] = useState('');
const [pendingDrillIndex, setPendingDrillIndex] = useState(null);
const [earnedStreak, setEarnedStreak] = useState(0);
  const drill = workoutDrills[currentDrill];
  const progress = Math.round(
    (completedDrills.length / workoutDrills.length) * 100
  );
const [earnedXp, setEarnedXp] = useState(0);
const [totalXp, setTotalXp] = useState(0);
const [playerLevel, setPlayerLevel] = useState(1);
const [unlockedAchievement, setUnlockedAchievement] = useState(null);
const [showAchievementCelebration, setShowAchievementCelebration] = useState(false);
const [showBonusChallenge, setShowBonusChallenge] = useState(false);
const [selectedChallenge, setSelectedChallenge] = useState(null);
const [challengeCompleted, setChallengeCompleted] = useState(false);
const [challengeXp, setChallengeXp] = useState(0);
const [workoutReplay, setWorkoutReplay] = useState(false);
const [challengeStarted, setChallengeStarted] = useState(false);
const [challengeSecondsLeft, setChallengeSecondsLeft] = useState(0);
const [challengeTimerFinished, setChallengeTimerFinished] = useState(false);
const [challengeStep, setChallengeStep] = useState(0);
const [challengeStepFinished, setChallengeStepFinished] = useState(false);
const [challengeCountdown, setChallengeCountdown] = useState(0);
const [challengeCountingDown, setChallengeCountingDown] = useState(false);
const [showChallengeReward, setShowChallengeReward] = useState(false);
const [challengeAccepted, setChallengeAccepted] = useState(false);
const [sessionResults, setSessionResults] = useState([]);
const [weeklyWorkouts, setWeeklyWorkouts] = useState(0);
const [weeklyGoal, setWeeklyGoal] = useState(5);
useEffect(() => {
  if (!challengeCountingDown) return;

  const countdownTimer = setInterval(() => {
    setChallengeCountdown((count) => {
      if (count <= 1) {
        clearInterval(countdownTimer);

        setChallengeCountingDown(false);
        setChallengeStarted(true);
        setChallengeSecondsLeft(60);
        setChallengeTimerFinished(false);
        setChallengeStepFinished(false);

        return 0;
      }

      return count - 1;
    });
  }, 1000);

  return () => clearInterval(countdownTimer);
}, [challengeCountingDown]);

useEffect(() => {
  if (!challengeStarted || challengeTimerFinished) return;

  if (challengeSecondsLeft <= 0) {
    setChallengeTimerFinished(true);
    return;
  }

  const timer = setInterval(() => {
    setChallengeSecondsLeft((seconds) => {
      if (seconds <= 1) {
  clearInterval(timer);
  setChallengeTimerFinished(true);
  setChallengeStepFinished(true);
  return 0;
}

      return seconds - 1;
    });
  }, 1000);

  return () => clearInterval(timer);
}, [
  challengeStarted,
  challengeSecondsLeft,
  challengeTimerFinished,
]);
  async function handleCompleteDrill() {
  const currentDrillData = workoutDrills[currentDrill];

  if (completedDrills.includes(currentDrill)) {
    return;
  }

  let repTotal = null;

  if (currentDrillData.metricType === 'reps') {
    if (pendingDrillIndex !== currentDrill) {
      setPendingDrillIndex(currentDrill);
      setPendingRepTotal('');
      setShowRepEntry(true);
      return;
    }

    if (pendingRepTotal.trim() === '') {
      setShowRepEntry(true);
      return;
    }

    const parsedReps = Number(pendingRepTotal);

    if (
      !Number.isFinite(parsedReps) ||
      parsedReps < 0 ||
      !Number.isInteger(parsedReps)
    ) {
      setShowRepEntry(true);
      return;
    }

    repTotal = parsedReps;
  }

  if (!supabase) {
    setCompletedDrills((previous) => [...previous, currentDrill]);
    setShowRepEntry(false);
    setPendingRepTotal('');
    setPendingDrillIndex(null);
    return;
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error('Could not identify the player:', userError);
    return;
  }

  const { data, error } = await supabase.rpc(
    'complete_training_drill',
    {
      p_workout_key: 'guard-skill-builder',
      p_drill_index: currentDrill,
    }
  );

  if (error) {
    console.error('Could not save drill reward:', error);
    return;
  }

  const reward = data?.[0];

  if (reward) {
    console.log('Saved drill reward:', reward);

    setEarnedStreak(reward.training_streak ?? 0);
    setEarnedXp(
      (previousXp) => previousXp + (reward.xp_awarded ?? 0)
    );
    setTotalXp(reward.xp ?? 0);
    setPlayerLevel(reward.level ?? 1);
  }

  if (repTotal !== null) {
    /*
      Find the ONE session that was just created. The old version
      updated every matching historical session for this drill.
    */
    const { data: newestSession, error: sessionLookupError } =
      await supabase
        .from('training_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('workout_key', 'guard-skill-builder')
        .eq('drill_index', currentDrill)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (sessionLookupError || !newestSession?.id) {
      console.error(
        'Could not find the new training session:',
        sessionLookupError
      );
      return;
    }

    const { data: previousBestSession, error: previousBestError } =
      await supabase
        .from('training_sessions')
        .select('reps')
        .eq('user_id', user.id)
        .eq('workout_key', 'guard-skill-builder')
        .eq('drill_index', currentDrill)
        .neq('id', newestSession.id)
        .not('reps', 'is', null)
        .order('reps', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (previousBestError) {
      console.error('Could not compare the previous best:', previousBestError);
    }

    const previousBest = previousBestSession?.reps == null
      ? null
      : Number(previousBestSession.reps);

    const { error: repError } = await supabase
      .from('training_sessions')
      .update({
        drill_name: currentDrillData.name,
        category: currentDrillData.category,
        difficulty: currentDrillData.difficulty,
        duration_seconds: currentDrillData.durationSeconds,
        reps: repTotal,
      })
      .eq('id', newestSession.id)
      .eq('user_id', user.id);

    if (repError) {
      console.error('Could not save drill reps:', repError);
      return;
    }

    setSessionResults((previous) => [
      ...previous.filter((result) => result.drillIndex !== currentDrill),
      {
        drillIndex: currentDrill,
        drillName: currentDrillData.name,
        reps: repTotal,
        previousBest,
        isPersonalBest: previousBest === null || repTotal > previousBest,
      },
    ]);
  }

  setCompletedDrills((previous) => [...previous, currentDrill]);
  setShowRepEntry(false);
  setPendingRepTotal('');
  setPendingDrillIndex(null);
}


function handlePreviousDrill() {
  if (currentDrill > 0) {
    setCurrentDrill(currentDrill - 1);
  }
}

function handleNextDrill() {
  if (currentDrill < workoutDrills.length - 1) {
    setCurrentDrill(currentDrill + 1);
  }
}
   

async function handleFinishWorkout() {
  if (!supabase) {
    setWorkoutFinished(true);
    return;
  }

  const { data, error } = await supabase.rpc(
    'record_workout_completion',
    {
      p_workout_key: 'guard-skill-builder',
      p_workout_name: 'Guard Skill Builder',
      p_workout_focus: 'Ball Handling',
      p_drills_completed: workoutDrills.length,
      p_minutes_trained: workoutDurationMinutes,
      p_xp_earned: earnedXp,
    }
  );

  if (error) {
    console.error('Could not save workout completion:', error);
    return;
  }

  console.log('Workout completion saved:', data);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: updatedProfile, error: profileError } = await supabase
      .from('profiles')
      .select('weekly_workouts, weekly_goal, training_streak, xp, level')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Could not refresh workout totals:', profileError);
    } else if (updatedProfile) {
      const completionBonus = Math.max(0, (updatedProfile.xp ?? 0) - totalXp);

      setWeeklyWorkouts(updatedProfile.weekly_workouts ?? 0);
      setWeeklyGoal(updatedProfile.weekly_goal || 5);
      setEarnedStreak(updatedProfile.training_streak ?? earnedStreak);
      setEarnedXp((previousXp) => previousXp + completionBonus);
      setWorkoutReplay(earnedXp === 0 && completionBonus === 0);
      setTotalXp(updatedProfile.xp ?? totalXp);
      setPlayerLevel(updatedProfile.level ?? playerLevel);
    }
  }
const { data: challengeData, error: challengeError } = await supabase
  .from('training_challenges')
  .select('*')
  .eq('active', true);

if (challengeError) {
  console.error('Could not load bonus challenge:', challengeError);
} else if (challengeData?.length > 0) {
  const randomChallenge =
    challengeData[Math.floor(Math.random() * challengeData.length)];

  setSelectedChallenge(randomChallenge);
  setShowBonusChallenge(true);
}
  const {
    data: achievementData,
    error: achievementError,
  } = await supabase.rpc('check_and_unlock_achievements');

  if (achievementError) {
    console.error(
      `Could not check achievements | code: ${achievementError.code || 'none'} | message: ${achievementError.message || 'none'} | details: ${achievementError.details || 'none'} | hint: ${achievementError.hint || 'none'}`
    );
 } else if (achievementData?.length > 0) {
  const newestAchievement = achievementData[0];

  setUnlockedAchievement(newestAchievement);
  setShowAchievementCelebration(true);
}

setWorkoutFinished(true);
}

if (showBonusChallenge && selectedChallenge) {
  const challengeInstructions = selectedChallenge.instructions ?? [];
  const currentInstruction =
    challengeInstructions[challengeStep] ?? '';

  const currentStepSeconds = 60;
  const challengeRoundLabels = ['CONTROL', 'RHYTHM', 'MOVEMENT', 'GAME SPEED'];

  // Full-screen 5-second countdown before EVERY drill
  if (challengeCountingDown) {
    return (
      <main className="cs-challenge-countdown-page">
        <div className="cs-challenge-countdown-content">
          <p>GET READY</p>

          <strong>{challengeCountdown}</strong>

          <h2>{currentInstruction}</h2>

          <span>
            Drill {challengeStep + 1} of {challengeInstructions.length}
          </span>
        </div>
      </main>
    );
  }

  return (
    <main className="cs-challenge-page">
      <section className="cs-challenge-card">

        {/* STEP 1 — CHALLENGE OVERVIEW */}
        {!challengeAccepted ? (
          <div className="cs-bonus-offer">
            <section className="cs-bonus-briefing">
              <div className="cs-bonus-kicker">
                <span>DAILY BONUS</span>
                <div>
                  <strong>AVAILABLE TODAY</strong>
                  <b>+40 XP</b>
                </div>
              </div>

              <div className="cs-bonus-ball" aria-hidden="true">
                <svg viewBox="0 0 100 100" focusable="false">
                  <defs>
                    <radialGradient id="csBonusBallFill" cx="31%" cy="25%" r="78%">
                      <stop offset="0%" stopColor="#ffad5f" />
                      <stop offset="58%" stopColor="#ff7d2d" />
                      <stop offset="100%" stopColor="#ef5a12" />
                    </radialGradient>
                    <clipPath id="csBonusBallClip">
                      <circle cx="50" cy="50" r="47" />
                    </clipPath>
                  </defs>

                  <circle className="cs-ball-fill" cx="50" cy="50" r="47" />

                  <g className="cs-ball-seams" clipPath="url(#csBonusBallClip)">
                    <path d="M13 -7 C31 10 45 30 50 50 C56 70 66 89 73 108" />
                    <path d="M58 -8 C55 14 53 34 59 47 C66 61 82 63 108 58" />
                    <path d="M-8 54 C18 53 36 57 43 68 C52 82 46 98 32 108" />
                    <path d="M-7 91 C24 85 50 76 72 62 C90 50 101 36 108 20" />
                  </g>

                  <path
                    className="cs-ball-highlight"
                    d="M22 24 C31 15 45 12 57 16 C41 17 30 23 21 34 C18 31 19 27 22 24 Z"
                  />
                </svg>
              </div>

              <p className="cs-bonus-overline">EXTRA WORK. REAL PROGRESS.</p>
              <h1>{selectedChallenge.name}</h1>
              <p className="cs-bonus-description">{selectedChallenge.description}</p>

              <div className="cs-bonus-facts" aria-label="Challenge details">
                <span><strong>{selectedChallenge.duration_minutes}</strong> minutes</span>
                <span><strong>{challengeInstructions.length}</strong> rounds</span>
                <span><strong>{selectedChallenge.difficulty}</strong> level</span>
              </div>

              <div className="cs-bonus-actions">
                <button
                  type="button"
                  className="cs-bonus-start"
                  onClick={() => {
                    setChallengeAccepted(true);
                    setChallengeStep(0);
                    setChallengeStarted(false);
                    setChallengeStepFinished(false);
                    setChallengeTimerFinished(false);
                    setChallengeSecondsLeft(60);
                    setChallengeCountdown(0);
                    setChallengeCountingDown(false);
                  }}
                >
                  <span>Start today&apos;s challenge</span>
                  <strong>→</strong>
                </button>

                <button
                  type="button"
                  className="cs-bonus-skip"
                  onClick={() => setShowBonusChallenge(false)}
                >
                  Not today
                </button>
              </div>
            </section>

            <aside className="cs-bonus-plan">
              <header>
                <div>
                  <span>TODAY&apos;S GAME PLAN</span>
                  <h2>{challengeInstructions.length} rounds. No wasted reps.</h2>
                </div>
                <strong>{selectedChallenge.duration_minutes}:00</strong>
              </header>

              <div className="cs-bonus-rounds">
                {challengeInstructions.map((instruction, index) => (
                  <article key={`${selectedChallenge.challenge_key}-${index}`}>
                    <div className="cs-bonus-round-number">
                      <span>0{index + 1}</span>
                    </div>
                    <div className="cs-bonus-round-copy">
                      <small>{challengeRoundLabels[index] || `ROUND ${index + 1}`}</small>
                      <strong>{instruction}</strong>
                    </div>
                    <time>60 SEC</time>
                  </article>
                ))}
              </div>

              <footer>
                <div>
                  <span>COMPLETE EVERY ROUND</span>
                  <strong>Finish the work. Bank the reward.</strong>
                </div>
                <div className="cs-bonus-xp">
                  <small>YOU EARN</small>
                  <strong>+40 <span>XP</span></strong>
                </div>
              </footer>
            </aside>
          </div>
        ) : !challengeStarted && !challengeStepFinished ? (
          <>
            {/* STEP 2 — DRILL PREVIEW */}

            <div className="cs-challenge-progress-heading">
              <span>
                Drill {challengeStep + 1} of {challengeInstructions.length}
              </span>

              <strong>
                {Math.round(
                  (challengeStep / challengeInstructions.length) * 100
                )}
                %
              </strong>
            </div>

            <div className="cs-challenge-progress-track">
              <div
                style={{
                  width: `${Math.round(
                    (challengeStep / challengeInstructions.length) * 100
                  )}%`,
                }}
              />
            </div>

            <p className="cs-card-label">UP NEXT</p>

            <h1>{currentInstruction}</h1>

            {/* VIDEO PLACEHOLDER */}
            <div className="cs-challenge-video">
              <div className="cs-challenge-video-placeholder">
                <FiPlay />
                <strong>Drill Demonstration</strong>
                <span>
                  Your CourtStreak demonstration video will appear here.
                </span>
              </div>
            </div>

            <div className="cs-challenge-ready-card">
              <span>WORK INTERVAL</span>
              <strong>1:00</strong>
              <p>
                Watch the demonstration, get your ball ready, then start
                when you&apos;re set.
              </p>
            </div>

            <button
              type="button"
              className="cs-achievement-continue"
              onClick={() => {
                setChallengeCountdown(5);
                setChallengeCountingDown(true);
                setChallengeStarted(false);
                setChallengeTimerFinished(false);
                setChallengeStepFinished(false);
              }}
            >
              Start Drill
            </button>
          </>
        ) : challengeStarted && !challengeStepFinished ? (
          <>
            {/* STEP 3 — ACTIVE 60-SECOND DRILL */}

            <div className="cs-challenge-progress-heading">
              <span>
                Drill {challengeStep + 1} of {challengeInstructions.length}
              </span>

              <strong>IN PROGRESS</strong>
            </div>

            <div className="cs-challenge-active-step">
              <p className="cs-card-label">CURRENT DRILL</p>

              <h2>{currentInstruction}</h2>

              <div className="cs-challenge-timer">
                <span>TIME REMAINING</span>

                <strong>
                  {Math.floor(challengeSecondsLeft / 60)}:
                  {String(challengeSecondsLeft % 60).padStart(2, '0')}
                </strong>

                <p>
                  Stay locked in. Finish the entire interval.
                </p>
              </div>
            </div>

            <div className="cs-challenge-live-status">
  <span className="cs-challenge-live-dot" />
  <strong>Challenge in progress</strong>
  <span>Finish the full interval</span>
</div>
          </>
        ) : challengeStep < challengeInstructions.length - 1 ? (
          <>
            {/* STEP 4 — DRILL COMPLETE */}

            <p className="cs-card-label">DRILL COMPLETE</p>

           

<h1 className="cs-challenge-encouragement">
  {challengeStep === 0
    ? '🔥 Great start. You’re locked in.'
    : challengeStep === 1
      ? '🔥 You’re crushing this.'
      : challengeStep === 2
        ? '🔥 One more. Finish strong.'
        : '🔥 Extra work complete.'}
</h1>

<p className="cs-challenge-description">
  {challengeStep === 0
    ? 'First round down. Stay focused and keep building.'
    : challengeStep === 1
      ? 'You’re halfway there. Keep the intensity up.'
      : challengeStep === 2
        ? 'Three down. Finish the challenge the way you started it.'
        : 'You completed every round of today’s bonus challenge.'}
</p>
            <button
              type="button"
              className="cs-achievement-continue"
              onClick={() => {
                setChallengeStep((step) => step + 1);
                setChallengeStarted(false);
                setChallengeStepFinished(false);
                setChallengeTimerFinished(false);
                setChallengeSecondsLeft(currentStepSeconds);
              }}
            >
              Preview Next Drill
            </button>
          </>
        ) : (
          <>
            {/* FINAL CHALLENGE COMPLETION */}

            <p className="cs-card-label">CHALLENGE COMPLETE</p>

            <h1>Extra work finished.</h1>

            <p className="cs-challenge-description">
              You completed every bonus drill. Claim today&apos;s reward.
            </p>

            <div className="cs-challenge-ready-card">
              <span>DAILY BONUS</span>
              <strong>+40 XP</strong>
              <p>Earned through extra work.</p>
            </div>

            <button
              type="button"
              className="cs-achievement-continue"
              onClick={async () => {
                const { data, error } = await supabase.rpc(
                  'complete_training_challenge',
                  {
                    p_challenge_key:
                      selectedChallenge.challenge_key,
                  }
                );

                if (error) {
                  console.error(
                    'Could not complete challenge:',
                    error
                  );
                  return;
                }

                const reward = data?.[0];

                setChallengeCompleted(true);
                setChallengeXp(reward?.xp_awarded ?? 0);
                setTotalXp(reward?.total_xp ?? totalXp);
                setPlayerLevel(reward?.level ?? playerLevel);

                setShowChallengeReward(true);
                setShowBonusChallenge(false);
              }}
            >
              Claim +40 XP
            </button>
          </>
        )}

      </section>
    </main>
  );
}if (showChallengeReward) {
  return (
    <main className="cs-challenge-reward-page">
      <section className="cs-challenge-reward-card">

        <div className="cs-challenge-reward-glow" />

        <div className="cs-challenge-reward-sparks" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>

        <p className="cs-challenge-reward-eyebrow">
          EXTRA WORK COMPLETE
        </p>

        <div className="cs-challenge-reward-xp">
          +40 XP
        </div>

        <h1>You earned that.</h1>

        <p className="cs-challenge-reward-message">
          You did more than required today. That extra work adds up.
        </p>

        <div className="cs-challenge-reward-status">
          <span>DAILY BONUS</span>
          <strong>COMPLETED ✓</strong>
        </div>

        <button
          type="button"
          className="cs-challenge-reward-button"
          onClick={() => setShowChallengeReward(false)}
        >
          Continue
        </button>

      </section>
    </main>
  );
}
if (showAchievementCelebration && unlockedAchievement) {
  return (
    <main className="cs-achievement-page">
      <section className="cs-achievement-card">

        <p className="cs-achievement-eyebrow">
          ACHIEVEMENT UNLOCKED
        </p>

        <div className="cs-achievement-badge">
          <div className="cs-achievement-glow" />

          <div className="cs-achievement-icon">
            🏆
          </div>
        </div>

        <span className="cs-achievement-rarity">
          {unlockedAchievement.achievement_rarity}
        </span>

        <h1>
          {unlockedAchievement.achievement_name}
        </h1>

        <p className="cs-achievement-description">
          {unlockedAchievement.achievement_description}
        </p>

        <div className="cs-achievement-reward">
          <span>ACHIEVEMENT REWARD</span>
          <strong>
            +{unlockedAchievement.xp_reward} XP
          </strong>
        </div>

        <p className="cs-achievement-trophy-message">
          Added to your Trophy Case
        </p>

        <button
          type="button"
          className="cs-achievement-continue"
          onClick={() => setShowAchievementCelebration(false)}
        >
          Continue
        </button>

      </section>
    </main>
  );
}
if (workoutFinished) {
  const personalBests = sessionResults.filter(
    (result) => result.isPersonalBest
  );
  const goalProgress = Math.min(
    100,
    Math.round((weeklyWorkouts / Math.max(weeklyGoal, 1)) * 100)
  );
  const savedDate = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  return (
    <main className="cs-results-page">
      <section className="cs-results-shell">
        <header className="cs-results-header">
          <div className="cs-results-check"><FiCheck /></div>
          <div>
            <span>WORKOUT COMPLETE</span>
            <h1>Guard Skill Builder complete.</h1>
            <p>Your results are saved and ready to review.</p>
            <small className="cs-results-saved"><FiCheck /> Saved to Progress <i /> {savedDate}</small>
          </div>
          <div className="cs-results-level">
            <small>PLAYER LEVEL</small>
            <strong>{playerLevel}</strong>
            <span>{totalXp.toLocaleString()} total XP</span>
          </div>
        </header>

        <section className="cs-results-summary">
          <article><FiTarget /><span><strong>{workoutDrills.length}</strong><small>Drills completed</small></span></article>
          <article><FiClock /><span><strong>{workoutDurationMinutes}</strong><small>Minutes trained</small></span></article>
          <article><FiZap /><span><strong>+{earnedXp}</strong><small>{workoutReplay ? 'Practice replay · no new XP' : 'XP earned'}</small></span></article>
          <article><FiActivity /><span><strong>{earnedStreak}</strong><small>Day streak</small></span></article>
        </section>

        <section className="cs-results-grid">
          <article className="cs-results-performance">
            <div className="cs-results-section-heading">
              <div><span>YOUR RESULTS</span><h2>Today’s performance</h2></div>
              {personalBests.length > 0 && <strong><FiAward /> {personalBests.length} personal {personalBests.length === 1 ? 'best' : 'bests'}</strong>}
            </div>

            <div className="cs-results-list">
              {workoutDrills.map((resultDrill, index) => {
                const result = sessionResults.find((item) => item.drillIndex === index);
                const difference = result?.previousBest == null
                  ? null
                  : result.reps - result.previousBest;
                return (
                  <div key={resultDrill.key}>
                    <span className="cs-results-drill-number">{index + 1}</span>
                    <span><strong>{resultDrill.name}</strong><small>{resultDrill.category}</small></span>
                    <span className="cs-results-score">
                      <strong>{result ? result.reps : '—'}{result && <small> reps</small>}</strong>
                      {result?.isPersonalBest ? (
                        <>
                          <em>NEW PERSONAL BEST</em>
                          <small className="cs-results-comparison">
                            {result.previousBest == null
                              ? 'First recorded result'
                              : `Previous best: ${result.previousBest} reps`}
                          </small>
                        </>
                      ) : result ? (
                        <>
                          <small className="cs-results-comparison">
                            Personal best: {result.previousBest} reps
                          </small>
                          <small className="cs-results-distance">
                            {Math.abs(difference)} {Math.abs(difference) === 1 ? 'rep' : 'reps'} away
                          </small>
                        </>
                      ) : null}
                    </span>
                  </div>
                );
              })}
            </div>
          </article>

          <aside className="cs-results-momentum">
            <div className="cs-results-section-heading"><div><span>WEEKLY MOMENTUM</span><h2>Keep building.</h2></div><FiTrendingUp /></div>
            <div className="cs-results-goal-copy"><strong>{weeklyWorkouts} <small>/ {weeklyGoal}</small></strong><span>workouts this week</span><em>{goalProgress}% of weekly goal</em></div>
            <div className="cs-results-goal-track"><span style={{ width: `${goalProgress}%` }} /></div>
            <p>{weeklyWorkouts >= weeklyGoal ? 'Weekly goal complete. Every additional session is extra work.' : `${Math.max(0, weeklyGoal - weeklyWorkouts)} ${weeklyGoal - weeklyWorkouts === 1 ? 'workout' : 'workouts'} left. Your next session keeps you on pace.`}</p>
          </aside>
        </section>

        <footer className="cs-results-actions">
          <button type="button" className="secondary" onClick={() => navigate('/progress')}>Review Progress <FiTrendingUp /></button>
          <button type="button" onClick={() => navigate('/dashboard')}>Return to Dashboard <FiChevronRight /></button>
        </footer>
      </section>
    </main>
  );
}


  return (
    <main className="cs-workout-page">
      <header className="cs-workout-header">
        <button
          type="button"
          className="cs-workout-back"
          onClick={() => navigate('/dashboard')}
        >
          <FiArrowLeft />
          Dashboard
        </button>

        <div>
          <span>Guard Skill Builder</span>
          <strong>
            Drill {currentDrill + 1} of {workoutDrills.length}
          </strong>
        </div>
      </header>

      <section className="cs-workout-container">
        <div className="cs-workout-progress-heading">
          <div>
            <p className="cs-card-label">TODAY&apos;S WORKOUT</p>
            <h1>Guard Skill Builder</h1>
          </div>

          <strong>{progress}% complete</strong>
        </div>

        <div className="cs-workout-progress-bar">
          <div style={{ width: `${progress}%` }} />
        </div>

        <section className="cs-active-drill-card">
          <div className="cs-drill-number">
            <span>{currentDrill + 1}</span>
          </div>

          <div className="cs-drill-content">
            <span className="cs-card-label">{drill.category}</span>
            <h2>{drill.name}</h2>

            <div className="cs-drill-meta">
              <span>
                <FiClock />
                {drill.duration}
              </span>

              <span>
                <FiTarget />
                Intermediate
              </span>
            </div>

            <div className="cs-drill-video-placeholder">
              <FiPlay />
              <span>Drill demonstration will appear here</span>
            </div>

            <div className="cs-drill-instructions">
              <span>Instructions</span>
              <p>{drill.instructions}</p>
            </div>
{showRepEntry && pendingDrillIndex === currentDrill && (
  <div className="cs-rep-entry-card">
    <div className="cs-rep-entry-copy">
      <span>LOG YOUR RESULT</span>

      <h3>{drill.name} complete</h3>

      <p>
        Enter your rep total so CourtStreak can track your
        personal bests and improvement over time.
      </p>
    </div>

    <div className="cs-rep-entry-control">
      <label htmlFor="rep-total">
        {drill.metricLabel}
      </label>

      <input
        id="rep-total"
        type="number"
        min="0"
        inputMode="numeric"
        value={pendingRepTotal}
        onChange={(event) =>
          setPendingRepTotal(event.target.value)
        }
        placeholder="0"
        autoFocus
      />

      <button
        type="button"
        onClick={() => {
          const parsedReps = Number(pendingRepTotal);

          if (
            !Number.isFinite(parsedReps) ||
            parsedReps < 0 ||
            pendingRepTotal === ''
          ) {
            return;
          }

          setPendingRepTotal(
            String(Math.round(parsedReps))
          );

          setShowRepEntry(false);

          handleCompleteDrill();
        }}
      >
        Save Result
      </button>
    </div>

    <small>
      This result will be added to your Progress history.
    </small>
  </div>
)}
            <button
              type="button"
              className={
                completedDrills.includes(currentDrill)
                  ? 'cs-complete-drill completed'
                  : 'cs-complete-drill'
              }
              onClick={handleCompleteDrill}
            >
              <FiCheck />
              {completedDrills.includes(currentDrill)
                ? 'Drill Completed'
                : 'Mark Drill Complete'}
            </button>
          </div>
        </section>

        <div className="cs-workout-navigation">
          <button
            type="button"
            onClick={handlePreviousDrill}
            disabled={currentDrill === 0}
          >
            <FiChevronLeft />
            Previous
          </button>

          {completedDrills.length === workoutDrills.length ? (
            <button
              type="button"
              className="cs-finish-workout"
              onClick={handleFinishWorkout}
            >
              Finish Workout
              <FiCheck />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNextDrill}
              disabled={currentDrill === workoutDrills.length - 1}
            >
              Next
              <FiChevronRight />
            </button>
          )}
        </div>

        <section className="cs-workout-drill-list">
          <p className="cs-card-label">WORKOUT DRILLS</p>

          <div>
            {workoutDrills.map((workoutDrill, index) => (
              <button
                type="button"
                key={workoutDrill.name}
                className={[
                  index === currentDrill ? 'active' : '',
                  completedDrills.includes(index) ? 'completed' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setCurrentDrill(index)}
              >
                <span>
                  {completedDrills.includes(index) ? (
                    <FiCheck />
                  ) : (
                    index + 1
                  )}
                </span>

                <div>
                  <strong>{workoutDrill.name}</strong>
                  <small>{workoutDrill.category}</small>
                </div>
              </button>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
