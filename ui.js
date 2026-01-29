import { createPlayer } from "./player.js";
import { countSteps, getStepCountsByItem } from "./runnerEngine.js";

export function renderHome({ app, plan, progress, settings, onReset, onUpdateSettings }) {
  const days = plan.days || [];
  const restBetweenRepsSec = settings?.restBetweenRepsSec ?? 60;
  app.innerHTML = `
    <div class="header">
      <div>
        <h1 class="title">${plan.name}</h1>
        <p class="subtitle">${plan.meta?.intensity || ""}</p>
      </div>
      <div class="header-actions">
        <button class="icon-button ghost" data-action="open-settings" aria-label="Open settings">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.65l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.1 7.1 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.58.23-1.12.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.65 8.83a.5.5 0 0 0 .12.65l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.65l1.92 3.32c.14.24.43.34.68.22l2.39-.96c.5.4 1.05.71 1.63.94l.36 2.54c.04.24.25.42.5.42h3.84c.25 0 .46-.18.5-.42l.36-2.54c.58-.23 1.12-.54 1.63-.94l2.39.96c.25.1.54.01.68-.22l1.92-3.32a.5.5 0 0 0-.12-.65l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5z"
            />
          </svg>
        </button>
        <a class="button ghost link" href="#/history">History</a>
      </div>
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
    <div class="modal" data-modal="settings" aria-hidden="true">
      <div class="modal-backdrop" data-action="close-settings"></div>
      <div class="modal-card card" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div class="modal-header">
          <h2 id="settings-title">Settings</h2>
          <button class="icon-button ghost" data-action="close-settings" aria-label="Close settings">
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        <div class="modal-body">
          <label class="field">
            <span class="field-label">Break between reps</span>
            <div class="slider-row">
              <input
                type="range"
                min="0"
                max="180"
                value="${restBetweenRepsSec}"
                data-action="rest-slider"
                aria-label="Break between reps"
              />
              <span class="slider-value" data-role="rest-value">${restBetweenRepsSec}s</span>
            </div>
          </label>
        </div>
      </div>
    </div>
  `;
  app.querySelector("[data-action='reset']").addEventListener("click", () => {
    onReset();
  });

  const settingsModal = app.querySelector("[data-modal='settings']");
  const openButton = app.querySelector("[data-action='open-settings']");
  const closeButtons = app.querySelectorAll("[data-action='close-settings']");
  const slider = app.querySelector("[data-action='rest-slider']");
  const valueLabel = app.querySelector("[data-role='rest-value']");

  const setModalOpen = (isOpen) => {
    if (!settingsModal) return;
    settingsModal.classList.toggle("is-visible", isOpen);
    settingsModal.setAttribute("aria-hidden", String(!isOpen));
    document.body.style.overflow = isOpen ? "hidden" : "";
  };

  if (openButton) {
    openButton.addEventListener("click", () => setModalOpen(true));
  }

  closeButtons.forEach((button) => {
    button.addEventListener("click", () => setModalOpen(false));
  });

  if (slider && valueLabel) {
    slider.addEventListener("input", () => {
      const value = Number(slider.value);
      valueLabel.textContent = `${value}s`;
      if (onUpdateSettings) {
        onUpdateSettings({ restBetweenRepsSec: value });
      }
    });
  }
}

