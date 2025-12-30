export function createRunnerEngine(day, { onLog, onDone } = {}) {
  const steps = buildSteps(day);
  let currentIndex = 0;
  let state = steps.length ? "ACTIVE" : "DONE_DAY";
  let phaseStart = Date.now();
  let currentTargetSec = null;
  let lastRepActualSec = null;
  let paused = false;
  let pausedAt = null;
  let pausedDurationMs = 0;
  const completedStepIndexes = new Set();

  if (state === "ACTIVE") {
    currentTargetSec = getTargetSec(steps[currentIndex], lastRepActualSec);
  }

  function startPhase() {
    phaseStart = Date.now();
    paused = false;
    pausedAt = null;
    pausedDurationMs = 0;
  }

  function getElapsedSec() {
    const now = paused && pausedAt ? pausedAt : Date.now();
    return Math.floor((now - phaseStart - pausedDurationMs) / 1000);
  }

  function getCompletedSteps() {
    return completedStepIndexes.size;
  }

  function getSnapshot() {
    const step = steps[currentIndex];
    const elapsedSec = getElapsedSec();
    const targetSec = state === "ACTIVE" ? currentTargetSec : step?.restSec || 0;
    const remaining = targetSec != null ? targetSec - elapsedSec : null;
    const completedSteps = getCompletedSteps();
    const progress = steps.length ? (completedSteps / steps.length) * 100 : 100;
    return {
      state,
      step,
      targetSec,
      elapsedSec,
      remainingSec: remaining,
      isOvertime: remaining != null && remaining < 0,
      progress,
      totalSteps: steps.length,
      currentIndex,
      completedSteps,
      paused,
    };
  }

  function tick() {
    if (state !== "REST" || paused) return;
    const elapsedSec = getElapsedSec();
    const step = steps[currentIndex];
    if (!step) return;
    if (elapsedSec >= (step.restSec || 0)) {
      advance();
    }
  }

  function completeCurrent() {
    if (state !== "ACTIVE" || paused) return;
    const step = steps[currentIndex];
    if (!step) return;
    const elapsedSec = getElapsedSec();
    const actualSec = step.type === "routine" ? 0 : elapsedSec;
    if (step.type === "reps" || step.type === "hold") {
      lastRepActualSec = actualSec || step.targetSec || 0;
    }
    completedStepIndexes.add(currentIndex);
    if (onLog) {
      onLog({
        exerciseId: step.exerciseId,
        type: step.type,
        itemIndex: step.itemIndex,
        setIndex: step.setIndex,
        repIndex: step.repIndex,
        stepIndex: currentIndex,
        targetSec: step.type === "hold" ? step.durationSec : currentTargetSec,
        actualSec,
        timestamp: new Date().toISOString(),
      });
    }
    if ((step.restSec || 0) > 0) {
      state = "REST";
      startPhase();
    } else {
      advance();
    }
  }

  function advance() {
    currentIndex += 1;
    if (currentIndex >= steps.length) {
      state = "DONE_DAY";
      if (onDone) onDone();
      return;
    }
    const step = steps[currentIndex];
    if (step.repIndex === 0) {
      lastRepActualSec = null;
    }
    state = "ACTIVE";
    currentTargetSec = getTargetSec(step, lastRepActualSec);
    startPhase();
  }

  function pause() {
    if (paused) return;
    paused = true;
    pausedAt = Date.now();
  }

  function resume() {
    if (!paused) return;
    paused = false;
    if (pausedAt) {
      pausedDurationMs += Date.now() - pausedAt;
    }
    pausedAt = null;
  }

  function restart() {
    currentIndex = 0;
    state = steps.length ? "ACTIVE" : "DONE_DAY";
    lastRepActualSec = null;
    completedStepIndexes.clear();
    currentTargetSec = steps.length ? getTargetSec(steps[currentIndex], lastRepActualSec) : null;
    startPhase();
  }

  function jumpToItem(itemIndex) {
    const targetIndex = steps.findIndex((step) => step.itemIndex === itemIndex);
    if (targetIndex === -1) return;
    currentIndex = targetIndex;
    lastRepActualSec = null;
    state = "ACTIVE";
    currentTargetSec = getTargetSec(steps[currentIndex], lastRepActualSec);
    startPhase();
  }

  function resetPhase() {
    startPhase();
  }

  return {
    getSnapshot,
    completeCurrent,
    tick,
    resetPhase,
    pause,
    resume,
    restart,
    jumpToItem,
  };
}

export function countSteps(day) {
  return buildSteps(day).length;
}

function getTargetSec(step, lastRepActualSec) {
  if (!step) return null;
  if (step.type === "routine") return null;
  if (step.type === "hold") return step.durationSec;
  if (step.type === "reps") {
    if (step.repIndex > 0 && lastRepActualSec != null) {
      return lastRepActualSec;
    }
    return step.targetSec;
  }
  return null;
}

function buildSteps(day) {
  const steps = [];
  day.items.forEach((item, itemIndex) => {
    const sets = item.sets || 1;
    for (let setIndex = 0; setIndex < sets; setIndex += 1) {
      const repsValue = Array.isArray(item.reps) ? item.reps[setIndex] : item.reps;
      const repCount = item.type === "reps"
        ? (typeof repsValue === "number" ? repsValue : 1)
        : 1;
      for (let repIndex = 0; repIndex < repCount; repIndex += 1) {
        steps.push({
          exerciseId: item.exerciseId,
          type: item.type,
          itemIndex,
          setIndex,
          repIndex,
          restSec: item.restSec || 0,
          targetSec: item.targetSec || 0,
          durationSec: item.durationSec || item.targetSec || 0,
        });
      }
    }
  });
  return steps;
}
