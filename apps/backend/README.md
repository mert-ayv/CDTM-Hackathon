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
  -d '{"userId":"demo-user","occurredAt":"2026-05-09T10:00:00.000Z","food":[{"name":"Yogurt"}],"stressLevel":4}'
```

## Next Backend Steps

1. Replace in-memory stores with a database per service or a shared development database.
2. Add authentication and user ownership checks.
3. Add real image upload storage for the Photo Service.
4. Connect OpenFoodFacts for food metadata enrichment.
5. Connect weather and pollen providers in the Environment Service.
6. Implement trigger detection and 24-48h flare prediction in the Insights Service.
