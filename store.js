const STORAGE_KEY = "fitness_mvp_progress_v1";

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

export function completeSession(progress, sessionId) {
  const session = progress.sessions[sessionId];
  if (!session) return;
  session.completedAt = new Date().toISOString();
  progress.completedDays[session.dayId] = {
    completedAt: session.completedAt,
    sessionId,
  };
  saveProgress(progress);
}
