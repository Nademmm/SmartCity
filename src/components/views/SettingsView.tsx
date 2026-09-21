'use client';

import React, { useState } from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { MetricCard } from '@/components/common/MetricCard';
import {
  Settings,
  Radio,
  Server,
  Code2,
  Copy,
  Check,
  Cpu,
  BookOpen,
  Sparkles,
  Zap,
  Save,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { scenario, setScenario } = useSmartCity();

  const [brokerHost, setBrokerHost] = useState<string>('broker.emqx.io');
  const [brokerPort, setBrokerPort] = useState<string>('8883');
  const [topicPrefix, setTopicPrefix] = useState<string>('urbanpulse');
  const [selectedSensorTab, setSelectedSensorTab] = useState<'traffic' | 'pju' | 'air' | 'pedestrian'>('traffic');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const getArduinoCode = () => {
    switch (selectedSensorTab) {
      case 'traffic':
        return `// UrbanPulse ESP32 Traffic Node (SMK IoT Project)
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

const char* ssid = "WIFI_SMK_LAB";
const char* password = "PASSWORD_WIFI";
const char* mqtt_server = "${brokerHost}";
const int mqtt_port = ${brokerPort};

WiFiClient espClient;
PubSubClient client(espClient);

const int TRIG_PIN = 5;
const int ECHO_PIN = 18;
const int LED_RED = 19;
const int LED_YELLOW = 21;
const int LED_GREEN = 22;

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  // Terima perintah ATSC otomatis dari UrbanPulse
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  // Hitung kepadatan via ultrasonic / radar
  StaticJsonDocument<200> doc;
  doc["deviceId"] = "ESP32-001";
  doc["density"] = 74; // hasil hitung
  doc["vehicleCount"] = 1420;
  
  char buffer[256];
  serializeJson(doc, buffer);
  client.publish("${topicPrefix}/traffic/simpang-merdeka", buffer);
  delay(3000);
}`;
      case 'pju':
        return `// UrbanPulse ESP32 Smart PJU Dimming Node
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

const int PIR_PIN = 4; // Sensor Gerak
const int PWM_PIN = 16; // MOSFET LED PJU Driver
int currentBrightness = 30; // 30% Eco Mode

void loop() {
  int motion = digitalRead(PIR_PIN);
  if (motion == HIGH) {
    // Soft Brightening ke 100%
    ledcWrite(0, 255);
    currentBrightness = 100;
  } else {
    // Soft Dimming ke 30%
    ledcWrite(0, 76);
    currentBrightness = 30;
  }

  StaticJsonDocument<200> doc;
  doc["id"] = "PJU-001";
  doc["brightness"] = currentBrightness;
  doc["motion"] = (motion == HIGH);
  
  char buffer[256];
  serializeJson(doc, buffer);
  client.publish("${topicPrefix}/pju/cluster-merdeka", buffer);
  delay(3000);
}`;
      case 'air':
        return `// UrbanPulse ESP32 Air Quality Multi-Gas Station
#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

#define DHTPIN 15
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

const int MQ135_PIN = 34; // Analog Gas MQ-135

void loop() {
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();
  int rawGas = analogRead(MQ135_PIN);
  int aqi = map(rawGas, 0, 4095, 20, 200);

  StaticJsonDocument<256> doc;
  doc["zone"] = "Industri Timur";
  doc["aqi"] = aqi;
  doc["temperature"] = temp;
  doc["humidity"] = hum;

  char buffer[256];
  serializeJson(doc, buffer);
  client.publish("${topicPrefix}/air/zone-east", buffer);
  delay(3000);
}`;
      case 'pedestrian':
        return `// UrbanPulse ESP32 Smart Pelican Crossing Controller
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

const int BUTTON_PIN = 13; // Push button pejalan kaki
const int RELAY_WALK = 26; // Lampu Hijau WALK

void loop() {
  int pressed = digitalRead(BUTTON_PIN);
  if (pressed == LOW) {
    // Request penyeberangan
    StaticJsonDocument<150> doc;
    doc["id"] = "PED-01";
    doc["action"] = "REQUEST_WALK";
    
    char buffer[200];
    serializeJson(doc, buffer);
    client.publish("${topicPrefix}/pedestrian/sman1", buffer);
  }
  delay(500);
}`;
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(getArduinoCode());
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSaveConfig = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="glass-panel rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Settings className="w-4 h-4 text-cyan-400" />
              Hardware Integration & IoT Broker Settings
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Konfigurasi koneksi MQTT / Firebase dan panduan kode Arduino C++ untuk implementasi hardware ESP32 prototype siswa SMK.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            Abstraction Layer: Ready
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: MQTT & Firebase Connection Configuration */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">MQTT Broker Mesh Setup</h3>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              CONNECTED
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">MQTT Broker Host / IP</label>
              <input
                type="text"
                value={brokerHost}
                onChange={(e) => setBrokerHost(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Port (SSL/TLS)</label>
                <input
                  type="text"
                  value={brokerPort}
                  onChange={(e) => setBrokerPort(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Topic Prefix</label>
                <input
                  type="text"
                  value={topicPrefix}
                  onChange={(e) => setTopicPrefix(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Firebase Realtime DB URL (Opsional)</label>
              <input
                type="text"
                placeholder="https://urbanpulse-smartcity-default-rtdb.firebaseio.com"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-[11px] placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="pt-2">
              <button
                onClick={handleSaveConfig}
                className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
              >
                {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                <span>{isSaved ? 'Konfigurasi Tersimpan!' : 'Simpan Konfigurasi Broker'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: SMK Student ESP32 Code Generator */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  ESP32 Arduino C++ Code Generator (SMK)
                </h3>
              </div>

              {/* Sensor Module Switcher */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px]">
                <button
                  onClick={() => setSelectedSensorTab('traffic')}
                  className={`px-2.5 py-1 rounded font-semibold transition-all ${
                    selectedSensorTab === 'traffic' ? 'bg-cyan-500 text-white font-bold' : 'text-slate-400'
                  }`}
                >
                  Traffic
                </button>
                <button
                  onClick={() => setSelectedSensorTab('pju')}
                  className={`px-2.5 py-1 rounded font-semibold transition-all ${
                    selectedSensorTab === 'pju' ? 'bg-cyan-500 text-white font-bold' : 'text-slate-400'
                  }`}
                >
                  PJU Dimming
                </button>
                <button
                  onClick={() => setSelectedSensorTab('air')}
                  className={`px-2.5 py-1 rounded font-semibold transition-all ${
                    selectedSensorTab === 'air' ? 'bg-cyan-500 text-white font-bold' : 'text-slate-400'
                  }`}
                >
                  MQ-135 Air
                </button>
                <button
                  onClick={() => setSelectedSensorTab('pedestrian')}
                  className={`px-2.5 py-1 rounded font-semibold transition-all ${
                    selectedSensorTab === 'pedestrian' ? 'bg-cyan-500 text-white font-bold' : 'text-slate-400'
                  }`}
                >
                  Pelican
                </button>
              </div>
            </div>

            {/* Code Viewer */}
            <div className="relative mt-4">
              <div className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-t-xl border-x border-t border-slate-800 text-[11px] text-slate-400">
                <span className="font-mono">src/{selectedSensorTab}_node.ino</span>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors font-semibold"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Tersalin' : 'Salin Kode C++'}</span>
                </button>
              </div>
              <pre className="text-[11px] font-mono text-emerald-400 bg-slate-950 p-4 rounded-b-xl border border-slate-800 overflow-x-auto max-h-72 leading-relaxed">
                {getArduinoCode()}
              </pre>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>Kompatibel: ESP32 Dev Module / ESP8266 NodeMCU</span>
            <span className="text-cyan-400 font-mono">JSON Payload: RFC 8259</span>
          </div>
        </div>
      </div>
    </div>
  );
};
