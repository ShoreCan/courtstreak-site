// CourtStreak quality update v1
import { saveResultContext } from '../lib/resultContext.js';
import ShareTraining from '../components/ShareTraining.jsx';
import TrainingVisibility from '../components/TrainingVisibility.jsx';
import usePreviewNavigate from '../lib/usePreviewNavigate.js';
import DrillGuide from '../components/DrillGuide.jsx';
import { requireTrainingAccess, normalizeStats } from '../lib/trainingAccess.js';
import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';
import '../workout-results.css';
import '../workout-library.css';
import { WORKOUT_GOALS, WORKOUT_PROGRAMS, isCurrentCustomWorkout } from '../data/workoutPrograms.js';
import {
  FiActivity,
  FiArrowDown,
  FiArrowLeft,
  FiArrowUp,
  FiAward,
  FiCamera,
  FiCheck,
  FiChevronRight,
  FiClock,
  FiEdit3,
  FiLayers,
  FiLock,
  FiPause,
  FiPlay,
  FiPlus,
  FiRefreshCw,
  FiSave,
  FiSearch,
  FiTarget,
  FiTrash2,
  FiTrendingUp,
  FiUsers,
  FiX,
  FiZap,
} from 'react-icons/fi';

const WORKOUT_DRAFT_KEY = 'courtstreak-guided-workout-draft-v1';
const CUSTOM_WORKOUTS_KEY = 'courtstreak-custom-workouts-v1';
function cacheWrite(key, value) {
  try { window.localStorage.setItem(key, value); return true; } catch { return false; }
}
function cacheRemove(key) {
  try { window.localStorage.removeItem(key); } catch { /* Account results remain on the server. */ }
}
const CUSTOM_WORKOUT_MIN_DRILLS = 3;
const CUSTOM_WORKOUT_MAX_DRILLS = 20;

const CUSTOM_DRILL_FILTERS = [
  { key: 'all', label: 'All drills' },
  { key: 'foundation', label: 'Foundations' },
  { key: 'crossover', label: 'Crossovers' },
  { key: 'between', label: 'Between legs' },
  { key: 'behind', label: 'Behind back' },
  { key: 'weak', label: 'Weak hand' },
  { key: 'pace', label: 'Pace & control' },
  { key: 'combo', label: 'Combos' },
];

function getCustomDrillCategory(drill) {
  const searchable = `${drill.key} ${drill.name} ${drill.aiProfile}`.toLowerCase();
  if (searchable.includes('weak')) return 'weak';
  if (searchable.includes('between')) return 'between';
  if (searchable.includes('behind')) return 'behind';
  if (searchable.includes('cross')) return 'crossover';
  if (/combo|chain|freestyle|decision/.test(searchable)) return 'combo';
  if (/pace|pause|hang|pocket|hesitation|inout|in-out|v-dribble/.test(searchable)) return 'pace';
  return 'foundation';
}

const CUSTOM_DRILL_LIBRARY = [...new Map(WORKOUT_PROGRAMS.flatMap(program=>program.drills.map(drill=>[drill.key,{...drill,sourceWorkout:'Core drill library',builderCategory:getCustomDrillCategory(drill)}]))).values()];

