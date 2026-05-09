import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type JsonValue = unknown;

type ServiceState = {
  health?: JsonValue;
  diarySummary?: JsonValue;
  bodyMap?: JsonValue;
  photos?: JsonValue;
  environmentSummary?: JsonValue;
  environmentSnapshots?: JsonValue;
  treatmentSummary?: JsonValue;
  forecast?: JsonValue;
};

type PhotoUpload = {
  id: string;
  uri: string;
  dataUri: string;
  filename?: string;
};

type ApiError = {
  error?: string;
  message?: string;
};

const bodyRegions = [
  { id: "head", label: "Head" },
  { id: "neck_front", label: "Neck" },
  { id: "chest", label: "Chest" },
  { id: "left_arm_front", label: "Left arm" },
  { id: "right_arm_front", label: "Right arm" },
  { id: "left_hand_front", label: "Left hand" },
  { id: "right_hand_front", label: "Right hand" },
  { id: "upper_back", label: "Upper back" },
  { id: "lower_back", label: "Lower back" },
  { id: "left_leg_front", label: "Left leg" },
  { id: "right_leg_front", label: "Right leg" },
];

const triggerCategories = [
  "gluten",
  "nightshades",
  "dairy",
  "nuts",
  "soy",
  "histamine",
  "high_sugar",
  "spicy",
  "alcohol",
  "ultra_processed",
];

const fallbackApiBaseUrl = "http://10.14.52.173:3000";

function formatJson(value: JsonValue) {
  return JSON.stringify(value ?? null, null, 2);
}

function asApiError(value: unknown): ApiError {
  return value && typeof value === "object" ? (value as ApiError) : {};
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  const apiError = asApiError(error);
  return apiError.message ?? apiError.error ?? "Request failed";
}

