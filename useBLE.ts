import { useState, useEffect, useRef } from "react";
import { BleManager, Device } from "react-native-ble-plx";
import { Buffer } from "buffer";

const SERVICE_UUID = "12345678-1234-1234-1234-1234567890A0";
const TEMP_CHAR_UUID = "12345678-1234-1234-1234-1234567890A1";

export type BLEStatus = "idle" | "scanning" | "connected" | "disconnected" | "error";

export function useBLE() {
  const managerRef = useRef<BleManager | null>(null);
  const deviceRef = useRef<Device | null>(null);
  const [status, setStatus] = useState<BLEStatus>("idle");
  const [temperature, setTemperature] = useState<number | null>(null);

  useEffect(() => {
    managerRef.current = new BleManager();
    return () => {
      managerRef.current?.destroy();
    };
  }, []);

  async function startScan() {
    const manager = managerRef.current;
    if (!manager) return;

    setStatus("scanning");
    setTemperature(null);

    // Stop scanning after 10 seconds if nothing found
    const timeout = setTimeout(() => {
      manager.stopDeviceScan();
      setStatus((prev) => (prev === "scanning" ? "disconnected" : prev));
    }, 10000);

    manager.startDeviceScan(
      [SERVICE_UUID],
      null,
      async (error, device) => {
        if (error) {
          clearTimeout(timeout);
          setStatus("error");
          return;
        }

        if (device?.name === "CarTempSensor") {
          clearTimeout(timeout);
          manager.stopDeviceScan();

          try {
            const connected = await device.connect();
            await connected.discoverAllServicesAndCharacteristics();
            deviceRef.current = connected;
            setStatus("connected");

            // Subscribe to live temperature notifications
            connected.monitorCharacteristicForService(
              SERVICE_UUID,
              TEMP_CHAR_UUID,
              (err, characteristic) => {
                if (err || !characteristic?.value) return;
                // Decode little-endian Int16 from base64
                const bytes = Buffer.from(characteristic.value, "base64");
                const tempInt = bytes.readInt16LE(0);
                setTemperature(tempInt / 100);
              }
            );

            connected.onDisconnected(() => {
              setStatus("disconnected");
              setTemperature(null);
              deviceRef.current = null;
            });
          } catch {
            setStatus("error");
          }
        }
      }
    );
  }

  function disconnect() {
    deviceRef.current?.cancelConnection();
    setStatus("idle");
    setTemperature(null);
  }

  return { status, temperature, startScan, disconnect };
}