import { CameraView, useCameraPermissions } from "expo-camera";
import { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";

type Props = {
  onScanned: (carID: string) => void;
};

export default function ScanScreen({ onScanned }: Props) {
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Camera access is needed to scan barcodes</Text>
        <Pressable style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes: ["code128"] }}
        onBarcodeScanned={({ data }) => onScanned(data)}
      />
      <Text style={styles.hint}>Point at the car barcode</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  hint: { color: "#fff", textAlign: "center", padding: 16, fontSize: 14 },
  text: { color: "#fff", fontSize: 16, textAlign: "center", padding: 32 },
  button: { backgroundColor: "#007AFF", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, margin: 16 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600", textAlign: "center" },
});