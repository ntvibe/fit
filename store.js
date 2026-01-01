const STORAGE_KEY = "fitness_mvp_progress_v1";
const PLAN_ORDER_KEY = "fitness_mvp_plan_order_v1";

export function loadProgress() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { completedDays: {}, sessions: {} };
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      completedDays: parsed.completedDays || {},
      sessions: parsed.sessions || {},
    };
  } catch (error) {
    console.warn("Failed to parse progress; resetting.");
    return { completedDays: {}, sessions: {} };
  }
}

export function saveProgress(progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function resetProgress() {
  const empty = { completedDays: {}, sessions: {} };
  saveProgress(empty);
  return empty;
}

export function createSession(progress, { planId, dayId }) {
  const sessionId = `session_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  progress.sessions[sessionId] = {
    planId,
    dayId,
    startedAt: new Date().toISOString(),
    completedAt: null,
    status: "in_progress",
    pausedAt: null,
    resumedAt: null,
    log: [],
  };
  saveProgress(progress);
  return sessionId;
}

export function addLogEntry(progress, sessionId, entry) {
  const session = progress.sessions[sessionId];
  if (!session) return;
  session.log.push(entry);
  saveProgress(progress);
}

export function removeLogEntries(progress, sessionId, stepIndexes) {
  const session = progress.sessions[sessionId];
  if (!session || !Array.isArray(session.log)) return;
  const removeSet = new Set(stepIndexes.filter((value) => typeof value === "number"));
  if (removeSet.size === 0) return;
  session.log = session.log.filter((entry) => !removeSet.has(entry.stepIndex));
  saveProgress(progress);
}

export function updateSession(progress, sessionId, updates) {
  const session = progress.sessions[sessionId];
  if (!session) return;
  Object.assign(session, updates);
  saveProgress(progress);
}

export function completeSession(progress, sessionId) {
  const session = progress.sessions[sessionId];
  if (!session) return;
  session.completedAt = new Date().toISOString();
  session.status = "completed";
  progress.completedDays[session.dayId] = {
    completedAt: session.completedAt,
    sessionId,
  };
  saveProgress(progress);
}

export function reopenSession(progress, sessionId) {
  const session = progress.sessions[sessionId];
  if (!session) return;
  session.completedAt = null;
  session.status = "in_progress";
  delete progress.completedDays[session.dayId];
  saveProgress(progress);
}

export function loadPlanOrder(planId) {
  const raw = localStorage.getItem(PLAN_ORDER_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed[planId] || {};
  } catch (error) {
    console.warn("Failed to parse plan order; ignoring.");
    return {};
  }
}

export function savePlanOrder(planId, dayId, order) {
  const raw = localStorage.getItem(PLAN_ORDER_KEY);
  let parsed = {};
  if (raw) {
    try {
      parsed = JSON.parse(raw) || {};
    } catch (error) {
      parsed = {};
    }
  }
  if (!parsed[planId]) {
    parsed[planId] = {};
  }
  parsed[planId][dayId] = order;
  localStorage.setItem(PLAN_ORDER_KEY, JSON.stringify(parsed));
}
