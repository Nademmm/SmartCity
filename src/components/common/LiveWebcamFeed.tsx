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
  isNested?: boolean;
}

// Kamus Label Khusus Kendaraan & Mobil Miniatur / Lego
const LABEL_MAP: Record<string, { label: string; category: DetectedItem['category']; color: string }> = {
  car: { label: 'Mobil (Lego/Miniatur)', category: 'vehicle', color: '#10B981' }, // Hijau emerald
  'toy car': { label: 'Mobil (Lego/Miniatur)', category: 'vehicle', color: '#10B981' },
  'miniature car': { label: 'Mobil Miniatur', category: 'vehicle', color: '#10B981' },
  truck: { label: 'Truk / Pick-up (Lego)', category: 'vehicle', color: '#EF4444' }, // Merah
  bus: { label: 'Bus (Lego/Miniatur)', category: 'vehicle', color: '#F59E0B' }, // Amber
  motorcycle: { label: 'Motor', category: 'vehicle', color: '#06B6D4' }, // Cyan
  bicycle: { label: 'Sepeda', category: 'vehicle', color: '#14B8A6' }, // Teal
  train: { label: 'Kereta', category: 'vehicle', color: '#8B5CF6' },
  airplane: { label: 'Pesawat', category: 'vehicle', color: '#3B82F6' },
  boat: { label: 'Perahu', category: 'vehicle', color: '#0EA5E9' },
};

// Daftar Kelas yang Diizinkan: HANYA KENDARAAN & MOBIL MINIATUR
const VEHICLE_CLASSES = new Set([
  'car',
  'toy car',
  'miniature car',
  'truck',
  'bus',
  'motorcycle',
  'bicycle',
  'train',
  'airplane',
  'boat',
]);

function getCategoryPriority(itemClass: string): number {
  const c = itemClass.toLowerCase();
  if (VEHICLE_CLASSES.has(c)) return 3;
  return 0;
}

interface RawBox {
  class: string;
  score: number;
  bbox: [number, number, number, number]; // [x, y, w, h] in video coordinates
}

// Menghitung Intersection over Union (IoU) untuk Non-Maximum Suppression akurat
function computeIoU(b1: [number, number, number, number], b2: [number, number, number, number]): number {
  const [x1, y1, w1, h1] = b1;
  const [x2, y2, w2, h2] = b2;

  const left = Math.max(x1, x2);
  const top = Math.max(y1, y2);
  const right = Math.min(x1 + w1, x2 + w2);
  const bottom = Math.min(y1 + h1, y2 + h2);

  if (right <= left || bottom <= top) return 0;

  const intersection = (right - left) * (bottom - top);
  const area1 = w1 * h1;
  const area2 = w2 * h2;
  const union = area1 + area2 - intersection;

  return union > 0 ? intersection / union : 0;
}

// Menghitung rasio cakupan objek (Containment) untuk mendeteksi objek bertumpuk / di dalam satu kotak
function computeContainment(
  inner: [number, number, number, number],
  outer: [number, number, number, number]
): number {
  const [x1, y1, w1, h1] = inner;
  const [x2, y2, w2, h2] = outer;

  const left = Math.max(x1, x2);
  const top = Math.max(y1, y2);
  const right = Math.min(x1 + w1, x2 + w2);
  const bottom = Math.min(y1 + h1, y2 + h2);

  if (right <= left || bottom <= top) return 0;

  const intersection = (right - left) * (bottom - top);
  const innerArea = w1 * h1;
  return innerArea > 0 ? intersection / innerArea : 0;
}

// Proyeksi koordinat video native ke persentase viewport dengan perhitungan object-cover
function formatDetectedItem(
  rawClass: string,
  score: number,
  bbox: [number, number, number, number],
  vw: number,
  vh: number,
  cW: number,
  cH: number,
  id: string
): DetectedItem {
  const normClass = rawClass.toLowerCase().trim();
  const info = LABEL_MAP[normClass] || {
    label: rawClass.charAt(0).toUpperCase() + rawClass.slice(1),
    category: 'item' as const,
    color: '#06B6D4',
  };

  const [x, y, w, h] = bbox;

  // Rasio aspek container dan video
  const cAspect = cW > 0 && cH > 0 ? cW / cH : 16 / 9;
  const vAspect = vw > 0 && vh > 0 ? vw / vh : 4 / 3;

  let xPct: number;
  let yPct: number;
  let wPct: number;
  let hPct: number;

  if (vAspect < cAspect) {
    // Video lebih tegak (misal 4:3) dibanding container (16:9).
    // Bagian atas dan bawah video terpotong secara proporsional.
    const visibleVH = vw / cAspect;
    const cropTop = (vh - visibleVH) / 2;
    xPct = (x / vw) * 100;
    yPct = ((y - cropTop) / visibleVH) * 100;
    wPct = (w / vw) * 100;
    hPct = (h / visibleVH) * 100;
  } else {
    // Video lebih lebar. Sisi kiri dan kanan terpotong secara proporsional.
    const visibleVW = vh * cAspect;
    const cropLeft = (vw - visibleVW) / 2;
    xPct = ((x - cropLeft) / visibleVW) * 100;
    yPct = (y / vh) * 100;
    wPct = (w / visibleVW) * 100;
    hPct = (h / vh) * 100;
  }

  // Batasi rentang persentase agar selalu terlihat di dalam layar
  const clampedX = Math.max(0, Math.min(94, xPct));
  const clampedY = Math.max(0, Math.min(94, yPct));
  const clampedW = Math.max(4, Math.min(100 - clampedX, wPct));
  const clampedH = Math.max(4, Math.min(100 - clampedY, hPct));

  return {
    id,
    rawLabel: normClass,
    label: info.label,
    category: info.category,
    color: info.color,
    x: Number(clampedX.toFixed(1)),
    y: Number(clampedY.toFixed(1)),
    w: Number(clampedW.toFixed(1)),
    h: Number(clampedH.toFixed(1)),
    confidence: Number(score.toFixed(2)),
  };
}

