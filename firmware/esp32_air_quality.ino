/*
  =============================================================
  UrbanPulse Smart City - ESP32 Air Quality Sensor Node
  =============================================================
  Sensor: MQ-135 (Air Quality/Gas) & DHT22 (Temp & Humidity)
  Protocol: HTTP POST (REST API)
  Author: UrbanPulse Engineering
  =============================================================
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "DHT.h"

// 1. Konfigurasi Jaringan WiFi & Server UrbanPulse
const char* ssid = "NAMA_WIFI_ANDA";
const char* password = "PASSWORD_WIFI_ANDA";

// Masukkan IP Komputer / Server tempat Dashboard berjalan
// Contoh: "http://192.168.1.15:3000/api/iot/telemetry"
const char* serverUrl = "http://192.168.1.15:3000/api/iot/telemetry";

// 2. Definisi Pin Sensor
#define DHTPIN 4
#define DHTTYPE DHT22
#define MQ135_ANALOG_PIN 34
#define LED_INDICATOR 2

DHT dht(DHTPIN, DHTTYPE);

unsigned long lastSendTime = 0;
const unsigned long sendInterval = 4000; // Kirim data setiap 4 detik

void setup() {
  Serial.begin(115200);
  pinMode(LED_INDICATOR, OUTPUT);
  pinMode(MQ135_ANALOG_PIN, INPUT);
  
  dht.begin();
  
  Serial.println("\n--- Memulai Inisialisasi ESP32 Air Quality Node ---");
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    digitalWrite(LED_INDICATOR, !digitalRead(LED_INDICATOR));
  }
  
  digitalWrite(LED_INDICATOR, HIGH);
  Serial.println("\nWiFi Berhasil Terhubung!");
  Serial.print("IP ESP32: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  if (millis() - lastSendTime >= sendInterval) {
    lastSendTime = millis();
    
    if (WiFi.status() == WL_CONNECTED) {
      sendTelemetryData();
    } else {
      Serial.println("[WARNING] WiFi terputus. Mencoba menghubungkan kembali...");
      WiFi.reconnect();
    }
  }
}

void sendTelemetryData() {
  // 1. Baca data sensor fisik
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  int rawMQ135 = analogRead(MQ135_ANALOG_PIN);
  
  // Perhitungan estimasi AQI & PM2.5 dari sensor analog MQ-135
  if (isnan(temperature)) temperature = 29.8;
  if (isnan(humidity)) humidity = 65.0;
  
  // Konversi nilai ADC (0-4095) ke perkiraan parameter polusi
  int calculatedAQI = map(rawMQ135, 200, 3500, 35, 210);
  calculatedAQI = constrain(calculatedAQI, 20, 300);
  
  float calculatedPM25 = calculatedAQI * 0.45;
  float calculatedCO = (calculatedAQI / 40.0) + 0.3;
  int calculatedCO2 = 400 + (calculatedAQI * 2);

  // 2. Siapkan dokumen JSON sesuai format UrbanPulse
  StaticJsonDocument<350> doc;
  doc["deviceId"] = "ESP32-AIR-01";
  doc["type"] = "air-quality";
  doc["zone"] = "Kawasan Industri & Sudirman";
  
  JsonObject payload = doc.createNestedObject("payload");
  payload["aqi"] = calculatedAQI;
  payload["pm25"] = calculatedPM25;
  payload["co"] = calculatedCO;
  payload["co2"] = calculatedCO2;
  payload["temperature"] = temperature;
  payload["humidity"] = humidity;

  String requestBody;
  serializeJson(doc, requestBody);

  // 3. Kirim data HTTP POST ke Server Next.js
  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");

  Serial.println("\n[HTTP POST] Mengirim data kualitas udara ke dashboard...");
  Serial.println(requestBody);

  int httpResponseCode = http.POST(requestBody);

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.printf("[SUCCESS] Response code: %d | Data diterima dashboard!\n", httpResponseCode);
  } else {
    Serial.printf("[ERROR] Gagal mengirim data. Error code: %s\n", http.errorToString(httpResponseCode).c_str());
  }

  http.end();
}
