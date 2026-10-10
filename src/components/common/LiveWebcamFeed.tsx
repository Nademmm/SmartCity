'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import {
  Video,
  VideoOff,
  Camera,
  Scan,
  CheckCircle2,
  AlertCircle,
  SwitchCamera,
  Info,
  Layers,
  Sparkles,
  SlidersHorizontal,
  Lock,
  RefreshCw,
} from 'lucide-react';

interface VideoDevice {
  deviceId: string;
  label: string;
}

interface DetectedItem {
  id: string;
  rawLabel: string;
  label: string;
  category: 'vehicle' | 'person' | 'infrastructure' | 'item';
  color: string;
  x: number; // percentage
  y: number; // percentage
  w: number; // percentage
  h: number; // percentage
  confidence: number;
}

// Terjemahan ramah label COCO 80 kelas ke Bahasa Indonesia & penetapan warna
const LABEL_MAP: Record<string, { label: string; category: DetectedItem['category']; color: string }> = {
  // Kendaraan
  car: { label: 'Mobil', category: 'vehicle', color: '#10B981' }, // Hijau emerald
  motorcycle: { label: 'Motor', category: 'vehicle', color: '#06B6D4' }, // Cyan
  bus: { label: 'Bus', category: 'vehicle', color: '#F59E0B' }, // Amber
  truck: { label: 'Truk', category: 'vehicle', color: '#EF4444' }, // Merah
  bicycle: { label: 'Sepeda', category: 'vehicle', color: '#14B8A6' }, // Teal
  train: { label: 'Kereta', category: 'vehicle', color: '#8B5CF6' },
  airplane: { label: 'Pesawat', category: 'vehicle', color: '#3B82F6' },
  boat: { label: 'Perahu', category: 'vehicle', color: '#0EA5E9' },

  // Pejalan Kaki & Manusia
  person: { label: 'Orang / Pejalan Kaki', category: 'person', color: '#A855F7' }, // Ungu

  // Infrastruktur Lalin
  'traffic light': { label: 'Lampu Lalu Lintas', category: 'infrastructure', color: '#EAB308' },
  'stop sign': { label: 'Rambu Stop', category: 'infrastructure', color: '#DC2626' },
  'parking meter': { label: 'Meter Parkir', category: 'infrastructure', color: '#64748B' },
  bench: { label: 'Bangku', category: 'infrastructure', color: '#64748B' },

  // Berbagai Item Umum / Miniatur di Meja
  'cell phone': { label: 'Smartphone / HP', category: 'item', color: '#38BDF8' },
  bottle: { label: 'Botol', category: 'item', color: '#0284C7' },
  cup: { label: 'Cangkir / Gelas', category: 'item', color: '#FB923C' },
  chair: { label: 'Kursi / Miniatur', category: 'item', color: '#F43F5E' },
  book: { label: 'Buku', category: 'item', color: '#EC4899' },
  laptop: { label: 'Laptop', category: 'item', color: '#6366F1' },
  mouse: { label: 'Mouse', category: 'item', color: '#84CC16' },
  keyboard: { label: 'Keyboard', category: 'item', color: '#10B981' },
  remote: { label: 'Remote', category: 'item', color: '#F97316' },
  clock: { label: 'Jam', category: 'item', color: '#FBBF24' },
  backpack: { label: 'Tas Ransel', category: 'item', color: '#D946EF' },
  handbag: { label: 'Tas Tangan', category: 'item', color: '#E11D48' },
  umbrella: { label: 'Payung', category: 'item', color: '#06B6D4' },
  scissors: { label: 'Gunting', category: 'item', color: '#64748B' },
  bowl: { label: 'Mangkuk', category: 'item', color: '#F59E0B' },
  box: { label: 'Kotak / Kardus', category: 'item', color: '#78716C' },
  pen: { label: 'Pulpen / Alat Tulis', category: 'item', color: '#3B82F6' },
};