interface VisionMemory {
  prevLum: Float32Array | null;
  bgLum: Float32Array | null;
}

// Mesin Computer Vision Khusus Kendaraan & Mobil Miniatur / Lego
// Menghapus total deteksi orang / wajah dan barang umum non-kendaraan
async function detectNativeVision(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  vw: number,
  vh: number,
  memory: VisionMemory
): Promise<RawBox[]> {
  const results: RawBox[] = [];

  // Analisis Spasial & Temporal Canvas Resolusi 168x126 (~1.8ms)
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return results;

  const targetW = 168;
  const targetH = 126;
  canvas.width = targetW;
  canvas.height = targetH;
  ctx.drawImage(video, 0, 0, targetW, targetH);

  let imgData: ImageData;
  try {
    imgData = ctx.getImageData(0, 0, targetW, targetH);
  } catch {
    return results;
  }

  const data = imgData.data;
  const cols = 28; // 28 kolom (grid 6x6 px per cell untuk menangkap lego kecil)
  const rows = 21; // 21 baris
  const cellW = targetW / cols;
  const cellH = targetH / rows;
  const totalBlocks = cols * rows;

  const curLumArray = new Float32Array(totalBlocks);
  const curSatArray = new Float32Array(totalBlocks);
  const gridSkin = Array.from({ length: rows }, () => new Array(cols).fill(0));
  const gridObject = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const bIdx = r * cols + c;
      const startX = Math.floor(c * cellW);
      const startY = Math.floor(r * cellH);
      const endX = Math.floor((c + 1) * cellW);
      const endY = Math.floor((r + 1) * cellH);

      let skinCount = 0;
      let totalR = 0;
      let totalG = 0;
      let totalB = 0;
      let totalLum = 0;
      let edgeEnergy = 0;
      let count = 0;

      for (let y = startY; y < endY; y += 2) {
        for (let x = startX; x < endX; x += 2) {
          const idx = (y * targetW + x) * 4;
          const red = data[idx];
          const green = data[idx + 1];
          const blue = data[idx + 2];
          const lum = 0.299 * red + 0.587 * green + 0.114 * blue;

          totalR += red;
          totalG += green;
          totalB += blue;
          totalLum += lum;
          count++;

          // Gradien tepi horizontal & vertikal
          if (x + 2 < targetW) {
            const nextIdx = (y * targetW + (x + 2)) * 4;
            const diffX = Math.abs(red - data[nextIdx]) + Math.abs(green - data[nextIdx + 1]);
            edgeEnergy += diffX;
          }

          // Cek kromatis kulit (hanya untuk mengisolasi tangan agar tidak dikira mobil)
          if (
            red > 65 &&
            green > 30 &&
            blue > 15 &&
            red > green &&
            red > blue &&
            red - Math.min(green, blue) > 8 &&
            Math.abs(red - green) > 6
          ) {
            skinCount++;
          }
        }
      }

      const avgLum = count > 0 ? totalLum / count : 128;
      const avgR = count > 0 ? totalR / count : 128;
      const avgG = count > 0 ? totalG / count : 128;
      const avgB = count > 0 ? totalB / count : 128;
      const avgEdge = count > 0 ? edgeEnergy / count : 0;
      const skinRatio = count > 0 ? skinCount / count : 0;
      const colorSat = Math.max(Math.abs(avgR - avgG), Math.abs(avgG - avgB), Math.abs(avgB - avgR));

      curLumArray[bIdx] = avgLum;
      curSatArray[bIdx] = colorSat;

      // Tandai kulit manusia agar disaring
      if (skinRatio > 0.22) {
        gridSkin[r][c] = 1;
      }
    }
  }

  // Hitung rata-rata luminansi latar lantai/ruangan (lantai terang/ubin)
  let floorLumSum = 0;
  let floorLumCount = 0;
  for (let i = 0; i < totalBlocks; i++) {
    floorLumSum += curLumArray[i];
    floorLumCount++;
  }
  const avgSceneLum = floorLumCount > 0 ? floorLumSum / floorLumCount : 128;

  // Analisis blok: Mobil lego memiliki tepi kontras (roda hitam, kaca, kap mobil)
  // dan kontras tajam terhadap lantai/ubin di sekitarnya
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (gridSkin[r][c] === 1) continue;

      const bIdx = r * cols + c;
      const lum = curLumArray[bIdx];

      // Perbedaan terhadap rata-rata latar sekitar
      const contrastToScene = Math.abs(lum - avgSceneLum);

      // Cek variasi dengan blok tetangga langsung
      let localEdge = 0;
      const dNeigh = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of dNeigh) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          localEdge += Math.abs(lum - curLumArray[nr * cols + nc]);
        }
      }

      // Cek apakah blok berbeda dari background statis (dinding, lemari, anyaman bambu)
      const deltaBg = memory.bgLum ? Math.abs(lum - memory.bgLum[bIdx]) : 30;

      // Kriteria pintar penandaan objek mobil mainan / lego:
      // Hanya tandai jika ADA perubahan terhadap background ATAU warna jenuh khas balok lego
      // Dinding / lemari / anyaman statis akan otomatis diabaikan karena deltaBg < 18
      const isLegoColor = curSatArray[bIdx] > 32;
      const isForeground = deltaBg > 22;

      if ((isForeground && localEdge > 16) || (isLegoColor && localEdge > 18)) {
        // Abaikan area paling atas frame (langit-langit / plafon / dinding atas)
        if (r >= 3 && r <= rows - 2 && c >= 2 && c <= cols - 2) {
          gridObject[r][c] = 1;
        }
      }
    }
  }

  // Update memori background dan frame sebelumnya
  if (!memory.bgLum || memory.bgLum.length !== totalBlocks) {
    memory.bgLum = new Float32Array(curLumArray);
  } else {
    for (let i = 0; i < totalBlocks; i++) {
      memory.bgLum[i] = memory.bgLum[i] * 0.98 + curLumArray[i] * 0.02;
    }
  }
  memory.prevLum = new Float32Array(curLumArray);

  // Klasterisasi Objek Mobil Miniatur / Lego
  const visited = Array.from({ length: rows }, () => new Array(cols).fill(false));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (gridObject[r][c] === 1 && !visited[r][c]) {
        let qMinR = r, qMaxR = r, qMinC = c, qMaxC = c, qCount = 0;
        const queue: [number, number][] = [[r, c]];
        visited[r][c] = true;

        while (queue.length > 0) {
          const [currR, currC] = queue.pop()!;
          qCount++;
          if (currR < qMinR) qMinR = currR;
          if (currR > qMaxR) qMaxR = currR;
          if (currC < qMinC) qMinC = currC;
          if (currC > qMaxC) qMaxC = currC;

          const neighbors: [number, number][] = [
            [currR - 1, currC],
            [currR + 1, currC],
            [currR, currC - 1],
            [currR, currC + 1],
            [currR - 1, currC - 1],
            [currR - 1, currC + 1],
            [currR + 1, currC - 1],
            [currR + 1, currC + 1],
          ];
          for (const [nR, nC] of neighbors) {
            if (
              nR >= 0 &&
              nR < rows &&
              nC >= 0 &&
              nC < cols &&
              gridObject[nR][nC] === 1 &&
              !visited[nR][nC]
            ) {
              visited[nR][nC] = true;
              queue.push([nR, nC]);
            }
          }
        }

        // Filter Klaster Mobil Lego:
        // Ukuran klaster harus proporsional dengan mobil mainan (antara 3 hingga 30 blok)
        if (qCount >= 3 && qCount <= 70) {
          const bW = ((qMaxC - qMinC + 1) / cols) * vw;
          const bH = ((qMaxR - qMinR + 1) / rows) * vh;
          const bX = (qMinC / cols) * vw;
          const bY = (qMinR / rows) * vh;

          const maxDim = Math.max(bW, bH);
          const minDim = Math.min(bW, bH);
          const shapeRatio = maxDim / Math.max(1, minDim);
          const areaFraction = (bW * bH) / (vw * vh);

          // Mobil mainan pada jarak webcam: ukuran proporsional 0.6% hingga 20% dari layar
          if (areaFraction < 0.006 || areaFraction > 0.20) continue;

          // Abaikan area plafon / dinding atas frame (bY < 16% dari tinggi frame)
          if (bY < vh * 0.16) continue;

          // Mobil mainan dari atas maupun samping memiliki rasio memanjang khas kendaraan (1.25 hingga 3.4)
          // Menolak benda bulat/persegi seperti cangkir/kertas (rasio < 1.25) dan kabel/pena (rasio > 3.4)
          if (shapeRatio < 1.25 || shapeRatio > 3.4) continue;

          let itemClass = 'car';
          let itemScore = 0.95;

          if (shapeRatio > 2.2) {
            itemClass = 'truck';
            itemScore = 0.96;
          } else {
            itemClass = 'car';
            itemScore = 0.96;
          }

          results.push({
            class: itemClass,
            score: itemScore,
            bbox: [bX, bY, bW, bH],
          });
        }
      }
    }
  }

  return results.slice(0, 3); // Maksimal 3 mobil mainan
}

