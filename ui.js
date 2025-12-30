import { createPlayer } from "./player.js";

export function renderHome({ app, plan, progress, onReset }) {
  const days = plan.days || [];
  app.innerHTML = `
    <div class="header">
      <div>
        <h1 class="title">${plan.name}</h1>
        <p class="subtitle">${plan.meta?.intensity || ""}</p>
      </div>
      <a class="button ghost link" href="#/history">History</a>
    </div>
    <div class="stack">
      ${days
        .map((day) => {
          const completed = progress.completedDays[day.id];
          return `
            <a class="card link" href="#/training/${day.id}">
              <div class="list-item">
                <div>
                  <h3>${day.name}</h3>
                  <p>${day.items.length} exercises</p>
                </div>
                <span class="badge ${completed ? "complete" : "pending"}">
                  ${completed ? "Completed" : "Pending"}
                </span>
              </div>
            </a>
          `;
        })
        .join("")}
      <button class="button ghost" data-action="reset">Reset progress</button>
    </div>
  `;
  app.querySelector("[data-action='reset']").addEventListener("click", () => {
    onReset();
  });
}

export function renderTrainingDetail({ app, day, progress }) {
  const completed = progress.completedDays[day.id];
  app.innerHTML = `
    <div class="header">
      <a class="button ghost link" href="#/">Back</a>
      <div></div>
    </div>
    <div class="card">
      <h2>${day.name}</h2>
      <p class="small">${day.items.length} exercises</p>
      <div class="inline-list">
        <span class="badge ${completed ? "complete" : "pending"}">
          ${completed ? "Completed" : "Not completed"}
        </span>
      </div>
    </div>
    <h3 class="section-title">Exercises</h3>
    <div class="stack">
      ${day.items
        .map((item) => {
          const detail = item.type === "hold"
            ? `${item.sets} sets • ${item.durationSec}s hold`
            : item.type === "routine"
              ? `${item.sets} set routine`
              : `${item.sets} sets • ${formatReps(item.reps)}`;
          return `
            <div class="card">
              <h3>${formatExercise(item.exerciseId)}</h3>
              <p>${detail}</p>
            </div>
          `;
        })
        .join("")}
    </div>
    <div class="nav-row" style="margin-top: 20px;">
      <a class="button primary link" href="#/run/${day.id}">Start training</a>
    </div>
  `;
}

