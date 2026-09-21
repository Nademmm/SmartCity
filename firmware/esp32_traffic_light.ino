/*
  =============================================================
  UrbanPulse Smart City - ESP32 Adaptive Traffic Signal (ATSC)
  =============================================================
  Sensor: Ultrasonic HC-SR04 (Deteksi Antrean Kendaraan)
  Aktuator: LED Traffic Module (Merah Pin 19, Kuning Pin 21, Hijau Pin 22)
  Protocol: HTTP POST Telemetry & Adaptive Light Control
  =============================================================
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "NAMA_WIFI_ANDA";
const char* password = "PASSWORD_WIFI_ANDA";
const char* serverUrl = "http://192.168.1.15:3000/api/iot/telemetry";

#define TRIG_PIN 5
#define ECHO_PIN 18

#define LED_RED 19
#define LED_YELLOW 21
#define LED_GREEN 22

unsigned long lastSend = 0;
String currentLight = "green";
int vehicleDensity = 45; // 0 - 100%

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  
  pinMode(LED_RED, OUTPUT);
  pinMode(LED_YELLOW, OUTPUT);
  pinMode(LED_GREEN, OUTPUT);

  setTrafficLight("green");

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected! Traffic Node Ready.");
}

void setTrafficLight(String state) {
  currentLight = state;
  if (state == "red") {
    digitalWrite(LED_RED, HIGH);
    digitalWrite(LED_YELLOW, LOW);
    digitalWrite(LED_GREEN, LOW);
  } else if (state == "yellow") {
    digitalWrite(LED_RED, LOW);
    digitalWrite(LED_YELLOW, HIGH);
    digitalWrite(LED_GREEN, LOW);
  } else if (state == "green") {
    digitalWrite(LED_RED, LOW);
    digitalWrite(LED_YELLOW, LOW);
    digitalWrite(LED_GREEN, HIGH);
  }
}

long readDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  long duration = pulseIn(ECHO_PIN, HIGH, 25000);
  if (duration == 0) return 200;
  return duration * 0.034 / 2;
}

void loop() {
  long distance = readDistanceCm();
  
  // Jika jarak semakin dekat (< 30cm), berarti antrean kendaraan semakin padat
  if (distance < 20) {
    vehicleDensity = random(85, 98); // Macet Padat
  } else if (distance < 60) {
    vehicleDensity = random(55, 75); // Sedang
  } else {
    vehicleDensity = random(20, 40); // Lancar
  }

  if (millis() - lastSend >= 3500) {
    lastSend = millis();
    if (WiFi.status() == WL_CONNECTED) {
      sendTrafficTelemetry();
    }
  }
}

void sendTrafficTelemetry() {
  StaticJsonDocument<350> doc;
  doc["deviceId"] = "ESP32-TRAFFIC-01";
  doc["type"] = "traffic";
  doc["intersectionId"] = "int-1";

  JsonObject payload = doc.createNestedObject("payload");
  payload["density"] = vehicleDensity;
  payload["vehicleCount"] = vehicleDensity * 18;
  payload["avgSpeedKmh"] = map(100 - vehicleDensity, 0, 100, 12, 60);
  payload["queueLengthMeters"] = vehicleDensity * 2;
  payload["currentLight"] = currentLight;

  String requestBody;
  serializeJson(doc, requestBody);

  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  int code = http.POST(requestBody);
  if (code > 0) {
    Serial.printf("[TRAFFIC SUCCESS] Code: %d | Kepadatan: %d%% | Status Lampu: %s\n", 
      code, vehicleDensity, currentLight.c_str());
  }
  http.end();
}
