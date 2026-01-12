export async function loadPlan() {
  const planUrl = new URL("./data/week1.json", window.location.href);
  const response = await fetch(planUrl.toString(), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load plan: ${response.status}`);
  }
  const rawPlan = await response.json();
  return normalizePlan(rawPlan);
}

function normalizePlan(rawPlan) {
  if (rawPlan?.days) {
    return rawPlan;
  }

  const workouts = Array.isArray(rawPlan?.workouts) ? rawPlan.workouts : [];
  const days = workouts.map((workout) => {
    const items = (workout.blocks || []).flatMap((block) =>
      (block.items || []).map((item) => normalizeItem(item)),
    );
    return {
      id: workout.workoutId || workout.id || workout.name,
      name: workout.name || "Workout",
      items,
    };
  });

  return {
    id: rawPlan?.planId || rawPlan?.id || "plan",
    name: rawPlan?.title || rawPlan?.name || "Training Plan",
    meta: {
      intensity: rawPlan?.globalRules?.intensity?.notes || "",
    },
    days,
  };
}

function normalizeItem(item) {
  const normalized = {
    exerciseId: item.exerciseId,
    name: item.name,
    sets: item.sets ?? 1,
    restSec: item.restSec ?? 0,
    notes: item.notes,
    targetRIR: item.targetRIR,
  };

  if (typeof item.durationMin === "number") {
    return {
      ...normalized,
      type: "hold",
      durationSec: Math.round(item.durationMin * 60),
    };
  }

  if (Array.isArray(item.durationSecRange)) {
    const [min, max] = item.durationSecRange;
    const average = Math.round((min + max) / 2);
    return {
      ...normalized,
      type: "hold",
      durationSec: average,
      durationSecRange: [min, max],
    };
  }

  if (Array.isArray(item.repsRange)) {
    const [, max] = item.repsRange;
    return {
      ...normalized,
      type: "reps",
      reps: max,
      repsRange: item.repsRange,
    };
  }

  return {
    ...normalized,
    type: "reps",
    reps: item.reps ?? 1,
  };
}
