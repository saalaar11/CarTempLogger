import { useState } from "react";
import {
  View, Text, StyleSheet, FlatList,
  Pressable, Share, Alert
} from "react-native";


export type ScanRecord = {
  id: string;
  carID: string;
  center: number;
  ventA: number;
  ventB: number;
  average: number;
  status: "OK" | "WATCH" | "FLAG FOR SERVICE";
  timestamp: number;
  inspectorName: string;
  inspectorID: string;
  depot: string;
};

type Props = {
  records: ScanRecord[];
  onBack: () => void;
  onClear: () => void;
};

// Replace with your laptop's actual IP address (run ipconfig to find it)
const SERVER_URL = "cartempserver-production.up.railway.app";

function statusColor(status: string) {
  if (status === "FLAG FOR SERVICE") return "#FF3B30";
  if (status === "WATCH") return "#FF9500";
  return "#34C759";
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleString();
}

function generateCSV(records: ScanRecord[]): string {
  const header = "Inspection DateTime,Inspector Name,Inspector ID,Car Number,Center (°F),Vent A (°F),Vent B (°F),Average (°F),Status,Shift,Location";
  const rows = records.map(r => {
    const dt = new Date(r.timestamp);
    const shift = dt.getHours() < 12 ? "AM" : "PM";
    return `${formatDate(r.timestamp)},${r.inspectorName},${r.inspectorID},${r.carID},${r.center.toFixed(2)},${r.ventA.toFixed(2)},${r.ventB.toFixed(2)},${r.average.toFixed(2)},${r.status},${shift},${r.depot}`;
  });
  return [header, ...rows].join("\n");
}

export default function HistoryScreen({ records, onBack, onClear }: Props) {
const [uploading, setUploading] = useState(false);
  async function handleExport() {
    if (records.length === 0) {
      Alert.alert("No data", "No scan records to export yet.");
      return;
    }
    const csv = generateCSV(records);
    await Share.share({
      message: csv,
      title: "Car Temp Inspection Report",
    });
  }

  async function handleUpload() {
  if (records.length === 0) {
    Alert.alert("No data", "No records to upload.");
    return;
  }
  if (uploading) return;

  setUploading(true);
  const csv = generateCSV(records);

  // 10 second timeout so it fails fast instead of hanging
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${SERVER_URL}/upload-csv`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: csv,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const result = await response.json();
    Alert.alert("Upload Successful", `${result.added} records sent to server.`);
  } catch (e: any) {
    clearTimeout(timeout);
    const msg = e?.name === "AbortError"
      ? "Request timed out. Check that the server is running and the URL is correct."
      : "Could not reach the server.\n\n• Is node server.js running?\n• Is the tunnel URL current?\n• Are phone and laptop on same network?";
    Alert.alert("Upload Failed", msg);
  } finally {
    setUploading(false);
  }
}

  function confirmClear() {
    Alert.alert(
      "Clear History",
      "This will delete all scan records. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear", style: "destructive", onPress: onClear },
      ]
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onBack}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>History</Text>
        <View style={styles.headerActions}>
          <Pressable
  onPress={handleUpload}
  style={[styles.uploadBtn, uploading && styles.uploadBtnDisabled]}
  disabled={uploading}
>
  <Text style={styles.uploadBtnText}>
    {uploading ? "Uploading..." : "↑ Upload"}
  </Text>
</Pressable>
          <Pressable onPress={handleExport}>
            <Text style={styles.exportText}>Export CSV</Text>
          </Pressable>
        </View>
      </View>

      {records.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No scans recorded yet.</Text>
        </View>
      ) : (
        <FlatList
          data={[...records].reverse()}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardCarID}>{item.carID}</Text>
                <Text style={[styles.cardStatus, { color: statusColor(item.status) }]}>
                  {item.status}
                </Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.cardDetail}>Center: {item.center.toFixed(1)}°F</Text>
                <Text style={styles.cardDetail}>Vent A: {item.ventA.toFixed(1)}°F</Text>
                <Text style={styles.cardDetail}>Vent B: {item.ventB.toFixed(1)}°F</Text>
              </View>
              <View style={styles.cardFooter}>
                <Text style={styles.cardAvg}>Avg: {item.average.toFixed(2)}°F avg</Text>
                <Text style={styles.cardTime}>{formatDate(item.timestamp)}</Text>
              </View>
              <Text style={styles.cardDepot}>{item.depot} · {item.inspectorName}</Text>
            </View>
          )}
        />
      )}

      {records.length > 0 && (
        <Pressable style={styles.clearButton} onPress={confirmClear}>
          <Text style={styles.clearText}>Clear History</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f2f7" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e0e0e0",
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  backText: { color: "#007AFF", fontSize: 16 },
  title: { fontSize: 18, fontWeight: "700" },
  exportText: { color: "#007AFF", fontSize: 16, fontWeight: "600" },
  uploadBtn: {
    backgroundColor: "#34C759", paddingHorizontal: 10,
    paddingVertical: 5, borderRadius: 6,
  },
  uploadBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#999", fontSize: 16 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: "#fff", borderRadius: 12, padding: 16,
    gap: 8, shadowColor: "#000", shadowOpacity: 0.06,
    shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardCarID: { fontSize: 20, fontWeight: "700", letterSpacing: 2 },
  cardStatus: { fontSize: 13, fontWeight: "800" },
  cardRow: { flexDirection: "row", gap: 12 },
  cardDetail: { fontSize: 13, color: "#555" },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  cardAvg: { fontSize: 14, fontWeight: "600" },
  cardTime: { fontSize: 12, color: "#999" },
  cardDepot: { fontSize: 11, color: "#aaa" },
  uploadBtnDisabled: { backgroundColor: "#aaa" },
  clearButton: {
    margin: 16, padding: 14, borderRadius: 10,
    backgroundColor: "#FF3B30", alignItems: "center",
  },
  clearText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});