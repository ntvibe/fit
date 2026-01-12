# Fitness Plan Schema

The app loads its workout plan from `/data/week1.json`. The file **must** be valid JSON and follow the structure below so the UI and runner can render workouts correctly.

## Top-level structure

```json
{
  "id": "string",
  "name": "string",
  "meta": {
    "intensity": "string"
  },
  "days": [
    {
      "id": "string",
      "name": "string",
      "items": [
        {
          "exerciseId": "string",
          "name": "string",
          "type": "reps | hold | routine",
          "sets": 1,
          "reps": 10,
          "repsRange": [8, 10],
          "durationSec": 30,
          "durationSecRange": [20, 40],
          "restSec": 60,
          "targetRIR": 2,
          "notes": "string"
        }
      ]
    }
  ]
}
```

## Field notes

- `id` and `name` are required on the plan and each day.
- `meta.intensity` is optional and is shown under the plan title.
- Each item in `days[].items` must include:
  - `exerciseId` (unique slug used for ordering and optional images)
  - `name` (display label)
  - `type`
    - `reps`: standard repetitions per set
    - `hold`: time-based hold in seconds
    - `routine`: a single step with no reps/hold timer
  - `sets` (defaults to 1 if omitted)
  - `restSec` (rest between sets or holds)
- For `type: "reps"`:
  - `reps` is **required** and drives the runner step count.
  - `repsRange` is optional (used for display like “Reps 8-10”).
- For `type: "hold"`:
  - `durationSec` is **required** and drives the timer per set.
  - `durationSecRange` is optional (used for display like “30-40s”).
- Optional coaching fields:
  - `targetRIR` (reps in reserve target)
  - `notes` (free-form guidance)

## Minimal example

```json
{
  "id": "starter-plan",
  "name": "Starter Plan",
  "meta": { "intensity": "Easy effort" },
  "days": [
    {
      "id": "day-1",
      "name": "Day 1",
      "items": [
        {
          "exerciseId": "pushup",
          "name": "Push-Up",
          "type": "reps",
          "sets": 3,
          "reps": 8,
          "restSec": 60
        },
        {
          "exerciseId": "plank",
          "name": "Plank",
          "type": "hold",
          "sets": 2,
          "durationSec": 30,
          "restSec": 45
        }
      ]
    }
  ]
}
```
