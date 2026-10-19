'use client';

import React from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { MetricCard } from '@/components/common/MetricCard';
import {
  Footprints,
  Radio,
  Volume2,
  VolumeX,
  CheckCircle2,
  RotateCcw,
  UserCheck,
  Terminal,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const PedestrianView: React.FC = () => {
  const {
    crossing,
    triggerCrossingDetection,
    resetCrossingToSafe,
    testBuzzerAlarm,
    isHardwareConnected,
    setActiveSubsystem,
  } = useSmartCity();

  const isMenyebrang = crossing.lampu === 'MERAH';
  const isKuning = crossing.lampu === 'KUNING';

  return (
    <div className="space-y-4">
      {/* Offline Hardware Banner */}
      {!isHardwareConnected && (
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-slate-500" />
            <p>
              Dual sensor ultrasonik (Pin 32/34 dan 33/35) menunggu koneksi ESP32.
            </p>
          </div>
          <div className="font-mono text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 shrink-0">
            Standby
          </div>
        </div>
      )}

      {/* Alert Banner when Pedestrians Detected or Crossing */}
      {(isMenyebrang || isKuning || !crossing.siapMenyeberang) && (
        <div
          className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
            isMenyebrang
              ? 'bg-rose-950/30 border-rose-500/40'
              : isKuning
              ? 'bg-amber-950/30 border-amber-500/40'
              : 'bg-slate-900/60 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Footprints
              className={`w-4 h-4 shrink-0 ${isMenyebrang ? 'text-rose-400' : isKuning ? 'text-amber-400' : 'text-slate-400'}`}
            />
            <div>
              <p className="font-semibold text-white">
                {isMenyebrang
                  ? `Penyeberangan Aktif: Lampu Merah Kendaraan (${crossing.countdownSeconds} detik)`
                  : isKuning
                  ? 'Transisi Lampu Kuning (1 detik)'
                  : 'Siklus Penyeberangan Selesai'}
              </p>
              <p className="text-slate-400">
                {crossing.orangKanan && crossing.orangKiri
                  ? 'Objek terdeteksi pada kedua sensor ultrasonik (kanan & kiri).'
                  : crossing.orangKanan
                  ? 'Objek terdeteksi pada sensor kanan (jarak <= 17 cm).'
                  : crossing.orangKiri
                  ? 'Objek terdeteksi pada sensor kiri (jarak <= 25 cm).'
                  : 'Area zebra cross lengang.'}
              </p>
            </div>
          </div>

          <button
            onClick={resetCrossingToSafe}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <p>Reset Aman</p>
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Sensor Ultrasonik Kanan"
          value={crossing.jarakKanan !== null ? `${Math.round(crossing.jarakKanan * 10) / 10} cm` : '-'}
          statusText={crossing.orangKanan ? 'Objek Dekat (<= 17cm)' : 'Aman (> 17cm)'}
          statusVariant={crossing.orangKanan ? 'danger' : 'success'}
          icon={<Radio className="w-4 h-4" />}
          footerText={`TRIG 32 | ECHO 34 (Batas: ${crossing.batasKanan} cm)`}
        />

        <MetricCard
          title="Sensor Ultrasonik Kiri"
          value={crossing.jarakKiri !== null ? `${Math.round(crossing.jarakKiri * 10) / 10} cm` : '-'}
          statusText={crossing.orangKiri ? 'Objek Dekat (<= 25cm)' : 'Aman (> 25cm)'}
          statusVariant={crossing.orangKiri ? 'danger' : 'success'}
          icon={<Radio className="w-4 h-4" />}
          footerText={`TRIG 33 | ECHO 35 (Batas: ${crossing.batasKiri} cm)`}
        />

        <MetricCard
          title="Lampu Penyeberangan"
          value={`LAMPU ${crossing.lampu}`}
          statusText={
            crossing.lampu === 'MERAH'
              ? `Berjalan (${crossing.countdownSeconds}s)`
              : crossing.lampu === 'KUNING'
              ? 'Kuning (1s)'
              : 'Kendaraan Jalan (Hijau)'
          }
          statusVariant={crossing.lampu === 'MERAH' ? 'danger' : crossing.lampu === 'KUNING' ? 'warning' : 'success'}
          icon={<Footprints className="w-4 h-4" />}
          footerText="Hijau: Pin 12 | Kuning: Pin 14 | Merah: Pin 27"
        />

        <MetricCard
          title="Buzzer Penyeberangan"
          value={crossing.buzzer ? 'BUNYI AKTIF' : 'MATI'}
          statusText={crossing.buzzer ? 'Pola Tototot' : 'Standby'}
          statusVariant={crossing.buzzer ? 'danger' : 'neutral'}
          icon={crossing.buzzer ? <Volume2 className="w-4 h-4 text-rose-400" /> : <VolumeX className="w-4 h-4" />}
          footerText="Aktuator Buzzer Pin 13"
        />
      </div>

      {/* Schematic Road Visualizer & Sequence Specifications */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Road & Zebra Cross Visualizer */}
        <div className="lg:col-span-7 rounded-xl bg-slate-900/60 border border-slate-800/80 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                Simulasi Jalur Penyeberangan
              </h3>
              <p className="text-[11px] font-mono text-slate-400">Durasi: 5 Detik</p>
            </div>

            {/* Visualizer Road */}
            <div className="my-4 p-5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex flex-col items-center justify-center">
              {/* Traffic Light Head */}
              <div className="flex items-center gap-3 mb-5 bg-slate-900 p-2 rounded-xl border border-slate-800">
                <div
                  className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-[10px] ${
                    crossing.lampu === 'MERAH'
                      ? 'bg-rose-500 border-rose-400 text-white'
                      : 'bg-rose-950/20 border-rose-900/30 text-rose-900/40'
                  }`}
                >
                  {crossing.lampu === 'MERAH' && `${crossing.countdownSeconds}s`}
                </div>

                <div
                  className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-[10px] ${
                    crossing.lampu === 'KUNING'
                      ? 'bg-amber-400 border-amber-300 text-black'
                      : 'bg-amber-950/20 border-amber-900/30 text-amber-900/40'
                  }`}
                >
                  {crossing.lampu === 'KUNING' && '1s'}
                </div>

                <div
                  className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-[10px] ${
                    crossing.lampu === 'HIJAU'
                      ? 'bg-emerald-400 border-emerald-300 text-black'
                      : 'bg-emerald-950/20 border-emerald-900/30 text-emerald-900/40'
                  }`}
                >
                  {crossing.lampu === 'HIJAU' && 'GO'}
                </div>
              </div>

              {/* Zebra Cross Grid */}
              <div className="w-full max-w-md bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                {/* Left Sensor */}
                <div
                  className={`p-2.5 rounded-lg border flex flex-col items-center gap-0.5 text-center transition-colors ${
                    crossing.orangKiri
                      ? 'bg-rose-950/50 border-rose-500/60 text-rose-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <Radio className="w-4 h-4 text-cyan-400" />
                  <p className="text-[10px] font-semibold">Sensor Kiri</p>
                  <p className="text-xs font-mono font-bold text-white">
                    {crossing.jarakKiri !== null ? `${Math.round(crossing.jarakKiri * 10) / 10} cm` : '-'}
                  </p>
                  <p className="text-[9px] text-slate-400 font-mono">&lt;= {crossing.batasKiri}cm</p>
                </div>

                {/* Zebra Stripes */}
                <div className="flex-1 flex justify-center gap-2 px-1">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-12 w-2.5 rounded-sm transition-colors ${
                        crossing.lampu === 'MERAH' ? 'bg-rose-400/80' : 'bg-slate-700'
                      }`}
                    />
                  ))}
                </div>

                {/* Right Sensor */}
                <div
                  className={`p-2.5 rounded-lg border flex flex-col items-center gap-0.5 text-center transition-colors ${
                    crossing.orangKanan
                      ? 'bg-rose-950/50 border-rose-500/60 text-rose-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <Radio className="w-4 h-4 text-cyan-400" />
                  <p className="text-[10px] font-semibold">Sensor Kanan</p>
                  <p className="text-xs font-mono font-bold text-white">
                    {crossing.jarakKanan !== null ? `${Math.round(crossing.jarakKanan * 10) / 10} cm` : '-'}
                  </p>
                  <p className="text-[9px] text-slate-400 font-mono">&lt;= {crossing.batasKanan}cm</p>
                </div>
              </div>

              <div className="mt-3 text-center text-xs text-slate-400">
                <p>Status: <span className="font-semibold text-white">{crossing.statusRingkasan}</span></p>
              </div>
            </div>

            {/* Test Trigger Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
              <button
                onClick={() => triggerCrossingDetection('kanan')}
                className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                <p>Uji Sisi Kanan</p>
              </button>

              <button
                onClick={() => triggerCrossingDetection('kiri')}
                className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                <p>Uji Sisi Kiri</p>
              </button>

              <button
                onClick={() => triggerCrossingDetection('kedua')}
                className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Footprints className="w-3.5 h-3.5 text-cyan-400" />
                <p>Uji Kedua Sisi</p>
              </button>

              <button
                onClick={testBuzzerAlarm}
                className="py-2 px-3 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                <p>Uji Buzzer (Pin 13)</p>
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <p>Buzzer berbunyi pola tototot saat lampu merah aktif.</p>
            <p className="font-mono text-slate-400">Buzzer Pin 13</p>
          </div>
        </div>

        {/* Right: Sequence & Hardware Specifications */}
        <div className="lg:col-span-5 rounded-xl bg-slate-900/60 border border-slate-800/80 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                Alur Siklus & Spesifikasi Hardware
              </h3>
              <p className="text-[11px] font-mono text-slate-400">Sistem Keamanan</p>
            </div>

            <div className="my-3 space-y-2.5 text-xs">
              {/* Step 1 */}
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <p className="font-medium text-white">Status Hijau (Kendaraan Berjalan)</p>
                  <p className="text-[11px] text-slate-400">
                    Lampu Hijau (Pin 12) menyala. Kedua sensor ultrasonik HC-SR04 terus memindai objek.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <p className="font-medium text-white">Transisi Kuning (1 Detik)</p>
                  <p className="text-[11px] text-slate-400">
                    Saat pejalan kaki mendekat, lampu kuning (Pin 14) menyala selama 1 detik sebagai peringatan.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <p className="font-medium text-white">Penyeberangan Merah (5 Detik) + Buzzer</p>
                  <p className="text-[11px] text-slate-400">
                    Lampu Merah (Pin 27) aktif. Buzzer (Pin 13) berbunyi pola tototot memberi sinyal audio aman menyeberang.
                  </p>
                </div>
              </div>

              {/* Hardware Pin Summary */}
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
                <p className="font-semibold text-white mb-1.5 text-[11px]">Pinout Terkoneksi ke ESP32:</p>
                <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px] text-slate-300">
                  <div className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
                    Kanan: TRIG 32 / ECHO 34
                  </div>
                  <div className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
                    Kiri: TRIG 33 / ECHO 35
                  </div>
                  <div className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
                    LED: 12 (H), 14 (K), 27 (M)
                  </div>
                  <div className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
                    Buzzer: GPIO Pin 13
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar with Link to Centralized Logs */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px]">Dual sensor ultrasonik aktif</span>
            </div>

            <button
              onClick={() => setActiveSubsystem('alerts')}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 text-xs font-medium cursor-pointer transition-colors"
            >
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>Log Penyeberangan</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
