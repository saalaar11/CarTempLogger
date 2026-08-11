import { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ScanScreen from "./scan";
import ReadingScreen from "./ReadingScreen";
import HistoryScreen, { ScanRecord } from "./HistoryScreen";
import LoginScreen from "./LoginScreen";

type Screen = "home" | "scan" | "reading" | "history";
type Inspector = { name: string; id: string };

function getStatus(avg: number): ScanRecord["status"] {
  if (avg >= 80) return "FLAG FOR SERVICE";
  if (avg > 75) return "WATCH";
  return "OK";
}

const STORAGE_KEY = "cart_temp_records";

export default function App() {
  const [inspector, setInspector] = useState<Inspector | null>(null);
  const [screen, setScreen] = useState<Screen>("home");
  const [carID, setCarID] = useState<string | null>(null);
  const [records, setRecords] = useState<ScanRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [scanStartTime, setScanStartTime] = useState<number>(Date.now());
  

  // Load records from storage on app start
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(val => {
      if (val) setRecords(JSON.parse(val));
      setLoaded(true);
    });
  }, []);

  // Save records to storage whenever they change
  useEffect(() => {
    if (loaded) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    }
  }, [records, loaded]);

  if (!inspector) {
    return <LoginScreen onLogin={setInspector} />;
  }

  if (screen === "scan") {
    return (
      <ScanScreen
        onScanned={(id) => { setCarID(id); setScreen("reading"); setScanStartTime(Date.now()); }}
      />
    );
  }

  if (screen === "reading" && carID) {
    return (
      <ReadingScreen
        carID={carID}
        onComplete={(readings) => {
          const avg = (readings.center + readings.ventA + readings.ventB) / 3;
          const newRecord: ScanRecord = {
              id: Date.now().toString(),
              carID,
              center: readings.center,
              ventA: readings.ventA,
              ventB: readings.ventB,
              average: avg,
              status: getStatus(avg),
              timestamp: Date.now(),
              startTime: scanStartTime,  // we'll add this below
              inspectorName: inspector.name,
              inspectorID: inspector.id,
              depot: readings.depot,
              notes: readings.notes || "",
            };
          setRecords(prev => [...prev, newRecord]);
          setScreen("home");
        }}
        onBack={() => setScreen("home")}
      />
    );
  }

  if (screen === "history") {
    return (
      <HistoryScreen
        records={records}
        onBack={() => setScreen("home")}
        onClear={() => setRecords([])}
      />
    );
  }

  const lastRecord = records[records.length - 1];

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.inspectorText}>👤 {inspector.name}</Text>
        <Pressable onPress={() => setInspector(null)}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      <Text style={styles.title}>Car Temp Logger</Text>

      {lastRecord && (
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>Last Scan</Text>
          <Text style={styles.summaryCarID}>{lastRecord.carID}</Text>
          <Text style={styles.summaryAvg}>{lastRecord.average.toFixed(2)}°F avg</Text>
        </View>
      )}

      <Pressable style={styles.primaryButton} onPress={() => setScreen("scan")}>
        <Text style={styles.primaryButtonText}>Scan Car Barcode</Text>
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={() => setScreen("history")}>
        <Text style={styles.secondaryButtonText}>
          History {records.length > 0 ? `(${records.length})` : ""}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 24, paddingTop: 60, gap: 16 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  inspectorText: { fontSize: 14, color: "#333", fontWeight: "500" },
  logoutText: { fontSize: 14, color: "#FF3B30", fontWeight: "600" },
  title: { fontSize: 28, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  summaryBox: { alignItems: "center", padding: 16, backgroundColor: "#f2f2f7", borderRadius: 12, gap: 4 },
  summaryLabel: { fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: 1 },
  summaryCarID: { fontSize: 24, fontWeight: "700", letterSpacing: 2 },
  summaryAvg: { fontSize: 16, color: "#555" },
  primaryButton: { backgroundColor: "#007AFF", padding: 16, borderRadius: 10, alignItems: "center" },
  primaryButtonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  secondaryButton: { backgroundColor: "#f2f2f7", padding: 16, borderRadius: 10, alignItems: "center" },
  secondaryButtonText: { color: "#007AFF", fontSize: 18, fontWeight: "600" },
});