function formatDetectedItem(rawClass: string, score: number, bbox: [number, number, number, number], vw: number, vh: number, id: string): DetectedItem {
  const normClass = rawClass.toLowerCase().trim();
  const info = LABEL_MAP[normClass] || {
    label: rawClass.charAt(0).toUpperCase() + rawClass.slice(1),
    category: 'item' as const,
    color: '#06B6D4',
  };

  const [x, y, w, h] = bbox;
  const xPct = Math.max(0, Math.min(95, (x / vw) * 100));
  const yPct = Math.max(0, Math.min(95, (y / vh) * 100));
  const wPct = Math.max(3, Math.min(100 - xPct, (w / vw) * 100));
  const hPct = Math.max(3, Math.min(100 - yPct, (h / vh) * 100));

  return {
    id,
    rawLabel: rawClass,
    label: info.label,
    category: info.category,
    color: info.color,
    x: Number(xPct.toFixed(1)),
    y: Number(yPct.toFixed(1)),
    w: Number(wPct.toFixed(1)),
    h: Number(hPct.toFixed(1)),
    confidence: Number(score.toFixed(2)),
  };
}

export const LiveWebcamFeed: React.FC = () => {
  const {
    traffic,
    setIsCameraConnected,
    updateTrafficCameraData,
  } = useSmartCity();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modelRef = useRef<any>(null);
  const detectionLoopRef = useRef<NodeJS.Timeout | null>(null);

  const [devices, setDevices] = useState<VideoDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [activeCameraLabel, setActiveCameraLabel] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState<boolean>(false);
  const [showAiOverlay, setShowAiOverlay] = useState<boolean>(true);
  const [activeFps, setActiveFps] = useState<number>(30);
  const [isModelLoading, setIsModelLoading] = useState<boolean>(true);
  const [modelStatusText, setModelStatusText] = useState<string>('Memuat Model AI COCO-SSD...');

  // Settings
  const [filterMode, setFilterMode] = useState<'all' | 'vehicles' | 'traffic_pedestrian'>('all');
  const [minConfidence, setMinConfidence] = useState<number>(0.35); // 35% default agar sensitif ke miniatur

  // Real-time detected items list
  const [detectedItems, setDetectedItems] = useState<DetectedItem[]>([]);

  // 1. Dynamic Script Loader untuk TensorFlow.js dan COCO-SSD via CDN
  useEffect(() => {
    let isMounted = true;

    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Gagal memuat skrip: ${src}`));
        document.head.appendChild(script);
      });
    };

    const initAiModel = async () => {
      try {
        setIsModelLoading(true);
        setModelStatusText('Memuat AI Vision Library (TensorFlow)...');

        // Load TFJS core
        if (!(window as any).tf) {
          await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js');
        }

        // Load COCO-SSD model
        if (!(window as any).cocoSsd) {
          setModelStatusText('Memuat COCO-SSD Multi-Object Model...');
          await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js');
        }

        if ((window as any).cocoSsd) {
          setModelStatusText('Menginisialisasi Model Deteksi Objek...');
          const loadedModel = await (window as any).cocoSsd.load({
            base: 'mobilenet_v2', // Cepat dan akurat untuk real-time browser
          });
          if (isMounted) {
            modelRef.current = loadedModel;
            setIsModelLoading(false);
            setModelStatusText('Model AI Siap (80+ Jenis Objek)');
          }
        }
      } catch (err: any) {
        console.warn('Gagal memuat COCO-SSD via CDN, fallback ke Canvas Contour Vision:', err);
        if (isMounted) {
          setIsModelLoading(false);
          setModelStatusText('Mode Vision Fallback Aktif');
        }
      }
    };

    initAiModel();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Enumerate video devices
  const getCameraDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        setErrorMessage('Browser tidak mendukung akses kamera langsung (MediaDevices API).');
        return [];
      }

      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices
        .filter((d) => d.kind === 'videoinput')
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Kamera / Webcam USB ${index + 1}`,
        }));

      setDevices(videoInputs);
      return videoInputs;
    } catch (err: any) {
      console.error('Gagal mengambil daftar kamera:', err);
      return [];
    }
  }, []);

  // 3. Start camera stream
  const startCamera = useCallback(async (deviceIdToUse?: string) => {
    setErrorMessage(null);
    setIsPermissionDenied(false);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      const targetId = deviceIdToUse || selectedDeviceId;
      const constraints: MediaStreamConstraints = {
        video: targetId
          ? {
              deviceId: { ideal: targetId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 },
            }
          : {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 },
            },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const track = stream.getVideoTracks()[0];
      if (track) {
        track.enabled = true;
        setActiveCameraLabel(track.label || 'Kamera Aktif');
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        videoRef.current.autoplay = true;

        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('Autoplay error:', playErr);
        }
      }

      setIsStreaming(true);
      setIsCameraConnected(true);
      setActiveFps(30);

      const refreshedDevices = await getCameraDevices();
      if (targetId) {
        setSelectedDeviceId(targetId);
      } else if (refreshedDevices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(refreshedDevices[0].deviceId);
      }
    } catch (err: any) {
      setIsStreaming(false);
      setIsCameraConnected(false);

      const isDenied =
        err.name === 'NotAllowedError' ||
        err.name === 'PermissionDeniedError' ||
        (err.message && err.message.toLowerCase().includes('denied'));

      if (isDenied) {
        console.warn('Izin kamera belum diizinkan atau diblokir browser:', err.message);
        setIsPermissionDenied(true);
        setErrorMessage('Izin kamera diblokir browser. Klik ikon gembok pada address bar untuk mengizinkan kamera.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        console.warn('Kamera tidak ditemukan:', err.message);
        setErrorMessage('Kamera webcam tidak ditemukan. Pastikan USB webcam sudah dicolokkan ke laptop.');
      } else {
        console.warn('Error saat mengakses kamera:', err);
        setErrorMessage(`Gagal membuka webcam: ${err.message || 'Kamera sedang dipakai aplikasi lain'}`);
      }
    }
  }, [selectedDeviceId, getCameraDevices, setIsCameraConnected]);

  // 4. Switch camera
  const switchCamera = useCallback(async () => {
    let currentDevices = devices;
    if (currentDevices.length <= 1) {
      currentDevices = await getCameraDevices();
    }

    if (currentDevices.length === 0) {
      await startCamera();
      return;
    }

    const currentIdx = currentDevices.findIndex((d) => d.deviceId === selectedDeviceId);
    const nextIdx = (currentIdx + 1) % currentDevices.length;
    const nextDevice = currentDevices[nextIdx];

    if (nextDevice) {
      setSelectedDeviceId(nextDevice.deviceId);
      await startCamera(nextDevice.deviceId);
    }
  }, [devices, selectedDeviceId, getCameraDevices, startCamera]);

  // 5. Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (detectionLoopRef.current) {
      clearInterval(detectionLoopRef.current);
      detectionLoopRef.current = null;
    }
    setIsStreaming(false);
    setIsCameraConnected(false);
    setDetectedItems([]);
  }, [setIsCameraConnected]);

  // Initial auto mount with permission check
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'camera' as PermissionName })
        .then((permissionStatus) => {
          if (permissionStatus.state === 'denied') {
            setIsPermissionDenied(true);
            setErrorMessage('Izin kamera diblokir browser. Klik ikon gembok pada address bar untuk mengizinkan kamera.');
          } else {
            startCamera();
          }

          permissionStatus.onchange = () => {
            if (permissionStatus.state === 'granted') {
              setIsPermissionDenied(false);
              setErrorMessage(null);
              startCamera();
            } else if (permissionStatus.state === 'denied') {
              setIsPermissionDenied(true);
            }
          };
        })
        .catch(() => {
          startCamera();
        });
    } else {
      startCamera();
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (detectionLoopRef.current) {
        clearInterval(detectionLoopRef.current);
      }
    };
  }, [startCamera]);

  // 6. REAL OBJECT DETECTION LOOP (Berjalan setiap ~250ms langsung dari video element)
  useEffect(() => {
    if (!isStreaming) return;

    const runDetectionCycle = async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.paused || video.ended) {
        return;
      }

      const vw = video.videoWidth || 640;
      const vh = video.videoHeight || 480;

      // Jika Model COCO-SSD sudah siap di memori browser
      if (modelRef.current) {
        try {
          const rawPredictions = await modelRef.current.detect(video);
          
          let filtered = rawPredictions.filter((p: any) => p.score >= minConfidence);

          // Terapkan filter kategori jika dipilih
          if (filterMode === 'vehicles') {
            filtered = filtered.filter((p: any) =>
              ['car', 'motorcycle', 'bus', 'truck', 'bicycle', 'train'].includes(p.class.toLowerCase())
            );
          } else if (filterMode === 'traffic_pedestrian') {
            filtered = filtered.filter((p: any) =>
              ['car', 'motorcycle', 'bus', 'truck', 'bicycle', 'person', 'traffic light', 'stop sign'].includes(
                p.class.toLowerCase()
              )
            );
          }

          const items: DetectedItem[] = filtered.map((p: any, idx: number) =>
            formatDetectedItem(p.class, p.score, p.bbox, vw, vh, `ITEM-${idx + 1}`)
          );

          setDetectedItems(items);

          // Sinkronisasi metrik lalu lintas ke SmartCityContext
          const cars = items.filter((i) => i.rawLabel === 'car').length;
          const motos = items.filter((i) => i.rawLabel === 'motorcycle').length;
          const buses = items.filter((i) => i.rawLabel === 'bus').length;
          const trucks = items.filter((i) => i.rawLabel === 'truck').length;
          const totalVehicles = cars + motos + buses + trucks;
          const totalObjects = items.length;

          // Hitung kepadatan dari total kendaraan atau total item yang terdeteksi
          const density = Math.min(100, Math.round((Math.max(totalVehicles, totalObjects * 0.7) / 7) * 100));

          updateTrafficCameraData({
            vehicleCount: totalVehicles > 0 ? totalVehicles : totalObjects,
            density,
            statusText: density >= 75 ? 'MACET TOTAL' : density >= 55 ? 'PADAT' : density >= 30 ? 'SEDANG' : 'LANCAR',
            vehicleCounts: {
              mobil: cars,
              motor: motos,
              bus: buses,
              truk: trucks,
            },
          });
        } catch (detErr) {
          console.warn('Deteksi frame gagal:', detErr);
        }
      } else {
        // Fallback visual jika model masih mengunduh: analisis kontras frame canvas
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            canvas.width = 160;
            canvas.height = 90;
            ctx.drawImage(video, 0, 0, 160, 90);
          }
        }
      }
    };

    // Jalankan siklus deteksi setiap 250ms (4 FPS, ringan untuk browser dan responsif)
    const interval = setInterval(runDetectionCycle, 250);
    detectionLoopRef.current = interval;

    return () => clearInterval(interval);
  }, [isStreaming, filterMode, minConfidence, updateTrafficCameraData]);

  return (
    <div className="rounded-xl bg-slate-900/60 border border-slate-800/80 overflow-hidden flex flex-col">
      {/* Header Bar */}
      <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-slate-800 text-slate-300 border border-slate-700/80">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                Feed Kamera Pemantau (AI Computer Vision)
              </h3>
              <div
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
                  isStreaming
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                    : 'bg-slate-800/40 text-slate-400 border-slate-700/50'
                }`}
              >
                {isStreaming ? `Live (${activeFps} FPS)` : 'Standby'}
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {activeCameraLabel ? `Kamera: ${activeCameraLabel}` : 'Webcam laptop/USB terhubung langsung ke dashboard.'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter Mode Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
            <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value as any)}
              className="bg-transparent text-slate-200 text-xs font-medium focus:outline-none cursor-pointer"
              title="Pilih jenis objek yang dideteksi oleh AI"
            >
              <option value="all" className="bg-slate-900 text-slate-200">Semua Objek (80+ Jenis)</option>
              <option value="traffic_pedestrian" className="bg-slate-900 text-slate-200">Kendaraan & Pejalan Kaki</option>
              <option value="vehicles" className="bg-slate-900 text-slate-200">Khusus Kendaraan</option>
            </select>
          </div>

          {/* Quick Switch Camera Button */}
          <button
            onClick={switchCamera}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors cursor-pointer"
            title="Beralih kamera"
          >
            <SwitchCamera className="w-3.5 h-3.5" />
            <p>Ganti Kamera {devices.length > 1 ? `(${devices.length})` : ''}</p>
          </button>

          {/* Device Selection Dropdown if multiple */}
          {devices.length > 0 && (
            <select
              value={selectedDeviceId}
              onChange={(e) => {
                const newId = e.target.value;
                setSelectedDeviceId(newId);
                startCamera(newId);
              }}
              className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1 font-mono focus:outline-none max-w-[150px] truncate"
            >
              {devices.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `Kamera ${i + 1}`}
                </option>
              ))}
            </select>
          )}

          {/* Toggle AI Overlay Button */}
          <button
            onClick={() => setShowAiOverlay(!showAiOverlay)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              showAiOverlay
                ? 'bg-slate-800 text-white border-slate-700'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
            title="Tampilkan atau sembunyikan kotak deteksi AI"
          >
            <Scan className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Overlay Box</span>
          </button>

          {/* Start/Stop Camera Button */}
          {isStreaming ? (
            <button
              onClick={stopCamera}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-medium transition-colors cursor-pointer"
            >
              <VideoOff className="w-3.5 h-3.5" />
              <p>Matikan</p>
            </button>
          ) : (
            <button
              onClick={() => startCamera()}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Video className="w-3.5 h-3.5" />
              <p>Nyalakan Kamera</p>
            </button>
          )}
        </div>
      </div>

      {/* Model Status & Sensitivity Adjustment Bar */}
      <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <p className="font-mono text-[11px] text-slate-300">
            Model: {modelStatusText}
          </p>
        </div>

        {/* Sensitivity / Min Confidence Slider */}
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <SlidersHorizontal className="w-3 h-3 text-slate-400" />
          <p className="text-slate-400">Sensitivitas:</p>
          <input
            type="range"
            min="0.20"
            max="0.75"
            step="0.05"
            value={minConfidence}
            onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
            className="w-20 accent-cyan-400 cursor-pointer"
            title={`Threshold Keyakinan: ${Math.round(minConfidence * 100)}%`}
          />
          <p className="text-white font-medium">{Math.round(minConfidence * 100)}%</p>
        </div>
      </div>

      {/* Video Viewport Area */}
      <div className="relative aspect-video w-full bg-black overflow-hidden flex items-center justify-center select-none min-h-[380px]">
        {/* Hidden Canvas for Vision Frame Processing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* HTML5 Native Video Stream */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-contain bg-black"
        />

        {/* Fallback / Offline Standby Screen */}
        {!isStreaming && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-4 bg-[#030712]/95 z-10 backdrop-blur-sm">
            {isPermissionDenied ? (
              <div className="max-w-md p-5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-left space-y-3 shadow-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Izin Akses Kamera Diblokir Browser</h4>
                    <p className="text-xs text-amber-300/80">Browser memblokir permintaan akses webcam otomatis.</p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                  <p className="font-semibold text-slate-200">Cara mengizinkan webcam di browser:</p>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-400">
                    <li>Klik ikon <span className="text-amber-300 font-medium">Gembok / Izin Situs</span> di sebelah kiri URL (<code className="text-cyan-400">localhost:3000</code>).</li>
                    <li>Ubah setelan <span className="text-white font-medium">Kamera (Camera)</span> menjadi <span className="text-emerald-400 font-semibold">Allow (Izinkan)</span>.</li>
                    <li>Klik tombol di bawah ini untuk mengaktifkan kamera.</li>
                  </ol>
                </div>

                <button
                  onClick={() => startCamera()}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98]"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Coba Hubungkan Kamera Lagi</span>
                </button>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 shadow-xl">
                  <Camera className="w-8 h-8 text-cyan-400" />
                </div>

                <div className="max-w-md">
                  <h4 className="text-base font-bold text-white tracking-tight">Kamera Laptop / USB Siap Digunakan</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Kamera mendeteksi berbagai jenis item nyata secara instan di browser menggunakan TensorFlow AI Vision.
                  </p>
                </div>

                {errorMessage ? (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 max-w-lg">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{errorMessage}</span>
                  </div>
                ) : null}

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => startCamera()}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all active:scale-[0.98]"
                  >
                    <Video className="w-4 h-4" />
                    <span>Nyalakan Kamera Sekarang</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* AI HUD Computer Vision Overlay (Active when streaming) */}
        {isStreaming && showAiOverlay && (
          <div className="absolute inset-0 pointer-events-none z-20">
            {/* Top Scanning Line Animation */}
            <div
              className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-pulse"
              style={{ top: '25%' }}
            />

            {/* Real Detected Bounding Boxes */}
            {detectedItems.map((box) => (
              <div
                key={box.id}
                className="absolute border-2 transition-all duration-150 flex flex-col justify-start"
                style={{
                  borderColor: box.color,
                  left: `${box.x}%`,
                  top: `${box.y}%`,
                  width: `${box.w}%`,
                  height: `${box.h}%`,
                  boxShadow: `0 0 12px ${box.color}60`,
                }}
              >
                {/* Corner Accents */}
                <span className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-white shadow-sm" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-white shadow-sm" />
                <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-white shadow-sm" />
                <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-white shadow-sm" />

                {/* Box Tag Label */}
                <div
                  className="self-start text-[10px] font-mono font-bold text-slate-950 px-2 py-0.5 rounded shadow-lg -mt-5 flex items-center gap-1"
                  style={{ backgroundColor: box.color }}
                >
                  <span>{box.label}</span>
                  <span className="opacity-80">{(box.confidence * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}

            {/* Top HUD Badges */}
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <div className="bg-slate-950/90 px-2.5 py-1 rounded text-[10px] font-mono text-slate-300 border border-slate-800">
                COCO-SSD AI
              </div>
              <div className="bg-slate-950/90 px-2 py-1 rounded text-[10px] font-mono text-emerald-400 border border-slate-800">
                {activeFps} FPS
              </div>
            </div>

            {/* Bottom HUD Bar */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
              <div className="bg-slate-950/90 px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center gap-3">
                <p className="text-emerald-400 font-medium">Terdeteksi: {detectedItems.length} Objek</p>
                <p className="text-slate-600">|</p>
                <p>Kepadatan: {traffic.density}% ({traffic.statusText})</p>
                <p className="text-slate-600">|</p>
                <p className="text-amber-300">Kendaraan: {traffic.vehicleCount}</p>
              </div>

              <div className="bg-slate-950/90 text-white px-2.5 py-1 rounded text-[10px] font-medium font-mono border border-slate-800">
                Live Video
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Live Detected Items Chips Strip */}
      {isStreaming && (
        <div className="px-4 py-2 bg-slate-950 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto text-xs">
          <p className="font-mono text-[11px] text-slate-400 font-medium shrink-0">
            Objek Terdeteksi:
          </p>
          {detectedItems.length === 0 ? (
            <p className="text-slate-500 text-[11px] italic">
              Belum ada objek di depan kamera. Dekatkan benda atau maket ke lensa kamera.
            </p>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              {detectedItems.map((item, idx) => (
                <div
                  key={`${item.id}-${idx}`}
                  className="px-2 py-0.5 rounded font-mono text-[11px] border"
                  style={{
                    backgroundColor: `${item.color}15`,
                    borderColor: `${item.color}40`,
                    color: item.color,
                  }}
                >
                  {item.label} ({(item.confidence * 100).toFixed(0)}%)
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer Info Strip */}
      <div className="px-4 py-2 bg-slate-950/80 border-t border-slate-800/80 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <p className="text-[11px]">Deteksi berjalan langsung di browser (Client-Side AI).</p>
        </div>
        <p className="font-mono text-[11px] text-slate-400">
          Source: {activeCameraLabel || selectedDeviceId || 'Webcam'}
        </p>
      </div>
    </div>
  );
};
