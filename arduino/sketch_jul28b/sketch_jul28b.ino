#include <Wire.h>
#include <Adafruit_MLX90614.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// Custom UUIDs for your app — don't change these,
// your React Native code will need to match them exactly
#define SERVICE_UUID        "12345678-1234-1234-1234-1234567890A0"
#define TEMP_CHAR_UUID      "12345678-1234-1234-1234-1234567890A1"

Adafruit_MLX90614 mlx = Adafruit_MLX90614();
BLECharacteristic *tempCharacteristic;
bool deviceConnected = false;

// Tracks connection state so app can show "No device connected"
class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* server) { deviceConnected = true; }
  void onDisconnect(BLEServer* server) {
    deviceConnected = false;
    // Restart advertising so phone can reconnect
    server->startAdvertising();
  }
};

void setup() {
  Serial.begin(115200);
  
  // Start sensor
  if (!mlx.begin()) {
    Serial.println("MLX90614 not found — check wiring");
    while (1);
  }
  Serial.println("Sensor ready");

  // Start BLE
  BLEDevice::init("CarTempSensor");
  BLEServer *server = BLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());

  BLEService *service = server->createService(SERVICE_UUID);
  
  tempCharacteristic = service->createCharacteristic(
    TEMP_CHAR_UUID,
    BLECharacteristic::PROPERTY_READ |
    BLECharacteristic::PROPERTY_NOTIFY
  );
  tempCharacteristic->addDescriptor(new BLE2902());
  
  service->start();
  
  BLEAdvertising *advertising = BLEDevice::getAdvertising();
  advertising->addServiceUUID(SERVICE_UUID);
  advertising->start();
  
  Serial.println("BLE advertising as CarTempSensor");
}

void loop() {
  // Read temperature in Fahrenheit every second
  float tempF = mlx.readObjectTempF();
  
  Serial.print("Temperature: ");
  Serial.print(tempF);
  Serial.println(" °F");

  if (deviceConnected) {
    // Send as integer (temp * 100) to avoid float precision issues
    // e.g. 72.54°F is sent as 7254
    int16_t tempInt = (int16_t)(tempF * 100);
    tempCharacteristic->setValue((uint8_t*)&tempInt, 2);
    tempCharacteristic->notify();
  }

  delay(1000);
}