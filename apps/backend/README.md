# Backend

Microservice-oriented backend scaffold for the Neurodermitis tracker.

This is a technical prototype, not a medical device and not medical advice.

## Services

| Service | Port | Responsibility |
| --- | ---: | --- |
| API Gateway | 3000 | Single frontend entrypoint, health aggregation, service routing |
| Diary Service | 3001 | Food, sport, stress, sleep, habits, life changes |
| Skin Service | 3002 | 3D body map regions, flare observations, itchiness, dryness, redness |
| Photo Service | 3003 | Rash image metadata and future AI severity scoring pipeline |
| Environment Service | 3004 | Weather, pollen, detergents, clothing, pets, contextual factors |
| Insights Service | 3005 | 24-48h flare prediction and trigger detection placeholders |
| Treatment Service | 3006 | Medication, care routine, treatment applications |

## Development

Run all backend services:

```bash
npm run dev -w apps/backend
```

## Supabase

The backend uses Supabase Postgres as the durable storage layer. Secrets belong
in `apps/backend/.env`; that file is ignored by Git.

Required values:

```text
DATABASE_URL=
DATABASE_SSL=true
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=rash-photos
```

Run migrations:

```bash
npm run backend:db:migrate
```

If `db.<project-ref>.supabase.co` cannot be resolved, copy the **Session
Pooler** connection string from Supabase Dashboard -> Database -> Connect and
put that value into `DATABASE_URL`.

Check the connection:

```bash
npm run backend:db:health
```

The current implementation persists diary entries, food image metadata and rash
photo metadata in Postgres. Rash photo binary files still use the local
prototype file store unless a `storageUrl` is supplied; Supabase Storage is
configured next via `SUPABASE_STORAGE_BUCKET`.

For Expo Go on a physical phone, the backend must be reachable over your local
network. The services bind to `0.0.0.0` by default, so use your Mac's LAN IP in
the mobile app instead of `localhost`.

Find the LAN IP:

```bash
npm run backend:lan-ip
```

Then configure the Expo app with:

```bash
EXPO_PUBLIC_API_BASE_URL=http://<YOUR_LAN_IP>:3000
```

