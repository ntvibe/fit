const warnedExercises = new Set();

export function createPlayer(container, exerciseId) {
  container.innerHTML = `
    <div class="pose-layer pose1"></div>
    <div class="pose-layer pose2"></div>
    <div class="player-overlay">
      <div class="player-title-block">
        <div class="player-title"></div>
        <div class="player-sets"></div>
      </div>
      <div class="player-reps">
        <div class="player-reps-label">Reps</div>
        <div class="player-reps-value"></div>
      </div>
    </div>
  `;
  const pose1 = container.querySelector(".pose1");
  const pose2 = container.querySelector(".pose2");
  let currentExerciseId = exerciseId;
  let isResting = false;

  async function setPoseImages(imageId, fallback1, fallback2) {
    const pose1Path = `assets/exercises/${imageId}-p1.png`;
    const pose2Path = `assets/exercises/${imageId}-p2.png`;
    const [pose1Ok, pose2Ok] = await Promise.all([
      loadImage(pose1Path),
      loadImage(pose2Path),
    ]);

    if (pose1Ok && pose2Ok) {
      pose1.style.backgroundImage = `url(${pose1Path})`;
      pose2.style.backgroundImage = `url(${pose2Path})`;
      pose1.textContent = "";
      pose2.textContent = "";
    } else {
      pose1.style.backgroundImage = "";
      pose2.style.backgroundImage = "";
      pose1.textContent = fallback1;
      pose2.textContent = fallback2;
      if (!warnedExercises.has(imageId)) {
        console.warn(`Missing pose images for ${imageId}, using text fallback.`);
        warnedExercises.add(imageId);
      }
    }
  }

  async function setExercise(newExerciseId) {
    currentExerciseId = newExerciseId;
    if (!isResting) {
      await setPoseImages(currentExerciseId, "POSE 1", "POSE 2");
    }
  }

  async function setResting(resting) {
    isResting = resting;
    if (isResting) {
      await setPoseImages("rest", "REST", "REST");
    } else if (currentExerciseId) {
      await setPoseImages(currentExerciseId, "POSE 1", "POSE 2");
    }
  }

  setExercise(exerciseId);

  return {
    setExercise,
    setResting,
  };
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}
