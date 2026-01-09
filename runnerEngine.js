export function createRunnerEngine(
  day,
  { onLog, onDone, restBetweenRepsSec } = {},
) {
  const steps = buildSteps(day, restBetweenRepsSec);
  let currentIndex = 0;
  let state = steps.length ? "ACTIVE" : "DONE_DAY";
  let phaseStart = Date.now();
  let currentTargetSec = null;
  let lastRepActualSec = null;
  let paused = false;
  let pausedAt = null;
  let pausedDurationMs = 0;
  const completedStepIndexes = new Set();
  const undoStack = [];

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
    const previousState = {
      state,
      currentIndex,
      phaseStart,
      currentTargetSec,
      lastRepActualSec,
      paused,
      pausedAt,
      pausedDurationMs,
    };
    const elapsedSec = getElapsedSec();
    const actualSec = step.type === "routine" ? 0 : elapsedSec;
    if (step.type === "reps" || step.type === "hold") {
      lastRepActualSec = actualSec || step.targetSec || 0;
    }
    const lastIndex = step.type === "reps"
      ? findLastIndexInSet(step.itemIndex, step.setIndex, currentIndex)
      : currentIndex;
    const completedIndexes = [];
    for (let index = currentIndex; index <= lastIndex; index += 1) {
      const stepToLog = steps[index];
      if (!stepToLog) continue;
      completedStepIndexes.add(index);
      completedIndexes.push(index);
      if (onLog) {
        onLog({
          exerciseId: stepToLog.exerciseId,
          type: stepToLog.type,
          itemIndex: stepToLog.itemIndex,
          setIndex: stepToLog.setIndex,
          repIndex: stepToLog.repIndex,
          stepIndex: index,
          targetSec: stepToLog.type === "hold" ? stepToLog.durationSec : stepToLog.targetSec,
          actualSec,
          timestamp: new Date().toISOString(),
        });
      }
    }
    if (completedIndexes.length > 0) {
      undoStack.push({ previousState, completedIndexes });
    }
    currentIndex = lastIndex;
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
    undoStack.length = 0;
    currentTargetSec = steps.length ? getTargetSec(steps[currentIndex], lastRepActualSec) : null;
    startPhase();
  }

  function jumpToItem(itemIndex) {
    const targetIndex = steps.findIndex((step) => step.itemIndex === itemIndex);
    if (targetIndex === -1) return;
    currentIndex = targetIndex;
    lastRepActualSec = null;
    state = "ACTIVE";
    undoStack.length = 0;
    currentTargetSec = getTargetSec(steps[currentIndex], lastRepActualSec);
    startPhase();
  }

  function resetPhase() {
    startPhase();
  }

  function canUndo() {
    return undoStack.length > 0;
  }

  function undoLast() {
    const entry = undoStack.pop();
    if (!entry) return null;
    entry.completedIndexes.forEach((index) => {
      completedStepIndexes.delete(index);
    });
    state = entry.previousState.state;
    currentIndex = entry.previousState.currentIndex;
    phaseStart = entry.previousState.phaseStart;
    currentTargetSec = entry.previousState.currentTargetSec;
    lastRepActualSec = entry.previousState.lastRepActualSec;
    paused = entry.previousState.paused;
    pausedAt = entry.previousState.pausedAt;
    pausedDurationMs = entry.previousState.pausedDurationMs;
    return entry.completedIndexes;
  }

  return {
    getSnapshot,
    completeCurrent,
    skipRest,
    tick,
    resetPhase,
    pause,
    resume,
    restart,
    jumpToItem,
    undoLast,
    canUndo,
  };

  function skipRest() {
    if (state !== "REST" || paused) return;
    advance();
  }

  function findLastIndexInSet(itemIndex, setIndex, startIndex) {
    let index = startIndex;
    while (
      index + 1 < steps.length
      && steps[index + 1].itemIndex === itemIndex
      && steps[index + 1].setIndex === setIndex
    ) {
      index += 1;
    }
    return index;
  }
}

export function countSteps(day) {
  return buildSteps(day).length;
}

export function getStepCountsByItem(day) {
  const counts = Array.from({ length: day.items.length }, () => 0);
  buildSteps(day).forEach((step) => {
    counts[step.itemIndex] += 1;
  });
  return counts;
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

function buildSteps(day, restBetweenRepsSec) {
  const steps = [];
  day.items.forEach((item, itemIndex) => {
    const sets = item.sets || 1;
    for (let setIndex = 0; setIndex < sets; setIndex += 1) {
      const repsValue = Array.isArray(item.reps) ? item.reps[setIndex] : item.reps;
      const repCount = item.type === "reps"
        ? (typeof repsValue === "number" ? repsValue : 1)
        : 1;
      for (let repIndex = 0; repIndex < repCount; repIndex += 1) {
        const restOverride = item.type === "reps"
          && typeof restBetweenRepsSec === "number"
          ? restBetweenRepsSec
          : null;
        steps.push({
          exerciseId: item.exerciseId,
          type: item.type,
          itemIndex,
          setIndex,
          repIndex,
          restSec: restOverride != null ? restOverride : item.restSec || 0,
          targetSec: item.targetSec || 0,
          durationSec: item.durationSec || item.targetSec || 0,
        });
      }
    }
  });
  return steps;
}