export function renderHistory({ app, progress }) {
  const sessions = Object.entries(progress.sessions || {}).sort((a, b) => {
    return new Date(b[1].startedAt) - new Date(a[1].startedAt);
  });

  app.innerHTML = `
    <div class="header">
      <a class="button ghost link" href="#/">Back</a>
      <h1 class="title">History</h1>
    </div>
    <div class="stack">
      ${sessions.length === 0 ? "<p class='small'>No sessions yet.</p>" : ""}
      ${sessions
        .map(([id, session]) => {
          return `
            <div class="card">
              <h3>${session.dayId}</h3>
              <p>Started: ${formatDate(session.startedAt)}</p>
              <p>Completed: ${session.completedAt ? formatDate(session.completedAt) : "In progress"}</p>
              <p class="small">Logs: ${session.log.length}</p>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

export function renderRunner({
  app,
  day,
  engine,
  onComplete,
  onExit,
  onTick,
}) {
  app.innerHTML = `
    <div class="header">
      <button class="button ghost" data-action="exit">Back</button>
      <div></div>
    </div>
    <div class="runner">
      <div class="card">
        <h2 class="runner-title"></h2>
        <p class="runner-meta"></p>
      </div>
      <div class="player" id="player"></div>
      <div class="card">
        <div class="timer" id="timer">00:00</div>
        <p class="small" id="timer-label">ACTIVE</p>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" id="progress-fill"></div>
      </div>
      <button class="button success" data-action="complete">Complete</button>
      <p class="small" id="instruction"></p>
    </div>
  `;

  const playerEl = app.querySelector("#player");
  let player = null;
  let currentExercise = null;
  const titleEl = app.querySelector(".runner-title");
  const metaEl = app.querySelector(".runner-meta");
  const timerEl = app.querySelector("#timer");
  const timerLabelEl = app.querySelector("#timer-label");
  const progressFillEl = app.querySelector("#progress-fill");
  const instructionEl = app.querySelector("#instruction");
  const completeButton = app.querySelector("[data-action='complete']");

  function update() {
    const snapshot = engine.getSnapshot();
    if (snapshot.state === "DONE_DAY") {
      titleEl.textContent = "Training completed";
      metaEl.textContent = "Great work!";
      timerEl.textContent = "00:00";
      timerLabelEl.textContent = "DONE";
      progressFillEl.style.width = "100%";
      instructionEl.textContent = "";
      if (onComplete) onComplete();
      return;
    }

    const step = snapshot.step;
    const exerciseName = formatExercise(step.exerciseId);
    if (exerciseName !== currentExercise) {
      currentExercise = exerciseName;
      if (!player) {
        player = createPlayer(playerEl, step.exerciseId);
      } else {
        player.setExercise(step.exerciseId);
      }
    }

    titleEl.textContent = exerciseName;
    metaEl.textContent = buildMeta(step, day);

    if (snapshot.state === "REST") {
      timerLabelEl.textContent = "REST";
      timerEl.classList.remove("overtime");
      timerEl.textContent = formatTimer(snapshot.remainingSec || 0);
      completeButton.disabled = true;
      completeButton.classList.add("ghost");
    } else if (step.type === "routine") {
      timerLabelEl.textContent = "ACTIVE";
      timerEl.textContent = "--:--";
      timerEl.classList.remove("overtime");
      completeButton.disabled = false;
      completeButton.classList.remove("ghost");
    } else {
      timerLabelEl.textContent = "ACTIVE";
      const remaining = snapshot.remainingSec ?? 0;
      if (remaining < 0) {
        timerEl.textContent = `+${formatTimer(Math.abs(remaining))}`;
        timerEl.classList.add("overtime");
      } else {
        timerEl.textContent = formatTimer(remaining);
        timerEl.classList.remove("overtime");
      }
      completeButton.disabled = false;
      completeButton.classList.remove("ghost");
    }

    progressFillEl.style.width = `${Math.min(snapshot.progress + (100 / snapshot.totalSteps), 100)}%`;
    instructionEl.textContent = step.type === "routine" ? "Complete routine, then tap Complete." : "";
    if (onTick) onTick(snapshot);
  }

  update();
  const intervalId = setInterval(() => {
    engine.tick();
    update();
  }, 500);

  completeButton.addEventListener("click", () => {
    engine.completeCurrent();
    update();
  });

  app.querySelector("[data-action='exit']").addEventListener("click", () => {
    clearInterval(intervalId);
    onExit();
  });

  return () => clearInterval(intervalId);
}

function formatExercise(id) {
  return id
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatReps(reps) {
  if (!Array.isArray(reps)) return reps || "";
  return reps
    .map((rep) => (rep === "max" ? "max" : `${rep} reps`))
    .join(" • ");
}

function buildMeta(step, day) {
  const item = day.items[step.itemIndex];
  const setTotal = item.sets || 1;
  if (step.type === "reps") {
    const repsValue = Array.isArray(item.reps) ? item.reps[step.setIndex] : item.reps;
    const repTotal = typeof repsValue === "number" ? repsValue : 1;
    return `Set ${step.setIndex + 1} / ${setTotal} • Rep ${step.repIndex + 1} / ${repTotal}`;
  }
  if (step.type === "hold") {
    return `Set ${step.setIndex + 1} / ${setTotal} • Hold`;
  }
  return `Set ${step.setIndex + 1} / ${setTotal} • Routine`;
}

function formatTimer(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.max(seconds % 60, 0);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString();
}