export default function App() {
  const [apiBaseUrl, setApiBaseUrl] = useState(fallbackApiBaseUrl);
  const [userId, setUserId] = useState("demo-user");
  const [bodyRegionId, setBodyRegionId] = useState("left_arm_front");
  const [status, setStatus] = useState("Ready");
  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<JsonValue>({
    hint: "Run an action to test a service.",
  });
  const [state, setState] = useState<ServiceState>({});

  const [foodName, setFoodName] = useState("Pasta mit Tomatensauce");
  const [foodCategory, setFoodCategory] = useState("gluten");
  const [stressLevel, setStressLevel] = useState("6");
  const [sportType, setSportType] = useState("running");
  const [sweatLevel, setSweatLevel] = useState("7");
  const [itchiness, setItchiness] = useState("7");
  const [dryness, setDryness] = useState("6");
  const [barcode, setBarcode] = useState("737628064502");
  const [latitude, setLatitude] = useState("48.1351");
  const [longitude, setLongitude] = useState("11.5820");
  const [photoUpload, setPhotoUpload] = useState<PhotoUpload | undefined>();
  const [lastPhotoId, setLastPhotoId] = useState("");
  const [medicationName, setMedicationName] = useState("Basic Pflegecreme");
  const [lastMedicationId, setLastMedicationId] = useState("");

  const apiBase = useMemo(
    () => apiBaseUrl.trim().replace(/\/+$/, ""),
    [apiBaseUrl],
  );

  async function request<T = JsonValue>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const response = await fetch(`${apiBase}${path}`, {
      ...options,
      headers: {
        "content-type": "application/json",
        ...options.headers,
      },
    });
    const contentType = response.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json")
      ? ((await response.json()) as JsonValue)
      : await response.text();

    if (!response.ok) {
      throw body;
    }

    return body as T;
  }

  async function runAction(label: string, action: () => Promise<JsonValue>) {
    setLoading(true);
    setStatus(`${label}...`);

    try {
      const result = await action();
      setLastResponse(result);
      setStatus(`${label} done`);
      await refreshAll(false);
      return result;
    } catch (error) {
      const message = getErrorMessage(error);
      setLastResponse({ error: message, raw: error });
      setStatus(`${label} failed: ${message}`);
      Alert.alert(label, message);
      return undefined;
    } finally {
      setLoading(false);
    }
  }

  async function refreshAll(updateStatus = true) {
    if (updateStatus) {
      setLoading(true);
      setStatus("Refreshing services...");
    }

    try {
      const [
        health,
        diarySummary,
        bodyMap,
        photos,
        environmentSummary,
        environmentSnapshots,
        treatmentSummary,
        forecast,
      ] = await Promise.allSettled([
        request("/api/health"),
        request(`/api/diary/summary?userId=${encodeURIComponent(userId)}&days=14`),
        request(`/api/skin/body-map?userId=${encodeURIComponent(userId)}`),
        request(`/api/photos?userId=${encodeURIComponent(userId)}`),
        request(`/api/environment/summary?userId=${encodeURIComponent(userId)}&days=14`),
        request(
          `/api/environment/snapshots?userId=${encodeURIComponent(
            userId,
          )}&symptomObserved=true&limit=5`,
        ),
        request(`/api/treatment/summary?userId=${encodeURIComponent(userId)}&days=14`),
        request(`/api/insights/forecast?userId=${encodeURIComponent(userId)}`),
      ]);

      setState({
        health: health.status === "fulfilled" ? health.value : undefined,
        diarySummary:
          diarySummary.status === "fulfilled" ? diarySummary.value : undefined,
        bodyMap: bodyMap.status === "fulfilled" ? bodyMap.value : undefined,
        photos: photos.status === "fulfilled" ? photos.value : undefined,
        environmentSummary:
          environmentSummary.status === "fulfilled"
            ? environmentSummary.value
            : undefined,
        environmentSnapshots:
          environmentSnapshots.status === "fulfilled"
            ? environmentSnapshots.value
            : undefined,
        treatmentSummary:
          treatmentSummary.status === "fulfilled" ? treatmentSummary.value : undefined,
        forecast: forecast.status === "fulfilled" ? forecast.value : undefined,
      });

      if (updateStatus) {
        setStatus("Refresh done");
      }
    } finally {
      if (updateStatus) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    void refreshAll(false);
  }, []);

  function numberValue(value: string, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  async function createDiaryEntry() {
    return runAction("Diary entry", () =>
      request("/api/diary/entries", {
        method: "POST",
        body: JSON.stringify({
          userId,
          food: [
            {
              name: foodName,
              mealType: "lunch",
              amount: "1 portion",
              triggerCategories: [foodCategory],
            },
          ],
          sport: {
            type: sportType,
            durationMinutes: 35,
            intensity: 4,
            sweatLevel: numberValue(sweatLevel),
            location: "outdoor",
          },
          stress: {
            level: numberValue(stressLevel),
            source: "Expo Go manual test",
          },
          activeRashes: [
            {
              bodyRegionId,
              itchiness: numberValue(itchiness),
              dryness: numberValue(dryness),
              active: true,
            },
          ],
          notes: "Created from Expo Go test console",
        }),
      }),
    );
  }

  async function createSkinEntry() {
    return runAction("Skin entry", () =>
      request("/api/skin/entries", {
        method: "POST",
        body: JSON.stringify({
          userId,
          bodyRegionId,
          intensity: 4,
          itchiness: numberValue(itchiness),
          dryness: numberValue(dryness),
          redness: 5,
          active: true,
          photoIds: lastPhotoId ? [lastPhotoId] : [],
          notes: "Expo Go skin log",
        }),
      }),
    );
  }

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Photos", "Photo library permission is required.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.75,
      base64: true,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];

    if (!asset.base64) {
      Alert.alert("Photos", "The selected image did not include base64 data.");
      return;
    }

    const mimeType = asset.mimeType ?? "image/jpeg";
    setPhotoUpload({
      id: `${Date.now()}`,
      uri: asset.uri,
      dataUri: `data:${mimeType};base64,${asset.base64}`,
      filename: asset.fileName ?? "rash-photo.jpg",
    });
  }

  async function uploadPhoto() {
    return runAction("Photo upload", async () => {
      if (!photoUpload) {
        throw new Error("Choose an image first.");
      }

      const result = await request<{ photo?: { id?: string } }>("/api/photos", {
        method: "POST",
        body: JSON.stringify({
          userId,
          dataUri: photoUpload.dataUri,
          originalFilename: photoUpload.filename,
          notes: "Uploaded from Expo Go test console",
          analyze: false,
        }),
      });
      const photoId = result.photo?.id;

      if (photoId) {
        setLastPhotoId(photoId);
      }

      return result;
    });
  }

  async function enrichFood() {
    return runAction("OpenFoodFacts lookup", () =>
      request(
        `/api/diary/food/openfoodfacts/products/${encodeURIComponent(barcode)}`,
      ),
    );
  }

  async function useCurrentLocation() {
    setLoading(true);
    setStatus("Reading location...");

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (!permission.granted) {
        throw new Error("Location permission is required.");
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLatitude(position.coords.latitude.toFixed(5));
      setLongitude(position.coords.longitude.toFixed(5));
      setStatus("Location updated");
    } catch (error) {
      const message = getErrorMessage(error);
      setStatus(`Location failed: ${message}`);
      Alert.alert("Location", message);
    } finally {
      setLoading(false);
    }
  }

  async function captureEnvironment() {
    return runAction("Weather and pollen capture", () =>
      request("/api/environment/snapshots/capture", {
        method: "POST",
        body: JSON.stringify({
          userId,
          latitude: numberValue(latitude, 48.1351),
          longitude: numberValue(longitude, 11.582),
          symptomObserved: true,
          activeRashes: [
            {
              bodyRegionId,
              itchiness: numberValue(itchiness),
              dryness: numberValue(dryness),
              active: true,
            },
          ],
          notes: "Expo Go environment capture",
        }),
      }),
    );
  }

  async function createMedication() {
    return runAction("Medication", async () => {
      const result = await request<{ medication?: { id?: string } }>(
        "/api/treatment/medications",
        {
          method: "POST",
          body: JSON.stringify({
            userId,
            name: medicationName,
            type: "emollient",
            form: "cream",
            dosage: "thin layer",
            schedule: "morning and evening",
            active: true,
          }),
        },
      );
      const medicationId = result.medication?.id;

      if (medicationId) {
        setLastMedicationId(medicationId);
      }

      return result;
    });
  }

  async function createTreatmentApplication() {
    return runAction("Treatment application", () =>
      request("/api/treatment/applications", {
        method: "POST",
        body: JSON.stringify({
          userId,
          medicationId: lastMedicationId || undefined,
          bodyRegionId,
          amount: "pea-sized",
          reason: "flare",
          itchinessBefore: numberValue(itchiness),
          itchinessAfter: Math.max(0, numberValue(itchiness) - 2),
          drynessBefore: numberValue(dryness),
          drynessAfter: Math.max(0, numberValue(dryness) - 2),
          effectiveness: 7,
          notes: "Expo Go treatment log",
        }),
      }),
    );
  }

  async function loadInsights() {
    return runAction("Insights", async () => {
      const [forecast, triggers] = await Promise.all([
        request(`/api/insights/forecast?userId=${encodeURIComponent(userId)}`),
        request("/api/insights/trigger-candidates", {
          method: "POST",
          body: JSON.stringify({ userId }),
        }),
      ]);

      return { forecast, triggers };
    });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Neurodermitis Tracker</Text>
            <Text style={styles.title}>Expo Go Test Console</Text>
          </View>
          <Pressable style={styles.primaryButton} onPress={() => void refreshAll()}>
            <Text style={styles.primaryButtonText}>Refresh</Text>
          </Pressable>
        </View>

        <View style={styles.configCard}>
          <Field label="API Base URL" value={apiBaseUrl} onChangeText={setApiBaseUrl} />
          <Field label="User ID" value={userId} onChangeText={setUserId} />
          <Text style={styles.label}>Body region</Text>
          <View style={styles.segmentGrid}>
            {bodyRegions.map((region) => (
              <Pressable
                key={region.id}
                style={[
                  styles.segment,
                  bodyRegionId === region.id && styles.segmentActive,
                ]}
                onPress={() => setBodyRegionId(region.id)}
              >
                <Text
                  style={[
                    styles.segmentText,
                    bodyRegionId === region.id && styles.segmentTextActive,
                  ]}
                >
                  {region.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.statusRow}>
          {loading ? <ActivityIndicator color="#1f6f62" /> : null}
          <Text style={styles.statusText}>{status}</Text>
        </View>

        <Section title="Diary" subtitle="food, sport, stress">
          <Field label="Food" value={foodName} onChangeText={setFoodName} />
          <Text style={styles.label}>Trigger</Text>
          <View style={styles.segmentGrid}>
            {triggerCategories.map((category) => (
              <Pressable
                key={category}
                style={[
                  styles.segment,
                  foodCategory === category && styles.segmentActive,
                ]}
                onPress={() => setFoodCategory(category)}
              >
                <Text
                  style={[
                    styles.segmentText,
                    foodCategory === category && styles.segmentTextActive,
                  ]}
                >
                  {category}
                </Text>
              </Pressable>
            ))}
          </View>
          <Field label="Sport" value={sportType} onChangeText={setSportType} />
          <View style={styles.twoColumns}>
            <Field
              keyboardType="numeric"
              label="Stress 0-10"
              value={stressLevel}
              onChangeText={setStressLevel}
            />
            <Field
              keyboardType="numeric"
              label="Sweat 0-10"
              value={sweatLevel}
              onChangeText={setSweatLevel}
            />
          </View>
          <ActionButton title="Create diary entry" onPress={createDiaryEntry} />
          <Field label="Barcode" value={barcode} onChangeText={setBarcode} />
          <ActionButton title="Lookup OpenFoodFacts" onPress={enrichFood} />
        </Section>

        <Section title="Skin" subtitle="rash scales">
          <View style={styles.twoColumns}>
            <Field
              keyboardType="numeric"
              label="Itch 0-10"
              value={itchiness}
              onChangeText={setItchiness}
            />
            <Field
              keyboardType="numeric"
              label="Dryness 0-10"
              value={dryness}
              onChangeText={setDryness}
            />
          </View>
          <ActionButton title="Create skin entry" onPress={createSkinEntry} />
          <Text style={styles.smallText}>Linked photo: {lastPhotoId || "none"}</Text>
        </Section>

        <Section title="Photos" subtitle="rash upload">
          {photoUpload ? (
            <Image source={{ uri: photoUpload.uri }} style={styles.previewImage} />
          ) : null}
          <View style={styles.twoColumns}>
            <ActionButton title="Pick photo" onPress={pickPhoto} />
            <ActionButton title="Upload photo" onPress={uploadPhoto} />
          </View>
        </Section>

        <Section title="Environment" subtitle="weather and pollen">
          <View style={styles.twoColumns}>
            <Field label="Latitude" value={latitude} onChangeText={setLatitude} />
            <Field label="Longitude" value={longitude} onChangeText={setLongitude} />
          </View>
          <View style={styles.twoColumns}>
            <ActionButton title="Use location" onPress={useCurrentLocation} />
            <ActionButton title="Capture flare context" onPress={captureEnvironment} />
          </View>
        </Section>

        <Section title="Treatment" subtitle="medication and application">
          <Field
            label="Medication"
            value={medicationName}
            onChangeText={setMedicationName}
          />
          <View style={styles.twoColumns}>
            <ActionButton title="Create medication" onPress={createMedication} />
            <ActionButton title="Log application" onPress={createTreatmentApplication} />
          </View>
          <Text style={styles.smallText}>
            Medication ID: {lastMedicationId || "none"}
          </Text>
        </Section>

        <Section title="Insights" subtitle="forecast placeholders">
          <View style={styles.twoColumns}>
            <ActionButton title="Run insights" onPress={loadInsights} />
            <ActionButton title="Refresh dashboard" onPress={() => refreshAll()} />
          </View>
        </Section>

        <DataPanel title="Health" value={state.health} />
        <DataPanel title="Diary summary" value={state.diarySummary} />
        <DataPanel title="Skin body map" value={state.bodyMap} />
        <DataPanel title="Photos" value={state.photos} />
        <DataPanel title="Environment summary" value={state.environmentSummary} />
        <DataPanel title="Environment flares" value={state.environmentSnapshots} />
        <DataPanel title="Treatment summary" value={state.treatmentSummary} />
        <DataPanel title="Insights forecast" value={state.forecast} />
        <DataPanel title="Last response" value={lastResponse} dark />
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "numeric";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType={keyboardType ?? "default"}
        onChangeText={onChangeText}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>
      {children}
    </View>
  );
}

function ActionButton({
  title,
  onPress,
}: {
  title: string;
  onPress: () => Promise<unknown> | void;
}) {
  return (
    <Pressable style={styles.button} onPress={() => void onPress()}>
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}

function DataPanel({
  title,
  value,
  dark,
}: {
  title: string;
  value: JsonValue;
  dark?: boolean;
}) {
  return (
    <View style={[styles.dataPanel, dark && styles.dataPanelDark]}>
      <Text style={[styles.dataTitle, dark && styles.dataTitleDark]}>{title}</Text>
      <Text style={[styles.jsonText, dark && styles.jsonTextDark]}>
        {value === undefined ? "No data" : formatJson(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f4f6f7",
  },
  container: {
    gap: 14,
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  eyebrow: {
    color: "#2e7d6f",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  title: {
    color: "#1e252b",
    fontSize: 25,
    fontWeight: "800",
    lineHeight: 30,
  },
  configCard: {
    backgroundColor: "#ffffff",
    borderColor: "#d7dee3",
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#d7dee3",
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  cardHeader: {
    alignItems: "baseline",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardTitle: {
    color: "#1e252b",
    fontSize: 18,
    fontWeight: "800",
  },
  cardSubtitle: {
    color: "#687681",
    fontSize: 12,
    fontWeight: "700",
  },
  field: {
    gap: 6,
  },
  label: {
    color: "#53616c",
    fontSize: 12,
    fontWeight: "800",
  },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#c8d1d8",
    borderRadius: 7,
    borderWidth: 1,
    color: "#1e252b",
    minHeight: 42,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  twoColumns: {
    flexDirection: "row",
    gap: 10,
  },
  segmentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  segment: {
    borderColor: "#c8d1d8",
    borderRadius: 7,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  segmentActive: {
    backgroundColor: "#1f6f62",
    borderColor: "#1f6f62",
  },
  segmentText: {
    color: "#40505a",
    fontSize: 12,
    fontWeight: "800",
  },
  segmentTextActive: {
    color: "#ffffff",
  },
  button: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#bcc7cf",
    borderRadius: 7,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  buttonText: {
    color: "#1e252b",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#1f6f62",
    borderRadius: 7,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  statusRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 24,
  },
  statusText: {
    color: "#485762",
    flex: 1,
    fontSize: 14,
  },
  previewImage: {
    backgroundColor: "#e7ecef",
    borderRadius: 8,
    height: 180,
    resizeMode: "cover",
    width: "100%",
  },
  smallText: {
    color: "#40505a",
    fontSize: 13,
    fontWeight: "600",
  },
  dataPanel: {
    backgroundColor: "#ffffff",
    borderColor: "#d7dee3",
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  dataPanelDark: {
    backgroundColor: "#172026",
    borderColor: "#172026",
  },
  dataTitle: {
    color: "#1e252b",
    fontSize: 15,
    fontWeight: "800",
  },
  dataTitleDark: {
    color: "#ffffff",
  },
  jsonText: {
    color: "#33414a",
    fontFamily: "Courier",
    fontSize: 11,
    lineHeight: 15,
  },
  jsonTextDark: {
    color: "#dbe7e4",
  },
});
