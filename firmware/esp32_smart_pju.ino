/*
  =============================================================
  UrbanPulse Smart City - ESP32 Smart Street Lighting (PJU)
  =============================================================
  Sensor: PIR Motion Sensor (HC-SR501) & LDR Sensor Cahaya
  Aktuator: PWM Dimmer LED (Lampu Jalan)
  Protocol: HTTP POST Telemetry & Polling Action
  =============================================================
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "NAMA_WIFI_ANDA";
const char* password = "PASSWORD_WIFI_ANDA";
const char* serverUrl = "http://192.168.1.15:3000/api/iot/telemetry";

#define PIR_PIN 13
#define LDR_PIN 35
#define LED_PWM_PIN 25

// PWM Setup
const int pwmFreq = 5000;
const int pwmChannel = 0;
const int pwmResolution = 8; // 0 - 255

int currentBrightness = 30; // 30% standby
bool isMotionDetected = false;
unsigned long lastSend = 0;
unsigned long motionTimer = 0;

void setup() {
  Serial.begin(115200);
  pinMode(PIR_PIN, INPUT);
  pinMode(LDR_PIN, INPUT);
  
  ledcAttach(LED_PWM_PIN, pwmFreq, pwmResolution);
  setLampBrightness(currentBrightness);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected! IP: " + WiFi.localIP().toString());
}

void setLampBrightness(int percent) {
  currentBrightness = constrain(percent, 0, 100);
  int dutyCycle = map(currentBrightness, 0, 100, 0, 255);
  ledcWrite(LED_PWM_PIN, dutyCycle);
}

void loop() {
  int pirState = digitalRead(PIR_PIN);
  int ambientLight = analogRead(LDR_PIN); // Pembacaan intensitas cahaya sekitar

  // Jika terdeteksi objek/pejalan kaki di malam hari
  if (pirState == HIGH) {
    isMotionDetected = true;
    motionTimer = millis();
    setLampBrightness(100); // Terang maksimal 100%
  } else {
    if (millis() - motionTimer > 7000) { // Setelah 7 detik tanpa gerakan
      isMotionDetected = false;
      setLampBrightness(30); // Kembali redup hemat energi 30%
    }
  }

  // Kirim telemetri setiap 3 detik
  if (millis() - lastSend >= 3000) {
    lastSend = millis();
    if (WiFi.status() == WL_CONNECTED) {
      sendPJUTelemetry();
    }
  }
}

void sendPJUTelemetry() {
  StaticJsonDocument<300> doc;
  doc["deviceId"] = "ESP32-PJU-01";
  doc["type"] = "pju";
  doc["nodeId"] = "pju-1";

  JsonObject payload = doc.createNestedObject("payload");
  payload["brightness"] = currentBrightness;
  payload["powerWatts"] = map(currentBrightness, 0, 100, 15, 120);
  payload["motionDetected"] = isMotionDetected;
  payload["status"] = (currentBrightness > 50) ? "optimal" : "energy_saving";

  String requestBody;
  serializeJson(doc, requestBody);

  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  int code = http.POST(requestBody);
  if (code > 0) {
    Serial.printf("[PJU SUCCESS] Code: %d | Brightness: %d%% | Motion: %s\n", 
      code, currentBrightness, isMotionDetected ? "YES" : "NO");
  }
  http.end();
}
