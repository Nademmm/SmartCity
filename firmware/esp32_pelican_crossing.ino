/*
  =============================================================
  UrbanPulse Smart City - ESP32 Smart Pelican Crossing
  =============================================================
  Sensor: Push Button Penyeberang (Pin 4)
  Aktuator: Buzzer Beep (Pin 14), LED WALK (Pin 26), LED WAIT (Pin 27)
  Protocol: HTTP POST Telemetry
  =============================================================
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "NAMA_WIFI_ANDA";
const char* password = "PASSWORD_WIFI_ANDA";
const char* serverUrl = "http://192.168.1.15:3000/api/iot/telemetry";

#define BUTTON_PIN 4
#define BUZZER_PIN 14
#define LED_WALK 26
#define LED_WAIT 27

bool isCrossRequested = false;
int waitingPedestrians = 0;
String pelicanState = "WAIT";
unsigned long lastSend = 0;

void setup() {
  Serial.begin(115200);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_WALK, OUTPUT);
  pinMode(LED_WAIT, OUTPUT);

  digitalWrite(LED_WAIT, HIGH);
  digitalWrite(LED_WALK, LOW);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected! Pelican Node Online.");
}

void loop() {
  // Cek apakah tombol penyeberangan ditekan oleh warga
  if (digitalRead(BUTTON_PIN) == LOW) {
    delay(50); // Debounce
    if (digitalRead(BUTTON_PIN) == LOW) {
      if (!isCrossRequested) {
        isCrossRequested = true;
        waitingPedestrians += 1;
        Serial.println("[EVENT] Tombol Pelican Ditekan! Permintaan menyeberang aktif.");
        tone(BUZZER_PIN, 1000, 200);
        sendPedestrianTelemetry();
      }
    }
  }

  if (millis() - lastSend >= 5000) {
    lastSend = millis();
    if (WiFi.status() == WL_CONNECTED) {
      sendPedestrianTelemetry();
    }
  }
}

void sendPedestrianTelemetry() {
  StaticJsonDocument<300> doc;
  doc["deviceId"] = "ESP32-PELICAN-01";
  doc["type"] = "pedestrian";
  doc["crossingId"] = "ped-1";

  JsonObject payload = doc.createNestedObject("payload");
  payload["pedestrianCount"] = waitingPedestrians * 4;
  payload["waitingCount"] = waitingPedestrians;
  payload["pelicanState"] = isCrossRequested ? "WALK" : "WAIT";
  payload["status"] = (waitingPedestrians > 3) ? "HIGH ACTIVITY" : "NORMAL";

  String requestBody;
  serializeJson(doc, requestBody);

  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  int code = http.POST(requestBody);
  if (code > 0) {
    Serial.printf("[PELICAN SUCCESS] Code: %d | Antrean: %d Orang | Mode: %s\n", 
      code, waitingPedestrians, isCrossRequested ? "WALK" : "WAIT");
  }
  http.end();
}