Example:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.178.42:3000
```

The backend can expose the same value through `.env`:

```bash
PUBLIC_API_BASE_URL=http://192.168.178.42:3000
```

Run one service in a separate terminal:

```bash
npm run dev:gateway -w apps/backend
npm run dev:diary -w apps/backend
npm run dev:skin -w apps/backend
npm run dev:photos -w apps/backend
npm run dev:environment -w apps/backend
npm run dev:insights -w apps/backend
npm run dev:treatment -w apps/backend
```

Health check through the gateway:

```bash
curl http://localhost:3000/api/health
```

Health check from the phone browser:

```text
http://<YOUR_LAN_IP>:3000/api/health
```

Expo config endpoint:

```text
http://<YOUR_LAN_IP>:3000/api/mobile/config
```

## Gateway Routes

The gateway forwards requests to the services:

```text
/api/diary/*        -> Diary Service
/api/skin/*         -> Skin Service
/api/photos/*       -> Photo Service
/api/environment/*  -> Environment Service
/api/insights/*     -> Insights Service
/api/treatment/*    -> Treatment Service
```

Example:

```bash
curl -X POST http://localhost:3000/api/diary/entries \
  -H "Content-Type: application/json" \
  -d '{"userId":"demo-user","occurredAt":"2026-05-09T10:00:00.000Z","food":[{"name":"Yogurt","triggerCategories":["dairy"]}],"stress":{"level":4}}'
```

## Diary Service

The Diary Service is the main backend surface for patient-entered trigger and
symptom logs. It keeps the current prototype in memory and is shaped so it can
be moved to a dedicated database later.

### Routes

```text
GET    /metadata
GET    /entries?userId=&from=&to=&category=&hasRash=true
POST   /entries
GET    /entries/:id
PATCH  /entries/:id
DELETE /entries/:id
GET    /summary?userId=&days=14
GET    /food/categories
GET    /food/images?userId=
POST   /food/images
GET    /food/openfoodfacts/products/:barcode
GET    /food/openfoodfacts/search?q=&pageSize=10
```

### Diary Entry Example

```bash
curl -X POST http://localhost:3001/entries \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "demo-user",
    "occurredAt": "2026-05-09T10:00:00.000Z",
    "food": [
      {
        "name": "Pasta mit Tomatensauce",
        "mealType": "lunch",
        "amount": "1 plate",
        "triggerCategories": ["gluten", "nightshades"]
      }
    ],
    "sport": {
      "type": "running",
      "durationMinutes": 35,
      "intensity": 4,
      "sweatLevel": 8,
      "location": "outdoor"
    },
    "stress": {
      "level": 7,
      "source": "hackathon deadline"
    },
    "activeRashes": [
      {
        "bodyRegionId": "arm_left",
        "side": "front",
        "itchiness": 8,
        "dryness": 6,
        "active": true
      }
    ],
    "foodImages": [
      {
        "storageUrl": "https://example.com/pasta.jpg",
        "foodItemName": "Pasta mit Tomatensauce"
      }
    ],
    "notes": "Juckreiz nach Sport beobachtet"
  }'
```

### OpenFoodFacts

OpenFoodFacts enrichment is opt-in to avoid accidental external API traffic:

```bash
curl -X POST http://localhost:3001/entries \
  -H "Content-Type: application/json" \
  -d '{"userId":"demo-user","enrichOpenFoodFacts":true,"food":[{"name":"Product scan","barcode":"737628064502"}]}'
```

Configure the integration with:

```text
OPENFOODFACTS_BASE_URL=https://world.openfoodfacts.org
OPENFOODFACTS_USER_AGENT=neurodermitis-tracker/0.1 (prototype)
```

## Environment Service

The Environment Service captures weather, pollen and air-quality context for a
location and can persist that snapshot together with the user's current rash
state. This is the main data model for later trigger analysis like "flare after
high grass pollen" or "dryness when humidity is low".

Provider-backed snapshots use Open-Meteo:

- Weather Forecast API for temperature, humidity, pressure, rain, wind and UV.
- Air Quality API for alder, birch, grass, mugwort, olive and ragweed pollen,
  PM10, PM2.5 and European AQI.

### Routes

```text
GET  /metadata
GET  /snapshot?latitude=&longitude=&userId=&persist=false
GET  /snapshots?userId=&from=&to=&symptomObserved=true&limit=100
POST /snapshots
POST /snapshots/capture
GET  /summary?userId=&days=14
GET  /context-events?userId=
POST /context-events
```

### Capture Weather, Pollen And Flare Context

Use this when the app user reports an active rash and you want to store the
environmental context at that moment:

```bash
curl -X POST http://localhost:3004/snapshots/capture \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "demo-user",
    "latitude": 48.1351,
    "longitude": 11.5820,
    "symptomObserved": true,
    "activeRashes": [
      {
        "bodyRegionId": "arm_left",
        "side": "front",
        "itchiness": 7,
        "dryness": 6,
        "active": true
      }
    ],
    "notes": "Ausschlag nach Spaziergang beobachtet"
  }'
```

Through the gateway:

```text
POST http://localhost:3000/api/environment/snapshots/capture
```

For Expo Go, replace `localhost` with the Mac LAN IP and keep port `3000`.

### Read Saved Flare-Environment Snapshots

```bash
curl "http://localhost:3004/snapshots?userId=demo-user&symptomObserved=true"
curl "http://localhost:3004/summary?userId=demo-user&days=14"
```

Configure provider defaults with:

```text
OPEN_METEO_WEATHER_BASE_URL=https://api.open-meteo.com
OPEN_METEO_AIR_QUALITY_BASE_URL=https://air-quality-api.open-meteo.com
POLLEN_RISK_MEDIUM_THRESHOLD=10
POLLEN_RISK_HIGH_THRESHOLD=50
```

## Treatment Service

The Treatment Service tracks medication/care products and concrete applications
on body regions. It is shaped for later treatment optimization, e.g. comparing
itchiness before and after applying a cream.

### Routes

```text
GET    /metadata
GET    /medications?userId=&active=true&type=
POST   /medications
GET    /medications/:id
PATCH  /medications/:id
DELETE /medications/:id
GET    /applications?userId=&medicationId=&bodyRegionId=&from=&to=
POST   /applications
GET    /applications/:id
PATCH  /applications/:id
DELETE /applications/:id
GET    /summary?userId=&days=14
```

### Medication Example

```bash
curl -X POST http://localhost:3006/medications \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "demo-user",
    "name": "Basic Pflegecreme",
    "type": "emollient",
    "form": "cream",
    "dosage": "thin layer",
    "schedule": "morning and evening",
    "instructions": "Apply after showering"
  }'
```

### Treatment Application Example

```bash
curl -X POST http://localhost:3006/applications \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "demo-user",
    "medicationId": "med_...",
    "appliedAt": "2026-05-09T20:00:00.000Z",
    "bodyRegionId": "left_arm_front",
    "amount": "pea-sized",
    "reason": "flare",
    "itchinessBefore": 8,
    "itchinessAfter": 5,
    "drynessBefore": 7,
    "drynessAfter": 4,
    "effectiveness": 7
  }'
```

## Insights Service

The Insights Service builds deterministic, explainable analytics from diary,
skin, photo, environment and treatment data. It does not claim medical
causation. It ranks possible personal patterns and creates 24-48h flare risk
forecasts.

### Routes

```text
GET  /metadata
GET  /features?userId=&days=30
POST /features/rebuild
GET  /triggers?userId=&days=30&lagHours=48
POST /trigger-candidates
GET  /forecast?userId=&horizonHours=24&days=30
POST /explain
```

### Forecast Example

```bash
curl "http://localhost:3005/forecast?userId=demo-user&horizonHours=48&days=30"
```

Through the gateway:

```text
GET http://localhost:3000/api/insights/forecast?userId=demo-user&horizonHours=48
```

### Trigger Analysis Example

```bash
curl "http://localhost:3005/triggers?userId=demo-user&days=30&lagHours=48"
```

### LLM Explanation

The deterministic forecast and trigger candidates work without OpenAI. If
`OPENAI_API_KEY` or `AI_PROVIDER_API_KEY` is set, `/explain` asks the configured
model to produce a cautious German UI explanation.

```bash
curl -X POST http://localhost:3005/explain \
  -H "Content-Type: application/json" \
  -d '{"userId":"demo-user","days":30,"horizonHours":48}'
```

Configure with:

```text
OPENAI_API_KEY=
OPENAI_INSIGHTS_MODEL=gpt-4.1-mini
```

## Next Backend Steps

1. Add authentication and user ownership checks.
2. Add real image upload storage for Diary food images and the Photo Service.
3. Add OpenFoodFacts write/photo upload flow if contributor auth is needed.
4. Implement trigger detection and 24-48h flare prediction in the Insights Service.
5. Replace prototype pollen risk thresholds with medically reviewed thresholds.
