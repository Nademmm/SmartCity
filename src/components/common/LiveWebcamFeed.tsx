'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSmartCity } from '@/context/SmartCityContext';

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
  x: number;
  y: number;
  w: number;
  h: number;
  confidence: number;
  isNested?: boolean;
}

const LABEL_MAP: Record<string, { label: string; category: DetectedItem['category']; color: string }> = {
  car: { label: 'Mobil', category: 'vehicle', color: '#22C55E' },
  'toy car': { label: 'Mobil Miniatur', category: 'vehicle', color: '#22C55E' },
  'miniature car': { label: 'Mobil Miniatur', category: 'vehicle', color: '#22C55E' },
  truck: { label: 'Truk', category: 'vehicle', color: '#F87171' },
  bus: { label: 'Bus', category: 'vehicle', color: '#FBBF24' },
  motorcycle: { label: 'Motor', category: 'vehicle', color: '#60A5FA' },
  bicycle: { label: 'Sepeda', category: 'vehicle', color: '#34D399' },
};

const VEHICLE_CLASSES = new Set([
  'car',
  'toy car',
  'miniature car',
  'truck',
  'bus',
  'motorcycle',
  'bicycle',
]);

interface RawBox {
  class: string;
  score: number;
  bbox: [number, number, number, number];
}

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
    label: rawClass.toUpperCase(),
    category: 'item' as const,
    color: '#60A5FA',
  };

  const [x, y, w, h] = bbox;
  const cAspect = cW > 0 && cH > 0 ? cW / cH : 16 / 9;
  const vAspect = vw > 0 && vh > 0 ? vw / vh : 4 / 3;

  let xPct: number;
  let yPct: number;
  let wPct: number;
  let hPct: number;

  if (vAspect < cAspect) {
    const visibleVH = vw / cAspect;
    const cropTop = (vh - visibleVH) / 2;
    xPct = (x / vw) * 100;
    yPct = ((y - cropTop) / visibleVH) * 100;
    wPct = (w / vw) * 100;
    hPct = (h / visibleVH) * 100;
  } else {
    const visibleVW = vh * cAspect;
    const cropLeft = (vw - visibleVW) / 2;
    xPct = ((x - cropLeft) / visibleVW) * 100;
    yPct = (y / vh) * 100;
    wPct = (w / visibleVW) * 100;
    hPct = (h / vh) * 100;
  }

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

async function detectNativeVision(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  vw: number,
  vh: number,
  memory: VisionMemory
): Promise<RawBox[]> {
  const results: RawBox[] = [];
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
  const cols = 28;
  const rows = 21;
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
      const skinRatio = count > 0 ? skinCount / count : 0;
      const colorSat = Math.max(Math.abs(avgR - avgG), Math.abs(avgG - avgB), Math.abs(avgB - avgR));

      curLumArray[bIdx] = avgLum;
      curSatArray[bIdx] = colorSat;

      if (skinRatio > 0.22) {
        gridSkin[r][c] = 1;
      }
    }
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (gridSkin[r][c] === 1) continue;

      const bIdx = r * cols + c;
      const lum = curLumArray[bIdx];

      let localEdge = 0;
      const dNeigh = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of dNeigh) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          localEdge += Math.abs(lum - curLumArray[nr * cols + nc]);
        }
      }

      const deltaBg = memory.bgLum ? Math.abs(lum - memory.bgLum[bIdx]) : 30;
      const isLegoColor = curSatArray[bIdx] > 32;
      const isForeground = deltaBg > 22;

      if ((isForeground && localEdge > 16) || (isLegoColor && localEdge > 18)) {
        if (r >= 3 && r <= rows - 2 && c >= 2 && c <= cols - 2) {
          gridObject[r][c] = 1;
        }
      }
    }
  }

  if (!memory.bgLum || memory.bgLum.length !== totalBlocks) {
    memory.bgLum = new Float32Array(curLumArray);
  } else {
    for (let i = 0; i < totalBlocks; i++) {
      memory.bgLum[i] = memory.bgLum[i] * 0.98 + curLumArray[i] * 0.02;
    }
  }
  memory.prevLum = new Float32Array(curLumArray);

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

        if (qCount >= 3 && qCount <= 70) {
          const bW = ((qMaxC - qMinC + 1) / cols) * vw;
          const bH = ((qMaxR - qMinR + 1) / rows) * vh;
          const bX = (qMinC / cols) * vw;
          const bY = (qMinR / rows) * vh;

          const maxDim = Math.max(bW, bH);
          const minDim = Math.min(bW, bH);
          const shapeRatio = maxDim / Math.max(1, minDim);
          const areaFraction = (bW * bH) / (vw * vh);

          if (areaFraction < 0.006 || areaFraction > 0.2) continue;
          if (bY < vh * 0.16) continue;
          if (shapeRatio < 1.25 || shapeRatio > 3.4) continue;

          results.push({
            class: shapeRatio > 2.2 ? 'truck' : 'car',
            score: 0.96,
            bbox: [bX, bY, bW, bH],
          });
        }
      }
    }
  }

  return results.slice(0, 3);
}

