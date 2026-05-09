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

## Next Backend Steps

1. Replace in-memory stores with a database per service or a shared development database.
2. Add authentication and user ownership checks.
3. Add real image upload storage for Diary food images and the Photo Service.
4. Add OpenFoodFacts write/photo upload flow if contributor auth is needed.
5. Connect weather and pollen providers in the Environment Service.
6. Implement trigger detection and 24-48h flare prediction in the Insights Service.
