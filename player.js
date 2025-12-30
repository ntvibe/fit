const warnedExercises = new Set();

export function createPlayer(container, exerciseId) {
  container.innerHTML = `
    <div class="pose-layer pose1"></div>
    <div class="pose-layer pose2"></div>
  `;
  const pose1 = container.querySelector(".pose1");
  const pose2 = container.querySelector(".pose2");

  async function setExercise(newExerciseId) {
    const pose1Path = `assets/exercises/${newExerciseId}/pose1.png`;
    const pose2Path = `assets/exercises/${newExerciseId}/pose2.png`;
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
      pose1.textContent = "POSE 1";
      pose2.textContent = "POSE 2";
      if (!warnedExercises.has(newExerciseId)) {
        console.warn(`Missing pose images for ${newExerciseId}, using text fallback.`);
        warnedExercises.add(newExerciseId);
      }
    }
  }

  setExercise(exerciseId);

  return {
    setExercise,
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
