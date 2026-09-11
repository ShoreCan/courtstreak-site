import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';
import {
  FiArrowLeft,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiPlay,
  FiTarget,
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
const [challengeStarted, setChallengeStarted] = useState(false);
const [challengeSecondsLeft, setChallengeSecondsLeft] = useState(0);
const [challengeTimerFinished, setChallengeTimerFinished] = useState(false);
const [challengeStep, setChallengeStep] = useState(0);
const [challengeStepFinished, setChallengeStepFinished] = useState(false);
const [challengeCountdown, setChallengeCountdown] = useState(0);
const [challengeCountingDown, setChallengeCountingDown] = useState(false);
const [showChallengeReward, setShowChallengeReward] = useState(false);
const [challengeAccepted, setChallengeAccepted] = useState(false);
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

  if (pendingRepTotal === '') {
    setShowRepEntry(true);
    return;
  }

  const parsedReps = Number(pendingRepTotal);

  if (!Number.isFinite(parsedReps) || parsedReps < 0) {
    setShowRepEntry(true);
    return;
  }

  repTotal = Math.round(parsedReps);
}

  setCompletedDrills((previous) => [
    ...previous,
    currentDrill,
  ]);

  if (supabase) {
    const { data, error } = await supabase.rpc(
      'complete_training_drill',
      {
        p_workout_key: 'guard-skill-builder',
        p_drill_index: currentDrill,
      }
    );

    if (error) {
      console.error(
        'Could not save drill reward:',
        error
      );
    } else {
      const reward = data?.[0];

      if (reward) {
        console.log('Saved drill reward:', reward);

        setEarnedStreak(
          reward.training_streak ?? 0
        );

        setEarnedXp(
          (previousXp) =>
            previousXp + (reward.xp_awarded ?? 0)
        );

        setTotalXp(reward.xp ?? 0);
        setPlayerLevel(reward.level ?? 1);
      }
    }

    if (repTotal !== null) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { error: repError } = await supabase
          .from('training_sessions')
          .update({
            drill_name: currentDrillData.name,
            category: currentDrillData.category,
            difficulty: currentDrillData.difficulty,
            duration_seconds:
              currentDrillData.durationSeconds,
            reps: repTotal,
          })
          .eq('user_id', user.id)
          .eq(
            'workout_key',
            'guard-skill-builder'
          )
          .eq('drill_index', currentDrill)
          .order('completed_at', {
            ascending: false,
          })
          .limit(1);

        if (repError) {
          console.error(
            'Could not save drill reps:',
            repError
          );
        }
      }
    }
  }

 
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
      p_minutes_trained: 35,
      p_xp_earned: earnedXp,
    }
  );

  if (error) {
    console.error('Could not save workout completion:', error);
    return;
  }

  console.log('Workout completion saved:', data);
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
      'Could not check achievements:',
      achievementError
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
          <>
            <p className="cs-card-label">DAILY BONUS CHALLENGE</p>

            <h1>{selectedChallenge.name}</h1>

            <p className="cs-challenge-description">
              {selectedChallenge.description}
            </p>

            <div className="cs-challenge-meta">
              <span>{selectedChallenge.duration_minutes} min</span>
              <span>+40 XP</span>
              <span>{selectedChallenge.difficulty}</span>
            </div>

            <div className="cs-challenge-preview">
              <p>
                Put in the extra work. Complete all{' '}
                {challengeInstructions.length} timed drills to earn
                today&apos;s +40 XP bonus.
              </p>

              <div className="cs-challenge-steps">
                {challengeInstructions.map((instruction, index) => (
                  <div
                    key={`${selectedChallenge.challenge_key}-${index}`}
                  >
                    <strong>{index + 1}</strong>
                    <span>{instruction}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="cs-achievement-continue"
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
              Accept Challenge
            </button>

            <button
              type="button"
              className="cs-challenge-skip"
              onClick={() => setShowBonusChallenge(false)}
            >
              Skip today&apos;s bonus
            </button>
          </>
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
  const xpIntoLevel = totalXp % 100;
  const xpProgress = `${xpIntoLevel}%`;

  return (
    <main className="cs-celebration-page">
      <section className="cs-celebration-card">
        <div className="cs-celebration-stage">
          <div className="cs-celebration-ring" />
          <div className="cs-celebration-sparks" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>

          <div className="cs-celebration-flame" aria-hidden="true">
            🔥
          </div>

          <strong className="cs-celebration-streak">
            {earnedStreak}
          </strong>
        </div>

        <p className="cs-card-label">TRAINING STREAK</p>
        <h1>Streak protected.</h1>

        <p className="cs-celebration-message">
          You showed up today. Keep the fire alive.
        </p>

        <div className="cs-celebration-xp">
          <strong>+{earnedXp} XP</strong>
          <span>Level {playerLevel}</span>
        </div>

        <div className="cs-celebration-progress">
          <div className="cs-celebration-progress-heading">
            <span>Level {playerLevel}</span>
            <span>{xpIntoLevel} / 100 XP</span>
          </div>

          <div className="cs-celebration-progress-track">
            <div style={{ width: xpProgress }} />
          </div>
        </div>

        <div className="cs-celebration-stats">
          <article>
            <strong>{workoutDrills.length}</strong>
            <span>Drills</span>
          </article>

          <article>
            <strong>35</strong>
            <span>Minutes</span>
          </article>

          <article>
            <strong>{earnedStreak}</strong>
            <span>Day streak</span>
          </article>
        </div>

        <button
          type="button"
          className="cs-celebration-button"
          onClick={() => navigate('/dashboard')}
        >
          Continue to Dashboard
        </button>
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