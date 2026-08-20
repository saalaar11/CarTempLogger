import { useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Share, Alert,
  Modal, Image, ScrollView, Dimensions } from "react-native";


export type ScanRecord = {
  id: string;
  carID: string;
  center: number;
  ventA: number;
  ventB: number;
  average: number;
  status: "OK" | "WATCH" | "FLAG FOR SERVICE";
  timestamp: number;
  startTime: number;
  inspectorName: string;
  inspectorID: string;
  photos: string[];
  depot: string;
  notes: string;
};

type Props = {
  records: ScanRecord[];
  onBack: () => void;
  onClear: () => void;
};

// Replace with your laptop's actual IP address (run ipconfig to find it)
const SERVER_URL = "https://cartempserver-production.up.railway.app";

function statusColor(status: string) {
  if (status === "FLAG FOR SERVICE") return "#FF3B30";
  if (status === "WATCH") return "#FF9500";
  return "#34C759";
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleString();
}

function formatTimeClean(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const s = d.getSeconds().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m}:${s} ${ampm}`;
}

function generateCSV(records: ScanRecord[]): string {
  const header = "Record ID,Uploaded On,Inspector Last Name,Car ID,Date,AM/PM,Shop,Start Time,Center (F),Vent A (F),Vent B (F),Average (F),Status,Notes";
  const rows = records.map(r => {
    const inspectDt = new Date(r.startTime || r.timestamp);
    const shift = inspectDt.getHours() < 12 ? "AM" : "PM";
    const lastName = r.inspectorName.split(" ").pop() || r.inspectorName;
    const dateStr = inspectDt.toLocaleDateString("en-US");
    const uploadedOn = new Date().toLocaleDateString("en-US");
    const notes = (r.notes || "").replace(/,/g, ";");
    return `${r.id},${uploadedOn},${lastName},${r.carID},${dateStr},${shift},${r.depot},${formatTimeClean(r.startTime || r.timestamp)},${r.center.toFixed(2)},${r.ventA.toFixed(2)},${r.ventB.toFixed(2)},${r.average.toFixed(2)},${r.status},${notes}`;
  });
  return "\uFEFF" + [header, ...rows].join("\n");
}

export default function HistoryScreen({ records, onBack, onClear }: Props) {
const [uploading, setUploading] = useState(false);
const [viewingPhotos, setViewingPhotos] = useState<string[] | null>(null);
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
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
  const response = await fetch(`${SERVER_URL}/upload-csv`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: csv,
    signal: controller.signal,
  });
  clearTimeout(timeout);
  const result = await response.json();
  Alert.alert("Upload Complete", `${result.added} new records uploaded, ${result.skipped || 0} duplicates skipped.`);
} catch (e: any) {
  clearTimeout(timeout);
  const msg = e?.name === "AbortError"
    ? "Server is waking up — wait 20 seconds and try again."
    : `Upload failed: ${e?.message}`;
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
              {item.notes ? (
                <Text style={styles.cardNotes}>📝 {item.notes}</Text>
              ) : null}
              {item.photos?.length > 0 && (
  <Pressable onPress={() => setViewingPhotos(item.photos)}>
    <Text style={styles.cardNotes}>
      📷 {item.photos.length} photo{item.photos.length > 1 ? "s" : ""} attached — tap to view
    </Text>
  </Pressable>
  
)}
            </View>
          )}
        />
      )}

      {records.length > 0 && (
        <Pressable style={styles.clearButton} onPress={confirmClear}>
          <Text style={styles.clearText}>Clear History</Text>
        </Pressable>
      )}
      {/* Photo Viewer Modal */}
<Modal
  visible={viewingPhotos !== null}
  transparent
  animationType="fade"
  onRequestClose={() => setViewingPhotos(null)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContainer}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>
          Photos ({viewingPhotos?.length || 0})
        </Text>
        <Pressable onPress={() => setViewingPhotos(null)}>
          <Text style={styles.modalClose}>✕ Close</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.modalScroll}>
        {viewingPhotos?.map((uri, index) => (
          <View key={index} style={styles.modalPhotoWrapper}>
            <Text style={styles.modalPhotoLabel}>Photo {index + 1}</Text>
            <Image
              source={{ uri }}
              style={styles.modalPhoto}
              resizeMode="contain"
            />
          </View>
        ))}
      </ScrollView>
    </View>
  </View>
</Modal>
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
  cardNotes: { fontSize: 12, color: "#666", fontStyle: "italic" },
  modalOverlay: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.85)",
  justifyContent: "center",
  alignItems: "center",
},
modalContainer: {
  width: "92%",
  maxHeight: "88%",
  backgroundColor: "#1c1c1e",
  borderRadius: 16,
  overflow: "hidden",
},
modalHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  padding: 16,
  borderBottomWidth: 1,
  borderBottomColor: "#333",
},
modalTitle: {
  color: "#fff",
  fontSize: 17,
  fontWeight: "700",
},
modalClose: {
  color: "#FF3B30",
  fontSize: 15,
  fontWeight: "600",
},
modalScroll: {
  padding: 16,
  gap: 16,
},
modalPhotoWrapper: {
  gap: 6,
},
modalPhotoLabel: {
  color: "#999",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 1,
},
modalPhoto: {
  width: "100%",
  height: Dimensions.get("window").width * 0.75,
  borderRadius: 10,
  backgroundColor: "#000",
},
});