'use client';

import React from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { MetricCard } from '@/components/common/MetricCard';
import { TerminalConsole } from '@/components/common/TerminalConsole';
import {
  Footprints,
  Radio,
  Volume2,
  VolumeX,
  CheckCircle2,
  RotateCcw,
  UserCheck,
} from 'lucide-react';

export const PedestrianView: React.FC = () => {
  const {
    crossing,
    triggerCrossingDetection,
    resetCrossingToSafe,
    isHardwareConnected,
  } = useSmartCity();

  const isMenyebrang = crossing.lampu === 'MERAH';
  const isKuning = crossing.lampu === 'KUNING';

  return (
    <div className="space-y-5">
      {/* Offline Hardware Banner */}
      {!isHardwareConnected && (
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>
              <strong>Perangkat ESP32 Offline:</strong> Dual sensor ultrasonik (Pin 32/34 & 33/35) dalam mode Standby. Colokkan ESP32 dan jalankan Thonny agar deteksi jarak langsung aktif.
            </span>
          </div>
          <span className="font-mono text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded shrink-0">
            Hardware Belum Terhubung
          </span>
        </div>
      )}
      {/* Alert Banner when Pedestrians Detected or Crossing */}
      {(isMenyebrang || isKuning || !crossing.siapMenyeberang) && (
        <div
          className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
            isMenyebrang
              ? 'bg-rose-950/40 border-rose-500/50 animate-pulse'
              : isKuning
              ? 'bg-amber-950/40 border-amber-500/50 animate-pulse'
              : 'bg-slate-900/60 border-slate-700/50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-lg border ${
                isMenyebrang
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                  : isKuning
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              <Footprints className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                  {isMenyebrang
                    ? 'PENYEBERANGAN SEDANG BERLANGSUNG'
                    : isKuning
                    ? 'OBJEK TERDETEKSI MENDEKATI ZEBRA CROSS'
                    : 'MENUNGGU AREA KOSONG SEBELUM DETEKSI ULANG'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    isMenyebrang
                      ? 'bg-rose-500 text-white'
                      : isKuning
                      ? 'bg-amber-400 text-black'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  LAMPU: {crossing.lampu}
                </span>
              </div>
              <h2 className="text-sm font-bold text-white mt-0.5">
                {isMenyebrang
                  ? `Penyeberangan Aktif! Sisa Waktu: ${crossing.countdownSeconds} Detik (Pola Bunyi Buzzer)`
                  : isKuning
                  ? 'Lampu Kuning Menyala (1 Detik) sebelum sinyal Merah'
                  : 'Siklus selesai. Menunggu objek menjauh agar tidak memicu berulang.'}
              </h2>
              <p className="text-xs text-slate-300">
                {crossing.orangKanan && crossing.orangKiri
                  ? 'Terdeteksi pada sensor kanan (<=17cm) & kiri (<=25cm).'
                  : crossing.orangKanan
                  ? 'Terdeteksi oleh Sensor Ultrasonik Kanan (Pin 32/34, <=17cm).'
                  : crossing.orangKiri
                  ? 'Terdeteksi oleh Sensor Ultrasonik Kiri (Pin 33/35, <=25cm).'
                  : 'Area zebra cross sudah mulai lengang.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={resetCrossingToSafe}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Aman</span>
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Sensor Kanan (Jarak)"
          value={crossing.jarakKanan !== null ? `${Math.round(crossing.jarakKanan * 10) / 10} cm` : 'Error'}
          statusText={crossing.orangKanan ? 'OBJEK TERDETEKSI (<=17cm)' : 'Aman (>17cm)'}
          statusVariant={crossing.orangKanan ? 'danger' : 'success'}
          icon={<Radio className="w-4 h-4" />}
          footerText={`TRIG 32 | ECHO 34 (Batas: ${crossing.batasKanan} cm)`}
        />

        <MetricCard
          title="Sensor Kiri (Jarak)"
          value={crossing.jarakKiri !== null ? `${Math.round(crossing.jarakKiri * 10) / 10} cm` : 'Error'}
          statusText={crossing.orangKiri ? 'OBJEK TERDETEKSI (<=25cm)' : 'Aman (>25cm)'}
          statusVariant={crossing.orangKiri ? 'danger' : 'success'}
          icon={<Radio className="w-4 h-4" />}
          footerText={`TRIG 33 | ECHO 35 (Batas: ${crossing.batasKiri} cm)`}
        />

        <MetricCard
          title="Status Lampu Penyeberangan"
          value={`LAMPU ${crossing.lampu}`}
          statusText={
            crossing.lampu === 'MERAH'
              ? `Menyeberang (${crossing.countdownSeconds}s)`
              : crossing.lampu === 'KUNING'
              ? 'Kuning (1s)'
              : 'Aman Jalan (Hijau)'
          }
          statusVariant={crossing.lampu === 'MERAH' ? 'danger' : crossing.lampu === 'KUNING' ? 'warning' : 'success'}
          icon={<Footprints className="w-4 h-4" />}
          footerText="Hijau: Pin 12 | Kuning: Pin 14 | Merah: Pin 27"
        />

        <MetricCard
          title="Buzzer Penyeberangan"
          value={crossing.buzzer ? 'BUNYI AKTIF' : 'MATI'}
          statusText={crossing.buzzer ? 'Pola nada tototot' : 'Kondisi Standby'}
          statusVariant={crossing.buzzer ? 'danger' : 'neutral'}
          icon={crossing.buzzer ? <Volume2 className="w-4 h-4 text-rose-400" /> : <VolumeX className="w-4 h-4" />}
          footerText="Buzzer Aktuator Pin 13"
        />
      </div>

      {/* Main Grid: Visual Road Simulator & Live Terminal Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Road & Zebra Cross Visualizer */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Visualisasi Dual Sensor & Zebra Cross
                </h3>
              </div>
              <span className="text-xs font-mono text-cyan-300 bg-slate-900 px-2.5 py-0.5 rounded border border-slate-800">
                Waktu Menyeberang: 5 Detik
              </span>
            </div>

            {/* Simulated Road & Sensors Layout */}
            <div className="my-5 p-6 rounded-2xl bg-[#070D1A] border border-slate-800 relative overflow-hidden flex flex-col items-center justify-center">
              {/* Traffic Light Head for Crossing */}
              <div className="flex items-center gap-4 mb-6 bg-slate-950 p-2.5 rounded-2xl border-2 border-slate-800 shadow-xl">
                {/* Red */}
                <div
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-xs transition-all ${
                    crossing.lampu === 'MERAH'
                      ? 'bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/80 animate-pulse'
                      : 'bg-rose-950/30 border-rose-900/40 text-rose-900/30'
                  }`}
                >
                  {crossing.lampu === 'MERAH' && `${crossing.countdownSeconds}s`}
                </div>

                {/* Yellow */}
                <div
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-xs transition-all ${
                    crossing.lampu === 'KUNING'
                      ? 'bg-amber-400 border-amber-300 text-black shadow-lg shadow-amber-400/80 animate-pulse'
                      : 'bg-amber-950/30 border-amber-900/40 text-amber-900/30'
                  }`}
                >
                  {crossing.lampu === 'KUNING' && '1s'}
                </div>

                {/* Green */}
                <div
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-xs transition-all ${
                    crossing.lampu === 'HIJAU'
                      ? 'bg-emerald-400 border-emerald-300 text-black shadow-lg shadow-emerald-400/80 animate-pulse'
                      : 'bg-emerald-950/30 border-emerald-900/40 text-emerald-900/30'
                  }`}
                >
                  {crossing.lampu === 'HIJAU' && 'GO'}
                </div>
              </div>

              {/* Zebra Cross Visual */}
              <div className="w-full max-w-md bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-3 relative">
                {/* Left Sensor (Kiri) */}
                <div
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    crossing.orangKiri
                      ? 'bg-rose-950/60 border-rose-500 text-rose-300 animate-pulse shadow-lg shadow-rose-500/30'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <Radio className="w-5 h-5 text-cyan-400" />
                  <span className="text-[10px] font-bold uppercase">Sensor Kiri</span>
                  <span className="text-xs font-mono font-bold text-white">
                    {crossing.jarakKiri !== null ? `${Math.round(crossing.jarakKiri * 10) / 10} cm` : '-'}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400">Pin 33/35 (Batas {crossing.batasKiri}cm)</span>
                </div>

                {/* Zebra Stripes */}
                <div className="flex-1 flex justify-center gap-2 px-2">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-16 w-3 rounded transition-colors ${
                        crossing.lampu === 'MERAH' ? 'bg-rose-400/80 animate-pulse' : 'bg-white/80'
                      }`}
                    />
                  ))}
                </div>

                {/* Right Sensor (Kanan) */}
                <div
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    crossing.orangKanan
                      ? 'bg-rose-950/60 border-rose-500 text-rose-300 animate-pulse shadow-lg shadow-rose-500/30'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <Radio className="w-5 h-5 text-cyan-400" />
                  <span className="text-[10px] font-bold uppercase">Sensor Kanan</span>
                  <span className="text-xs font-mono font-bold text-white">
                    {crossing.jarakKanan !== null ? `${Math.round(crossing.jarakKanan * 10) / 10} cm` : '-'}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400">Pin 32/34 (Batas {crossing.batasKanan}cm)</span>
                </div>
              </div>

              {/* Countdown status note */}
              <div className="mt-4 text-center">
                <div className="text-xs font-bold text-slate-300">
                  Status Ringkasan: <span className="text-cyan-400 font-mono">{crossing.statusRingkasan}</span>
                  {!crossing.siapMenyeberang && (
                    <span className="ml-2 text-amber-400 font-mono text-[11px]">[Lock: Menunggu Area Kosong]</span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Batas deteksi objek: Kanan &lt;= 17 cm, Kiri &lt;= 25 cm (Filter median 3 sampel).
                </div>
              </div>
            </div>

            {/* Test Trigger Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
              <button
                onClick={() => triggerCrossingDetection('kanan')}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <UserCheck className="w-4 h-4 text-cyan-400" />
                <span>Deteksi Kanan (&lt;=17cm)</span>
              </button>

              <button
                onClick={() => triggerCrossingDetection('kiri')}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <UserCheck className="w-4 h-4 text-cyan-400" />
                <span>Deteksi Kiri (&lt;=25cm)</span>
              </button>

              <button
                onClick={() => triggerCrossingDetection('kedua')}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-500/20 to-amber-500/20 hover:from-rose-500/30 hover:to-amber-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <Footprints className="w-4 h-4 text-rose-400" />
                <span>Deteksi Kedua Sisi</span>
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Pola nada buzzer: tototot, tototot saat Lampu Merah</span>
            <span className="font-mono text-cyan-400">Pin 13 Buzzer (5s)</span>
          </div>
        </div>

        {/* Right: Real Live Terminal Shell Output (Replacing static code snippet) */}
        <div className="lg:col-span-5 flex flex-col justify-between">
          <TerminalConsole
            filterFeature="penyeberangan"
            title="Live Serial Terminal Output (Penyeberangan)"
            maxHeight="max-h-[380px]"
          />

          <div className="mt-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-white font-semibold">Aktuator & Sensor:</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-slate-300 text-[11px]">
              <span>R: 32/34</span>
              <span>•</span>
              <span>L: 33/35</span>
              <span>•</span>
              <span>LED: 12,14,27</span>
              <span>•</span>
              <span>Bz: 13</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