export const LiveWebcamFeed: React.FC = () => {
  const { setIsCameraConnected, updateTrafficCameraData } = useSmartCity();

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modelRef = useRef<{ detect: (v: HTMLVideoElement) => Promise<RawBox[]> } | null>(null);
  const detectionLoopRef = useRef<NodeJS.Timeout | null>(null);
  const visionMemoryRef = useRef<VisionMemory>({ prevLum: null, bgLum: null });

  const selectedDeviceIdRef = useRef<string>('');
  const isStartingRef = useRef<boolean>(false);

  const [devices, setDevices] = useState<VideoDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [minConfidence, setMinConfidence] = useState<number>(0.25);
  const [detectedItems, setDetectedItems] = useState<DetectedItem[]>([]);
  const [feedMode, setFeedMode] = useState<'yolo11' | 'browser'>('yolo11');
  const [yoloStreamOnline, setYoloStreamOnline] = useState<boolean>(true);
  const [yoloCameraSource, setYoloCameraSource] = useState<number>(0);
  const [isSwitchingYoloCam, setIsSwitchingYoloCam] = useState<boolean>(false);

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
      } catch {}
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
    } catch {} finally {
      setIsSwitchingYoloCam(false);
    }
  };

  const getCameraDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return [];
      }
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices
        .filter((d) => d.kind === 'videoinput')
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Kamera ${index + 1}`,
        }));
      setDevices(videoInputs);
      return videoInputs;
    } catch {
      return [];
    }
  }, []);

  const startCamera = useCallback(
    async (deviceIdToUse?: string) => {
      if (isStartingRef.current) return;
      isStartingRef.current = true;
      setErrorMessage(null);

      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        const targetId = deviceIdToUse || selectedDeviceIdRef.current;
        const constraints: MediaStreamConstraints = {
          video: targetId
            ? { deviceId: { ideal: targetId }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          videoRef.current.playsInline = true;
          videoRef.current.autoplay = true;
          try {
            await videoRef.current.play();
          } catch {}
        }

        setIsStreaming(true);
        setIsCameraConnected(true);

        const refreshed = await getCameraDevices();
        if (targetId) {
          selectedDeviceIdRef.current = targetId;
          setSelectedDeviceId(targetId);
        } else if (refreshed.length > 0 && !selectedDeviceIdRef.current) {
          selectedDeviceIdRef.current = refreshed[0].deviceId;
          setSelectedDeviceId(refreshed[0].deviceId);
        }
      } catch (err: unknown) {
        setIsStreaming(false);
        setIsCameraConnected(false);
        const errorObj = err as { message?: string };
        setErrorMessage(errorObj.message || 'Kamera tidak terjangkau atau izin ditolak browser.');
      } finally {
        isStartingRef.current = false;
      }
    },
    [getCameraDevices, setIsCameraConnected]
  );

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

  useEffect(() => {
    if (feedMode === 'yolo11') {
      setIsCameraConnected(yoloStreamOnline);
      stopCamera();
    } else {
      startCamera();
    }
  }, [feedMode, yoloStreamOnline, startCamera, stopCamera, setIsCameraConnected]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  useEffect(() => {
    if (!isStreaming) return;

    const runDetectionCycle = async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.paused || video.ended) return;

      const vw = video.videoWidth || 640;
      const vh = video.videoHeight || 480;
      const rawPredictions: RawBox[] = [];

      if (modelRef.current) {
        try {
          const cocoPredictions = await modelRef.current.detect(video);
          for (const p of cocoPredictions) {
            const rawCls = p.class.toLowerCase();
            if (VEHICLE_CLASSES.has(rawCls) && p.score >= minConfidence) {
              rawPredictions.push({ class: rawCls, score: p.score, bbox: p.bbox });
            }
          }
        } catch {}
      }

      const canvas = canvasRef.current;
      if (canvas) {
        try {
          const nativeResults = await detectNativeVision(video, canvas, vw, vh, visionMemoryRef.current);
          rawPredictions.push(...nativeResults);
        } catch {}
      }

      const sortedRaw = [...rawPredictions].sort((a, b) => b.score - a.score);
      const dedupedPredictions: RawBox[] = [];
      for (const item of sortedRaw) {
        const isDup = dedupedPredictions.some(
          (d) => d.class.toLowerCase() === item.class.toLowerCase() && computeIoU(d.bbox, item.bbox) > 0.55
        );
        if (!isDup) dedupedPredictions.push(item);
      }

      const prioritizedBoxes = dedupedPredictions
        .filter((p) => VEHICLE_CLASSES.has(p.class.toLowerCase()))
        .slice(0, 6);

      const container = containerRef.current;
      const cW = container ? container.clientWidth : 16;
      const cH = container ? container.clientHeight : 9;

      const items = prioritizedBoxes.map((p, idx) =>
        formatDetectedItem(p.class, p.score, p.bbox, vw, vh, cW, cH, `ITEM-${idx + 1}`)
      );

      setDetectedItems(items);

      const cars = items.filter((i) => i.rawLabel === 'car').length;
      const motos = items.filter((i) => i.rawLabel === 'motorcycle').length;
      const buses = items.filter((i) => i.rawLabel === 'bus').length;
      const trucks = items.filter((i) => i.rawLabel === 'truck').length;
      const totalVehicles = cars + motos + buses + trucks;

      let density = 0;
      let statusText: 'LANCAR' | 'SEDANG' | 'PADAT' | 'MACET TOTAL' = 'LANCAR';
      if (totalVehicles === 1) {
        density = 25;
        statusText = 'LANCAR';
      } else if (totalVehicles === 2) {
        density = 50;
        statusText = 'SEDANG';
      } else if (totalVehicles === 3) {
        density = 75;
        statusText = 'PADAT';
      } else if (totalVehicles >= 4) {
        density = Math.min(100, 85 + (totalVehicles - 4) * 5);
        statusText = 'MACET TOTAL';
      }

      updateTrafficCameraData({
        vehicleCount: totalVehicles,
        density,
        statusText,
        vehicleCounts: { mobil: cars, motor: motos, bus: buses, truk: trucks },
      });
    };

    const interval = setInterval(runDetectionCycle, 150);
    detectionLoopRef.current = interval;
    return () => clearInterval(interval);
  }, [isStreaming, minConfidence, updateTrafficCameraData]);

  return (
    <section aria-label="Feed Kamera Pemantau" className="rack-panel flex flex-col">
      {/* Header Controls */}
      <div className="px-4 py-3 bg-[var(--bg-header)] border-b border-[var(--border-line)] flex flex-wrap items-center justify-between gap-2 rounded-t-[10px]">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-[var(--text-primary)]">Kamera Pemantau</h3>
          <span className="rack-tag">{feedMode === 'yolo11' ? 'PORT 8088' : 'WEBCAM'}</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setFeedMode('yolo11')}
            className={`ctrl-btn ctrl-btn-sm font-mono ${
              feedMode === 'yolo11' ? 'ctrl-btn-active' : ''
            }`}
          >
            YOLO11 Server
          </button>
          <button
            type="button"
            onClick={() => setFeedMode('browser')}
            className={`ctrl-btn ctrl-btn-sm font-mono ${
              feedMode === 'browser' ? 'ctrl-btn-active' : ''
            }`}
          >
            Webcam Browser
          </button>

          {feedMode === 'yolo11' ? (
            <>
              <button
                type="button"
                onClick={() => switchYoloCamera(0)}
                disabled={isSwitchingYoloCam}
                className={`ctrl-btn ctrl-btn-sm font-mono ${
                  yoloCameraSource === 0 ? 'ctrl-btn-green' : ''
                }`}
              >
                CAM 0
              </button>
              <button
                type="button"
                onClick={() => switchYoloCamera(1)}
                disabled={isSwitchingYoloCam}
                className={`ctrl-btn ctrl-btn-sm font-mono ${
                  yoloCameraSource === 1 ? 'ctrl-btn-green' : ''
                }`}
              >
                CAM 1 (USB)
              </button>
            </>
          ) : (
            <>
              {devices.length > 1 && (
                <select
                  value={selectedDeviceId}
                  onChange={(e) => {
                    setSelectedDeviceId(e.target.value);
                    startCamera(e.target.value);
                  }}
                  aria-label="Pilih Perangkat Kamera"
                  className="rack-well px-2.5 h-8 text-xs font-mono"
                >
                  {devices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label}
                    </option>
                  ))}
                </select>
              )}

              {isStreaming ? (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="ctrl-btn ctrl-btn-sm ctrl-btn-red font-mono"
                >
                  Matikan
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="ctrl-btn ctrl-btn-sm ctrl-btn-green font-mono"
                >
                  Nyalakan
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {/* Video Viewport */}
        <div
          ref={containerRef}
          className="relative aspect-video w-full bg-[#090D16] rounded-lg border border-[var(--border-strong)] overflow-hidden flex items-center justify-center min-h-[280px]"
        >
          <canvas ref={canvasRef} className="hidden" />

          {feedMode === 'yolo11' ? (
            yoloStreamOnline ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="http://localhost:8088/video_feed"
                alt="YOLO11 Stream"
                className="w-full h-full object-cover"
                onError={() => setYoloStreamOnline(false)}
              />
            ) : (
              <div className="p-6 text-center font-mono space-y-3 text-[#F8FAFC]">
                <p className="text-sm font-bold">STREAM PORT 8088 SIAGA</p>
                <p className="text-xs text-[#94A3B8] max-w-md mx-auto">
                  Server Python YOLO11 belum berjalan. Klik [Webcam Browser] untuk menggunakan kamera langsung.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setYoloStreamOnline(true)}
                    className="ctrl-btn ctrl-btn-sm font-mono"
                  >
                    Coba Ulang Port 8088
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedMode('browser')}
                    className="ctrl-btn ctrl-btn-sm ctrl-btn-active font-mono"
                  >
                    Gunakan Webcam Browser
                  </button>
                </div>
              </div>
            )
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover bg-black"
            />
          )}

          {feedMode === 'browser' && !isStreaming && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#090D16] text-[#F8FAFC] font-mono space-y-3 z-10">
              <p className="text-sm font-bold">WEBCAM SIAGA</p>
              {errorMessage && (
                <p className="text-xs text-[#F87171] max-w-md">{errorMessage}</p>
              )}
              <button
                type="button"
                onClick={() => startCamera()}
                className="ctrl-btn ctrl-btn-green font-mono"
              >
                Aktifkan Kamera
              </button>
            </div>
          )}

          {feedMode === 'browser' && isStreaming && (
            <div className="absolute inset-0 pointer-events-none z-20">
              {detectedItems.map((box) => (
                <div
                  key={box.id}
                  className="absolute border-2"
                  style={{
                    borderColor: box.color,
                    left: `${box.x}%`,
                    top: `${box.y}%`,
                    width: `${box.w}%`,
                    height: `${box.h}%`,
                  }}
                >
                  <span
                    className="inline-block text-[10px] font-mono font-bold text-black px-1.5 py-0.5"
                    style={{ backgroundColor: box.color }}
                  >
                    {box.label} {(box.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sensitivity Slider */}
        <div className="rack-well px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
          <span className="text-[var(--text-secondary)]">
            Sensitivitas Deteksi:{' '}
            <strong className="text-[var(--text-primary)]">{Math.round(minConfidence * 100)}%</strong>
          </span>
          <div className="w-48">
            <input
              type="range"
              min="0.20"
              max="0.80"
              step="0.05"
              value={minConfidence}
              onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
              className="ctrl-range"
              aria-label="Sensitivitas Deteksi"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
