# Fitness MVP (Static)

This is a static, GitHub Pages–ready MVP for a fitness workout app. It runs entirely from HTML/CSS/JS with no build step.

## How it works
- The app loads the workout plan from `/data/week1.json` at runtime.
- The Home screen lists each training day and completion status.
- Training detail shows all exercises in the day and offers a Start button.
- The Runner screen steps through each exercise using ACTIVE and REST phases with a single **Complete** button.
- Progress and session logs are stored in `localStorage` under `fitness_mvp_progress_v1`.
- If exercise pose images are missing, the player shows animated text placeholders (`POSE 1` / `POSE 2`) instead of failing.

## Plan data requirement
- **`/data/week1.json` must exist** and match the agreed schema.
- The app does not include or inline any plan JSON.

## Adding exercise images later
Place images in the following structure:

```
/assets/exercises/{exerciseId}/pose1.png
/assets/exercises/{exerciseId}/pose2.png
```

If either image is missing, the player will automatically fall back to text placeholders.

## Deploying on GitHub Pages
1. Ensure the repository root contains `index.html`, `styles.css`, and the JS modules.
2. Push to GitHub.
3. In **Settings → Pages**, set **Source** to the root of the default branch.
4. The app will be available at your GitHub Pages URL.

## Project structure
```
/
  index.html
  styles.css
  app.js
  router.js
  store.js
  planLoader.js
  runnerEngine.js
  player.js
  ui.js
  /data
    week1.json
  /assets
    /exercises
  /docs
    README.md
```
