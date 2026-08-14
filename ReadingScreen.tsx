import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { View, Text, StyleSheet, TextInput,
  Pressable, ScrollView, KeyboardAvoidingView, Platform, Image, Alert } from "react-native";
import { useBLE } from "./useBLE";

type Props = {
  carID: string;
  onComplete: (readings: {
  center: number;
  ventA: number;
  ventB: number;
  depot: string;
  notes: string;
  photos: string[];
}) => void;
  onBack: () => void;
};

type Readings = { center: string; ventA: string; ventB: string };
type DecalKey = keyof Readings;

const DECALS: { key: DecalKey; label: string }[] = [
  { key: "center", label: "Center Decal" },
  { key: "ventA",  label: "Vent A Decal" },
  { key: "ventB",  label: "Vent B Decal" },
];

const DEPOTS = [
  "EAST NEW YORK", "CONEY ISLAND", "JEROME", "LIVONIA",
  "PITKIN", "CONCOURSE", "CORONA", "FRESH POND", "JAMAICA",
];

function getStatus(avg: number): { label: string; color: string } {
  if (avg >= 80) return { label: "FLAG FOR SERVICE", color: "#FF3B30" };
  if (avg > 75)  return { label: "WATCH",            color: "#FF9500" };
  return           { label: "OK",               color: "#34C759" };
}

function sensorDotColor(bleStatus: string) {
  if (bleStatus === "connected") return "#34C759";
  if (bleStatus === "scanning")  return "#FF9500";
  return "#ccc";
}

function sensorStatusLabel(bleStatus: string, temp: number | null) {
  if (bleStatus === "connected" && temp !== null)
    return `Sensor connected · ${temp.toFixed(2)}°F`;
  if (bleStatus === "scanning")    return "Scanning for sensor...";
  if (bleStatus === "disconnected") return "Sensor not found — manual entry";
  if (bleStatus === "error")        return "Bluetooth error — manual entry";
  return "No sensor connected";
}

