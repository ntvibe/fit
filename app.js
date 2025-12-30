import { loadPlan } from "./planLoader.js";
import { getRoute, onRouteChange } from "./router.js";
import {
  loadProgress,
  resetProgress,
  createSession,
  addLogEntry,
  completeSession,
  updateSession,
  loadPlanOrder,
  savePlanOrder,
} from "./store.js";
import { createRunnerEngine } from "./runnerEngine.js";
import {
  renderHome,
  renderTrainingDetail,
  renderRunner,
  renderHistory,
} from "./ui.js";

const app = document.getElementById("app");
const state = {
  plan: null,
  progress: loadProgress(),
  error: null,
  runnerSession: null,
  cleanup: null,
};

function getLatestSessionForDay(progress, dayId) {
  const sessions = Object.entries(progress.sessions || {})
    .filter(([, session]) => session.dayId === dayId)
    .sort((a, b) => new Date(b[1].startedAt) - new Date(a[1].startedAt));
  if (sessions.length === 0) return null;
  const [sessionId, session] = sessions[0];
  return { sessionId, session };
}

function startRunnerSession(day) {
  const sessionId = createSession(state.progress, {
    planId: state.plan.id,
    dayId: day.id,
  });
  const engine = createRunnerEngine(day, {
    onLog: (entry) => addLogEntry(state.progress, sessionId, entry),
    onDone: () => completeSession(state.progress, sessionId),
  });
  state.runnerSession = { dayId: day.id, sessionId, engine };
}

async function init() {
  try {
    state.plan = await loadPlan();
    applyPlanOrder(state.plan);
  } catch (error) {
    state.error = "Unable to load workout plan. Please verify /data/week1.json.";
  }
  render();
}

function applyPlanOrder(plan) {
  const orderData = loadPlanOrder(plan.id);
  plan.days.forEach((day) => {
    const order = orderData[day.id];
    if (!Array.isArray(order) || order.length === 0) return;
    day.items = reorderItems(day.items, order);
  });
}

function reorderItems(items, order) {
  const buckets = new Map();
  items.forEach((item) => {
    const key = item.exerciseId;
    if (!buckets.has(key)) {
      buckets.set(key, []);
    }
    buckets.get(key).push(item);
  });
  const ordered = [];
  order.forEach((exerciseId) => {
    const bucket = buckets.get(exerciseId);
    if (bucket && bucket.length) {
      ordered.push(bucket.shift());
    }
  });
  items.forEach((item) => {
    const bucket = buckets.get(item.exerciseId);
    if (bucket && bucket.length && bucket[0] === item) {
      ordered.push(bucket.shift());
    }
  });
  return ordered;
}

function render() {
  if (state.cleanup) {
    state.cleanup();
    state.cleanup = null;
  }
  if (state.error) {
    app.innerHTML = `
      <div class="card">
        <h2>Plan load error</h2>
        <p class="error">${state.error}</p>
      </div>
    `;
    return;
  }
  const route = getRoute();
  if (!state.plan) return;

  if (route.name === "home") {
    renderHome({
      app,
      plan: state.plan,
      progress: state.progress,
      onReset: () => {
        state.progress = resetProgress();
        render();
      },
    });
    return;
  }

  if (route.name === "training") {
    const day = state.plan.days.find((item) => item.id === route.id);
    if (!day) {
      window.location.hash = "#/";
      return;
    }
    const latestSession = getLatestSessionForDay(state.progress, day.id);
    renderTrainingDetail({
      app,
      day,
      progress: state.progress,
      latestSession,
      onRestart: () => {
        if (latestSession?.sessionId) {
          updateSession(state.progress, latestSession.sessionId, {
            status: "abandoned",
            abandonedAt: new Date().toISOString(),
          });
        }
        startRunnerSession(day);
        window.location.hash = `#/run/${day.id}`;
      },
      onReorder: (fromIndex, direction) => {
        const toIndex = fromIndex + direction;
        if (toIndex < 0 || toIndex >= day.items.length) return;
        const updated = [...day.items];
        [updated[fromIndex], updated[toIndex]] = [updated[toIndex], updated[fromIndex]];
        day.items = updated;
        savePlanOrder(
          state.plan.id,
          day.id,
          day.items.map((item) => item.exerciseId),
        );
        render();
      },
    });
    return;
  }

  if (route.name === "history") {
    renderHistory({ app, progress: state.progress });
    return;
  }

  if (route.name === "run") {
    const day = state.plan.days.find((item) => item.id === route.id);
    if (!day) {
      window.location.hash = "#/";
      return;
    }

    if (!state.runnerSession || state.runnerSession.dayId !== day.id) {
      startRunnerSession(day);
    }

    state.cleanup = renderRunner({
      app,
      day,
      engine: state.runnerSession.engine,
      onComplete: () => {},
      onPause: () => {
        updateSession(state.progress, state.runnerSession.sessionId, {
          status: "paused",
          pausedAt: new Date().toISOString(),
        });
      },
      onResume: () => {
        updateSession(state.progress, state.runnerSession.sessionId, {
          status: "in_progress",
          resumedAt: new Date().toISOString(),
          pausedAt: null,
        });
      },
      onRestart: () => {
        updateSession(state.progress, state.runnerSession.sessionId, {
          status: "abandoned",
          abandonedAt: new Date().toISOString(),
        });
        startRunnerSession(day);
        render();
      },
      onExit: () => {
        window.location.hash = `#/training/${day.id}`;
      },
    });
    return;
  }

  window.location.hash = "#/";
}

onRouteChange(render);
init();
