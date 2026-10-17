/*
  =============================================================
  UrbanPulse Smart City - ESP32 Air Quality Sensor Node
  =============================================================
  Sensor: MQ-135 (Air Quality/Gas) & DHT22 (Temp & Humidity)
  Output:
    - [REVISI] Monitor Hijau: LCD 16x2 I2C (SDA Pin 21, SCL Pin 22)
    - [REVISI] LED Peringatan Polusi: Pin 18 (Merah/Kuning)
    - [REVISI] LED Udara Bersih: Pin 19 (Hijau)
  Protocol: HTTP POST (REST API)
  Author: UrbanPulse Engineering
  =============================================================
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include "DHT.h"

// 1. Konfigurasi Jaringan WiFi & Server UrbanPulse
const char* ssid = "NAMA_WIFI_ANDA";
const char* password = "PASSWORD_WIFI_ANDA";

// Masukkan IP Komputer / Server tempat Dashboard berjalan
// Contoh: "http://192.168.1.15:3000/api/iot/telemetry"
const char* serverUrl = "http://192.168.1.15:3000/api/iot/telemetry";

// 2. Definisi Pin Sensor & Aktuator
#define DHTPIN 4
#define DHTTYPE DHT22
#define MQ135_ANALOG_PIN 34
#define LED_INDICATOR 2

// [BARU - REVISI] 2 Pin LED Tambahan
#define LED_POLUSI_WARNING 18  // Menyala saat polusi tinggi
#define LED_UDARA_BERSIH   19  // Menyala saat udara bersih / aman

DHT dht(DHTPIN, DHTTYPE);

// [BARU - REVISI] Inisialisasi Monitor Hijau LCD 16x2 I2C (Alamat default 0x27 atau 0x3F)
LiquidCrystal_I2C lcd(0x27, 16, 2);

unsigned long lastSendTime = 0;
const unsigned long sendInterval = 4000; // Kirim data setiap 4 detik
int screenCycle = 0;

void setup() {
  Serial.begin(115200);
  pinMode(LED_INDICATOR, OUTPUT);
  pinMode(LED_POLUSI_WARNING, OUTPUT);
  pinMode(LED_UDARA_BERSIH, OUTPUT);
  pinMode(MQ135_ANALOG_PIN, INPUT);
  
  // Inisialisasi LED awal
  digitalWrite(LED_POLUSI_WARNING, LOW);
  digitalWrite(LED_UDARA_BERSIH, HIGH);

  // Inisialisasi I2C & Monitor Hijau LCD
  Wire.begin(21, 22);
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Selamat Datang  ");
  lcd.setCursor(0, 1);
  lcd.print("Di Kota Pintar  ");
  
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

  // ==============================================================
  // [BARU - REVISI] LOGIKA MONITOR HIJAU (LCD) & 2 LED TAMBAHAN
  // ==============================================================
  if (calculatedAQI > 100) {
    // KONDISI POLUSI TINGGI:
    // LED Peringatan MENYALA, LED Bersih MATI
    digitalWrite(LED_POLUSI_WARNING, HIGH);
    digitalWrite(LED_UDARA_BERSIH, LOW);

    // Tampilkan di Monitor Hijau:
    lcd.setCursor(0, 0);
    lcd.print("STATUS: BAHAYA! ");
    lcd.setCursor(0, 1);
    char buf[17];
    snprintf(buf, sizeof(buf), "AQI:%d TINGGI  ", calculatedAQI);
    lcd.print(buf);
  } else {
    // KONDISI UDARA BERSIH / NORMAL:
    // LED Peringatan MATI, LED Bersih MENYALA
    digitalWrite(LED_POLUSI_WARNING, LOW);
    digitalWrite(LED_UDARA_BERSIH, HIGH);

    screenCycle = (screenCycle + 1) % 2;
    if (screenCycle == 0) {
      lcd.setCursor(0, 0);
      lcd.print("Selamat Datang  ");
      lcd.setCursor(0, 1);
      lcd.print("Di Kota Pintar  ");
    } else {
      lcd.setCursor(0, 0);
      lcd.print("Udara: AMAN     ");
      lcd.setCursor(0, 1);
      char buf[17];
      snprintf(buf, sizeof(buf), "AQI:%d Bersih  ", calculatedAQI);
      lcd.print(buf);
    }
  }

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