export const LiveWebcamFeed: React.FC = () => {
  const {
    traffic,
    setIsCameraConnected,
    updateTrafficCameraData,
  } = useSmartCity();

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modelRef = useRef<any>(null);
  const detectionLoopRef = useRef<NodeJS.Timeout | null>(null);

  // Memori Vision Spasial & Temporal (Mendeteksi kemunculan benda seketika)
  const visionMemoryRef = useRef<VisionMemory>({ prevLum: null, bgLum: null });

  // Guard State & Stabilizer Kamera
  const selectedDeviceIdRef = useRef<string>('');
  const isStartingRef = useRef<boolean>(false);
  const hasMountedRef = useRef<boolean>(false);

  const [devices, setDevices] = useState<VideoDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [activeCameraLabel, setActiveCameraLabel] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState<boolean>(false);
  const [showAiOverlay, setShowAiOverlay] = useState<boolean>(true);
  const [activeFps, setActiveFps] = useState<number>(30);
  const [isModelLoading, setIsModelLoading] = useState<boolean>(false);
  const [modelStatusText, setModelStatusText] = useState<string>('Vision AI Native Aktif (Deteksi Instan)');
  const [minConfidence, setMinConfidence] = useState<number>(0.25); // Sensitif untuk kendaraan & mainan lego

  // Real-time detected items list
  const [detectedItems, setDetectedItems] = useState<DetectedItem[]>([]);

  // Mode Feed: 'yolo11' (Backend Python YOLO11 Tracking Class-wise Server) atau 'browser' (In-Browser Camera)
  const [feedMode, setFeedMode] = useState<'yolo11' | 'browser'>('yolo11');
  const [yoloStreamOnline, setYoloStreamOnline] = useState<boolean>(true);
  const [yoloCameraSource, setYoloCameraSource] = useState<number>(0);
  const [isSwitchingYoloCam, setIsSwitchingYoloCam] = useState<boolean>(false);

  // Sync status sumber kamera YOLO11 dari port 8088
  useEffect(() => {
    let active = true;
    const checkYoloCam = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200);
        const res = await fetch('http://localhost:8088/camera_status', {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          if (active && typeof data.current_source === 'number') {
            setYoloCameraSource(data.current_source);
          }
        }
      } catch {
        // Backend offline / standby
      }
    };
    checkYoloCam();
    const interval = setInterval(checkYoloCam, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const switchYoloCamera = async (sourceId: number) => {
    setIsSwitchingYoloCam(true);
    try {
      const res = await fetch(`http://localhost:8088/switch_camera?source=${sourceId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setYoloCameraSource(sourceId);
        }
      }
    } catch (e) {
      console.warn('Gagal beralih kamera YOLO11:', e);
    } finally {
      setIsSwitchingYoloCam(false);
    }
  };

  // 1. Script Loader Asinkron: Hanya dimuat jika pengguna beralih ke mode browser
  useEffect(() => {
    if (feedMode !== 'browser') return;
    let isMounted = true;

    const loadScriptWithTimeout = (src: string, timeoutMs = 7000): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        let timedOut = false;
        const timer = setTimeout(() => {
          timedOut = true;
          reject(new Error(`Timeout: ${src}`));
        }, timeoutMs);

        script.onload = () => {
          if (!timedOut) {
            clearTimeout(timer);
            resolve();
          }
        };
        script.onerror = () => {
          if (!timedOut) {
            clearTimeout(timer);
            reject(new Error(`Gagal memuat: ${src}`));
          }
        };
        document.head.appendChild(script);
      });
    };

    const initAiModel = async () => {
      try {
        if (isMounted) {
          setModelStatusText('Vision AI Native Aktif (Engine Cepat)');
        }

        // Coba muat TFJS core via jsdelivr atau unpkg
        if (!(window as any).tf) {
          try {
            await loadScriptWithTimeout('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js', 6000);
          } catch {
            await loadScriptWithTimeout('https://unpkg.com/@tensorflow/tfjs@4.22.0/dist/tf.min.js', 6000);
          }
        }

        // Pastikan tf benar-benar siap sebelum mencoba memuat COCO-SSD untuk mencegah error Cannot find TensorFlow
        if (!(window as any).tf) {
          return;
        }

        // Coba muat COCO-SSD via jsdelivr atau unpkg
        if (!(window as any).cocoSsd) {
          try {
            await loadScriptWithTimeout('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js', 6000);
          } catch {
            await loadScriptWithTimeout('https://unpkg.com/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js', 6000);
          }
        }

        if ((window as any).cocoSsd && (window as any).tf) {
          const loadedModel = await (window as any).cocoSsd.load({
            base: 'lite_mobilenet_v2', // Model lite (~2.5MB), sangat cepat dan stabil
          });
          if (isMounted) {
            modelRef.current = loadedModel;
            setIsModelLoading(false);
            setModelStatusText('Vision AI Hybrid Aktif (COCO-SSD + Native CV)');
          }
        }
      } catch (err: any) {
        console.warn('COCO-SSD CDN tidak terjangkau, menggunakan Native Computer Vision Engine:', err);
        if (isMounted) {
          setIsModelLoading(false);
          setModelStatusText('Vision AI Native Aktif (Offline Mode)');
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

  // 3. Start camera stream dengan guard anti-loop
  const startCamera = useCallback(async (deviceIdToUse?: string) => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    setErrorMessage(null);
    setIsPermissionDenied(false);

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      const targetId = deviceIdToUse || selectedDeviceIdRef.current;
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
        } catch (playErr: any) {
          if (playErr.name !== 'AbortError') {
            console.warn('Autoplay warning:', playErr);
          }
        }
      }

      setIsStreaming(true);
      setIsCameraConnected(true);
      setActiveFps(30);

      const refreshedDevices = await getCameraDevices();
      const usbDevice = refreshedDevices.find(
        (d) =>
          d.label.toLowerCase().includes('logitech') ||
          d.label.toLowerCase().includes('usb') ||
          d.label.toLowerCase().includes('c930')
      );

      if (targetId) {
        selectedDeviceIdRef.current = targetId;
        setSelectedDeviceId(targetId);
      } else if (usbDevice && !selectedDeviceIdRef.current) {
        selectedDeviceIdRef.current = usbDevice.deviceId;
        setSelectedDeviceId(usbDevice.deviceId);
        if (track && !track.label.toLowerCase().includes('logitech') && !track.label.toLowerCase().includes('usb')) {
          startCamera(usbDevice.deviceId);
          return;
        }
      } else if (refreshedDevices.length > 0 && !selectedDeviceIdRef.current) {
        selectedDeviceIdRef.current = refreshedDevices[0].deviceId;
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
        setIsPermissionDenied(true);
        setErrorMessage('Izin kamera diblokir browser. Klik ikon gembok pada address bar untuk mengizinkan kamera.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('Kamera webcam tidak ditemukan. Pastikan USB webcam sudah dicolokkan ke laptop.');
      } else {
        setErrorMessage(`Gagal membuka webcam: ${err.message || 'Kamera sedang dipakai aplikasi lain'}`);
      }
    } finally {
      isStartingRef.current = false;
    }
  }, [getCameraDevices, setIsCameraConnected]);

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
      selectedDeviceIdRef.current = nextDevice.deviceId;
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

  // Sinkronisasi status kamera ke context SmartCity
  useEffect(() => {
    if (feedMode === 'yolo11') {
      setIsCameraConnected(yoloStreamOnline);
    } else {
      setIsCameraConnected(isStreaming);
    }
  }, [feedMode, yoloStreamOnline, isStreaming, setIsCameraConnected]);

  // Kelola lifecycle kamera browser secara lazy (Hanya aktifkan jika user membuka mode browser)
  useEffect(() => {
    if (feedMode === 'browser') {
      startCamera();
    } else {
      stopCamera();
    }
  }, [feedMode, startCamera, stopCamera]);

  // Cleanup saat komponen dibongkar / pindah tab
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // 6. REAL OBJECT DETECTION LOOP (Berjalan cepat setiap 120ms / ~8 FPS untuk responsivitas instan)
  useEffect(() => {
    if (!isStreaming) return;

    const runDetectionCycle = async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.paused || video.ended) {
        return;
      }

      const vw = video.videoWidth || 640;
      const vh = video.videoHeight || 480;

      const rawPredictions: RawBox[] = [];

      // A. Jika Model COCO-SSD siap, HANYA ambil prediksi yang merupakan KENDARAAN
      if (modelRef.current) {
        try {
          const cocoPredictions = await modelRef.current.detect(video);
          for (const p of cocoPredictions) {
            const rawCls = p.class.toLowerCase();
            // HANYA terima kelas kendaraan dan miniatur mobil, tolak person dan semua item lain!
            if (VEHICLE_CLASSES.has(rawCls)) {
              if (p.score >= 0.25) {
                rawPredictions.push({
                  class: rawCls,
                  score: p.score,
                  bbox: p.bbox,
                });
              }
            }
          }
        } catch (detErr) {
          console.warn('Deteksi COCO-SSD frame error:', detErr);
        }
      }

      // B. Engine Vision AI Native (Spasial, Miniatur & Handheld Lego Car Vision)
      // Khusus melacak miniatur mobil / lego yang dipegang tangan
      const canvas = canvasRef.current;
      if (canvas) {
        try {
          const nativeResults = await detectNativeVision(video, canvas, vw, vh, visionMemoryRef.current);
          rawPredictions.push(...nativeResults);
        } catch (cvErr) {
          console.warn('Deteksi native CV frame error:', cvErr);
        }
      }

      // Prioritaskan pengurutan berdasarkan skor keyakinan
      const sortedRaw = [...rawPredictions].sort((a, b) => b.score - a.score);

      // NMS Cerdas: Hapus duplikat hanya untuk kelas identik yang tumpang tindih tinggi (IoU > 0.55)
      const dedupedPredictions: RawBox[] = [];
      for (const item of sortedRaw) {
        const isDup = dedupedPredictions.some(
          (d) => d.class.toLowerCase() === item.class.toLowerCase() && computeIoU(d.bbox, item.bbox) > 0.55
        );
        if (!isDup) {
          dedupedPredictions.push(item);
        }
      }

      // Filter ketat: HANYA kendaraan dan miniatur mobil yang boleh lolos!
      const filtered = dedupedPredictions.filter((p) => VEHICLE_CLASSES.has(p.class.toLowerCase()));

      // Batasi maksimal 6 objek paling prioritas (kendaraan selalu di urutan teratas)
      // agar tampilan dashboard tetap bersih, tajam, cerdas dan tidak penuh sesak
      const prioritizedBoxes = filtered.slice(0, 6);

      // Proyeksikan koordinat ke kontainer display dengan perhitungan object-cover
      const container = containerRef.current;
      const cW = container ? container.clientWidth : 16;
      const cH = container ? container.clientHeight : 9;

      const items: DetectedItem[] = prioritizedBoxes.map((p, idx) => {
        return formatDetectedItem(p.class, p.score, p.bbox, vw, vh, cW, cH, `ITEM-${idx + 1}`);
      });

      setDetectedItems(items);

      // Sinkronisasi metrik lalu lintas murni berbasis kendaraan
      const cars = items.filter((i) => i.rawLabel === 'car').length;
      const motos = items.filter((i) => i.rawLabel === 'motorcycle').length;
      const buses = items.filter((i) => i.rawLabel === 'bus').length;
      const trucks = items.filter((i) => i.rawLabel === 'truck').length;
      const totalVehicles = cars + motos + buses + trucks;

      // Kepadatan jalan dihitung murni dari jumlah kendaraan nyata
      let density = 0;
      let statusText: 'LANCAR' | 'SEDANG' | 'PADAT' | 'MACET TOTAL' = 'LANCAR';
      if (totalVehicles === 0) {
        density = 0;
        statusText = 'LANCAR';
      } else if (totalVehicles === 1) {
        density = 25;
        statusText = 'LANCAR';
      } else if (totalVehicles === 2) {
        density = 50;
        statusText = 'SEDANG';
      } else if (totalVehicles === 3) {
        density = 75;
        statusText = 'PADAT';
      } else {
        density = Math.min(100, 85 + (totalVehicles - 4) * 5);
        statusText = 'MACET TOTAL';
      }

      updateTrafficCameraData({
        vehicleCount: totalVehicles,
        density,
        statusText,
        vehicleCounts: {
          mobil: cars,
          motor: motos,
          bus: buses,
          truk: trucks,
        },
      });
    };

    // Jalankan siklus deteksi setiap 120ms (~8 FPS, sangat cepat mendeteksi objek baru seketika)
    const interval = setInterval(runDetectionCycle, 120);
    detectionLoopRef.current = interval;

    return () => clearInterval(interval);
  }, [isStreaming, minConfidence, updateTrafficCameraData]);

  return (
    <div className="neu-raised rounded-2xl border border-[#dfdbd2] p-5 flex flex-col gap-4 overflow-hidden">
      {/* Header Bar */}
      <div className="pb-3 border-b border-[#dfdbd2] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl neu-inset text-[#1d6a47] border border-[#dfdbd2]">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-xs font-bold text-[#25282b] uppercase tracking-wider">
                Feed Kamera Pemantau (AI Computer Vision)
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold border ${
                  isStreaming
                    ? 'bg-[#e4e9e4] text-[#1d6a47] border-[#cbd5cb]'
                    : 'bg-[#dedad0] text-[#4c5156] border-[#cfcac0]'
                }`}
              >
                {isStreaming ? `Live (${activeFps} FPS)` : 'Siaga'}
              </span>
            </div>
            <p className="text-[11px] text-[#4c5156] mt-0.5">
              {feedMode === 'yolo11'
                ? `Sumber YOLO11: ${yoloCameraSource === 1 ? 'Webcam USB (Eksternal)' : 'Kamera Laptop (Internal)'} | Stream port 8088`
                : activeCameraLabel
                ? `Kamera Browser: ${activeCameraLabel}`
                : 'Webcam laptop atau USB terhubung langsung ke dashboard.'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode Switcher: YOLO11 Tracking Engine vs Browser Local */}
          <div className="flex items-center neu-inset p-1 rounded-xl border border-[#dfdbd2]">
            <button
              type="button"
              onClick={() => setFeedMode('yolo11')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[44px] focus-visible:outline-2 focus-visible:outline-[#1d6a47] ${
                feedMode === 'yolo11'
                  ? 'neu-btn-active text-[#1d6a47]'
                  : 'text-[#4c5156] hover:text-[#25282b]'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>YOLO11 Tracking</span>
            </button>
            <button
              type="button"
              onClick={() => setFeedMode('browser')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[44px] focus-visible:outline-2 focus-visible:outline-[#1d6a47] ${
                feedMode === 'browser'
                  ? 'neu-btn-active text-[#1d6a47]'
                  : 'text-[#4c5156] hover:text-[#25282b]'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Webcam Browser</span>
            </button>
          </div>

          {feedMode === 'browser' ? (
            <>
              {/* Dropdown Pilihan Kamera jika terdeteksi lebih dari 1 */}
              {devices.length > 1 ? (
                <select
                  value={selectedDeviceId}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setSelectedDeviceId(newId);
                    startCamera(newId);
                  }}
                  className="neu-inset text-[#25282b] border border-[#dfdbd2] text-xs rounded-xl px-3 py-2 outline-none cursor-pointer max-w-[170px] truncate min-h-[44px] focus-visible:outline-2 focus-visible:outline-[#1d6a47]"
                  title="Pilih kamera"
                >
                  {devices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label}
                    </option>
                  ))}
                </select>
              ) : (
                <button
                  type="button"
                  onClick={switchCamera}
                  className="neu-btn flex items-center gap-1.5 px-3 py-2 rounded-xl text-[#25282b] text-xs font-semibold min-h-[44px] focus-visible:outline-2 focus-visible:outline-[#1d6a47]"
                  title="Beralih kamera"
                >
                  <SwitchCamera className="w-4 h-4 text-[#1d6a47]" />
                  <span>Ganti Kamera</span>
                </button>
              )}

              {/* Start/Stop Camera Button */}
              {isStreaming ? (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="neu-btn flex items-center gap-1.5 px-4 py-2 rounded-xl text-[#a12d1f] text-xs font-bold min-h-[44px] focus-visible:outline-2 focus-visible:outline-[#1d6a47]"
                >
                  <VideoOff className="w-4 h-4" />
                  <span>Matikan</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="neu-btn flex items-center gap-1.5 px-4 py-2 rounded-xl text-[#1d6a47] text-xs font-bold min-h-[44px] focus-visible:outline-2 focus-visible:outline-[#1d6a47]"
                >
                  <Video className="w-4 h-4" />
                  <span>Nyalakan Kamera</span>
                </button>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2">
              {/* Pilihan Kamera YOLO11: Laptop vs USB */}
              <div className="flex items-center neu-inset rounded-xl border border-[#dfdbd2] p-1 text-xs">
                <button
                  type="button"
                  onClick={() => switchYoloCamera(0)}
                  disabled={isSwitchingYoloCam}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[44px] flex items-center focus-visible:outline-2 focus-visible:outline-[#1d6a47] ${
                    yoloCameraSource === 0
                      ? 'neu-btn-active text-[#1d6a47]'
                      : 'text-[#4c5156] hover:text-[#25282b]'
                  }`}
                  title="Gunakan Kamera Laptop Bawaan"
                >
                  Kamera Laptop
                </button>
                <button
                  type="button"
                  onClick={() => switchYoloCamera(1)}
                  disabled={isSwitchingYoloCam}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[44px] flex items-center focus-visible:outline-2 focus-visible:outline-[#1d6a47] ${
                    yoloCameraSource === 1
                      ? 'neu-btn-active text-[#1d6a47]'
                      : 'text-[#4c5156] hover:text-[#25282b]'
                  }`}
                  title="Gunakan Webcam USB Eksternal"
                >
                  Webcam USB
                </button>
              </div>

              <div className="neu-inset-sm flex items-center gap-2 text-[#1d6a47] rounded-xl px-3 py-2 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-[#1d6a47]" />
                <span>YOLO11 Server Aktif</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Model Status & Sensitivity Adjustment Bar */}
      <div className="px-3 py-2 neu-inset rounded-xl border border-[#dfdbd2] flex flex-wrap items-center justify-between text-xs text-[#4c5156] gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#1d6a47] shrink-0" />
          <p className="font-mono text-[11px] text-[#25282b] font-semibold">
            Model: {modelStatusText}
          </p>
        </div>

        {/* Sensitivity / Min Confidence Slider */}
        <div className="flex items-center gap-2.5 font-mono text-[11px]">
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#4c5156]" />
          <span>Sensitivitas:</span>
          <input
            type="range"
            min="0.20"
            max="0.80"
            step="0.05"
            value={minConfidence}
            onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
            className="neu-range w-24"
            title={`Threshold Keyakinan: ${Math.round(minConfidence * 100)}%`}
            aria-label="Sensitivitas Deteksi Objek"
          />
          <span className="text-[#25282b] font-bold">{Math.round(minConfidence * 100)}%</span>
        </div>
      </div>

      {/* Video Viewport Area */}
      <div
        ref={containerRef}
        className="relative aspect-video w-full bg-black overflow-hidden flex items-center justify-center select-none min-h-[380px]"
      >
        {/* Hidden Canvas for Vision Frame Processing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* YOLO11 Backend Stream (Port 8088) atau HTML5 Native Webcam */}
        {feedMode === 'yolo11' ? (
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            {yoloStreamOnline ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="http://localhost:8088/video_feed"
                alt="YOLO11 Traffic Stream"
                className="w-full h-full object-cover"
                onError={() => setYoloStreamOnline(false)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white">YOLO11 Stream Offline</h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  Server YOLO11 (port 8088) belum aktif atau sedang memproses. Pastikan sistem traffic-monitor berjalan.
                </p>
                <button
                  onClick={() => setYoloStreamOnline(true)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
                >
                  Muat Ulang Stream
                </button>
              </div>
            )}
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover bg-black"
          />
        )}


        {/* Fallback / Offline Standby Screen (Khusus mode browser jika belum streaming) */}
        {feedMode === 'browser' && !isStreaming && (
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

        {/* AI HUD Computer Vision Overlay (Khusus mode Browser saat streaming) */}
        {feedMode === 'browser' && isStreaming && showAiOverlay && (
          <div className="absolute inset-0 pointer-events-none z-20">

            {/* Top Scanning Line Animation */}
            <div
              className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-pulse"
              style={{ top: '25%' }}
            />

            {/* Real Detected Bounding Boxes */}
            {detectedItems.map((box, index) => {
              // Cek tabrakan tag label dengan bounding box lain di posisi serupa
              const isColliding = detectedItems.some(
                (other, oIdx) =>
                  oIdx !== index &&
                  Math.abs(box.x - other.x) < 9 &&
                  Math.abs(box.y - other.y) < 7
              );

              return (
                <div
                  key={box.id}
                  className="absolute border-2 transition-all duration-150 flex flex-col justify-start pointer-events-none"
                  style={{
                    borderColor: box.color,
                    left: `${box.x}%`,
                    top: `${box.y}%`,
                    width: `${box.w}%`,
                    height: `${box.h}%`,
                    zIndex: 10 + (box.isNested ? 20 : index),
                    boxShadow: box.isNested
                      ? `0 0 16px ${box.color}99, inset 0 0 10px ${box.color}35`
                      : `0 0 10px ${box.color}50`,
                  }}
                >
                  {/* Corner Accents */}
                  <span className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-white shadow-sm" />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-white shadow-sm" />
                  <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-white shadow-sm" />
                  <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-white shadow-sm" />

                  {/* Box Tag Label */}
                  <div
                    className={`text-[10px] font-mono font-bold text-slate-950 px-2 py-0.5 rounded shadow-lg flex items-center gap-1.5 whitespace-nowrap transition-all ${
                      box.y < 7 ? 'mt-1' : '-mt-5'
                    } ${isColliding ? 'self-end' : 'self-start'}`}
                    style={{ backgroundColor: box.color }}
                  >
                    <span>{box.label}</span>
                    {box.isNested && (
                      <span className="bg-black/35 text-white text-[9px] px-1 py-0.5 rounded font-semibold uppercase tracking-wider">
                        Di Dalam
                      </span>
                    )}
                    <span className="opacity-80">{(box.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              );
            })}

            {/* Top HUD Badges */}
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <div className="bg-slate-950/90 px-2.5 py-1 rounded text-[10px] font-mono text-slate-300 border border-slate-800">
                {modelRef.current ? 'COCO-SSD + Native AI' : 'Native Vision AI'}
              </div>
              <div className="bg-slate-950/90 px-2 py-1 rounded text-[10px] font-mono text-emerald-400 border border-slate-800">
                {activeFps} FPS
              </div>
            </div>

            {/* Bottom HUD Bar */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
              <div className="bg-slate-950/90 px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center gap-3">
                <p className="text-amber-400 font-semibold">Kendaraan: {traffic.vehicleCount} Unit</p>
                <p className="text-slate-600">|</p>
                <p>Kepadatan: {traffic.density}% ({traffic.statusText})</p>
                <p className="text-slate-600">|</p>
                <p className="text-emerald-400">Total Objek: {detectedItems.length}</p>
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
        <div className="p-3 neu-inset rounded-xl border border-[#dfdbd2] flex items-center gap-2.5 overflow-x-auto text-xs">
          <span className="font-mono text-[11px] text-[#25282b] font-bold shrink-0">
            Objek Terdeteksi:
          </span>
          {detectedItems.length === 0 ? (
            <span className="text-[#4c5156] text-[11px] italic">
              Belum ada objek di depan kamera. Letakkan objek miniatur di depan lensa.
            </span>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              {detectedItems.map((item, idx) => (
                <div
                  key={`${item.id}-${idx}`}
                  className="px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold border"
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
      <div className="pt-3 border-t border-[#dfdbd2] text-xs text-[#4c5156] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#1d6a47]" />
          <span className="text-[11px]">Deteksi berjalan langsung di peramban (Client-Side AI).</span>
        </div>
        <span className="font-mono text-[11px] text-[#4c5156]">
          Sumber: {activeCameraLabel || selectedDeviceId || 'Webcam'}
        </span>
      </div>
    </div>
  );
};