export default function ReadingScreen({ carID, onComplete, onBack }: Props) {
  const [readings, setReadings] = useState<Readings>({ center: "", ventA: "", ventB: "" });
  const [depot, setDepot] = useState("EAST NEW YORK");
  const { status, temperature, startScan, disconnect } = useBLE();
  const [noteText, setNoteText] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);

  const parsed = {
    center: parseFloat(readings.center),
    ventA:  parseFloat(readings.ventA),
    ventB:  parseFloat(readings.ventB),
  };
  const allValid = !isNaN(parsed.center) && !isNaN(parsed.ventA) && !isNaN(parsed.ventB);
  const average  = allValid ? (parsed.center + parsed.ventA + parsed.ventB) / 3 : null;
  const statusResult = average !== null ? getStatus(average) : null;

  async function handleTakePhoto() {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert("Permission needed", "Camera access is required to take photos.");
    return;
  }
  const result = await ImagePicker.launchCameraAsync({
    quality: 0.6,
    allowsEditing: false,
  });
  if (!result.canceled && result.assets[0]) {
    setPhotos(prev => [...prev, result.assets[0].uri]);
  }
}

  function captureReading(key: DecalKey) {
    if (temperature !== null) {
      setReadings(prev => ({ ...prev, [key]: temperature.toFixed(2) }));
    }
  }

  function updateManual(key: DecalKey, value: string) {
    if (/^\d*\.?\d*$/.test(value)) {
      setReadings(prev => ({ ...prev, [key]: value }));
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.container}>

        {/* Back button */}
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <Text style={styles.title}>Temperature Readings</Text>

        {/* Car ID */}
        <View style={styles.carIDBox}>
          <Text style={styles.carIDLabel}>Car ID</Text>
          <Text style={styles.carIDText}>{carID}</Text>
        </View>

        {/* Depot selector */}
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Depot</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {DEPOTS.map(d => (
                <Pressable
                  key={d}
                  style={[styles.depotChip, depot === d && styles.depotChipSelected]}
                  onPress={() => setDepot(d)}
                >
                  <Text style={[styles.depotChipText, depot === d && styles.depotChipTextSelected]}>
                    {d}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Sensor status bar */}
        <View style={styles.sensorBar}>
          <View style={[styles.dot, { backgroundColor: sensorDotColor(status) }]} />
          <Text style={styles.sensorLabel}>{sensorStatusLabel(status, temperature)}</Text>
          {(status === "idle" || status === "disconnected" || status === "error") && (
            <Pressable style={styles.connectBtn} onPress={startScan}>
              <Text style={styles.connectBtnText}>Connect</Text>
            </Pressable>
          )}
          {status === "connected" && (
            <Pressable style={styles.connectBtn} onPress={disconnect}>
              <Text style={styles.connectBtnText}>Disconnect</Text>
            </Pressable>
          )}
        </View>

        {/* Decal input fields */}
        {DECALS.map(({ key, label }) => (
          <View key={key} style={styles.inputRow}>
            <Text style={styles.inputLabel}>{label}</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={readings[key]}
                onChangeText={(v) => updateManual(key, v)}
                keyboardType="decimal-pad"
                placeholder="0.0"
                placeholderTextColor="#999"
              />
              <Text style={styles.unit}>°F</Text>
              {status === "connected" && temperature !== null && (
                <Pressable style={styles.captureBtn} onPress={() => captureReading(key)}>
                  <Text style={styles.captureBtnText}>Capture</Text>
                </Pressable>
              )}
            </View>
          </View>
        ))}

        {/* Live average and status badge */}
        {average !== null && statusResult !== null && (
          <View style={[styles.statusBox, { borderColor: statusResult.color }]}>
            <Text style={styles.avgLabel}>Average</Text>
            <Text style={styles.avgValue}>{average.toFixed(2)}°F</Text>
            <Text style={[styles.statusLabel, { color: statusResult.color }]}>
              {statusResult.label}
            </Text>
          </View>
        )}

        {/* Notes */}
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Notes (optional)</Text>
          <TextInput
            style={styles.notesInput}
            value={noteText}
            onChangeText={setNoteText}
            placeholder="Enter any observations about this car..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
            maxLength={300}
          />
        </View>

        {/* Photos */}
<View style={styles.inputRow}>
  <Text style={styles.inputLabel}>Photos ({photos.length}/5)</Text>
  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
    <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
      {photos.map((uri, index) => (
        <View key={index} style={styles.photoWrapper}>
          <Image source={{ uri }} style={styles.photoThumb} />
          <Pressable
            style={styles.photoDelete}
            onPress={() => setPhotos(prev => prev.filter((_, i) => i !== index))}
          >
            <Text style={styles.photoDeleteText}>✕</Text>
          </Pressable>
        </View>
      ))}
      {photos.length < 5 && (
        <Pressable style={styles.photoAddBtn} onPress={handleTakePhoto}>
          <Text style={styles.photoAddText}>📷 Add Photo</Text>
        </Pressable>
      )}
    </View>
  </ScrollView>
</View>

        {/* Save button */}
        <Pressable
          style={[styles.button, !allValid && styles.buttonDisabled]}
          onPress={() => allValid && onComplete({ ...parsed, depot, notes: noteText, photos })}
          disabled={!allValid}
        >
          <Text style={styles.buttonText}>Save Reading</Text>
        </Pressable>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:            { flex: 1, backgroundColor: "#fff" },
  container:       { padding: 24, paddingTop: 60, gap: 20, alignItems: "stretch" },
  backButton:      { marginBottom: 4 },
  backText:        { color: "#007AFF", fontSize: 16 },
  title:           { fontSize: 26, fontWeight: "700", textAlign: "center" },
  carIDBox:        { alignItems: "center", gap: 4 },
  carIDLabel:      { fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: 1 },
  carIDText:       { fontSize: 28, fontWeight: "700", letterSpacing: 3 },
  inputRow:        { gap: 6 },
  inputLabel:      { fontSize: 14, fontWeight: "600", color: "#333" },
  depotChip:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: "#ddd" },
  depotChipSelected:     { backgroundColor: "#007AFF", borderColor: "#007AFF" },
  depotChipText:         { fontSize: 12, color: "#555", fontWeight: "500" },
  depotChipTextSelected: { color: "#fff" },
  sensorBar:       { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#f2f2f7", borderRadius: 10, padding: 12 },
  dot:             { width: 10, height: 10, borderRadius: 5 },
  sensorLabel:     { flex: 1, fontSize: 13, color: "#333" },
  connectBtn:      { backgroundColor: "#007AFF", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  connectBtnText:  { color: "#fff", fontSize: 13, fontWeight: "600" },
  inputWrapper:    { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: "#ddd", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  input:           { flex: 1, fontSize: 22, fontWeight: "600", color: "#000" },
  unit:            { fontSize: 18, color: "#666" },
  captureBtn:      { backgroundColor: "#34C759", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  captureBtnText:  { color: "#fff", fontSize: 13, fontWeight: "700" },
  statusBox:       { borderWidth: 2, borderRadius: 12, padding: 20, alignItems: "center", gap: 4 },
  avgLabel:        { fontSize: 12, color: "#999", textTransform: "uppercase", letterSpacing: 1 },
  avgValue:        { fontSize: 36, fontWeight: "700" },
  statusLabel:     { fontSize: 18, fontWeight: "800", letterSpacing: 1 },
  button:          { backgroundColor: "#007AFF", borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  buttonDisabled:  { backgroundColor: "#ccc" },
  buttonText:      { color: "#fff", fontSize: 18, fontWeight: "700" },
  photoWrapper: { position: "relative" },
photoThumb: { width: 72, height: 72, borderRadius: 8 },
photoDelete: {
  position: "absolute", top: -6, right: -6,
  backgroundColor: "#FF3B30", borderRadius: 10,
  width: 20, height: 20, justifyContent: "center", alignItems: "center",
},
photoDeleteText: { color: "#fff", fontSize: 10, fontWeight: "700" },
photoAddBtn: {
  width: 72, height: 72, borderRadius: 8,
  borderWidth: 1.5, borderColor: "#007AFF", borderStyle: "dashed",
  justifyContent: "center", alignItems: "center",
},
photoAddText: { color: "#007AFF", fontSize: 11, textAlign: "center" },
  notesInput: {
  borderWidth: 1.5,
  borderColor: "#ddd",
  borderRadius: 10,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 15,
  color: "#000",
  minHeight: 80,
  textAlignVertical: "top",
},
});