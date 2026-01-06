import { createPlayer } from "./player.js";
import { countSteps, getStepCountsByItem } from "./runnerEngine.js";

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

export function renderTrainingDetail({
  app,
  day,
  progress,
  latestSession,
  onRestart,
  onReorder,
  onSelectExercise,
}) {
  const totalSteps = countSteps(day);
  const stepsPerItem = getStepCountsByItem(day);
  const latestSessionData = latestSession?.session || null;
  const sessionStatus = getSessionStatus(latestSessionData);
  const completedSteps = latestSessionData
    ? getCompletedStepsFromLog(latestSessionData.log)
    : 0;
  const completedStepsByItem = latestSessionData
    ? getCompletedStepsByItem(latestSessionData.log, day.items)
    : Array.from({ length: day.items.length }, () => 0);
  const percent = totalSteps ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const startedAt = latestSessionData?.startedAt
    ? formatDate(latestSessionData.startedAt)
    : "Not started yet";
  const durationLabel = buildSessionDuration(latestSessionData);
  const completed = progress.completedDays[day.id];
  app.innerHTML = `
    <div class="training-detail">
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
          ${
            sessionStatus === "paused"
              ? `<span class="badge paused">Paused</span>`
              : sessionStatus === "in_progress"
                ? `<span class="badge pending">In progress</span>`
                : ""
          }
        </div>
      </div>
      <div class="nav-row training-actions">
        <a class="button primary link" href="#/run/${day.id}">
          ${sessionStatus === "paused" || sessionStatus === "in_progress" ? "Resume training" : "Start training"}
        </a>
        ${
          onRestart
            ? `<button class="button ghost" data-action="restart">Reset training</button>`
            : ""
        }
      </div>
      <div class="card">
        <div class="list-item">
          <div>
            <p class="small">Progress</p>
            <h3>${percent}%</h3>
          </div>
          <div class="align-right">
            <p class="small">Started</p>
            <p class="small">${startedAt}</p>
          </div>
        </div>
        <div class="list-item" style="margin-top: 12px;">
          <p class="small">Duration</p>
          <p class="small">${durationLabel}</p>
        </div>
        <div class="progress-bar" style="margin-top: 12px;">
          <div class="progress-fill" style="width: ${percent}%"></div>
        </div>
      </div>
      <h3 class="section-title">Exercises</h3>
      <p class="small" style="margin-bottom: 8px;">Tap an exercise to jump in. Press and hold to move it.</p>
      <div class="stack">
        ${day.items
          .map((item, itemIndex) => {
            const detail = item.type === "hold"
              ? `${item.sets} sets • ${item.durationSec}s hold`
              : item.type === "routine"
                ? `${item.sets} set routine`
                : `${item.sets} sets • ${formatReps(item.reps)}`;
            const totalForItem = stepsPerItem[itemIndex] || 0;
            const completedForItem = completedStepsByItem[itemIndex] || 0;
            const percentForItem = totalForItem
              ? Math.round((completedForItem / totalForItem) * 100)
              : 0;
            return `
              <div class="card exercise-card" data-action="exercise-row" data-index="${itemIndex}">
                <div class="list-item">
                  <div class="exercise-order">${itemIndex + 1}</div>
                  <div class="exercise-info">
                    <h3>${formatExercise(item.exerciseId)}</h3>
                    <p>${detail}</p>
                  </div>
                </div>
                <div class="list-item" style="margin-top: 12px;">
                  <p class="small">Progress</p>
                  <p class="small">${completedForItem} / ${totalForItem} steps</p>
                </div>
                <div class="progress-bar" style="margin-top: 8px;">
                  <div class="progress-fill" style="width: ${percentForItem}%"></div>
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    </div>
  `;

  const restartButton = app.querySelector("[data-action='restart']");
  if (restartButton) {
    restartButton.addEventListener("click", () => {
      onRestart();
    });
  }

  const rows = app.querySelectorAll("[data-action='exercise-row']");
  let suppressClick = false;
  if (onSelectExercise) {
    rows.forEach((row) => {
      row.addEventListener("click", () => {
        if (suppressClick) {
          suppressClick = false;
          return;
        }
        const index = Number(row.dataset.index);
        if (Number.isNaN(index)) return;
        onSelectExercise(index);
      });
    });
  }

  if (onReorder) {
    let dragIndex = null;
    let touchDragIndex = null;
    let touchTarget = null;
    let longPressTimer = null;
    const releaseSuppressClick = () => {
      window.setTimeout(() => {
        suppressClick = false;
      }, 0);
    };
    const clearTouchDragState = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      touchDragIndex = null;
      if (touchTarget) {
        touchTarget.classList.remove("drag-over");
        delete touchTarget.dataset.dropPosition;
        touchTarget = null;
      }
      rows.forEach((row) => {
        row.classList.remove("dragging");
      });
      releaseSuppressClick();
    };
    rows.forEach((row) => {
      row.setAttribute("draggable", "true");
      row.addEventListener("dragstart", (event) => {
        dragIndex = Number(row.dataset.index);
        row.classList.add("dragging");
        suppressClick = true;
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", String(dragIndex));
        }
      });
      row.addEventListener("dragend", () => {
        row.classList.remove("dragging");
        dragIndex = null;
        releaseSuppressClick();
      });
      row.addEventListener("dragover", (event) => {
        event.preventDefault();
        if (dragIndex == null) return;
        const bounds = row.getBoundingClientRect();
        const isAfter = event.clientY - bounds.top > bounds.height / 2;
        row.dataset.dropPosition = isAfter ? "after" : "before";
        row.classList.add("drag-over");
      });
      row.addEventListener("dragleave", () => {
        row.classList.remove("drag-over");
        delete row.dataset.dropPosition;
      });
      row.addEventListener("drop", (event) => {
        event.preventDefault();
        row.classList.remove("drag-over");
        const fromIndex = dragIndex ?? Number(event.dataTransfer?.getData("text/plain"));
        const toIndex = Number(row.dataset.index);
        const position = row.dataset.dropPosition || "before";
        delete row.dataset.dropPosition;
        if (Number.isNaN(fromIndex) || Number.isNaN(toIndex) || fromIndex === toIndex) {
          return;
        }
        onReorder(fromIndex, toIndex, position);
      });

      row.addEventListener("touchstart", (event) => {
        if (event.touches.length !== 1) return;
        longPressTimer = window.setTimeout(() => {
          touchDragIndex = Number(row.dataset.index);
          row.classList.add("dragging");
          suppressClick = true;
        }, 250);
      }, { passive: true });

      row.addEventListener("touchmove", (event) => {
        if (touchDragIndex == null) return;
        event.preventDefault();
        const touch = event.touches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        const rowTarget = target?.closest("[data-action='exercise-row']");
        if (!rowTarget) return;
        if (touchTarget && touchTarget !== rowTarget) {
          touchTarget.classList.remove("drag-over");
          delete touchTarget.dataset.dropPosition;
        }
        if (rowTarget !== row) {
          const bounds = rowTarget.getBoundingClientRect();
          const isAfter = touch.clientY - bounds.top > bounds.height / 2;
          rowTarget.dataset.dropPosition = isAfter ? "after" : "before";
          rowTarget.classList.add("drag-over");
        }
        touchTarget = rowTarget;
      }, { passive: false });

      row.addEventListener("touchend", (event) => {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        if (touchDragIndex == null) return;
        event.preventDefault();
        const touch = event.changedTouches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        const rowTarget = target?.closest("[data-action='exercise-row']");
        const toIndex = Number(rowTarget?.dataset.index);
        const fromIndex = touchDragIndex;
        const position = rowTarget?.dataset.dropPosition || "before";
        clearTouchDragState();
        if (Number.isNaN(fromIndex) || Number.isNaN(toIndex) || fromIndex === toIndex) {
          return;
        }
        onReorder(fromIndex, toIndex, position);
      }, { passive: false });

      row.addEventListener("touchcancel", () => {
        clearTouchDragState();
      });
    });
  }
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
  onPause,
  onResume,
  onRestart,
  onTick,
  onUndo,
}) {
  app.innerHTML = `
    <div class="header">
      <button class="button ghost" data-action="exit">Back</button>
      <div></div>
    </div>
    <div class="runner">
      <div class="player" id="player"></div>
      <div class="runner-timer">
        <div class="timer-block">
          <div class="timer" id="timer">00:00</div>
          <p class="small" id="timer-label">ACTIVE</p>
        </div>
        <button class="button success" data-action="complete">Complete</button>
      </div>
    <div class="progress-bar">
      <div class="progress-fill" id="progress-fill"></div>
    </div>
    <div class="list-item">
      <p class="small" id="progress-detail">0 / 0 steps</p>
      <p class="small" id="progress-percent">0%</p>
    </div>
    <div class="nav-row">
      <button class="button ghost" data-action="pause">Pause</button>
      <button class="button ghost" data-action="undo">Undo</button>
      <button class="button ghost" data-action="restart">Restart</button>
    </div>
    <div class="card next-card">
      <p class="small">Up next</p>
      <h3 id="next-exercise">--</h3>
      <p class="small" id="next-detail"></p>
    </div>
    <p class="small" id="instruction"></p>
  </div>
`;

  const playerEl = app.querySelector("#player");
  let player = null;
  let currentExercise = null;
  let playerTitleEl = null;
  let playerSetsEl = null;
  let playerRepsLabelEl = null;
  let playerRepsValueEl = null;
  const timerEl = app.querySelector("#timer");
  const timerLabelEl = app.querySelector("#timer-label");
  const progressFillEl = app.querySelector("#progress-fill");
  const progressDetailEl = app.querySelector("#progress-detail");
  const progressPercentEl = app.querySelector("#progress-percent");
  const instructionEl = app.querySelector("#instruction");
  const nextExerciseEl = app.querySelector("#next-exercise");
  const nextDetailEl = app.querySelector("#next-detail");
  const completeButton = app.querySelector("[data-action='complete']");
  const pauseButton = app.querySelector("[data-action='pause']");
  const undoButton = app.querySelector("[data-action='undo']");
  const restartButton = app.querySelector("[data-action='restart']");

  function update() {
    const snapshot = engine.getSnapshot();
    if (snapshot.state === "DONE_DAY") {
      if (playerTitleEl) {
        playerTitleEl.textContent = "Training completed";
      }
      if (playerSetsEl) {
        playerSetsEl.textContent = "Great work!";
      }
      if (playerRepsLabelEl) {
        playerRepsLabelEl.textContent = "Reps";
      }
      if (playerRepsValueEl) {
        playerRepsValueEl.textContent = "--";
      }
      timerEl.textContent = "00:00";
      timerLabelEl.textContent = "DONE";
      progressFillEl.style.width = "100%";
      progressDetailEl.textContent = `${snapshot.totalSteps} / ${snapshot.totalSteps} steps`;
      progressPercentEl.textContent = "100%";
      instructionEl.textContent = "";
      undoButton.disabled = !engine.canUndo();
      if (onComplete) onComplete();
      return;
    }

    const step = snapshot.step;
    const exerciseName = formatExercise(step.exerciseId);
    if (exerciseName !== currentExercise) {
      currentExercise = exerciseName;
      if (!player) {
        player = createPlayer(playerEl, step.exerciseId);
        playerTitleEl = playerEl.querySelector(".player-title");
        playerSetsEl = playerEl.querySelector(".player-sets");
        playerRepsLabelEl = playerEl.querySelector(".player-reps-label");
        playerRepsValueEl = playerEl.querySelector(".player-reps-value");
      } else {
        player.setExercise(step.exerciseId);
      }
    }
    if (player) {
      player.setResting(snapshot.state === "REST");
    }

    if (playerTitleEl) {
      playerTitleEl.textContent = exerciseName;
    }
    if (playerSetsEl) {
      playerSetsEl.textContent = buildSetLabel(step, day);
    }
    const repsStat = buildRepsStat(step, day);
    if (playerRepsLabelEl) {
      playerRepsLabelEl.textContent = repsStat.label;
    }
    if (playerRepsValueEl) {
      playerRepsValueEl.textContent = repsStat.value;
    }
    const nextItem = day.items[step.itemIndex + 1];
    if (nextItem) {
      nextExerciseEl.textContent = formatExercise(nextItem.exerciseId);
      nextDetailEl.textContent = buildNextDetail(nextItem);
    } else {
      nextExerciseEl.textContent = "Last exercise";
      nextDetailEl.textContent = "Finish strong to wrap up.";
    }

    if (snapshot.paused) {
      timerLabelEl.textContent = "PAUSED";
      if (snapshot.remainingSec != null) {
        timerEl.textContent = formatTimer(snapshot.remainingSec);
      }
      completeButton.disabled = true;
      completeButton.classList.add("ghost");
      completeButton.textContent = "Complete";
    } else if (snapshot.state === "REST") {
      timerLabelEl.textContent = "REST";
      timerEl.classList.remove("overtime");
      timerEl.textContent = formatTimer(snapshot.remainingSec || 0);
      completeButton.disabled = false;
      completeButton.classList.remove("ghost");
      completeButton.textContent = "Skip rest";
    } else if (step.type === "routine") {
      timerLabelEl.textContent = "ACTIVE";
      timerEl.textContent = "--:--";
      timerEl.classList.remove("overtime");
      completeButton.disabled = false;
      completeButton.classList.remove("ghost");
      completeButton.textContent = "Complete";
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
      completeButton.textContent = "Complete";
    }

    const percent = Math.min(Math.round(snapshot.progress), 100);
    progressFillEl.style.width = `${percent}%`;
    progressDetailEl.textContent = `${snapshot.completedSteps} / ${snapshot.totalSteps} steps`;
    progressPercentEl.textContent = `${percent}%`;
    pauseButton.textContent = snapshot.paused ? "Resume" : "Pause";
    undoButton.disabled = !engine.canUndo();
    instructionEl.textContent = snapshot.state === "REST"
      ? "Resting. Tap Skip rest to continue."
      : step.type === "routine"
        ? "Complete routine, then tap Complete."
        : "";
    if (onTick) onTick(snapshot);
  }

  update();
  const intervalId = setInterval(() => {
    engine.tick();
    update();
  }, 500);

  completeButton.addEventListener("click", () => {
    const snapshot = engine.getSnapshot();
    if (snapshot.state === "REST") {
      engine.skipRest();
    } else {
      engine.completeCurrent();
    }
    update();
  });

  pauseButton.addEventListener("click", () => {
    const snapshot = engine.getSnapshot();
    if (snapshot.paused) {
      engine.resume();
      if (onResume) onResume();
    } else {
      engine.pause();
      if (onPause) onPause();
    }
    update();
  });

  undoButton.addEventListener("click", () => {
    const undone = engine.undoLast();
    if (undone?.length && onUndo) {
      onUndo(undone);
    }
    update();
  });

  restartButton.addEventListener("click", () => {
    clearInterval(intervalId);
    if (onRestart) onRestart();
  });

  app.querySelector("[data-action='exit']").addEventListener("click", () => {
    engine.pause();
    if (onPause) onPause();
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
  if (!Array.isArray(reps)) {
    if (!reps) return "";
    return reps === "max" ? "Reps max" : `Reps ${reps}`;
  }
  return reps
    .map((rep) => (rep === "max" ? "Reps max" : `Reps ${rep}`))
    .join(" • ");
}

function buildSetLabel(step, day) {
  const item = day.items[step.itemIndex];
  const setTotal = item.sets || 1;
  return `Set ${step.setIndex + 1} / ${setTotal}`;
}

function buildRepsStat(step, day) {
  const item = day.items[step.itemIndex];
  if (step.type === "hold") {
    return {
      label: "Hold",
      value: `${step.durationSec || item.durationSec || item.targetSec || 0}s`,
    };
  }
  if (step.type === "routine") {
    return {
      label: "Routine",
      value: "--",
    };
  }
  const repsValue = Array.isArray(item.reps) ? item.reps[step.setIndex] : item.reps;
  if (repsValue === "max") {
    return { label: "Reps", value: "Max" };
  }
  const repTotal = typeof repsValue === "number" ? repsValue : 1;
  return { label: "Reps", value: String(repTotal) };
}

function buildNextDetail(item) {
  if (item.type === "hold") {
    return `${item.sets || 1} sets • ${item.durationSec}s hold`;
  }
  if (item.type === "routine") {
    return `${item.sets || 1} set routine`;
  }
  return `${item.sets || 1} sets • ${formatReps(item.reps)}`;
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

function buildSessionDuration(session) {
  if (!session?.startedAt) return "00:00";
  const start = new Date(session.startedAt).getTime();
  const end = session.completedAt ? new Date(session.completedAt).getTime() : Date.now();
  const durationMs = Math.max(end - start, 0);
  return formatDuration(durationMs);
}

function formatDuration(durationMs) {
  const totalSeconds = Math.floor(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getSessionStatus(session) {
  if (!session) return "not_started";
  if (session.status) return session.status;
  if (session.completedAt) return "completed";
  return "in_progress";
}

function getCompletedStepsFromLog(log) {
  if (!Array.isArray(log)) return 0;
  const uniqueSteps = new Set(
    log
      .map((entry) => entry.stepIndex)
      .filter((value) => typeof value === "number"),
  );
  return uniqueSteps.size;
}

function getCompletedStepsByItem(log, items) {
  const itemCount = items.length;
  if (!Array.isArray(log)) return Array.from({ length: itemCount }, () => 0);
  const exerciseIndex = new Map(items.map((item, index) => [item.exerciseId, index]));
  const uniqueByItem = Array.from({ length: itemCount }, () => new Set());
  log.forEach((entry) => {
    if (typeof entry.stepIndex !== "number") return;
    const mappedIndex = exerciseIndex.get(entry.exerciseId);
    const fallbackIndex = typeof entry.itemIndex === "number" ? entry.itemIndex : -1;
    const targetIndex = typeof mappedIndex === "number" ? mappedIndex : fallbackIndex;
    if (targetIndex < 0 || targetIndex >= itemCount) return;
    uniqueByItem[targetIndex].add(entry.stepIndex);
  });
  return uniqueByItem.map((set) => set.size);
}