function readSavedCustomWorkouts() {
  if (typeof window === 'undefined') return [];
  try {
    const saved = JSON.parse(window.localStorage.getItem(CUSTOM_WORKOUTS_KEY));
    return Array.isArray(saved) ? saved.filter((workout) => workout?.key && Array.isArray(workout.drills)) : [];
  } catch {
    return [];
  }
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function Workout({ previewOnly = false }) {
  const navigate = usePreviewNavigate(previewOnly);
  const location = useLocation();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const aiRoundRef = useRef(null);
  const attemptRef = useRef(null);
  const [runId, setRunId] = useState(null);
  const [serverProgram, setServerProgram] = useState(null);
  const [startingWorkout, setStartingWorkout] = useState(false);
  const [sharedCircleIds, setSharedCircleIds] = useState([]);
  const [visibilityReady, setVisibilityReady] = useState(false);
  const startRunRef = useRef(false);
  const [playerPreferences, setPlayerPreferences] = useState({});
  const [resetSecondsLeft, setResetSecondsLeft] = useState(0);
  const [savingRound, setSavingRound] = useState(false);
  const [savingWorkout, setSavingWorkout] = useState(false);
  const roundSaveRef = useRef(false);
  const workoutSaveRef = useRef(false);
  const [selectedDuration, setSelectedDuration] = useState(10);
  const [selectedGoal, setSelectedGoal] = useState('all');
  const [previewWorkoutKey, setPreviewWorkoutKey] = useState(null);
  const [activeWorkoutKey, setActiveWorkoutKey] = useState(null);
  const [customWorkouts, setCustomWorkouts] = useState(() => previewOnly ? [] : readSavedCustomWorkouts());
  const [customBuilderOpen, setCustomBuilderOpen] = useState(false);
  const [customBuilderStep, setCustomBuilderStep] = useState(1);
  const [customWorkoutName, setCustomWorkoutName] = useState('');
  const [customSelectedDrills, setCustomSelectedDrills] = useState([]);
  const [customSearch, setCustomSearch] = useState('');
  const [customCategory, setCustomCategory] = useState('all');
  const [customVisibleLimit, setCustomVisibleLimit] = useState(36);
  const [editingCustomWorkoutKey, setEditingCustomWorkoutKey] = useState(null);
  const [trainingMode, setTrainingMode] = useState('manual');
  const [roundPhase, setRoundPhase] = useState('preview');
  const [roundCountdown, setRoundCountdown] = useState(5);
  const [roundSecondsLeft, setRoundSecondsLeft] = useState(0);
  const [roundPaused, setRoundPaused] = useState(false);
  const [roundMessage, setRoundMessage] = useState('');
  const [savedWorkoutDraft, setSavedWorkoutDraft] = useState(null);
  const [currentDrill, setCurrentDrill] = useState(0);
  const [completedDrills, setCompletedDrills] = useState([]);
  const [workoutFinished, setWorkoutFinished] = useState(false);
  const [circleChallenge, setCircleChallenge] = useState(location.state?.circleChallenge ?? null);
  const [circleChallengeSubmitted, setCircleChallengeSubmitted] = useState(false);
  const [showRepEntry, setShowRepEntry] = useState(false);
const [pendingRepTotal, setPendingRepTotal] = useState('');
const [pendingDrillIndex, setPendingDrillIndex] = useState(null);
const [earnedStreak, setEarnedStreak] = useState(0);
  const currentCustomWorkouts = customWorkouts.filter(isCurrentCustomWorkout);
  const retiredCustomCount = customWorkouts.length - currentCustomWorkouts.length;
  const availableWorkoutPrograms = [...WORKOUT_PROGRAMS, ...currentCustomWorkouts];
  const findAvailableWorkout = (workoutKey) =>
    availableWorkoutPrograms.find((program) => program.key === workoutKey) ?? null;
  const activeWorkout = serverProgram ?? findAvailableWorkout(activeWorkoutKey);
  const previewWorkout = findAvailableWorkout(previewWorkoutKey);
  const workoutDrills = activeWorkout?.drills ?? [];
  const workoutDurationMinutes = activeWorkout?.durationMinutes ?? 0;
  const drill = workoutDrills[currentDrill] ?? null;
  const selectedPrograms = WORKOUT_PROGRAMS.filter(
    (program) => program.durationMinutes === selectedDuration
  );
  const goalPrograms = selectedGoal === 'all'
    ? selectedPrograms
    : selectedPrograms.filter((program) => program.goal === selectedGoal);
  const preferenceMatches = goalPrograms.filter((program) => String(program.level).toLowerCase().includes(String(playerPreferences.skill_level || 'Intermediate').toLowerCase()));
  const recommendationPool = preferenceMatches.length ? preferenceMatches : goalPrograms;
  const recommendationOffset = selectedDuration === 20 ? 3 : 0;
  const recommendedProgram = recommendationPool.length
    ? recommendationPool[(new Date().getDay() + recommendationOffset) % recommendationPool.length]
    : null;
  const browsePrograms = goalPrograms.filter(
    (program) => program.key !== recommendedProgram?.key
  );
  const savedDraftProgram = findAvailableWorkout(savedWorkoutDraft?.workoutKey);
  const normalizedCustomSearch = customSearch.trim().toLowerCase();
  const filteredCustomDrills = CUSTOM_DRILL_LIBRARY.filter((builderDrill) => {
    const matchesCategory = customCategory === 'all' || builderDrill.builderCategory === customCategory;
    const matchesSearch = !normalizedCustomSearch
      || `${builderDrill.name} ${builderDrill.instructions} ${builderDrill.sourceWorkout}`
        .toLowerCase()
        .includes(normalizedCustomSearch);
    return matchesCategory && matchesSearch;
  });
  const firstIncompleteIndex = workoutDrills.findIndex(
    (_, index) => !completedDrills.includes(index)
  );
  const nextRequiredIndex = firstIncompleteIndex === -1
    ? workoutDrills.length
    : firstIncompleteIndex;
  const aiTrackerAvailable = false; // Enable only with a supported verification pipeline.
  const progress = Math.round(
    workoutDrills.length
      ? (completedDrills.length / workoutDrills.length) * 100
      : 0
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
  if (roundPhase !== 'complete' || resetSecondsLeft <= 0) return;
  const timer = setTimeout(() => setResetSecondsLeft((value) => value - 1), 1000);
  return () => clearTimeout(timer);
}, [roundPhase, resetSecondsLeft]);

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

useEffect(() => {
  if (roundPhase !== 'countdown') return undefined;

  if (roundCountdown <= 0) {
    setRoundPhase('active');
    return undefined;
  }

  const timer = window.setTimeout(
    () => setRoundCountdown((value) => value - 1),
    1000
  );

  return () => window.clearTimeout(timer);
}, [roundPhase, roundCountdown]);

useEffect(() => {
  if (roundPhase !== 'active' || roundPaused) return undefined;

  if (roundSecondsLeft <= 0) {
    void finishDrillRound();
    return undefined;
  }

  const timer = window.setTimeout(
    () => setRoundSecondsLeft((value) => Math.max(0, value - 1)),
    1000
  );

  return () => window.clearTimeout(timer);
}, [roundPhase, roundPaused, roundSecondsLeft]);

useEffect(() => {
  function pauseWhenHidden() {
    if (document.hidden && roundPhase === 'active') {
      setRoundPaused(true);
      setRoundMessage('Round paused because CourtStreak left the screen. Resume when you are ready.');
    }
  }

  document.addEventListener('visibilitychange', pauseWhenHidden);
  return () => document.removeEventListener('visibilitychange', pauseWhenHidden);
}, [roundPhase]);

useEffect(() => () => {
  streamRef.current?.getTracks().forEach((track) => track.stop());
  void aiRoundRef.current?.stop?.();
}, []);

useEffect(() => {
  if (previewOnly) return;
  if (!cacheWrite(CUSTOM_WORKOUTS_KEY, JSON.stringify(customWorkouts))) setRoundMessage('Device storage is unavailable. Keep this page open; account results still save online.');
}, [customWorkouts]);

useEffect(() => {
  const incoming = location.state?.circleChallenge;
  if (!incoming?.sourceKey || incoming.sourceType === 'drill') return;

  if (incoming.sourceType === 'custom_workout' && incoming.sourcePayload?.program) {
    setCustomWorkouts((saved) => {
      if (saved.some((workout) => workout.key === incoming.sourceKey)) return saved;
      return [...saved, incoming.sourcePayload.program];
    });
  }

  setCircleChallenge(incoming);
  setCircleChallengeSubmitted(false);
  setTrainingMode('manual');
  setPreviewWorkoutKey(incoming.sourceKey);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}, [location.key]);

useEffect(() => {
  let cancelled = false;

  async function loadAccountWorkouts() {
    if (previewOnly || !supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || cancelled) return;
    const metadata = user.user_metadata || {};
    const preferredMinutes = parseInt(metadata.preferred_training_duration, 10);
    if (!cancelled && [10, 20].includes(preferredMinutes)) setSelectedDuration(preferredMinutes);
    if (!cancelled) setPlayerPreferences(metadata);

    const { data, error } = await supabase
      .from('custom_workouts')
      .select('workout_data')
      .eq('user_id', user.id)
      .eq('is_archived', false);

    if (error) {
      console.info('Custom workouts are using this device only until cloud sync is enabled.');
      return;
    }

    const remoteWorkouts = (data ?? [])
      .map((row) => row.workout_data)
      .filter((workout) => workout?.key && Array.isArray(workout.drills));

    if (!cancelled && remoteWorkouts.length) {
      setCustomWorkouts((localWorkouts) => {
        const merged = new Map(localWorkouts.map((workout) => [workout.key, workout]));
        remoteWorkouts.forEach((workout) => merged.set(workout.key, workout));
        return [...merged.values()];
      });
    }
  }

  void loadAccountWorkouts().catch(() => { if (!cancelled) setRoundMessage('Custom plans could not sync. Check your connection before training.'); });
  return () => { cancelled = true; };
}, []);

useEffect(() => {
  if (previewOnly) return;
  try {
    const saved = JSON.parse(window.localStorage.getItem(WORKOUT_DRAFT_KEY));
    const isCurrentDay = saved?.dateKey === getLocalDateKey();
    const hasValidProgram = Boolean(findAvailableWorkout(saved?.workoutKey));

    if (isCurrentDay && hasValidProgram && !saved?.finished) {
      setSavedWorkoutDraft(saved);
    } else {
      cacheRemove(WORKOUT_DRAFT_KEY);
    }
  } catch {
    cacheRemove(WORKOUT_DRAFT_KEY);
  }
}, []);

useEffect(() => {
  if (previewOnly || !activeWorkout || workoutFinished) return;

  const draft = {
    dateKey: getLocalDateKey(),
    savedAt: new Date().toISOString(),
    workoutKey: activeWorkout.key,
    runId,
    currentDrill,
    completedDrills,
    sessionResults,
    trainingMode,
    earnedXp,
    totalXp,
    playerLevel,
    earnedStreak,
    finished: false,
  };

  cacheWrite(WORKOUT_DRAFT_KEY, JSON.stringify(draft));
  setSavedWorkoutDraft(draft);
}, [
  activeWorkout,
  completedDrills,
  currentDrill,
  earnedStreak,
  earnedXp,
  playerLevel,
  sessionResults,
  totalXp,
  trainingMode,
  workoutFinished,
]);

function clearWorkoutDraft() {
  cacheRemove(WORKOUT_DRAFT_KEY);
  setSavedWorkoutDraft(null);
}

async function syncCustomWorkout(program) {
  try {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from('custom_workouts').upsert({
    user_id: user.id,
    workout_key: program.key,
    name: program.name,
    workout_data: program,
    is_archived: false,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,workout_key' });

  if (error) throw error;
  } catch { setRoundMessage('Plan is available on this screen. Account sync could not finish; retry before closing.'); }
}

function resetCustomBuilder() {
  setCustomBuilderStep(1);
  setCustomWorkoutName('');
  setCustomSelectedDrills([]);
  setCustomSearch('');
  setCustomCategory('all');
  setCustomVisibleLimit(36);
  setEditingCustomWorkoutKey(null);
}

function openCustomBuilder(workout = null) {
  if (previewOnly) { navigate("/preview/membership"); return; }
  if (workout) {
    setCustomWorkoutName(workout.name);
    setCustomSelectedDrills(workout.drills.map((item) => ({
      ...item,
      key: item.sourceDrillKey ?? item.key,
      sourceWorkout: item.sourceWorkout ?? 'Your saved workout',
      builderCategory: item.builderCategory ?? getCustomDrillCategory(item),
    })));
    setEditingCustomWorkoutKey(workout.key);
  } else {
    resetCustomBuilder();
  }

  setCustomBuilderStep(1);
  setPreviewWorkoutKey(null);
  setCustomBuilderOpen(true);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeCustomBuilder() {
  setCustomBuilderOpen(false);
  resetCustomBuilder();
}

function toggleCustomDrill(builderDrill) {
  setCustomSelectedDrills((selected) => {
    const selectedIndex = selected.findIndex((item) => item.key === builderDrill.key);
    if (selectedIndex >= 0) return selected.filter((_, index) => index !== selectedIndex);
    if (selected.length >= CUSTOM_WORKOUT_MAX_DRILLS) return selected;
    return [...selected, builderDrill];
  });
}

function moveCustomDrill(index, direction) {
  setCustomSelectedDrills((selected) => {
    const destination = index + direction;
    if (destination < 0 || destination >= selected.length) return selected;
    const reordered = [...selected];
    [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
    return reordered;
  });
}

function removeCustomDrill(index) {
  setCustomSelectedDrills((selected) => selected.filter((_, itemIndex) => itemIndex !== index));
}

function saveCustomWorkout() {
  const name = customWorkoutName.trim();
  if (name.length < 2 || customSelectedDrills.length < CUSTOM_WORKOUT_MIN_DRILLS) return;

  const existing = customWorkouts.find((workout) => workout.key === editingCustomWorkoutKey);
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 28);
  const workoutKey = editingCustomWorkoutKey ?? `custom-${Date.now()}-${slug || 'workout'}`;
  const drills = customSelectedDrills.map((item, index) => ({
    ...item,
    key: `${workoutKey}-${index + 1}-${item.sourceDrillKey ?? item.key}`,
    sourceDrillKey: item.sourceDrillKey ?? item.key,
    order: index + 1,
    durationSeconds: 45,
    transitionSeconds: 15,
    duration: '45 sec work · 15 sec reset',
  }));
  const program = {
    key: workoutKey,
    name,
    durationMinutes: drills.length,
    level: 'Custom',
    intensity: drills.length >= 15 ? 'High' : drills.length >= 10 ? 'Moderate' : 'Controlled',
    focus: `Custom plan · ${drills.length} drills`,
    summary: 'A player-built stationary workout using CourtStreak drills.',
    outcome: 'A focused session built around the skills you chose.',
    whyItMatters: 'You choose the skills. CourtStreak keeps the work organized, timed, and accountable.',
    goal: 'custom',
    accent: 'custom',
    workSeconds: 45,
    resetSeconds: 15,
    totalDurationSeconds: drills.length * 60,
    drills,
    isCustom: true,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  setCustomWorkouts((workouts) => {
    const exists = workouts.some((workout) => workout.key === workoutKey);
    return exists
      ? workouts.map((workout) => workout.key === workoutKey ? program : workout)
      : [program, ...workouts];
  });
  void syncCustomWorkout(program);
  setTrainingMode('manual');
  setPreviewWorkoutKey(program.key);
  setCustomBuilderOpen(false);
  resetCustomBuilder();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteCustomWorkout(workout) {
  if (previewOnly) return;
  if (!window.confirm(`Delete “${workout.name}”? This cannot be undone.`)) return;
  try {
    const user = await requireTrainingAccess();
    const {error} = await supabase.from('custom_workouts')
      .update({is_archived: true, updated_at: new Date().toISOString()})
      .eq('user_id', user.id).eq('workout_key', workout.key);
    if (error) throw error;
    setCustomWorkouts(items => items.filter(item => item.key !== workout.key));
    if (savedWorkoutDraft?.workoutKey === workout.key) clearWorkoutDraft();
  } catch { setRoundMessage('Plan could not be deleted. Please try again.'); }
}

function openWorkoutPreview(workoutKey) {
  setTrainingMode('manual');
  setPreviewWorkoutKey(workoutKey);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function resumeWorkoutDraft() {
  if (!savedWorkoutDraft?.runId) {
    clearWorkoutDraft(); setRoundMessage('That older draft cannot be resumed. Your recorded results are still in Progress.'); return;
  }
  try {
    await requireTrainingAccess();
    const {data,error}=await supabase.rpc('get_workout_run',{p_run_id:savedWorkoutDraft.runId});
    if (error || !data?.program) throw new Error(error?.message || 'The saved workout could not be restored.');
    if (!isCurrentCustomWorkout(data.program)) throw new Error('This saved plan uses retired drills. Choose a core workout; your recorded results remain in Progress.');
    const results=(data.results || []).map((r)=>({drillIndex:r.drill_index,drillName:r.drill_name,reps:r.reps,previousBest:r.previous_best,isPersonalBest:r.previous_best===null || r.reps>r.previous_best,validationMode:'manual',xpAwarded:r.xp_awarded}));
    const completed=results.map((r)=>r.drillIndex); const firstOpen=data.program.drills.findIndex((_,i)=>!completed.includes(i));
    setRunId(data.run_id); setServerProgram(data.program); setActiveWorkoutKey(data.program.key);
    setCurrentDrill(firstOpen===-1 ? data.program.drills.length-1 : firstOpen);
    setCompletedDrills(completed); setSessionResults(results); setTrainingMode('manual');
    setEarnedXp(results.reduce((total,r)=>total+r.xpAwarded,0)); setWorkoutFinished(false);
    setRoundPhase(firstOpen===-1 ? 'complete' : 'preview'); setResetSecondsLeft(0);
    setRoundSecondsLeft(data.program.drills[Math.max(firstOpen,0)].durationSeconds); setRoundPaused(false);
    setRoundMessage('Progress restored from your account.');
    if(data.completed && data.receipt) {
      const receipt=data.receipt;
      setWeeklyWorkouts(receipt.weekly_workouts); setWeeklyGoal(receipt.weekly_goal);
      setEarnedStreak(receipt.training_streak); setPlayerLevel(receipt.level); setTotalXp(receipt.xp);
      setEarnedXp(receipt.drill_xp+receipt.bonus_xp+(receipt.achievements || []).reduce((total,a)=>total+(a.xp_reward || 0),0));
      setWorkoutReplay(receipt.already_completed && receipt.drill_xp===0);
      clearWorkoutDraft(); setWorkoutFinished(true);
    }
  } catch(error){setRoundMessage(error.message);}
}

function stopRoundCamera() {
  streamRef.current?.getTracks().forEach((track) => track.stop());
  streamRef.current = null;
  if (videoRef.current) videoRef.current.srcObject = null;
}

async function startDrillRound() {
  if (!drill || roundPhase !== 'preview' || completedDrills.includes(currentDrill)) return;
  setRoundPhase('preparing');

  setRoundMessage('');
  try {
    await requireTrainingAccess();
    const result=await supabase.rpc('begin_workout_drill_attempt',{p_run_id:runId,p_drill_index:currentDrill});
    if(result.error || !result.data?.attempt_id) throw new Error(result.error?.message || 'The round could not start.');
    attemptRef.current=result.data.attempt_id;
  } catch(error){setRoundMessage(error.message);setRoundPhase('preview');return;}
  setPendingRepTotal('');
  setPendingDrillIndex(currentDrill);
  setShowRepEntry(false);

  if (trainingMode === 'ai') {
    if (!aiTrackerAvailable) {
      setRoundMessage('Choose Guided Manual to start this workout.');
      setRoundPhase('preview');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      aiRoundRef.current = await window.CourtStreakAI.startRound({
        videoElement: videoRef.current,
        drillKey: drill.key,
        trackingProfile: drill.aiProfile,
      });
    } catch (error) {
      stopRoundCamera();
      setRoundMessage('Camera or AI tracking could not start. Check camera permission or switch to Guided Manual.');
      console.error('Could not start the AI-guided round:', error);
      setRoundPhase('preview');
      return;
    }
  }

  setRoundCountdown(5);
  setRoundSecondsLeft(drill.durationSeconds);
  setRoundPaused(false);
  setRoundPhase('countdown');
}

async function finishDrillRound() {
  if (!drill || roundPhase === 'processing' || roundPhase === 'result') return;

  setRoundPhase('processing');
  let verifiedReps = null;

  if (trainingMode === 'ai') {
    try {
      const trackerResult = await aiRoundRef.current?.stop?.();
      const trackerReps = Number(trackerResult?.confirmedReps ?? trackerResult?.reps);
      if (Number.isFinite(trackerReps) && trackerReps >= 0) {
        verifiedReps = Math.round(trackerReps);
      }
    } catch (error) {
      console.error('Could not finish the AI-guided round:', error);
    }
  }

  aiRoundRef.current = null;
  stopRoundCamera();
  setPendingDrillIndex(currentDrill);
  setPendingRepTotal(verifiedReps === null ? '' : String(verifiedReps));
  setShowRepEntry(true);
  setRoundPaused(false);
  setRoundMessage(
    trainingMode === 'ai'
      ? verifiedReps === null
        ? 'The tracker could not verify a result. Restart this round or switch to Guided Manual.'
        : `${verifiedReps} reps counted by the experimental tracker.`
      : 'Full work interval complete. Record only clean reps or complete sequences.'
  );
  setRoundPhase('result');
}

function selectWorkoutDrill(index) {
  if (index > nextRequiredIndex) return;

  stopRoundCamera();
  void aiRoundRef.current?.stop?.();
  aiRoundRef.current = null;
  setCurrentDrill(index);
  setRoundPhase(completedDrills.includes(index) ? 'complete' : 'preview');
  setRoundSecondsLeft(workoutDrills[index]?.durationSeconds ?? 0);
  setRoundPaused(false);
  setRoundMessage('');
  setShowRepEntry(false);
  setPendingRepTotal('');
  setPendingDrillIndex(null);
}

async function startWorkout(workoutKey) {
  if(previewOnly){navigate('/preview/membership');return;}
  const program=findAvailableWorkout(workoutKey);
  if(!program || trainingMode!=='manual' || startRunRef.current) return;
  if(savedWorkoutDraft && savedWorkoutDraft.workoutKey!==program.key && !window.confirm('Replace your saved draft with this workout? Recorded results remain in Progress.'))return;
  startRunRef.current=true;setStartingWorkout(true);setRoundMessage('');
  try {
    const user=await requireTrainingAccess();
    if(program.isCustom){
      const saved=await supabase.from('custom_workouts').upsert({user_id:user.id,workout_key:program.key,name:program.name,workout_data:program,is_archived:false},{onConflict:'user_id,workout_key'});
      if(saved.error)throw new Error('Your custom plan could not sync. Please try again.');
    }
    const circles=[...new Set([...sharedCircleIds,...(circleChallenge?.circleId ? [circleChallenge.circleId] : [])])];
    const {data,error}=await supabase.rpc('begin_workout_run',{p_workout_key:program.key,p_timezone:Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',p_shared_circle_ids:circles});
    if(error || !data?.run_id || !data.program)throw new Error(error?.message || 'The workout could not be prepared.');
    attemptRef.current=null;
    clearWorkoutDraft();setRunId(data.run_id);setServerProgram(data.program);setActiveWorkoutKey(program.key);setPreviewWorkoutKey(null);
    setCurrentDrill(0);setCompletedDrills([]);setWorkoutFinished(false);setShowRepEntry(false);setPendingRepTotal('');setPendingDrillIndex(null);
    setEarnedXp(0);setSessionResults([]);setRoundPhase('preview');setRoundCountdown(5);setRoundSecondsLeft(data.program.drills[0].durationSeconds);setResetSecondsLeft(0);setRoundPaused(false);window.scrollTo({top:0,behavior:'smooth'});
  }catch(error){setRoundMessage(error.message);}finally{startRunRef.current=false;setStartingWorkout(false);}
}

function leaveActiveWorkout() {
  setServerProgram(null);
  setRunId(null);
  setActiveWorkoutKey(null);
  setCurrentDrill(0);
  setCompletedDrills([]);
  setShowRepEntry(false);
  setPendingRepTotal('');
  setPendingDrillIndex(null);
  stopRoundCamera();
  void aiRoundRef.current?.stop?.();
  aiRoundRef.current = null;
  setRoundPhase('preview');
  setRoundMessage('');

  if (completedDrills.length === 0) {
    clearWorkoutDraft();
  }
}

  async function handleCompleteDrill() {
  if(previewOnly || roundSaveRef.current || roundPhase!=='result' || roundSecondsLeft>0 || !attemptRef.current || completedDrills.includes(currentDrill))return;
  const reps=Number(pendingRepTotal);
  if(!pendingRepTotal.trim() || !Number.isSafeInteger(reps) || reps<0 || reps>10000){setRoundMessage('Enter a whole number between 0 and 10,000.');return;}
  roundSaveRef.current=true;setSavingRound(true);
  try {
    await requireTrainingAccess();
    const {data,error}=await supabase.rpc('complete_workout_drill_attempt',{p_attempt_id:attemptRef.current,p_reps:reps});
    if(error || !data?.session_id)throw new Error(error?.message || 'Your result could not be saved. Keep this screen open and retry.');
    const contextSaved = await saveResultContext(data.session_id, drill, drill.durationSeconds);
    const result={drillIndex:data.drill_index,drillName:data.drill_name,reps:data.reps,previousBest:data.previous_best,isPersonalBest:data.previous_best===null || data.reps>data.previous_best,validationMode:'manual',xpAwarded:data.xp_awarded};
    setSessionResults((previous)=>[...previous.filter((r)=>r.drillIndex!==currentDrill),result]);
    setEarnedXp((previous)=>previous+data.xp_awarded);setTotalXp(data.xp);setPlayerLevel(data.level);setEarnedStreak(data.training_streak);
    setCompletedDrills((previous)=>[...new Set([...previous,currentDrill])]);setShowRepEntry(false);setPendingRepTotal('');setPendingDrillIndex(null);
    setRoundPhase('complete');setResetSecondsLeft(drill.transitionSeconds || 0);setRoundMessage(contextSaved ? 'Timed round saved. Result self-reported.' : 'Result saved. Comparison details could not save; this attempt stays in history.');
  }catch(error){setRoundMessage(error.message);setShowRepEntry(true);}finally{roundSaveRef.current=false;setSavingRound(false);}
}


function handleNextDrill() {
  if (resetSecondsLeft > 0) return;
  if (
    completedDrills.includes(currentDrill)
    && currentDrill < workoutDrills.length - 1
  ) {
    selectWorkoutDrill(currentDrill + 1);
  }
}
   

async function handleFinishWorkout() {
  if(previewOnly || !runId || workoutSaveRef.current)return;
  if(resetSecondsLeft>0 || completedDrills.length!==workoutDrills.length || workoutDrills.length===0){setRoundMessage('Finish and save every required round first.');return;}
  workoutSaveRef.current=true;setSavingWorkout(true);
  try {
    await requireTrainingAccess();
    const {data,error}=await supabase.rpc('finish_workout_run',{p_run_id:runId});
    if(error || !data)throw new Error(error?.message || 'Your workout could not be saved. Retry from this screen.');
    let challengeXp=0;
    if(circleChallenge?.id && !circleChallengeSubmitted){
      const posted=await supabase.rpc('submit_circle_challenge_result',{p_challenge_id:circleChallenge.id,p_score:0,p_verification_mode:'manual',p_result_payload:{runId}});
      if(posted.error)throw new Error('Your workout was saved, but the Circle result was not posted. Retry Finish Workout to post it.');
      const entry=Array.isArray(posted.data)?posted.data[0]:posted.data;challengeXp=entry?.result_payload?.xpAwarded || 0;setCircleChallengeSubmitted(true);
    }
    setWeeklyWorkouts(data.weekly_workouts);setWeeklyGoal(data.weekly_goal);setEarnedStreak(data.training_streak);setPlayerLevel(data.level);
    const achievementXp=(data.achievements || []).reduce((total,a)=>total+(a.xp_reward || 0),0);
    setEarnedXp(data.drill_xp+data.bonus_xp+achievementXp+challengeXp);setWorkoutReplay(data.already_completed && data.drill_xp===0);
    const stats=await supabase.rpc('get_my_courtstreak_stats');setTotalXp(normalizeStats(stats.data)?.xp ?? data.xp);
    if(data.achievements?.length){setUnlockedAchievement(data.achievements[0]);setShowAchievementCelebration(true);}
    clearWorkoutDraft();setWorkoutFinished(true);
  }catch(error){setRoundMessage(error.message);}finally{workoutSaveRef.current=false;setSavingWorkout(false);}
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

            <p className="cs-comparison-note">Stay balanced. Keep each bounce controlled. Follow the named drill for the full interval.</p>

            <div className="cs-challenge-ready-card">
              <span>WORK INTERVAL</span>
              <strong>1:00</strong>
              <p>
                Read the drill, get your ball ready, then start
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

if (!activeWorkout) {
  if (customBuilderOpen) {
    const visibleCustomDrills = filteredCustomDrills.slice(0, customVisibleLimit);

    return (
      <main className="cs-builder-page">
        <header className="cs-builder-topbar">
          <button type="button" className="cs-program-back" onClick={closeCustomBuilder}>
            <FiArrowLeft /> Workouts
          </button>
          <div>
            <span>COURTSTREAK</span>
            <strong>Workout Builder</strong>
          </div>
        </header>

        <section className="cs-builder-shell">
          <header className="cs-builder-hero">
            <div>
              <p className="cs-program-eyebrow">BUILD YOUR OWN</p>
              <h1>Make training fit your game.</h1>
              <p>Pick the drills you want, put them in order, and CourtStreak will turn them into one guided workout.</p>
            </div>
            <aside>
              <FiLayers />
              <div><strong>{customSelectedDrills.length}</strong><span>drills selected</span></div>
              <small>{customSelectedDrills.length}:00 workout</small>
            </aside>
          </header>

          <nav className="cs-builder-stepper" aria-label="Workout builder progress">
            {[
              [1, 'Choose drills'],
              [2, 'Set the order'],
              [3, 'Name & save'],
            ].map(([step, label]) => (
              <button
                type="button"
                key={step}
                className={`${customBuilderStep === step ? 'active' : ''} ${customBuilderStep > step ? 'complete' : ''}`}
                onClick={() => {
                  if (step === 1 || (step === 2 && customSelectedDrills.length >= CUSTOM_WORKOUT_MIN_DRILLS) || (step === 3 && customSelectedDrills.length >= CUSTOM_WORKOUT_MIN_DRILLS)) {
                    setCustomBuilderStep(step);
                  }
                }}
              >
                <span>{customBuilderStep > step ? <FiCheck /> : step}</span>
                <strong>{label}</strong>
              </button>
            ))}
          </nav>

          {customBuilderStep === 1 ? (
            <section className="cs-builder-panel">
              <header className="cs-builder-panel-heading">
                <div>
                  <span>STEP 1 OF 3</span>
                  <h2>Choose 3–20 drills.</h2>
                  <p>Tap Add for any drill you want. You can change the order next.</p>
                </div>
                <strong className={customSelectedDrills.length >= CUSTOM_WORKOUT_MIN_DRILLS ? 'ready' : ''}>
                  {customSelectedDrills.length} / {CUSTOM_WORKOUT_MAX_DRILLS}
                </strong>
              </header>

              <div className="cs-builder-toolbar">
                <label className="cs-builder-search">
                  <FiSearch />
                  <input
                    value={customSearch}
                    onChange={(event) => {
                      setCustomSearch(event.target.value);
                      setCustomVisibleLimit(36);
                    }}
                    placeholder="Search drills or skills"
                    aria-label="Search drills"
                  />
                  {customSearch ? <button type="button" onClick={() => setCustomSearch('')}><FiX /></button> : null}
                </label>
                <div className="cs-builder-filters" aria-label="Drill categories">
                  {CUSTOM_DRILL_FILTERS.map((filter) => (
                    <button
                      type="button"
                      key={filter.key}
                      className={customCategory === filter.key ? 'active' : ''}
                      onClick={() => {
                        setCustomCategory(filter.key);
                        setCustomVisibleLimit(36);
                      }}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="cs-builder-drill-grid">
                {visibleCustomDrills.map((builderDrill) => {
                  const selected = customSelectedDrills.some((item) => item.key === builderDrill.key);
                  return (
                    <article className={`cs-builder-drill-card ${selected ? 'selected' : ''}`} key={`${builderDrill.sourceWorkout}-${builderDrill.key}`}>
                      <header>
                        <span>{builderDrill.builderCategory.replace('-', ' ')}</span>
                        <small>{builderDrill.phase}</small>
                      </header>
                      <h3>{builderDrill.name}</h3>
                      <p>{builderDrill.instructions}</p>
                      <footer>
                        <div><small>COACHING CUE</small><strong>{builderDrill.cue}</strong></div>
                        <button
                          type="button"
                          className={selected ? 'selected' : ''}
                          disabled={!selected && customSelectedDrills.length >= CUSTOM_WORKOUT_MAX_DRILLS}
                          onClick={() => toggleCustomDrill(builderDrill)}
                        >
                          {selected ? <><FiCheck /> Added</> : <><FiPlus /> Add</>}
                        </button>
                      </footer>
                    </article>
                  );
                })}
              </div>

              {!visibleCustomDrills.length ? (
                <div className="cs-builder-empty"><FiSearch /><strong>No drills found.</strong><span>Try another skill or search.</span></div>
              ) : null}

              {filteredCustomDrills.length > customVisibleLimit ? (
                <button type="button" className="cs-builder-show-more" onClick={() => setCustomVisibleLimit((limit) => limit + 36)}>
                  Show more drills
                </button>
              ) : null}

              <footer className="cs-builder-footer">
                <span>{customSelectedDrills.length < CUSTOM_WORKOUT_MIN_DRILLS ? `Choose ${CUSTOM_WORKOUT_MIN_DRILLS - customSelectedDrills.length} more to continue` : 'Your first draft is ready.'}</span>
                <button
                  type="button"
                  disabled={customSelectedDrills.length < CUSTOM_WORKOUT_MIN_DRILLS}
                  onClick={() => { setCustomBuilderStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                >
                  Set the order <FiChevronRight />
                </button>
              </footer>
            </section>
          ) : null}

          {customBuilderStep === 2 ? (
            <section className="cs-builder-panel">
              <header className="cs-builder-panel-heading">
                <div><span>STEP 2 OF 3</span><h2>Put your workout in order.</h2><p>Start with control, build the challenge, and finish strong.</p></div>
                <strong className="ready">{customSelectedDrills.length}:00</strong>
              </header>

              <div className="cs-builder-order-list">
                {customSelectedDrills.map((selectedDrill, index) => (
                  <article className="cs-builder-order-item" key={`${selectedDrill.key}-${index}`}>
                    <span className="cs-builder-order-number">{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <small>{selectedDrill.phase} · 45 sec work</small>
                      <h3>{selectedDrill.name}</h3>
                      <p>{selectedDrill.instructions}</p>
                    </div>
                    <div className="cs-builder-order-actions">
                      <button type="button" disabled={index === 0} onClick={() => moveCustomDrill(index, -1)} aria-label={`Move ${selectedDrill.name} up`}><FiArrowUp /></button>
                      <button type="button" disabled={index === customSelectedDrills.length - 1} onClick={() => moveCustomDrill(index, 1)} aria-label={`Move ${selectedDrill.name} down`}><FiArrowDown /></button>
                      <button type="button" className="delete" onClick={() => removeCustomDrill(index)} aria-label={`Remove ${selectedDrill.name}`}><FiTrash2 /></button>
                    </div>
                  </article>
                ))}
              </div>

              <footer className="cs-builder-footer">
                <button type="button" className="secondary" onClick={() => setCustomBuilderStep(1)}><FiArrowLeft /> Add or remove drills</button>
                <button type="button" disabled={customSelectedDrills.length < CUSTOM_WORKOUT_MIN_DRILLS} onClick={() => { setCustomBuilderStep(3); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                  Name your workout <FiChevronRight />
                </button>
              </footer>
            </section>
          ) : null}

          {customBuilderStep === 3 ? (
            <section className="cs-builder-panel">
              <header className="cs-builder-panel-heading">
                <div><span>STEP 3 OF 3</span><h2>Give your workout a name.</h2><p>Use a name you will recognize when it is time to train.</p></div>
                <FiSave className="cs-builder-save-icon" />
              </header>

              <div className="cs-builder-review-grid">
                <div className="cs-builder-name-card">
                  <label htmlFor="custom-workout-name">WORKOUT NAME</label>
                  <input
                    id="custom-workout-name"
                    value={customWorkoutName}
                    maxLength={48}
                    onChange={(event) => setCustomWorkoutName(event.target.value)}
                    placeholder="Example: My Handle Builder"
                    autoFocus
                  />
                  <small>{customWorkoutName.trim().length}/48 characters</small>
                  <div className="cs-builder-summary-stats">
                    <div><strong>{customSelectedDrills.length}</strong><span>drills</span></div>
                    <div><strong>{customSelectedDrills.length}:00</strong><span>minutes</span></div>
                    <div><strong>45/15</strong><span>work/reset</span></div>
                  </div>
                </div>

                <aside className="cs-builder-final-list">
                  <span>YOUR WORKOUT</span>
                  {customSelectedDrills.map((item, index) => (
                    <div key={`${item.key}-review-${index}`}><small>{index + 1}</small><strong>{item.name}</strong></div>
                  ))}
                </aside>
              </div>

              <footer className="cs-builder-footer">
                <button type="button" className="secondary" onClick={() => setCustomBuilderStep(2)}><FiArrowLeft /> Review order</button>
                <button type="button" disabled={customWorkoutName.trim().length < 2} onClick={saveCustomWorkout}>
                  <FiSave /> {editingCustomWorkoutKey ? 'Save changes' : 'Save my workout'}
                </button>
              </footer>
            </section>
          ) : null}
        </section>
      </main>
    );
  }

  if (previewWorkout) {
    const previewPhases = [...new Set(previewWorkout.drills.map((item) => item.phase))];

    return (
      <main className="cs-program-page">
        <header className="cs-program-topbar">
          <button
            type="button"
            className="cs-program-back"
            onClick={() => setPreviewWorkoutKey(null)}
          >
            <FiArrowLeft />
            All workouts
          </button>

          <div>
            <span>{previewWorkout.durationMinutes} MINUTE WORKOUT</span>
            <strong>{previewWorkout.drills.length} guided rounds</strong>
          </div>
        </header>

        <section className="cs-program-preview-shell">
          <header className="cs-program-preview-hero">
            <div className="cs-program-preview-copy">
              <p className="cs-program-eyebrow">{previewWorkout.isCustom ? 'YOUR CUSTOM WORKOUT' : 'COURTSTREAK TRAINING PLAN'}</p>
              <h1>{previewWorkout.name}</h1>
              <p>{previewWorkout.summary}</p>

              <div className="cs-program-preview-meta">
                <span><FiClock /> {previewWorkout.durationMinutes} minutes</span>
                <span><FiActivity /> {previewWorkout.intensity}</span>
                <span><FiTarget /> {previewWorkout.level}</span>
              </div>
            </div>

            <aside className="cs-program-outcome">
              <span>WHAT YOU&apos;LL BUILD</span>
              <strong>{previewWorkout.outcome}</strong>
              <small>WHY THIS MATTERS</small>
              <p>{previewWorkout.whyItMatters}</p>
            </aside>
          </header>

          <div className="cs-program-preview-body">
            <section className="cs-program-sequence">
              <div className="cs-program-section-heading">
                <div>
                  <span>WORKOUT SEQUENCE</span>
                  <h2>Every round has a purpose.</h2>
                </div>
                <p>{previewPhases.join(' · ')}</p>
              </div>

              <div className="cs-program-sequence-list">
                {previewWorkout.drills.map((previewDrill, index) => (
                  <details key={previewDrill.key}>
                    <summary>
                      <span className="cs-program-sequence-number">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <small>{previewDrill.phase}</small>
                        <strong>{previewDrill.name}</strong>
                        <p>{previewDrill.cue}</p>
                      </div>
                      <time>
                        {previewDrill.durationSeconds}s
                        <small>work</small>
                      </time>
                      <FiChevronRight className="cs-program-sequence-chevron" />
                    </summary>
                    <div className="cs-program-drill-explanation">
                      <span>HOW TO DO IT</span>
                      <DrillGuide drill={previewDrill} />
                    </div>
                  </details>
                ))}
              </div>
            </section>

            <aside className="cs-program-start-panel">
              {roundMessage && <p role="alert">{roundMessage}</p>}
              <span>READY WHEN YOU ARE</span>
              <h2>{previewWorkout.durationMinutes}:00</h2>
              <p>
                One ball. Guided work and reset intervals. Complete every
                round to record the full workout.
              </p>
              <ul>
                <li><FiCheck /> {previewWorkout.drills.length} progressive drills</li>
                <li><FiCheck /> {previewWorkout.workSeconds}s work each round</li>
                <li><FiCheck /> {previewWorkout.resetSeconds}s guided reset</li>
              </ul>

              <div className="cs-manual-tracking-note">
                <FiEdit3 aria-hidden="true" />
                <div><strong>Guided training</strong><p>Follow each timer, then enter your clean reps. Camera counting is not included.</p></div>
              </div>

              {!previewOnly && <TrainingVisibility onReady={setVisibilityReady} value={sharedCircleIds} onChange={setSharedCircleIds} lockedCircleId={circleChallenge?.circleId} />}
              <button
                type="button"
                onClick={() => startWorkout(previewWorkout.key)}
                disabled={startingWorkout || (!previewOnly && !visibilityReady) || !trainingMode || (trainingMode === 'ai' && !aiTrackerAvailable)}
              >
                {startingWorkout ? 'Preparing your workout…' : previewOnly ? 'Unlock this workout' : 'Start workout'}
                <FiChevronRight />
              </button>
              <button
                type="button"
                className="cs-program-circle-challenge"
                onClick={() => navigate('/training-circles', {
                  state: {
                    challengeDraft: {
                      sourceType: previewWorkout.isCustom ? 'custom_workout' : 'workout',
                      sourceKey: previewWorkout.key,
                      sourceName: previewWorkout.name,
                      sourcePayload: previewWorkout.isCustom
                        ? { program: previewWorkout }
                        : { durationMinutes: previewWorkout.durationMinutes },
                      challengeType: 'score',
                    },
                  },
                })}
              >
                <FiUsers /> Challenge a Circle
              </button>
              <small className="cs-program-lock-note"><FiLock /> Future rounds stay locked until the current interval is completed and saved.</small>
            </aside>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="cs-workout-library-page">
      {roundMessage && <p className="cs-workout-round-message" role="alert">{roundMessage}</p>}
      <header className="cs-workout-library-topbar">
        <button
          type="button"
          className="cs-program-back"
          onClick={() => navigate('/dashboard')}
        >
          <FiArrowLeft />
          Dashboard
        </button>

        <div>
          <span>COURTSTREAK</span>
          <strong>Guided Workouts</strong>
        </div>
      </header>

      <section className="cs-workout-library-shell">
        <header className="cs-workout-library-hero">
          <div>
            <p className="cs-program-eyebrow">BALL-HANDLING WORKOUTS</p>
            <h1>Train with a plan.</h1>
            <p>
              Choose the time you have and the skill you want to sharpen.
              Every workout builds from control into game-speed decisions.
            </p>
          </div>

          <aside>
            <FiZap />
            <div>
              <strong>Purpose over random reps.</strong>
              <span>Progressive sequences designed to flow.</span>
            </div>
          </aside>
        </header>

        {savedWorkoutDraft && savedDraftProgram ? (
          <section className="cs-workout-resume-card">
            <div className="cs-workout-resume-progress">
              <span>
                {savedWorkoutDraft.completedDrills?.length ?? 0}
                <small> / {savedDraftProgram.drills.length}</small>
              </span>
            </div>
            <div>
              <small>AUTO-SAVED TODAY</small>
              <h2>Resume {savedDraftProgram.name}</h2>
              <p>
                Continue at round {(savedWorkoutDraft.completedDrills?.length ?? 0) + 1}.
                Completed work and recorded results are still saved.
              </p>
            </div>
            <div className="cs-workout-resume-actions">
              <button type="button" onClick={resumeWorkoutDraft}>
                Resume workout <FiChevronRight />
              </button>
              <button type="button" className="secondary" onClick={clearWorkoutDraft}>
                Discard draft
              </button>
            </div>
          </section>
        ) : null}

        <div className="cs-workout-duration-row">
          <div>
            <span>PREMADE COURTSTREAK PLANS</span>
            <h2>Choose your session.</h2>
            <p>Select your time, then find the skill focus you need today.</p>
          </div>

          <div className="cs-workout-session-actions">
            <div className="cs-workout-duration-tabs" role="tablist" aria-label="Workout duration">
              {[10, 20].map((duration) => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedDuration === duration}
                  className={selectedDuration === duration ? 'active' : ''}
                  key={duration}
                  onClick={() => setSelectedDuration(duration)}
                >
                  <strong>{duration}</strong>
                  <span>minutes</span>
                </button>
              ))}
            </div>

            <button type="button" className="cs-custom-compact-action" onClick={() => openCustomBuilder()}>
              <span className="cs-custom-compact-icon"><FiPlus /></span>
              <span>
                <small>WANT SOMETHING DIFFERENT?</small>
                <strong>Build your own workout</strong>
              </span>
              <FiChevronRight />
            </button>
          </div>
        </div>

        {retiredCustomCount > 0 && <p className="cs-comparison-note">{retiredCustomCount} saved plan(s) use retired drills and need rebuilding from the updated core library. Saved training history is unchanged.</p>}
        {currentCustomWorkouts.length ? (
          <section className="cs-my-workouts-section">
            <header>
              <div><span>MY WORKOUTS</span><h2>Your saved plans.</h2></div>
              <strong>{currentCustomWorkouts.length} saved</strong>
            </header>
            <div className="cs-custom-workout-grid">
              {currentCustomWorkouts.map((workout) => (
                <article className="cs-custom-workout-card" key={workout.key}>
                  <div className="cs-custom-workout-mark"><FiLayers /></div>
                  <div>
                    <small>CUSTOM WORKOUT</small>
                    <h3>{workout.name}</h3>
                    <p>{workout.drills.length} drills · {workout.durationMinutes} minutes</p>
                  </div>
                  <div className="cs-custom-workout-actions">
                    <button type="button" onClick={() => openWorkoutPreview(workout.key)}>View <FiChevronRight /></button>
                    <button type="button" className="icon" onClick={() => openCustomBuilder(workout)} aria-label={`Edit ${workout.name}`}><FiEdit3 /></button>
                    <button type="button" className="icon delete" onClick={() => void deleteCustomWorkout(workout)} aria-label={`Delete ${workout.name}`}><FiTrash2 /></button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <nav className="cs-workout-goal-filters" aria-label="Filter workouts by training goal">
          {WORKOUT_GOALS.map((goal) => (
            <button
              type="button"
              key={goal.key}
              className={selectedGoal === goal.key ? 'active' : ''}
              onClick={() => setSelectedGoal(goal.key)}
            >
              {goal.label}
            </button>
          ))}
        </nav>

        {recommendedProgram ? (
          <section className="cs-workout-recommendation">
            <div className="cs-workout-recommendation-copy">
              <span>COURTSTREAK PICK</span>
              <h2>{recommendedProgram.name}</h2>
              <p>{recommendedProgram.outcome}</p>
              <div>
                <small><FiClock /> {recommendedProgram.durationMinutes} min</small>
                <small><FiActivity /> {recommendedProgram.drills.length} rounds</small>
                <small><FiTarget /> {recommendedProgram.focus}</small>
              </div>
            </div>

            <aside>
              <span>WHY IT MATTERS</span>
              <strong>{recommendedProgram.whyItMatters}</strong>
              <button
                type="button"
                onClick={() => openWorkoutPreview(recommendedProgram.key)}
              >
                View today&apos;s plan <FiChevronRight />
              </button>
            </aside>
          </section>
        ) : null}

        <div className="cs-workout-browse-heading">
          <div>
            <span>MORE TRAINING PLANS</span>
            <h2>Choose what you need today.</h2>
          </div>
          <strong>{goalPrograms.length} {goalPrograms.length === 1 ? 'workout' : 'workouts'}</strong>
        </div>

        <section className="cs-program-card-grid">
          {browsePrograms.map((program, index) => {

            return (
              <article className={`cs-program-card accent-${program.accent}`} key={program.key}>
                <header>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <small>{program.level} · {program.intensity}</small>
                    <strong>{program.durationMinutes}:00</strong>
                  </div>
                </header>

                <div className="cs-program-card-copy">
                  <p>{program.focus}</p>
                  <h2>{program.name}</h2>
                  <span>{program.summary}</span>
                </div>

                <footer>
                  <span><FiActivity /> {program.drills.length} rounds</span>
                  <button
                    type="button"
                    onClick={() => openWorkoutPreview(program.key)}
                  >
                    View workout <FiChevronRight />
                  </button>
                </footer>
              </article>
            );
          })}
        </section>

        <footer className="cs-workout-library-note">
          <FiAward />
          <div>
            <strong>Full workouts build your training record.</strong>
            <span>Finish every round to add a workout, earn eligible XP, and advance your weekly goal.</span>
          </div>
        </footer>
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
          <div className="cs-results-check" aria-label="Workout completed"><FiCheck /><span className="cs-results-orbit" aria-hidden="true" /></div>
          <div>
            <span>WORKOUT COMPLETE</span>
            <h1>{activeWorkout?.name ?? 'Workout'} complete.</h1>
            <p>{activeWorkout?.outcome ?? 'Your results are saved and ready to review.'}</p>
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
              <div><span>WORKOUT SEQUENCE</span><h2>Work completed.</h2></div>

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
                    <span>
                      <strong>{resultDrill.name}</strong>
                      <small>
                        {resultDrill.phase} · {result?.validationMode === 'ai' ? 'Experimental camera count' : 'Timed · self-reported'}
                      </small>
                    </span>
                    <span className="cs-results-score">
                      {result ? (
                        <strong>{result.reps}<small> reps</small></strong>
                      ) : (
                        <strong className="cs-results-completed-label"><FiCheck /> Completed</strong>
                      )}
                      {result && <small className="cs-results-comparison">{resultDrill.durationSeconds}s · Self-reported result</small>}
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
          <ShareTraining text={`I completed ${activeWorkout?.name || 'a workout'} on CourtStreak: ${workoutDrills.length} drills · ${workoutDurationMinutes} minutes of guided intervals. Results self-reported.`} />
          <button type="button" className="secondary" onClick={() => navigate('/progress')}>Review Progress <FiTrendingUp /></button>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              const finalScore = sessionResults.reduce(
                (total, result) => total + (Number(result.reps) || 0),
                0
              );
              navigate('/training-circles', {
                state: {
                  challengeDraft: {
                    sourceType: activeWorkout?.isCustom ? 'custom_workout' : 'workout',
                    sourceKey: activeWorkout?.key,
                    sourceName: activeWorkout?.name,
                    sourcePayload: activeWorkout?.isCustom
                      ? { program: activeWorkout, durationMinutes: workoutDurationMinutes, runId }
                      : { durationMinutes: workoutDurationMinutes, runId },
                    challengeType: 'score',
                    baselineScore: finalScore || workoutDrills.length,
                    verificationMode: 'manual',
                  },
                },
              });
            }}
          >
            <FiUsers /> Challenge My Circle
          </button>
          {circleChallenge ? <button type="button" className="secondary" onClick={() => navigate(`/training-circles/${circleChallenge.circleId}`)}><FiUsers /> Return to {circleChallenge.circleName}</button> : null}
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
          onClick={leaveActiveWorkout}
        >
          <FiArrowLeft />
          {completedDrills.length > 0 ? 'Save & exit' : 'All workouts'}
        </button>

        <div>
          <span>{activeWorkout?.name}</span>
          <strong>
            Drill {currentDrill + 1} of {workoutDrills.length}
          </strong>
        </div>
      </header>

      <section className="cs-workout-container">
        <div className="cs-workout-progress-heading">
          <div>
            <p className="cs-card-label">TODAY&apos;S WORKOUT</p>
            <h1>{activeWorkout?.name}</h1>
            <p className="cs-workout-program-focus">{activeWorkout?.focus}</p>
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
            <span className="cs-card-label">{drill.phase} PHASE</span>
            <h2>{drill.name}</h2>

            <div className="cs-drill-meta">
              <span>
                <FiClock />
                {drill.duration}
              </span>

              <span>
                <FiTarget />
                {drill.difficulty}
              </span>
            </div>

            <div className={`cs-workout-run-stage mode-${trainingMode}`}>
              {trainingMode === 'ai' ? (
                <video ref={videoRef} autoPlay muted playsInline />
              ) : (
                <div className="cs-workout-manual-stage">
                  <FiActivity />
                  <strong>Guided Manual</strong>
                  <span>The full interval must finish before a result can be saved.</span>
                </div>
              )}

              {roundPhase === 'countdown' ? (
                <div className="cs-workout-round-overlay countdown">
                  <span>GET READY</span>
                  <strong>{roundCountdown}</strong>
                </div>
              ) : null}

              {roundPhase === 'active' ? (
                <div className="cs-workout-round-overlay active">
                  <span>{roundPaused ? 'ROUND PAUSED' : 'WORK INTERVAL'}</span>
                  <strong>
                    {Math.floor(roundSecondsLeft / 60)}:
                    {String(roundSecondsLeft % 60).padStart(2, '0')}
                  </strong>
                  <button
                    type="button"
                    onClick={() => {
                      setRoundPaused((value) => !value);
                      setRoundMessage('');
                    }}
                  >
                    {roundPaused ? <FiPlay /> : <FiPause />}
                    {roundPaused ? 'Resume round' : 'Pause'}
                  </button>
                </div>
              ) : null}

              {roundPhase === 'processing' ? (
                <div className="cs-workout-round-overlay processing">
                  <FiRefreshCw />
                  <strong>Validating round…</strong>
                </div>
              ) : null}

              {roundPhase === 'complete' ? (
                <div className="cs-workout-round-overlay complete">
                  <FiCheck />
                  <strong>{resetSecondsLeft > 0 ? `Reset · ${resetSecondsLeft}s` : 'Round complete'}</strong>
                </div>
              ) : null}
            </div>

            <DrillGuide drill={drill} />

            <div className="cs-drill-coaching-cue">
              <FiZap />
              <div>
                <span>COACHING CUE</span>
                <strong>{drill.cue}</strong>
              </div>
            </div>

            {roundMessage ? (
              <p className="cs-workout-round-message">{roundMessage}</p>
            ) : null}

            {roundPhase === 'preview' ? (
              <button
                type="button"
                className="cs-complete-drill"
                onClick={startDrillRound}
              >
                {trainingMode === 'ai' ? <FiCamera /> : <FiPlay />}
                Start required {drill.durationSeconds}-second round
              </button>
            ) : null}
{showRepEntry && pendingDrillIndex === currentDrill && (
  <div className="cs-rep-entry-card">
    <div className="cs-rep-entry-copy">
      <span>LOG YOUR RESULT</span>

      <h3>{drill.name} complete</h3>

      <p>
        {trainingMode === 'ai'
          ? 'Review the experimental camera count before saving this round.'
          : 'Enter only clean reps or full sequences completed during the required interval.'}
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
        readOnly={trainingMode === 'ai'}
        placeholder="0"
        autoFocus
      />

      <button
        type="button"
        disabled={savingRound}
        onClick={() => {
          const parsedReps = Number(pendingRepTotal);

          if (
            !Number.isFinite(parsedReps) ||
            parsedReps < 0 ||
            pendingRepTotal === ''
          ) {
            return;
          }

          if (!Number.isSafeInteger(parsedReps) || parsedReps > 10000) { setRoundMessage('Enter a whole number between 0 and 10,000.'); return; }

          void handleCompleteDrill();
        }}
      >
        {savingRound ? 'Saving…' : 'Save Result'}
      </button>
    </div>

    <small>
      {trainingMode === 'ai'
        ? 'Experimental camera count · not server-verified'
        : 'Timer verified · Result self-reported'}
    </small>

    {trainingMode === 'ai' && pendingRepTotal === '' ? (
      <button
        type="button"
        className="cs-workout-restart-round"
        onClick={() => {
          setRoundPhase('preview');
          setShowRepEntry(false);
          setRoundMessage('Reposition the camera, then restart the full interval.');
        }}
      >
        <FiRefreshCw /> Restart round
      </button>
    ) : null}
  </div>
)}

            {roundPhase === 'complete' ? (
              <div className="cs-workout-complete-status">
                <FiCheck />
                <span>
                  <strong>Round saved</strong>
                  <small>The next drill is now unlocked.</small>
                </span>
              </div>
            ) : null}
          </div>
        </section>

        <div className="cs-workout-navigation cs-workout-gated-navigation">
          <div className="cs-workout-sequence-lock">
            <FiLock />
            <span>
              <strong>Sequential workout</strong>
              <small>Rounds cannot be skipped or completed out of order.</small>
            </span>
          </div>
          {completedDrills.length === workoutDrills.length ? (
            <button
              type="button"
              className="cs-finish-workout"
              onClick={handleFinishWorkout} disabled={savingWorkout || resetSecondsLeft > 0}
            >
              Finish Workout
              <FiCheck />
            </button>
          ) : (
            <button
              type="button"
              className="cs-next-required-drill"
              onClick={handleNextDrill}
              disabled={
                currentDrill === workoutDrills.length - 1
                || resetSecondsLeft > 0
                || !completedDrills.includes(currentDrill)
              }
            >
              {completedDrills.includes(currentDrill)
                ? `Begin drill ${currentDrill + 2}`
                : 'Complete this round to continue'}
              <FiChevronRight />
            </button>
          )}
        </div>

        <section className="cs-workout-drill-list">
          <p className="cs-card-label">WORKOUT DRILLS</p>

          <div className="cs-workout-locked-sequence">
            {workoutDrills.map((workoutDrill, index) => (
              <article
                key={workoutDrill.name}
                className={[
                  index === currentDrill ? 'active' : '',
                  completedDrills.includes(index) ? 'completed' : '',
                  index > nextRequiredIndex ? 'locked' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span>
                  {index > nextRequiredIndex ? (
                    <FiLock />
                  ) : completedDrills.includes(index) ? (
                    <FiCheck />
                  ) : (
                    index + 1
                  )}
                </span>

                <div>
                  <strong>{workoutDrill.name}</strong>
                  <small>
                    {workoutDrill.phase} · {workoutDrill.durationSeconds}s ·{' '}
                    {completedDrills.includes(index)
                      ? 'Completed'
                      : index === nextRequiredIndex
                        ? 'Current round'
                        : 'Locked'}
                  </small>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
