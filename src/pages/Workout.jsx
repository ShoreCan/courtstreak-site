import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    name: 'Pound Dribbles',
    category: 'Ball Handling',
    duration: '45 seconds',
    instructions:
      'Stay low, keep your chest up and pound the basketball below your waist using your right hand.',
  },
  {
    name: 'Left-Hand Pound Dribbles',
    category: 'Ball Handling',
    duration: '45 seconds',
    instructions:
      'Repeat the movement with your left hand. Keep your eyes forward and maintain control.',
  },
  {
    name: 'Crossovers',
    category: 'Ball Handling',
    duration: '60 seconds',
    instructions:
      'Move the ball quickly from one hand to the other while staying balanced and low.',
  },
  {
    name: 'Inside-Hand Finishes',
    category: 'Finishing',
    duration: '10 makes each side',
    instructions:
      'Attack the basket and finish using the hand closest to the middle of the court.',
  },
  {
    name: 'Reverse Finishes',
    category: 'Finishing',
    duration: '10 makes each side',
    instructions:
      'Use the rim for protection and finish on the opposite side of the basket.',
  },
  {
    name: 'Jab-Step Footwork',
    category: 'Footwork',
    duration: '2 minutes',
    instructions:
      'Start in triple-threat position and practice sharp, balanced jab steps in both directions.',
  },
];

export default function Workout() {
  const navigate = useNavigate();
  const [currentDrill, setCurrentDrill] = useState(0);
  const [completedDrills, setCompletedDrills] = useState([]);
  const [workoutFinished, setWorkoutFinished] = useState(false);

  const drill = workoutDrills[currentDrill];
  const progress = Math.round(
    (completedDrills.length / workoutDrills.length) * 100
  );

  function handleCompleteDrill() {
    if (!completedDrills.includes(currentDrill)) {
      setCompletedDrills([...completedDrills, currentDrill]);
    }

    if (currentDrill < workoutDrills.length - 1) {
      setCurrentDrill(currentDrill + 1);
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

  function handleFinishWorkout() {
    setWorkoutFinished(true);
  }

  if (workoutFinished) {
    return (
      <main className="cs-workout-page">
        <section className="cs-workout-complete">
          <div className="cs-complete-icon">
            <FiCheck />
          </div>

          <p className="cs-card-label">WORKOUT COMPLETE</p>
          <h1>You protected your streak.</h1>

          <p>
            Great work. You completed the Guard Skill Builder and moved one
            step closer to your weekly goal.
          </p>

          <div className="cs-complete-results">
            <article>
              <strong>6</strong>
              <span>Drills completed</span>
            </article>

            <article>
              <strong>35</strong>
              <span>Minutes trained</span>
            </article>

            <article>
              <strong>8</strong>
              <span>Day streak</span>
            </article>
          </div>

          <button
            type="button"
            className="cs-return-dashboard"
            onClick={() => navigate('/dashboard')}
          >
            Return to Dashboard
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