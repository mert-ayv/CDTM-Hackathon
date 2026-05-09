# Neurodermitis Tracker

AI-supported tracker for neurodermatitis flare logging, trigger detection,
24-48h flare prediction and treatment tracking.

This is a technical prototype, not a medical device and not medical advice.

## Structure

```text
apps/
  frontend/   React + Vite + TypeScript
  backend/    Express + TypeScript microservice scaffold
```

## Product Scope

- Food logging with timestamps and future OpenFoodFacts enrichment
- Sport, stress, sleep, habits and life-change tracking
- 3D body map data model for affected body regions
- Rash photo metadata and future AI-based severity scoring
- Itchiness, dryness, redness and intensity scales
- Weather and pollen context for trigger analysis
- Trigger detection based on personal history
- 24-48h AI-supported flare prediction
- Treatment and medication tracking

## Getting Started

```bash
npm install
npm run dev
```

Frontend: http://localhost:5173

Backend: http://localhost:3000

## Useful Scripts

```bash
npm run dev
npm run build
npm run typecheck
npm run dev:frontend
npm run dev:backend
npm run dev:backend:gateway
npm run dev:backend:diary
npm run dev:backend:skin
npm run dev:backend:photos
npm run dev:backend:environment
npm run dev:backend:insights
npm run dev:backend:treatment
```

Backend service documentation: `apps/backend/README.md`
