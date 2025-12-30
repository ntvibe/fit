import { loadPlan } from "./planLoader.js";
import { getRoute, onRouteChange } from "./router.js";
import {
  loadProgress,
  resetProgress,
  createSession,
  addLogEntry,
  completeSession,
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

async function init() {
  try {
    state.plan = await loadPlan();
  } catch (error) {
    state.error = "Unable to load workout plan. Please verify /data/week1.json.";
  }
  render();
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
    renderTrainingDetail({ app, day, progress: state.progress });
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

    state.cleanup = renderRunner({
      app,
      day,
      engine: state.runnerSession.engine,
      onComplete: () => {},
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