export function renderTrainingDetail({
  app,
  day,
  progress,
  latestSession,
  onRestart,
  onReorderSave,
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
      <div class="section-header">
        <h3 class="section-title">Exercises</h3>
        <button class="button ghost" data-action="edit-order">Change order</button>
      </div>
      <p class="small" data-role="exercise-hint">Tap an exercise to expand the set details.</p>
      <div class="stack" data-role="exercise-list"></div>
      <div class="stack is-hidden" data-role="order-list"></div>
      <button class="icon-button floating-check is-hidden" data-action="save-order" aria-label="Save order">
        <span aria-hidden="true">✓</span>
      </button>
    </div>
  `;

  const restartButton = app.querySelector("[data-action='restart']");
  if (restartButton) {
    restartButton.addEventListener("click", () => {
      onRestart();
    });
  }

  const exerciseList = app.querySelector("[data-role='exercise-list']");
  const orderList = app.querySelector("[data-role='order-list']");
  const editOrderButton = app.querySelector("[data-action='edit-order']");
  const saveOrderButton = app.querySelector("[data-action='save-order']");
  const hint = app.querySelector("[data-role='exercise-hint']");
  let isReorderMode = false;
  let draftOrder = [...day.items];

  const renderSummaryChips = (item, itemIndex) => {
    const summary = buildExerciseSummary(item);
    return `
      <span class="summary-chip" data-summary="sets" data-index="${itemIndex}">${summary.sets}</span>
      <span class="summary-chip" data-summary="reps" data-index="${itemIndex}">${summary.reps}</span>
      <span class="summary-chip" data-summary="metric" data-index="${itemIndex}">${summary.metric}</span>
    `;
  };

  const renderSetList = (item, itemIndex) => {
    const sets = ensureSetDetails(item);
    const metric = getMetricMeta(item);
    return `
      <ul class="set-list" data-role="set-list" data-index="${itemIndex}">
        ${sets
          .map((set, setIndex) => {
            const repsValue = set.reps ?? "";
            const metricValue = set[metric.key] ?? "";
            return `
              <li class="set-row">
                <span class="set-label">Set ${setIndex + 1}</span>
                ${
                  metric.showReps
                    ? `
                      <label class="set-field">
                        <span>Reps</span>
                        <div class="set-input">
                          <input
                            type="number"
                            inputmode="numeric"
                            min="0"
                            data-action="edit-reps"
                            data-index="${itemIndex}"
                            data-set="${setIndex}"
                            value="${repsValue}"
                          />
                        </div>
                      </label>
                    `
                    : ""
                }
                <label class="set-field">
                  <span>${metric.label}</span>
                  <div class="set-input">
                    <input
                      type="number"
                      inputmode="numeric"
                      min="0"
                      data-action="edit-metric"
                      data-metric="${metric.key}"
                      data-index="${itemIndex}"
                      data-set="${setIndex}"
                      value="${metricValue}"
                    />
                    <span class="unit">${metric.unit}</span>
                  </div>
                </label>
                <button class="icon-button ghost small" data-action="delete-set" data-index="${itemIndex}" data-set="${setIndex}" aria-label="Delete set">
                  <span aria-hidden="true">✕</span>
                </button>
              </li>
            `;
          })
          .join("")}
      </ul>
      <button class="button ghost add-set" data-action="add-set" data-index="${itemIndex}">
        + Add set
      </button>
      ${
        onSelectExercise
          ? `<button class="button primary start-exercise" data-action="start-exercise" data-index="${itemIndex}">
              Start exercise
            </button>`
          : ""
      }
    `;
  };

  const renderExerciseCards = (items) => {
    if (!exerciseList) return;
    exerciseList.innerHTML = items
      .map((item, itemIndex) => {
        const totalForItem = stepsPerItem[itemIndex] || 0;
        const completedForItem = completedStepsByItem[itemIndex] || 0;
        const percentForItem = totalForItem
          ? Math.round((completedForItem / totalForItem) * 100)
          : 0;
        return `
          <details class="card exercise-toggle" data-index="${itemIndex}">
            <summary class="exercise-summary">
              <div class="exercise-summary-main">
                <div class="exercise-order">${itemIndex + 1}</div>
                <div class="exercise-info">
                  <h3>${getExerciseName(item)}</h3>
                  <div class="summary-chips">
                    ${renderSummaryChips(item, itemIndex)}
                  </div>
                </div>
              </div>
              <span class="toggle-icon" aria-hidden="true">⌄</span>
            </summary>
            <div class="exercise-body">
              <div class="list-item">
                <p class="small">Progress</p>
                <p class="small">${completedForItem} / ${totalForItem} steps</p>
              </div>
              <div class="progress-bar" style="margin-top: 8px;">
                <div class="progress-fill" style="width: ${percentForItem}%"></div>
              </div>
              <div class="sets-panel" data-role="sets-panel" data-index="${itemIndex}">
                ${renderSetList(item, itemIndex)}
              </div>
            </div>
          </details>
        `;
      })
      .join("");
  };

  const renderOrderList = () => {
    if (!orderList) return;
    orderList.innerHTML = draftOrder
      .map((item, itemIndex) => {
        return `
          <div class="card exercise-card order-card" data-action="order-row" data-index="${itemIndex}">
            <div class="list-item">
              <div class="exercise-order">${itemIndex + 1}</div>
              <div class="exercise-info">
                <h3>${getExerciseName(item)}</h3>
                <div class="summary-chips">
                  ${renderSummaryChips(item, itemIndex)}
                </div>
              </div>
            </div>
          </div>
        `;
      })
      .join("");
    bindOrderDragAndDrop();
  };

  const setReorderMode = (isActive) => {
    isReorderMode = isActive;
    if (exerciseList) {
      exerciseList.classList.toggle("is-hidden", isActive);
    }
    if (orderList) {
      orderList.classList.toggle("is-hidden", !isActive);
    }
    if (saveOrderButton) {
      saveOrderButton.classList.toggle("is-hidden", !isActive);
    }
    if (editOrderButton) {
      editOrderButton.textContent = isActive ? "Cancel" : "Change order";
    }
    if (hint) {
      hint.textContent = isActive
        ? "Drag exercises to reorder them, then tap the checkmark to save."
        : "Tap an exercise to expand the set details.";
    }
    if (isActive) {
      draftOrder = [...day.items];
      renderOrderList();
    }
  };

  const updateSummary = (itemIndex) => {
    const item = day.items[itemIndex];
    if (!item) return;
    const summary = buildExerciseSummary(item);
    const setsLabel = exerciseList?.querySelector(`[data-summary="sets"][data-index="${itemIndex}"]`);
    const repsLabel = exerciseList?.querySelector(`[data-summary="reps"][data-index="${itemIndex}"]`);
    const metricLabel = exerciseList?.querySelector(`[data-summary="metric"][data-index="${itemIndex}"]`);
    if (setsLabel) setsLabel.textContent = summary.sets;
    if (repsLabel) repsLabel.textContent = summary.reps;
    if (metricLabel) metricLabel.textContent = summary.metric;
  };

  const rerenderSetList = (itemIndex) => {
    const panel = app.querySelector(`[data-role="sets-panel"][data-index="${itemIndex}"]`);
    const item = day.items[itemIndex];
    if (!panel || !item) return;
    panel.innerHTML = renderSetList(item, itemIndex);
    updateSummary(itemIndex);
  };

  const getInsertIndex = (fromIndex, toIndex, position) => {
    const offset = position === "after" ? 1 : 0;
    let insertIndex = toIndex + offset;
    if (fromIndex < insertIndex) {
      insertIndex -= 1;
    }
    return insertIndex;
  };

  const bindOrderDragAndDrop = () => {
    const rows = orderList?.querySelectorAll("[data-action='order-row']") || [];
    let dragIndex = null;
    let touchDragIndex = null;
    let touchTarget = null;
    let longPressTimer = null;
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
    };
    rows.forEach((row) => {
      row.setAttribute("draggable", "true");
      row.addEventListener("dragstart", (event) => {
        dragIndex = Number(row.dataset.index);
        row.classList.add("dragging");
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", String(dragIndex));
        }
      });
      row.addEventListener("dragend", () => {
        row.classList.remove("dragging");
        dragIndex = null;
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
        const insertIndex = getInsertIndex(fromIndex, toIndex, position);
        const updated = [...draftOrder];
        const [moved] = updated.splice(fromIndex, 1);
        if (!moved) return;
        const clampedIndex = Math.max(0, Math.min(updated.length, insertIndex));
        updated.splice(clampedIndex, 0, moved);
        draftOrder = updated;
        renderOrderList();
      });

      row.addEventListener("touchstart", (event) => {
        if (event.touches.length !== 1) return;
        longPressTimer = window.setTimeout(() => {
          touchDragIndex = Number(row.dataset.index);
          row.classList.add("dragging");
        }, 250);
      }, { passive: true });

      row.addEventListener("touchmove", (event) => {
        if (touchDragIndex == null) return;
        event.preventDefault();
        const touch = event.touches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        const rowTarget = target?.closest("[data-action='order-row']");
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
        const rowTarget = target?.closest("[data-action='order-row']");
        const toIndex = Number(rowTarget?.dataset.index);
        const fromIndex = touchDragIndex;
        const position = rowTarget?.dataset.dropPosition || "before";
        clearTouchDragState();
        if (Number.isNaN(fromIndex) || Number.isNaN(toIndex) || fromIndex === toIndex) {
          return;
        }
        const insertIndex = getInsertIndex(fromIndex, toIndex, position);
        const updated = [...draftOrder];
        const [moved] = updated.splice(fromIndex, 1);
        if (!moved) return;
        const clampedIndex = Math.max(0, Math.min(updated.length, insertIndex));
        updated.splice(clampedIndex, 0, moved);
        draftOrder = updated;
        renderOrderList();
      }, { passive: false });

      row.addEventListener("touchcancel", () => {
        clearTouchDragState();
      });
    });
  };

  renderExerciseCards(day.items);

  if (editOrderButton) {
    editOrderButton.addEventListener("click", () => {
      setReorderMode(!isReorderMode);
    });
  }

  if (saveOrderButton && onReorderSave) {
    saveOrderButton.addEventListener("click", () => {
      const newOrder = draftOrder.map((item) => item.exerciseId);
      onReorderSave(newOrder);
    });
  }

  if (onSelectExercise) {
    app.addEventListener("click", (event) => {
      const target = event.target.closest("[data-action='start-exercise']");
      if (!target) return;
      const index = Number(target.dataset.index);
      if (Number.isNaN(index)) return;
      onSelectExercise(index);
    });
  }

  app.addEventListener("click", (event) => {
    const deleteButton = event.target.closest("[data-action='delete-set']");
    const addButton = event.target.closest("[data-action='add-set']");
    if (deleteButton) {
      const itemIndex = Number(deleteButton.dataset.index);
      const setIndex = Number(deleteButton.dataset.set);
      const item = day.items[itemIndex];
      if (!item || Number.isNaN(setIndex)) return;
      const sets = ensureSetDetails(item);
      if (sets.length <= 1) return;
      sets.splice(setIndex, 1);
      item.sets = sets.length;
      rerenderSetList(itemIndex);
      return;
    }
    if (addButton) {
      const itemIndex = Number(addButton.dataset.index);
      const item = day.items[itemIndex];
      if (!item) return;
      const sets = ensureSetDetails(item);
      const metric = getMetricMeta(item);
      const lastSet = sets[sets.length - 1] || {};
      const newSet = {
        reps: metric.showReps ? lastSet.reps ?? item.reps ?? 0 : null,
        durationSec: metric.key === "durationSec" ? lastSet.durationSec ?? item.durationSec ?? 0 : null,
        distanceMeters: metric.key === "distanceMeters" ? lastSet.distanceMeters ?? 0 : null,
        weightKg: metric.key === "weightKg" ? lastSet.weightKg ?? null : null,
      };
      sets.push(newSet);
      item.sets = sets.length;
      rerenderSetList(itemIndex);
    }
  });

  app.addEventListener("input", (event) => {
    const repsInput = event.target.closest("[data-action='edit-reps']");
    const metricInput = event.target.closest("[data-action='edit-metric']");
    if (repsInput) {
      const itemIndex = Number(repsInput.dataset.index);
      const setIndex = Number(repsInput.dataset.set);
      const item = day.items[itemIndex];
      if (!item) return;
      const value = Number(repsInput.value);
      const sets = ensureSetDetails(item);
      if (!sets[setIndex]) return;
      sets[setIndex].reps = Number.isNaN(value) ? null : value;
      const fallback = typeof item.reps === "number" ? item.reps : 0;
      item.reps = sets.map((set) => set.reps ?? fallback);
      updateSummary(itemIndex);
      return;
    }
    if (metricInput) {
      const itemIndex = Number(metricInput.dataset.index);
      const setIndex = Number(metricInput.dataset.set);
      const metricKey = metricInput.dataset.metric;
      const item = day.items[itemIndex];
      if (!item) return;
      const value = Number(metricInput.value);
      const sets = ensureSetDetails(item);
      if (!sets[setIndex]) return;
      sets[setIndex][metricKey] = Number.isNaN(value) ? null : value;
      if (metricKey === "durationSec") {
        item.durationSec = sets[setIndex].durationSec ?? item.durationSec;
      }
      updateSummary(itemIndex);
    }
  });
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
    const exerciseName = getExerciseName(day.items[step.itemIndex]);
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
      nextExerciseEl.textContent = getExerciseName(nextItem);
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

function getExerciseName(item) {
  if (item?.name) return item.name;
  if (!item?.exerciseId) return "";
  return formatExercise(item.exerciseId);
}

function formatExercise(id) {
  return id
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatHoldDuration(item) {
  if (Array.isArray(item.durationSecRange)) {
    return `${item.durationSecRange[0]}-${item.durationSecRange[1]}s`;
  }
  const duration = item.durationSec || item.targetSec || 0;
  return `${duration}s`;
}

function formatRepsSummary(item) {
  if (Array.isArray(item.repsRange)) {
    return `Reps ${item.repsRange[0]}-${item.repsRange[1]}`;
  }
  return formatReps(item.reps);
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

function getMetricMeta(item) {
  if (item?.type === "hold") {
    return {
      key: "durationSec",
      label: "Duration",
      unit: "sec",
      showReps: false,
    };
  }
  if (item?.type === "distance" || item?.distanceMeters != null) {
    return {
      key: "distanceMeters",
      label: "Distance",
      unit: "m",
      showReps: false,
    };
  }
  return {
    key: "weightKg",
    label: "Weight",
    unit: "kg",
    showReps: true,
  };
}

function ensureSetDetails(item) {
  const targetSets = item?.sets || 1;
  const existing = Array.isArray(item?.setDetails) ? item.setDetails : [];
  const metric = getMetricMeta(item);
  const normalized = [];
  for (let index = 0; index < targetSets; index += 1) {
    const existingSet = existing[index] || {};
    const repsFromItem = Array.isArray(item?.reps) ? item.reps[index] : item?.reps;
    const durationFromItem = Array.isArray(item?.durationSec)
      ? item.durationSec[index]
      : item?.durationSec;
    const distanceFromItem = Array.isArray(item?.distanceMeters)
      ? item.distanceMeters[index]
      : item?.distanceMeters;
    normalized.push({
      reps: existingSet.reps ?? (metric.showReps ? repsFromItem ?? item?.repsRange?.[1] ?? null : null),
      durationSec: existingSet.durationSec ?? (metric.key === "durationSec" ? durationFromItem ?? item?.durationSecRange?.[1] ?? null : null),
      distanceMeters: existingSet.distanceMeters ?? (metric.key === "distanceMeters" ? distanceFromItem ?? item?.distanceRange?.[1] ?? null : null),
      weightKg: existingSet.weightKg ?? (metric.key === "weightKg" ? item?.weightKg ?? item?.weightRange?.[1] ?? null : null),
    });
  }
  item.setDetails = normalized;
  item.sets = normalized.length;
  return normalized;
}

function formatRange(values, unit) {
  if (!values.length) {
    return unit ? `— ${unit}` : "—";
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = min === max ? `${min}` : `${min}-${max}`;
  return unit ? `${range} ${unit}` : range;
}

function buildExerciseSummary(item) {
  const sets = ensureSetDetails(item);
  const repsValues = sets.map((set) => set.reps).filter((value) => typeof value === "number");
  const metric = getMetricMeta(item);
  const metricValues = sets
    .map((set) => set[metric.key])
    .filter((value) => typeof value === "number");
  const setCount = sets.length;
  return {
    sets: `${setCount} ${setCount === 1 ? "Set" : "Sets"}`,
    reps: `${formatRange(repsValues)} Reps`,
    metric: formatRange(metricValues, metric.unit),
  };
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
      value: formatHoldDuration(item),
    };
  }
  if (step.type === "routine") {
    return {
      label: "Routine",
      value: "--",
    };
  }
  if (Array.isArray(item.repsRange)) {
    return { label: "Reps", value: `${item.repsRange[0]}-${item.repsRange[1]}` };
  }
  const repsValue = Array.isArray(item.reps) ? item.reps[step.setIndex] : item.reps;
  if (repsValue === "max") {
    return { label: "Reps", value: "Max" };
  }
  if (typeof repsValue === "number") {
    return { label: "Reps", value: String(repsValue) };
  }
  if (typeof repsValue === "string") {
    return { label: "Reps", value: repsValue };
  }
  return { label: "Reps", value: "1" };
}

function buildNextDetail(item) {
  if (item.type === "hold") {
    return `${item.sets || 1} sets • ${formatHoldDuration(item)} hold`;
  }
  if (item.type === "routine") {
    return `${item.sets || 1} set routine`;
  }
  return `${item.sets || 1} sets • ${formatRepsSummary(item)}`;
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
