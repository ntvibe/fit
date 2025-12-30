export function createRunnerEngine(day, { onLog, onDone } = {}) {
  const steps = buildSteps(day);
  let currentIndex = 0;
  let state = steps.length ? "ACTIVE" : "DONE_DAY";
  let phaseStart = Date.now();
  let currentTargetSec = null;
  let lastRepActualSec = null;

  if (state === "ACTIVE") {
    currentTargetSec = getTargetSec(steps[currentIndex], lastRepActualSec);
  }

  function startPhase() {
    phaseStart = Date.now();
  }

  function getElapsedSec() {
    return Math.floor((Date.now() - phaseStart) / 1000);
  }

  function getSnapshot() {
    const step = steps[currentIndex];
    const elapsedSec = getElapsedSec();
    const targetSec = state === "ACTIVE" ? currentTargetSec : step?.restSec || 0;
    const remaining = targetSec != null ? targetSec - elapsedSec : null;
    const progress = steps.length ? (currentIndex / steps.length) * 100 : 100;
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
    };
  }

  function tick() {
    if (state !== "REST") return;
    const elapsedSec = getElapsedSec();
    const step = steps[currentIndex];
    if (!step) return;
    if (elapsedSec >= (step.restSec || 0)) {
      advance();
    }
  }

  function completeCurrent() {
    if (state !== "ACTIVE") return;
    const step = steps[currentIndex];
    if (!step) return;
    const elapsedSec = getElapsedSec();
    const actualSec = step.type === "routine" ? 0 : elapsedSec;
    if (step.type === "reps" || step.type === "hold") {
      lastRepActualSec = actualSec || step.targetSec || 0;
    }
    if (onLog) {
      onLog({
        exerciseId: step.exerciseId,
        type: step.type,
        itemIndex: step.itemIndex,
        setIndex: step.setIndex,
        repIndex: step.repIndex,
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

  function resetPhase() {
    startPhase();
  }

  return {
    getSnapshot,
    completeCurrent,
    tick,
    resetPhase,
  };
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
