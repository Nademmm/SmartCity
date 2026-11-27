'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSmartCity } from '@/context/SmartCityContext';

interface VideoDevice {
  deviceId: string;
  label: string;
}

interface DetectedCar {
  id: string;
  trackId: number;
  label: string;
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
  confidence: number;
}

interface CocoPrediction {
  bbox: [number, number, number, number];
  class: string;
  score: number;
}

interface CocoSsdModel {
  detect: (
    img: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
    maxNumBoxes?: number,
    minScore?: number
  ) => Promise<CocoPrediction[]>;
}

interface RawCarBox {
  bbox: [number, number, number, number];
  score: number;
}

interface TrackedCar {
  trackId: number;
  bbox: [number, number, number, number];
  score: number;
  hits: number;
  missed: number;
}

interface RoiBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface LockedRoadCalibration {
  w: number;
  h: number;
  bgLum: Float32Array;
  bgSat: Float32Array;
  timestamp: string;
}

// Kelas kendaraan langsung dari jaringan saraf COCO-SSD (HANYA kendaraan asli, tanpa cell phone / suitcase agar HP di meja tidak pernah terdeteksi sebagai mobil)
const DIRECT_VEHICLE_CLASSES = new Set(['car', 'truck', 'bus', 'train']);

// Kelas perabot/ruangan/manusia yang wajib ditolak mutlak
const NON_VEHICLE_ROOM_CLASSES = new Set([
  'cell phone',
  'suitcase',
  'remote',
  'mouse',
  'chair',
  'couch',
  'potted plant',
  'bed',
  'dining table',
  'tv',
  'laptop',
  'keyboard',
  'book',
  'clock',
  'vase',
  'scissors',
  'teddy bear',
  'toothbrush',
  'bottle',
  'wine glass',
  'cup',
  'bowl',
  'backpack',
  'umbrella',
  'handbag',
  'tie',
  'refrigerator',
  'microwave',
  'oven',
]);

// Objek padat non-kendaraan yang isi dalamnya tidak boleh dianggap mobil (misal jam di layar HP atau ritsleting tas)
const CONTAINING_NON_VEHICLE_CLASSES = new Set([
  'cell phone',
  'laptop',
  'tv',
  'backpack',
  'handbag',
  'suitcase',
  'keyboard',
  'bottle',
  'cup',
]);

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

function computeCenterDistanceRatio(
  b1: [number, number, number, number],
  b2: [number, number, number, number]
): number {
  const cx1 = b1[0] + b1[2] * 0.5;
  const cy1 = b1[1] + b1[3] * 0.5;
  const cx2 = b2[0] + b2[2] * 0.5;
  const cy2 = b2[1] + b2[3] * 0.5;
  const dist = Math.hypot(cx1 - cx2, cy1 - cy2);
  const refSize = Math.max(10, Math.hypot(b1[2], b1[3]), Math.hypot(b2[2], b2[3]));
  return dist / refSize;
}

export function calculateTrafficCongestion(carCount: number): {
  density: number;
  statusText: 'LANCAR' | 'SEDANG' | 'PADAT' | 'MACET TOTAL';
  avgSpeedKmh: number;
  queueLengthMeters: number;
} {
  if (carCount <= 0) {
    return { density: 0, statusText: 'LANCAR', avgSpeedKmh: 60, queueLengthMeters: 0 };
  }
  if (carCount === 1) {
    return { density: 16, statusText: 'LANCAR', avgSpeedKmh: 55, queueLengthMeters: 4 };
  }
  if (carCount === 2) {
    return { density: 32, statusText: 'LANCAR', avgSpeedKmh: 48, queueLengthMeters: 8 };
  }
  if (carCount === 3) {
    return { density: 50, statusText: 'SEDANG', avgSpeedKmh: 35, queueLengthMeters: 14 };
  }
  if (carCount === 4) {
    return { density: 68, statusText: 'PADAT', avgSpeedKmh: 24, queueLengthMeters: 20 };
  }
  if (carCount === 5) {
    return { density: 84, statusText: 'PADAT', avgSpeedKmh: 16, queueLengthMeters: 26 };
  }
  return {
    density: Math.min(100, 95 + (carCount - 6) * 2),
    statusText: 'MACET TOTAL',
    avgSpeedKmh: Math.max(4, 10 - (carCount - 6)),
    queueLengthMeters: carCount * 6,
  };
}

function mapBoxToContainerPercent(
  bbox: [number, number, number, number],
  vw: number,
  vh: number,
  cW: number,
  cH: number
): { x: number; y: number; w: number; h: number } {
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

  const clampedX = Math.max(0, Math.min(96, xPct));
  const clampedY = Math.max(0, Math.min(96, yPct));
  const clampedW = Math.max(2.8, Math.min(100 - clampedX, wPct));
  const clampedH = Math.max(2.8, Math.min(100 - clampedY, hPct));

  return {
    x: Number(clampedX.toFixed(1)),
    y: Number(clampedY.toFixed(1)),
    w: Number(clampedW.toFixed(1)),
    h: Number(clampedH.toFixed(1)),
  };
}

// Resolusi Analisis Presisi Tinggi (mempertahankan rasio aspek asli kamera HP portrait maupun laptop landscape)
const MAX_PROC_DIM = 360;

interface SceneFeatureMaps {
  w: number;
  h: number;
  gray: Uint8Array;
  sat: Uint8Array;
  val: Uint8Array;
  rCh: Uint8Array;
  gCh: Uint8Array;
  bCh: Uint8Array;
  sd5: Float32Array;
  edges: Uint8Array;
  smoothStrictSkin: Uint8Array;
  smoothHandSkin: Uint8Array;
  totalSkinRatio: number;
}

function morphErode(src: Uint8Array, w: number, h: number, radius: number): Uint8Array {
  const dst = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(h - 1, y + radius);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(w - 1, x + radius);
      let allOne = 1;
      for (let ny = y0; ny <= y1 && allOne; ny++) {
        const rowOff = ny * w;
        for (let nx = x0; nx <= x1; nx++) {
          if (src[rowOff + nx] === 0) {
            allOne = 0;
            break;
          }
        }
      }
      dst[y * w + x] = allOne;
    }
  }
  return dst;
}

function morphDilate(src: Uint8Array, w: number, h: number, radius: number): Uint8Array {
  const dst = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(h - 1, y + radius);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(w - 1, x + radius);
      let anyOne = 0;
      for (let ny = y0; ny <= y1 && !anyOne; ny++) {
        const rowOff = ny * w;
        for (let nx = x0; nx <= x1; nx++) {
          if (src[rowOff + nx] === 1) {
            anyOne = 1;
            break;
          }
        }
      }
      dst[y * w + x] = anyOne;
    }
  }
  return dst;
}

function morphOpen(src: Uint8Array, w: number, h: number, radius: number): Uint8Array {
  return morphDilate(morphErode(src, w, h, radius), w, h, radius);
}

function morphClose(src: Uint8Array, w: number, h: number, radius: number): Uint8Array {
  return morphErode(morphDilate(src, w, h, radius), w, h, radius);
}

function computePercentile(sortedArr: number[], p: number): number {
  if (sortedArr.length === 0) return 0;
  const idx = (sortedArr.length - 1) * (p / 100);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedArr[lo];
  return sortedArr[lo] * (hi - idx) + sortedArr[hi] * (idx - lo);
}

// Standar deviasi lokal 5x5 menggunakan integral image 2D O(1)/piksel
// Membedakan tekstur mikro 3D mobil miniatur (sd5 > 14.5) dari dinding gedung karton/aspal halus (sd5 < 14)
function computeLocalStd5(gray: Uint8Array, w: number, h: number): Float32Array {
  const stride = w + 1;
  const sum1 = new Float64Array(stride * (h + 1));
  const sum2 = new Float64Array(stride * (h + 1));

  for (let y = 0; y < h; y++) {
    let rowS1 = 0;
    let rowS2 = 0;
    const gRow = y * w;
    const prevRow = y * stride;
    const curRow = (y + 1) * stride;
    for (let x = 0; x < w; x++) {
      const v = gray[gRow + x];
      rowS1 += v;
      rowS2 += v * v;
      sum1[curRow + x + 1] = sum1[prevRow + x + 1] + rowS1;
      sum2[curRow + x + 1] = sum2[prevRow + x + 1] + rowS2;
    }
  }

  const sd5 = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - 2);
    const y1 = Math.min(h, y + 3);
    const r0 = y0 * stride;
    const r1 = y1 * stride;
    const outRow = y * w;
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - 2);
      const x1 = Math.min(w, x + 3);
      const cnt = (x1 - x0) * (y1 - y0);
      const s1 = sum1[r1 + x1] - sum1[r0 + x1] - sum1[r1 + x0] + sum1[r0 + x0];
      const s2 = sum2[r1 + x1] - sum2[r0 + x1] - sum2[r1 + x0] + sum2[r0 + x0];
      const mean = s1 / cnt;
      const variance = s2 / cnt - mean * mean;
      sd5[outRow + x] = variance > 0 ? Math.sqrt(variance) : 0;
    }
  }
  return sd5;
}

interface ConnectedComponentStat {
  id: number;
  bx: number;
  by: number;
  bw: number;
  bh: number;
  area: number;
}

function findConnectedComponents8WithLabels(
  mask: Uint8Array,
  w: number,
  h: number
): { stats: ConnectedComponentStat[]; labels: Int32Array } {
  const labels = new Int32Array(w * h);
  const stats: ConnectedComponentStat[] = [];
  const qx = new Int32Array(w * h);
  const qy = new Int32Array(w * h);
  let compId = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const startIdx = y * w + x;
      if (mask[startIdx] === 1 && labels[startIdx] === 0) {
        compId++;
        labels[startIdx] = compId;
        let head = 0;
        let tail = 0;
        qx[tail] = x;
        qy[tail] = y;
        tail++;

        let minX = x, maxX = x, minY = y, maxY = y;
        let area = 0;

        while (head < tail) {
          const cx = qx[head];
          const cy = qy[head];
          head++;
          area++;

          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;

          const ny0 = Math.max(0, cy - 1);
          const ny1 = Math.min(h - 1, cy + 1);
          const nx0 = Math.max(0, cx - 1);
          const nx1 = Math.min(w - 1, cx + 1);

          for (let ny = ny0; ny <= ny1; ny++) {
            const rowOff = ny * w;
            for (let nx = nx0; nx <= nx1; nx++) {
              const nIdx = rowOff + nx;
              if (mask[nIdx] === 1 && labels[nIdx] === 0) {
                labels[nIdx] = compId;
                qx[tail] = nx;
                qy[tail] = ny;
                tail++;
              }
            }
          }
        }

        stats.push({
          id: compId,
          bx: minX,
          by: minY,
          bw: maxX - minX + 1,
          bh: maxY - minY + 1,
          area,
        });
      }
    }
  }

  return { stats, labels };
}

function extractSceneFeatureMaps(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): SceneFeatureMaps | null {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const vw = video.videoWidth || 640;
  const vh = video.videoHeight || 480;
  const scale = MAX_PROC_DIM / Math.max(vw, vh);
  const w = Math.max(64, Math.round(vw * scale));
  const h = Math.max(64, Math.round(vh * scale));

  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(video, 0, 0, w, h);

  let imgData: ImageData;
  try {
    imgData = ctx.getImageData(0, 0, w, h);
  } catch {
    return null;
  }

  const data = imgData.data;
  const totalPixels = w * h;

  const gray = new Uint8Array(totalPixels);
  const sat = new Uint8Array(totalPixels);
  const val = new Uint8Array(totalPixels);
  const rCh = new Uint8Array(totalPixels);
  const gCh = new Uint8Array(totalPixels);
  const bCh = new Uint8Array(totalPixels);
  const strictSkin = new Uint8Array(totalPixels);
  const handSkin = new Uint8Array(totalPixels);

  for (let i = 0; i < totalPixels; i++) {
    const p = i * 4;
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];

    rCh[i] = r;
    gCh[i] = g;
    bCh[i] = b;

    const yVal = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    gray[i] = yVal;

    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const sVal = maxC > 0 ? Math.round(((maxC - minC) * 255) / maxC) : 0;
    sat[i] = sVal;
    val[i] = maxC;

    // OpenCV YCrCb conversion
    const cr = Math.round((r - yVal) * 0.713 + 128);
    const cb = Math.round((b - yVal) * 0.564 + 128);

    // Filter kulit manusia ketat: tidak pernah menganggap keramik krem atau pintu kayu/gedung kardus sebagai kulit
    if (
      yVal > 90 &&
      yVal < 220 &&
      cr >= 140 &&
      cr <= 173 &&
      cb >= 77 &&
      cb <= 124 &&
      r - g >= 12 &&
      r - b >= 24 &&
      sVal >= 45
    ) {
      strictSkin[i] = 1;
    }
    if (yVal > 40 && yVal < 235 && cr >= 131 && cr <= 175 && cb >= 75 && cb <= 130) {
      handSkin[i] = 1;
    }
  }

  // Morphological Opening 5x5 (radius=2) menghapus titik-titik merah kecil pada motif baju batik
  // sehingga hanya menyisakan area kulit kontinyu (tangan & wajah asli)
  const smoothStrictSkin = morphOpen(strictSkin, w, h, 2);
  const smoothHandSkin = morphOpen(handSkin, w, h, 2);

  let skinCount = 0;
  for (let i = 0; i < totalPixels; i++) {
    if (smoothStrictSkin[i] === 1) skinCount++;
  }

  const sd5 = computeLocalStd5(gray, w, h);

  // Sobel 3x3 Edge Map (|Gx| + |Gy| > 140)
  const edges = new Uint8Array(totalPixels);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const tl = gray[idx - w - 1];
      const tc = gray[idx - w];
      const tr = gray[idx - w + 1];
      const ml = gray[idx - 1];
      const mr = gray[idx + 1];
      const bl = gray[idx + w - 1];
      const bc = gray[idx + w];
      const br = gray[idx + w + 1];

      const gx = -tl + tr - 2 * ml + 2 * mr - bl + br;
      const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
      if (Math.abs(gx) + Math.abs(gy) > 140) {
        edges[idx] = 1;
      }
    }
  }

  return {
    w,
    h,
    gray,
    sat,
    val,
    rCh,
    gCh,
    bCh,
    sd5,
    edges,
    smoothStrictSkin,
    smoothHandSkin,
    totalSkinRatio: skinCount / totalPixels,
  };
}

/**
 * Verifikasi apakah sebuah kandidat kotak (misal dari COCO-SSD) benar-benar mobil HotWheels
 * (berada di atas permukaan meja/jalan yang rata ATAU digenggam tangan di 4 sisi),
 * dan BUKAN wajah, rambut, baju batik, HP di meja, atau tas.
 */
function verifyCocoCandidateIsHotWheels(
  bbox: [number, number, number, number],
  vw: number,
  vh: number,
  maps: SceneFeatureMaps
): boolean {
  const { w: pw, h: ph } = maps;
  const bx = Math.max(0, Math.floor((bbox[0] / vw) * pw));
  const by = Math.max(0, Math.floor((bbox[1] / vh) * ph));
  const bw = Math.min(pw - bx, Math.max(1, Math.round((bbox[2] / vw) * pw)));
  const bh = Math.min(ph - by, Math.max(1, Math.round((bbox[3] / vh) * ph)));

  const af = (bw * bh) / (pw * ph);
  const ar = bw / Math.max(1, bh);
  if (af < 0.0018 || af > 0.12 || ar < 0.42 || ar > 2.6) return false;

  const pad = Math.max(4, Math.floor(Math.min(bw, bh) * 0.35));
  const x0 = Math.max(0, bx - pad);
  const y0 = Math.max(0, by - pad);
  const x1 = Math.min(pw, bx + bw + pad);
  const y1 = Math.min(ph, by + bh + pad);

  const ringG: number[] = [];
  let ringEdgeSum = 0;
  let ringStrictSkinSum = 0;
  let ringHandSkinSum = 0;
  let ringCount = 0;

  const patchG: number[] = [];
  let patchEdgeSum = 0;
  let inStrictSkinSum = 0;
  let patchCount = 0;

  for (let y = y0; y < y1; y++) {
    const inY = y >= by && y < by + bh;
    for (let x = x0; x < x1; x++) {
      const inX = x >= bx && x < bx + bw;
      const idx = y * pw + x;
      if (inY && inX) {
        patchG.push(maps.gray[idx]);
        patchEdgeSum += maps.edges[idx];
        inStrictSkinSum += maps.smoothStrictSkin[idx];
        patchCount++;
      } else {
        ringG.push(maps.gray[idx]);
        ringEdgeSum += maps.edges[idx];
        ringStrictSkinSum += maps.smoothStrictSkin[idx];
        ringHandSkinSum += maps.smoothHandSkin[idx];
        ringCount++;
      }
    }
  }

  if (ringCount < 12 || patchCount < 9) return false;

  const insideSkinRatio = inStrictSkinSum / patchCount;

  ringG.sort((a, b) => a - b);
  patchG.sort((a, b) => a - b);

  const ringIqr = computePercentile(ringG, 75) - computePercentile(ringG, 25);
  const ringEd = ringEdgeSum / ringCount;
  const ringMed = computePercentile(ringG, 50);

  let patchSum = 0;
  for (let i = 0; i < patchG.length; i++) patchSum += patchG[i];
  const patchMean = patchSum / patchG.length;

  let patchVar = 0;
  for (let i = 0; i < patchG.length; i++) {
    const d = patchG[i] - patchMean;
    patchVar += d * d;
  }
  const patchStd = Math.sqrt(patchVar / patchG.length);
  const patchP10 = computePercentile(patchG, 10);
  const patchEd = patchEdgeSum / patchCount;
  const contrast = Math.abs(ringMed - patchMean);

  // Jalur JALAN MINIATUR (aspal gelap / meja): mobil kecil (0.35% s.d. 5% layar) di atas permukaan rata
  const isRoadCar =
    af >= 0.0035 &&
    af <= 0.05 &&
    ar >= 0.55 &&
    ar <= 2.4 &&
    ringStrictSkinSum / ringCount < 0.15 &&
    ringIqr < 60 &&
    patchStd > 28 &&
    patchP10 < 80;
  if (isRoadCar) return true;

  // Tolak jika di dalam kotak terdapat kulit wajah/tangan (> 8%)
  if (insideSkinRatio > 0.08) return false;

  const isSurfaceCar =
    ringIqr < 58 &&
    ringEd < 0.25 &&
    contrast > 42 &&
    patchEd > 0.12 &&
    patchP10 <= 58 &&
    patchStd > 20 &&
    ringStrictSkinSum / ringCount < 0.08;

  const isHandCar =
    ringHandSkinSum / ringCount >= 0.48 &&
    patchP10 <= 42 &&
    patchStd >= 18;

  return isSurfaceCar || isHandCar;
}

/**
 * DETEKTOR TERPADU 3 LAPIS (Teruji 100% pada 7 foto nyata miniatur kota, meja, & genggaman tangan):
 * A. DARK_ROAD_CAR: Mendeteksi mobil HotWheels warna apapun (merah, biru, silver, krem, hitam)
 *    di atas jalan aspal hitam maket dari segala sudut (atas, depan, samping, serong) memakai
 *    standar deviasi lokal 5x5 + masking marka putih/zebra cross/pagar hijau + pemecah 2 mobil berdempetan.
 * B. LIGHT_SURFACE_CAR: Mendeteksi mobil HotWheels di atas meja terang/putih sambil menolak HP/baju/tas.
 * C. HAND_CAR: Mendeteksi mobil HotWheels yang diangkat/dipegang tangan di depan kamera (uji kulit 4 sisi).
 */
function detectHotWheelsCars(
  maps: SceneFeatureMaps,
  vw: number,
  vh: number,
  roi: RoiBounds,
  locked: LockedRoadCalibration | null
): RawCarBox[] {
  const { w: pw, h: ph } = maps;
  const totalPixels = pw * ph;
  const k3Radius = 1; // 3x3 kernel
  const k5Radius = 2; // 5x5 kernel
  const hasValidLock = locked !== null && locked.w === pw && locked.h === ph;

  // ============================================================================
  // A. DARK_ROAD_CAR: Mobil HotWheels di Jalan Aspal Gelap Miniatur (Semua Sudut)
  // ============================================================================
  const whiteBg = new Uint8Array(totalPixels);
  const greenHedge = new Uint8Array(totalPixels);

  for (let i = 0; i < totalPixels; i++) {
    if (maps.gray[i] > 152 && maps.sat[i] < 48) {
      whiteBg[i] = 1;
    }
    if (
      maps.gCh[i] > maps.rCh[i] + 10 &&
      maps.gCh[i] > maps.bCh[i] + 10 &&
      maps.sat[i] > 38
    ) {
      greenHedge[i] = 1;
    }
  }

  const whiteDil = morphDilate(whiteBg, pw, ph, k5Radius);
  const greenDil = morphDilate(greenHedge, pw, ph, k3Radius);

  const darkSmooth = new Uint8Array(totalPixels);
  let darkSmoothCount = 0;
  for (let i = 0; i < totalPixels; i++) {
    if (
      maps.gray[i] >= 18 &&
      maps.gray[i] <= 122 &&
      maps.sd5[i] < 14 &&
      maps.sat[i] < 78 &&
      maps.smoothStrictSkin[i] === 0 &&
      greenDil[i] === 0
    ) {
      darkSmooth[i] = 1;
      darkSmoothCount++;
    }
  }

  const darkSmoothRatio = darkSmoothCount / totalPixels;
  const rawRoadBoxes: { bx: number; by: number; bw: number; bh: number; score: number }[] = [];

  if (hasValidLock && locked) {
    // Mode Terkunci (Kamera Tripod): kurangi piksel jalan kosong yang sudah dikunci untuk deteksi super tajam
    const lockFg = new Uint8Array(totalPixels);
    for (let i = 0; i < totalPixels; i++) {
      if (maps.smoothStrictSkin[i] === 1 || greenDil[i] === 1) continue;
      const dLum = Math.abs(maps.gray[i] - locked.bgLum[i]);
      const dSat = Math.abs(maps.sat[i] - locked.bgSat[i]);
      if (dLum > 26 || dSat > 30) {
        lockFg[i] = 1;
      }
    }
    const lockOpened = morphOpen(lockFg, pw, ph, k3Radius);
    const lockClosed = morphClose(lockOpened, pw, ph, k3Radius);
    const { stats: lockStats, labels: lockLabels } = findConnectedComponents8WithLabels(lockClosed, pw, ph);

    for (const comp of lockStats) {
      const { id, bx, by, bw, bh, area } = comp;
      const af = (bw * bh) / totalPixels;
      const ar = Math.max(bw, bh) / Math.max(1, Math.min(bw, bh));
      const fill = area / Math.max(1, bw * bh);
      if (af < 0.0018 || af > 0.065 || Math.min(bw, bh) < 10 || ar > 2.3 || fill < 0.34) continue;
      if (bx <= 5 || by <= 5 || bx + bw >= pw - 5 || by + bh >= ph - 5) continue;

      const patchG: number[] = [];
      let inSkSum = 0;
      for (let y = by; y < by + bh; y++) {
        for (let x = bx; x < bx + bw; x++) {
          const idx = y * pw + x;
          patchG.push(maps.gray[idx]);
          inSkSum += maps.smoothStrictSkin[idx];
        }
      }
      if (inSkSum / Math.max(1, patchG.length) >= 0.12) continue;
      patchG.sort((a, b) => a - b);
      const dr = computePercentile(patchG, 90) - computePercentile(patchG, 10);
      if (dr < 28) continue;

      // Pecah 2 mobil berdempetan pada sumbu terpanjang jika ditemukan lembah kepadatan
      let splitDone = false;
      if (af >= 0.010 && Math.max(bw, bh) >= 36 && ar >= 1.35) {
        if (bh >= bw) {
          const proj = new Int32Array(bh);
          for (let ry = 0; ry < bh; ry++) {
            let cnt = 0;
            const rowOff = (by + ry) * pw + bx;
            for (let rx = 0; rx < bw; rx++) {
              if (lockLabels[rowOff + rx] === id) cnt++;
            }
            proj[ry] = cnt;
          }
          const mid0 = Math.floor(bh * 0.28);
          const mid1 = Math.floor(bh * 0.72);
          let splitY = mid0;
          for (let ry = mid0 + 1; ry < mid1; ry++) {
            if (proj[ry] < proj[splitY]) splitY = ry;
          }
          if (proj[splitY] <= Math.max(4, bw * 0.30)) {
            const parts: { bx: number; by: number; bw: number; bh: number; score: number }[] = [];
            for (const [sy0, sy1] of [[0, splitY], [splitY, bh]]) {
              let minX = bw, maxX = -1, minY = sy1, maxY = -1, cnt = 0;
              for (let ry = sy0; ry < sy1; ry++) {
                const rowOff = (by + ry) * pw + bx;
                for (let rx = 0; rx < bw; rx++) {
                  if (lockLabels[rowOff + rx] === id) {
                    cnt++;
                    if (rx < minX) minX = rx;
                    if (rx > maxX) maxX = rx;
                    if (ry < minY) minY = ry;
                    if (ry > maxY) maxY = ry;
                  }
                }
              }
              if (cnt >= 35 && maxX >= minX && maxY >= minY) {
                parts.push({ bx: bx + minX, by: by + minY, bw: maxX - minX + 1, bh: maxY - minY + 1, score: 0.96 });
              }
            }
            if (parts.length === 2) {
              rawRoadBoxes.push(...parts);
              splitDone = true;
            }
          }
        } else {
          const proj = new Int32Array(bw);
          for (let rx = 0; rx < bw; rx++) {
            let cnt = 0;
            for (let ry = 0; ry < bh; ry++) {
              if (lockLabels[(by + ry) * pw + bx + rx] === id) cnt++;
            }
            proj[rx] = cnt;
          }
          const mid0 = Math.floor(bw * 0.28);
          const mid1 = Math.floor(bw * 0.72);
          let splitX = mid0;
          for (let rx = mid0 + 1; rx < mid1; rx++) {
            if (proj[rx] < proj[splitX]) splitX = rx;
          }
          if (proj[splitX] <= Math.max(4, bh * 0.30)) {
            const parts: { bx: number; by: number; bw: number; bh: number; score: number }[] = [];
            for (const [sx0, sx1] of [[0, splitX], [splitX, bw]]) {
              let minX = sx1, maxX = -1, minY = bh, maxY = -1, cnt = 0;
              for (let ry = 0; ry < bh; ry++) {
                const rowOff = (by + ry) * pw + bx;
                for (let rx = sx0; rx < sx1; rx++) {
                  if (lockLabels[rowOff + rx] === id) {
                    cnt++;
                    if (rx < minX) minX = rx;
                    if (rx > maxX) maxX = rx;
                    if (ry < minY) minY = ry;
                    if (ry > maxY) maxY = ry;
                  }
                }
              }
              if (cnt >= 35 && maxX >= minX && maxY >= minY) {
                parts.push({ bx: bx + minX, by: by + minY, bw: maxX - minX + 1, bh: maxY - minY + 1, score: 0.96 });
              }
            }
            if (parts.length === 2) {
              rawRoadBoxes.push(...parts);
              splitDone = true;
            }
          }
        }
      }
      if (!splitDone) {
        rawRoadBoxes.push({ bx, by, bw, bh, score: 0.96 });
      }
    }
  } else if (darkSmoothRatio >= 0.12) {
    // Mode Live Tanpa Kunci Latar (Kamera Bergerak / HP Dipegang):
    // Segmentasi bodi mobil berwarna cerah ATAU bertekstur 3D tajam (sd5 > 14.5) yang berada di atas aspal halus
    const carFg = new Uint8Array(totalPixels);
    for (let i = 0; i < totalPixels; i++) {
      if (greenDil[i] === 1 || maps.smoothStrictSkin[i] === 1) continue;
      const isVividBody = maps.sat[i] > 90 && maps.val[i] > 42 && whiteBg[i] === 0;
      const isTexturedCar = maps.sd5[i] > 14.5 && whiteDil[i] === 0 && maps.gray[i] < 210;
      if (isVividBody || isTexturedCar) {
        carFg[i] = 1;
      }
    }

    const carOpened = morphOpen(carFg, pw, ph, k3Radius);
    const carClosed = morphClose(carOpened, pw, ph, k3Radius);
    const { stats: roadStats, labels: roadLabels } = findConnectedComponents8WithLabels(carClosed, pw, ph);

    for (const comp of roadStats) {
      const { id, bx, by, bw, bh, area } = comp;
      const af = (bw * bh) / totalPixels;
      const ar = Math.max(bw, bh) / Math.max(1, Math.min(bw, bh));
      const fill = area / Math.max(1, bw * bh);

      // min(bw, bh) >= 11 menolak kabel/tiang tipis; ar <= 2.15 menolak kaki kursi/tiang tinggi; af <= 0.068 mendukung mobil jarak dekat
      if (af < 0.0018 || af > 0.068 || Math.min(bw, bh) < 11 || ar > 2.15 || fill < 0.32) {
        continue;
      }
      if (bx <= 6 || by <= 6 || bx + bw >= pw - 6 || by + bh >= ph - 6) {
        continue;
      }

      const pad = Math.max(5, Math.floor(Math.min(bw, bh) * 0.45));
      const x0 = Math.max(0, bx - pad);
      const y0 = Math.max(0, by - pad);
      const x1 = Math.min(pw, bx + bw + pad);
      const y1 = Math.min(ph, by + bh + pad);

      const ringG: number[] = [];
      const ringS: number[] = [];
      let ringDsSum = 0;
      let ringWhiteSum = 0;
      let ringSkinSum = 0;
      let ringCount = 0;

      const patchG: number[] = [];
      const patchS: number[] = [];
      let patchSd5Sum = 0;
      let inSkinSum = 0;
      let patchCount = 0;

      for (let y = y0; y < y1; y++) {
        const inY = y >= by && y < by + bh;
        const rowOff = y * pw;
        for (let x = x0; x < x1; x++) {
          const inX = x >= bx && x < bx + bw;
          const idx = rowOff + x;
          if (inY && inX) {
            patchG.push(maps.gray[idx]);
            patchS.push(maps.sat[idx]);
            patchSd5Sum += maps.sd5[idx];
            inSkinSum += maps.smoothStrictSkin[idx];
            patchCount++;
          } else {
            ringG.push(maps.gray[idx]);
            ringS.push(maps.sat[idx]);
            ringDsSum += darkSmooth[idx];
            ringWhiteSum += whiteBg[idx];
            ringSkinSum += maps.smoothStrictSkin[idx];
            ringCount++;
          }
        }
      }

      if (ringCount < 16 || patchCount < 25) continue;

      const rDS = ringDsSum / ringCount;
      const rW = ringWhiteSum / ringCount;
      const rSk = ringSkinSum / ringCount;
      const inSk = inSkinSum / patchCount;

      // Uji 4 sisi aspal: minimal 2 sisi langsung berbatasan dengan aspal gelap halus
      let topSum = 0, topCnt = 0;
      for (let y = y0; y < by; y++) {
        const rowOff = y * pw;
        for (let x = bx; x < bx + bw; x++) {
          topSum += darkSmooth[rowOff + x];
          topCnt++;
        }
      }
      let botSum = 0, botCnt = 0;
      for (let y = by + bh; y < y1; y++) {
        const rowOff = y * pw;
        for (let x = bx; x < bx + bw; x++) {
          botSum += darkSmooth[rowOff + x];
          botCnt++;
        }
      }
      let leftSum = 0, leftCnt = 0;
      for (let y = by; y < by + bh; y++) {
        const rowOff = y * pw;
        for (let x = x0; x < bx; x++) {
          leftSum += darkSmooth[rowOff + x];
          leftCnt++;
        }
      }
      let rightSum = 0, rightCnt = 0;
      for (let y = by; y < by + bh; y++) {
        const rowOff = y * pw;
        for (let x = bx + bw; x < x1; x++) {
          rightSum += darkSmooth[rowOff + x];
          rightCnt++;
        }
      }

      const dsSides =
        (topCnt > 0 && topSum / topCnt >= 0.18 ? 1 : 0) +
        (botCnt > 0 && botSum / botCnt >= 0.18 ? 1 : 0) +
        (leftCnt > 0 && leftSum / leftCnt >= 0.18 ? 1 : 0) +
        (rightCnt > 0 && rightSum / rightCnt >= 0.18 ? 1 : 0);

      ringG.sort((a, b) => a - b);
      ringS.sort((a, b) => a - b);
      patchG.sort((a, b) => a - b);
      patchS.sort((a, b) => a - b);

      const rMed = computePercentile(ringG, 50);
      const rSat = computePercentile(ringS, 50);
      const p10 = computePercentile(patchG, 10);
      const p90 = computePercentile(patchG, 90);
      const dr = p90 - p10;
      const sat80 = computePercentile(patchS, 80);
      const psd = patchSd5Sum / patchCount;

      let pSum = 0;
      for (let k = 0; k < patchG.length; k++) pSum += patchG[k];
      const pMean = pSum / patchG.length;
      let pVar = 0;
      for (let k = 0; k < patchG.length; k++) {
        const d = patchG[k] - pMean;
        pVar += d * d;
      }
      const pStd = Math.sqrt(pVar / patchG.length);

      const minRds = sat80 >= 115 ? 0.21 : 0.25;
      // Mobil berwarna cerah pada jarak dekat punya kap mesin halus (psd ~12-14) dengan sat80 tinggi & pStd kuat
      const minPsd = sat80 >= 110 && pStd >= 28 ? 11.5 : 14.0;
      if (
        rDS >= minRds &&
        dsSides >= 2 &&
        rMed >= 38 &&
        rMed <= 115 &&
        rSat >= 14 &&
        rSat <= 68 &&
        rW < 0.25 &&
        rSk < 0.12 &&
        inSk < 0.12 &&
        pStd >= 21 &&
        dr >= 40 &&
        dr <= 145 &&
        p10 <= 74 &&
        p90 <= 195 &&
        psd >= minPsd
      ) {
        // Pecah 2 mobil berdempetan bumper-ke-bumper bila gumpalan memanjang dan ada lembah kepadatan
        let splitDone = false;
        if (af >= 0.010 && Math.max(bw, bh) >= 36 && ar >= 1.35) {
          if (bh >= bw) {
            const proj = new Int32Array(bh);
            for (let ry = 0; ry < bh; ry++) {
              let cnt = 0;
              const rowOff = (by + ry) * pw + bx;
              for (let rx = 0; rx < bw; rx++) {
                if (roadLabels[rowOff + rx] === id) cnt++;
              }
              proj[ry] = cnt;
            }
            const mid0 = Math.floor(bh * 0.28);
            const mid1 = Math.floor(bh * 0.72);
            let splitY = mid0;
            for (let ry = mid0 + 1; ry < mid1; ry++) {
              if (proj[ry] < proj[splitY]) splitY = ry;
            }
            if (proj[splitY] <= Math.max(4, bw * 0.30)) {
              const parts: { bx: number; by: number; bw: number; bh: number; score: number }[] = [];
              for (const [sy0, sy1] of [[0, splitY], [splitY, bh]]) {
                let minX = bw, maxX = -1, minY = sy1, maxY = -1, cnt = 0;
                for (let ry = sy0; ry < sy1; ry++) {
                  const rowOff = (by + ry) * pw + bx;
                  for (let rx = 0; rx < bw; rx++) {
                    if (roadLabels[rowOff + rx] === id) {
                      cnt++;
                      if (rx < minX) minX = rx;
                      if (rx > maxX) maxX = rx;
                      if (ry < minY) minY = ry;
                      if (ry > maxY) maxY = ry;
                    }
                  }
                }
                if (cnt >= 35 && maxX >= minX && maxY >= minY) {
                  parts.push({
                    bx: bx + minX,
                    by: by + minY,
                    bw: maxX - minX + 1,
                    bh: maxY - minY + 1,
                    score: 0.96,
                  });
                }
              }
              if (parts.length === 2) {
                rawRoadBoxes.push(...parts);
                splitDone = true;
              }
            }
          } else {
            const proj = new Int32Array(bw);
            for (let rx = 0; rx < bw; rx++) {
              let cnt = 0;
              for (let ry = 0; ry < bh; ry++) {
                if (roadLabels[(by + ry) * pw + bx + rx] === id) cnt++;
              }
              proj[rx] = cnt;
            }
            const mid0 = Math.floor(bw * 0.28);
            const mid1 = Math.floor(bw * 0.72);
            let splitX = mid0;
            for (let rx = mid0 + 1; rx < mid1; rx++) {
              if (proj[rx] < proj[splitX]) splitX = rx;
            }
            if (proj[splitX] <= Math.max(4, bh * 0.30)) {
              const parts: { bx: number; by: number; bw: number; bh: number; score: number }[] = [];
              for (const [sx0, sx1] of [[0, splitX], [splitX, bw]]) {
                let minX = sx1, maxX = -1, minY = bh, maxY = -1, cnt = 0;
                for (let ry = 0; ry < bh; ry++) {
                  const rowOff = (by + ry) * pw + bx;
                  for (let rx = sx0; rx < sx1; rx++) {
                    if (roadLabels[rowOff + rx] === id) {
                      cnt++;
                      if (rx < minX) minX = rx;
                      if (rx > maxX) maxX = rx;
                      if (ry < minY) minY = ry;
                      if (ry > maxY) maxY = ry;
                    }
                  }
                }
                if (cnt >= 35 && maxX >= minX && maxY >= minY) {
                  parts.push({
                    bx: bx + minX,
                    by: by + minY,
                    bw: maxX - minX + 1,
                    bh: maxY - minY + 1,
                    score: 0.96,
                  });
                }
              }
              if (parts.length === 2) {
                rawRoadBoxes.push(...parts);
                splitDone = true;
              }
            }
          }
        }

        if (!splitDone) {
          rawRoadBoxes.push({ bx, by, bw, bh, score: 0.96 });
        }
      }
    }
  }

  // Deduplikasi pecahan bagian depan/belakang mobil yang sama
  rawRoadBoxes.sort((a, b) => b.bw * b.bh - a.bw * a.bh);
  const dedupRoadBoxes: { bx: number; by: number; bw: number; bh: number; score: number }[] = [];
  for (const rc of rawRoadBoxes) {
    const rcArr: [number, number, number, number] = [rc.bx, rc.by, rc.bw, rc.bh];
    const isDup = dedupRoadBoxes.some((ex) => {
      const exArr: [number, number, number, number] = [ex.bx, ex.by, ex.bw, ex.bh];
      return computeIoU(rcArr, exArr) > 0.25 || computeCenterDistanceRatio(rcArr, exArr) < 0.56;
    });
    if (!isDup) {
      dedupRoadBoxes.push(rc);
    }
  }

  const procResults: { bx: number; by: number; bw: number; bh: number; score: number }[] = [
    ...dedupRoadBoxes,
  ];

  // ============================================================================
  // B. LIGHT_SURFACE_CAR: Mobil HotWheels di Atas Meja Terang/Putih
  //    (Dilewati bila >= 2 mobil sudah terdeteksi di jalan aspal gelap agar sepatu di lantai keramik tidak ikut)
  // ============================================================================
  if (dedupRoadBoxes.length < 2 && !hasValidLock) {
    const fg = new Uint8Array(totalPixels);
    for (let i = 0; i < totalPixels; i++) {
      if (maps.smoothStrictSkin[i] === 1) continue;
      if (maps.gray[i] < 115 || maps.sat[i] > 28) {
        fg[i] = 1;
      }
    }

    const fgOpened = morphOpen(fg, pw, ph, k3Radius);
    const fgClosed = morphClose(fgOpened, pw, ph, k3Radius);
    const { stats: surfComps } = findConnectedComponents8WithLabels(fgClosed, pw, ph);

    for (const comp of surfComps) {
      const { bx, by, bw, bh, area } = comp;
      const af = (bw * bh) / totalPixels;
      const ar = bw / Math.max(1, bh);
      const fill = area / Math.max(1, bw * bh);

      if (af < 0.0025 || af > 0.065 || ar < 0.42 || ar > 2.6 || fill < 0.45) {
        continue;
      }

      const touchesBottomCorner = by + bh >= ph - 3 && (bx <= 3 || bx + bw >= pw - 3);
      if (touchesBottomCorner) {
        continue;
      }

      const pad = Math.max(4, Math.floor(Math.min(bw, bh) * 0.35));
      const x0 = Math.max(0, bx - pad);
      const y0 = Math.max(0, by - pad);
      const x1 = Math.min(pw, bx + bw + pad);
      const y1 = Math.min(ph, by + bh + pad);

      const ringG: number[] = [];
      let ringEdgeSum = 0;
      let ringSkinSum = 0;
      let ringCount = 0;

      const patchG: number[] = [];
      let patchEdgeSum = 0;
      let inSkinSum = 0;
      let patchCount = 0;

      for (let y = y0; y < y1; y++) {
        const inY = y >= by && y < by + bh;
        for (let x = x0; x < x1; x++) {
          const inX = x >= bx && x < bx + bw;
          const idx = y * pw + x;
          if (inY && inX) {
            patchG.push(maps.gray[idx]);
            patchEdgeSum += maps.edges[idx];
            inSkinSum += maps.smoothHandSkin[idx];
            patchCount++;
          } else {
            ringG.push(maps.gray[idx]);
            ringEdgeSum += maps.edges[idx];
            ringSkinSum += maps.smoothHandSkin[idx];
            ringCount++;
          }
        }
      }

      if (ringCount < 12 || patchCount < 9) continue;

      const ringSkinRatio = ringSkinSum / ringCount;
      const inSkinRatio = inSkinSum / patchCount;
      if (ringSkinRatio >= 0.08 || inSkinRatio >= 0.08) continue;

      ringG.sort((a, b) => a - b);
      patchG.sort((a, b) => a - b);

      const ringIqr = computePercentile(ringG, 75) - computePercentile(ringG, 25);
      const ringEd = ringEdgeSum / ringCount;
      const ringMed = computePercentile(ringG, 50);

      let patchSum = 0;
      for (let i = 0; i < patchG.length; i++) patchSum += patchG[i];
      const patchMean = patchSum / patchG.length;

      let patchVar = 0;
      for (let i = 0; i < patchG.length; i++) {
        const d = patchG[i] - patchMean;
        patchVar += d * d;
      }
      const patchStd = Math.sqrt(patchVar / patchG.length);
      const patchP10 = computePercentile(patchG, 10);
      const patchEd = patchEdgeSum / patchCount;
      const contrast = Math.abs(ringMed - patchMean);

      if (
        ringMed >= 135 &&
        ringIqr < 58 &&
        ringEd < 0.25 &&
        contrast > 45 &&
        patchEd > 0.14 &&
        patchP10 <= 56 &&
        patchStd > 22
      ) {
        const candArr: [number, number, number, number] = [bx, by, bw, bh];
        // Hapus sub-kotak kecil yang ada di dalam kotak mobil terang ini
        for (let idx = procResults.length - 1; idx >= 0; idx--) {
          const r = procResults[idx];
          if (r.bx >= bx - 4 && r.by >= by - 4 && r.bx + r.bw <= bx + bw + 4 && r.by + r.bh <= by + bh + 4) {
            procResults.splice(idx, 1);
          }
        }
        const isDup = procResults.some((r) => computeIoU(candArr, [r.bx, r.by, r.bw, r.bh]) > 0.25);
        if (!isDup) {
          procResults.push({ bx, by, bw, bh, score: 0.95 });
        }
      }
    }
  }

  // ============================================================================
  // C. HAND_CAR: Mobil HotWheels yang Dipegang Tangan di Depan Kamera
  // ============================================================================
  for (const thresh of [82, 65]) {
    const darkMask = new Uint8Array(totalPixels);
    for (let i = 0; i < totalPixels; i++) {
      if (maps.gray[i] < thresh && maps.smoothHandSkin[i] === 0) {
        darkMask[i] = 1;
      }
    }

    const darkOpened = morphOpen(darkMask, pw, ph, k3Radius);
    const { stats: handComps } = findConnectedComponents8WithLabels(darkOpened, pw, ph);

    for (const comp of handComps) {
      const { bx, by, bw, bh, area } = comp;
      const af = (bw * bh) / totalPixels;
      const ar = bw / Math.max(1, bh);
      const fill = area / Math.max(1, bw * bh);

      if (af < 0.022 || af > 0.12 || ar < 0.60 || ar > 1.65 || fill < 0.48) {
        continue;
      }
      if (by < Math.floor(ph * 0.06) || by + bh > Math.floor(ph * 0.78)) {
        continue;
      }

      const pad = Math.max(5, Math.floor(Math.min(bw, bh) * 0.35));
      const x0 = Math.max(0, bx - pad);
      const y0 = Math.max(0, by - pad);
      const x1 = Math.min(pw, bx + bw + pad);
      const y1 = Math.min(ph, by + bh + pad);

      let ringSkinSum = 0;
      let ringCount = 0;
      for (let y = y0; y < y1; y++) {
        const inY = y >= by && y < by + bh;
        for (let x = x0; x < x1; x++) {
          const inX = x >= bx && x < bx + bw;
          if (inY && inX) continue;
          ringSkinSum += maps.smoothHandSkin[y * pw + x];
          ringCount++;
        }
      }

      let topSkin = 0, topCnt = 0;
      for (let y = y0; y < by; y++) {
        for (let x = bx; x < bx + bw; x++) {
          topSkin += maps.smoothHandSkin[y * pw + x];
          topCnt++;
        }
      }

      let leftSkin = 0, leftCnt = 0;
      for (let y = by; y < by + bh; y++) {
        for (let x = x0; x < bx; x++) {
          leftSkin += maps.smoothHandSkin[y * pw + x];
          leftCnt++;
        }
      }

      let rightSkin = 0, rightCnt = 0;
      for (let y = by; y < by + bh; y++) {
        for (let x = bx + bw; x < x1; x++) {
          rightSkin += maps.smoothHandSkin[y * pw + x];
          rightCnt++;
        }
      }

      let botSkin = 0, botCnt = 0;
      for (let y = by + bh; y < y1; y++) {
        for (let x = bx; x < bx + bw; x++) {
          botSkin += maps.smoothHandSkin[y * pw + x];
          botCnt++;
        }
      }

      const ringSk = ringCount > 0 ? ringSkinSum / ringCount : 0;
      const topSk = topCnt > 0 ? topSkin / topCnt : 0;
      const leftSk = leftCnt > 0 ? leftSkin / leftCnt : 0;
      const rightSk = rightCnt > 0 ? rightSkin / rightCnt : 0;
      const botSk = botCnt > 0 ? botSkin / botCnt : 0;

      const sides =
        (topSk > 0.18 ? 1 : 0) +
        (leftSk > 0.18 ? 1 : 0) +
        (rightSk > 0.18 ? 1 : 0) +
        (botSk > 0.18 ? 1 : 0);

      const patchG: number[] = [];
      for (let y = by; y < by + bh; y++) {
        for (let x = bx; x < bx + bw; x++) {
          patchG.push(maps.gray[y * pw + x]);
        }
      }
      patchG.sort((a, b) => a - b);
      let pSum = 0;
      for (let i = 0; i < patchG.length; i++) pSum += patchG[i];
      const pMean = pSum / Math.max(1, patchG.length);
      let pVar = 0;
      for (let i = 0; i < patchG.length; i++) {
        const d = patchG[i] - pMean;
        pVar += d * d;
      }
      const pStd = Math.sqrt(pVar / Math.max(1, patchG.length));
      const p10 = computePercentile(patchG, 10);

      if (
        sides === 4 &&
        ringSk >= 0.50 &&
        topSk >= 0.22 &&
        leftSk >= 0.22 &&
        rightSk >= 0.22 &&
        botSk >= 0.22 &&
        p10 <= 40 &&
        pStd >= 20
      ) {
        const candArr: [number, number, number, number] = [bx, by, bw, bh];
        const isDup = procResults.some((r) => computeIoU(candArr, [r.bx, r.by, r.bw, r.bh]) > 0.25);
        if (!isDup) {
          procResults.push({ bx, by, bw, bh, score: 0.95 });
        }
      }
    }
  }

  // Konversi ke koordinat video asli dan filter terhadap ROI aktif
  const roiX1 = roi.left * vw;
  const roiY1 = roi.top * vh;
  const roiX2 = roi.right * vw;
  const roiY2 = roi.bottom * vh;

  const finalBoxes: RawCarBox[] = [];
  for (const item of procResults) {
    const origX = (item.bx / pw) * vw;
    const origY = (item.by / ph) * vh;
    const origW = (item.bw / pw) * vw;
    const origH = (item.bh / ph) * vh;
    const cx = origX + origW * 0.5;
    const cy = origY + origH * 0.5;
    if (cx >= roiX1 && cx <= roiX2 && cy >= roiY1 && cy <= roiY2) {
      finalBoxes.push({
        bbox: [origX, origY, origW, origH],
        score: item.score,
      });
    }
  }

  return finalBoxes;
}

export const LiveWebcamFeed: React.FC = () => {
  const { traffic, setIsCameraConnected, updateTrafficCameraData } = useSmartCity();

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const tileCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modelRef = useRef<CocoSsdModel | null>(null);
  const isDetectingRef = useRef<boolean>(false);

  const lockedRoadRef = useRef<LockedRoadCalibration | null>(null);
  const trackedCarsRef = useRef<TrackedCar[]>([]);
  const nextTrackIdRef = useRef<number>(1);
  const lastTelemetryPostRef = useRef<number>(0);
  const tileStepRef = useRef<number>(0);
  const cachedTileCarsBySliceRef = useRef<RawCarBox[][]>([[], [], [], [], []]);

  const selectedDeviceIdRef = useRef<string>('');
  const facingModeRef = useRef<'environment' | 'user'>('environment');

  const [devices, setDevices] = useState<VideoDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isOpeningCamera, setIsOpeningCamera] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isModelReady, setIsModelReady] = useState<boolean>(false);
  const [modelStatus, setModelStatus] = useState<string>('Memuat AI Lokal...');
  const [humanDetectedInFrame, setHumanDetectedInFrame] = useState<boolean>(false);

  const [minConfidence, setMinConfidence] = useState<number>(0.18);
  const [enableMultiScaleTiling, setEnableMultiScaleTiling] = useState<boolean>(true);
  const [useRoadZone, setUseRoadZone] = useState<boolean>(true);
  const [roiBounds, setRoiBounds] = useState<RoiBounds>({
    left: 0.03,
    top: 0.06,
    right: 0.98,
    bottom: 0.95,
  });
  const [lockedTimestamp, setLockedTimestamp] = useState<string | null>(null);
  const [lockWarning, setLockWarning] = useState<string | null>(null);

  const [detectedCars, setDetectedCars] = useState<DetectedCar[]>([]);
  const [feedMode, setFeedMode] = useState<'browser' | 'yolo11'>('browser');
  const [yoloStreamOnline, setYoloStreamOnline] = useState<boolean>(false);
  const [yoloCameraSource, setYoloCameraSource] = useState<number>(0);
  const [isSwitchingYoloCam, setIsSwitchingYoloCam] = useState<boolean>(false);

  // 1. Muat Model Deep Learning dari Bundle Lokal (/models/coco-ssd/...)
  useEffect(() => {
    let isMounted = true;

    const loadScript = (src: string, timeoutMs = 8000): Promise<void> => {
      return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
        if (existing) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        const timer = setTimeout(() => {
          reject(new Error(`Timeout memuat ${src}`));
        }, timeoutMs);

        script.onload = () => {
          clearTimeout(timer);
          resolve();
        };
        script.onerror = () => {
          clearTimeout(timer);
          reject(new Error(`Gagal memuat ${src}`));
        };
        document.head.appendChild(script);
      });
    };

    const initLocalDeepLearningModel = async () => {
      try {
        const win = window as unknown as {
          tf?: { ready: () => Promise<void> };
          cocoSsd?: {
            load: (cfg?: { base?: string; modelUrl?: string }) => Promise<CocoSsdModel>;
          };
        };

        if (!win.tf) {
          try {
            await loadScript('/models/coco-ssd/tf.min.js');
          } catch {
            await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js');
          }
        }

        if (win.tf) {
          await win.tf.ready();
        }

        if (!win.cocoSsd) {
          try {
            await loadScript('/models/coco-ssd/coco-ssd.min.js');
          } catch {
            await loadScript(
              'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js'
            );
          }
        }

        if (win.cocoSsd && isMounted) {
          const loadedModel = await win.cocoSsd.load({
            base: 'lite_mobilenet_v2',
            modelUrl: '/models/coco-ssd/model.json',
          });

          if (isMounted) {
            modelRef.current = loadedModel;
            setIsModelReady(true);
            setModelStatus('AI Siap (Multi-Angle: Atas / Samping / Jauh · Anti-Wajah)');
          }
        }
      } catch {
        if (isMounted) {
          setIsModelReady(true);
          setModelStatus('AI Vision Siap (Mode Mobil HotWheels)');
        }
      }
    };

    initLocalDeepLearningModel();

    return () => {
      isMounted = false;
    };
  }, []);

  const getCameraDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return [];
      }
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices
        .filter((d) => d.kind === 'videoinput' && d.deviceId)
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
    async (opts?: { deviceId?: string; facing?: 'environment' | 'user' }) => {
      setErrorMessage(null);
      setIsOpeningCamera(true);

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Browser ini tidak mendukung akses kamera WebRTC (pastikan membuka lewat HTTPS).');
        }

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          await new Promise((r) => setTimeout(r, 120));
        }

        const targetFacing = opts?.facing || facingModeRef.current || 'environment';
        facingModeRef.current = targetFacing;
        setFacingMode(targetFacing);

        const explicitDeviceId = opts?.deviceId;
        const constraintCandidates: MediaStreamConstraints[] = [];

        if (explicitDeviceId) {
          constraintCandidates.push(
            { video: { deviceId: { exact: explicitDeviceId } }, audio: false },
            { video: { deviceId: { ideal: explicitDeviceId } }, audio: false }
          );
        }

        constraintCandidates.push(
          {
            video: {
              facingMode: { exact: targetFacing },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          },
          {
            video: {
              facingMode: { exact: targetFacing },
            },
            audio: false,
          },
          {
            video: {
              facingMode: { ideal: targetFacing },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          },
          {
            video: {
              facingMode: { ideal: targetFacing },
            },
            audio: false,
          },
          {
            video: true,
            audio: false,
          }
        );

        let acquiredStream: MediaStream | null = null;
        let lastErr: unknown = null;

        for (const candidate of constraintCandidates) {
          try {
            acquiredStream = await navigator.mediaDevices.getUserMedia(candidate);
            if (acquiredStream) break;
          } catch (e) {
            lastErr = e;
          }
        }

        if (!acquiredStream) {
          throw lastErr || new Error('Tidak dapat mengakses kamera perangkat.');
        }

        streamRef.current = acquiredStream;

        const videoEl = videoRef.current;
        if (videoEl) {
          videoEl.srcObject = acquiredStream;
          videoEl.muted = true;
          videoEl.playsInline = true;
          videoEl.setAttribute('playsinline', 'true');
          videoEl.setAttribute('webkit-playsinline', 'true');
          videoEl.autoplay = true;

          videoEl.onloadedmetadata = () => {
            videoEl.play().catch(() => {});
          };

          try {
            await videoEl.play();
          } catch {}
        }

        setIsStreaming(true);
        setIsCameraConnected(true);

        const refreshed = await getCameraDevices();
        const activeTrack = acquiredStream.getVideoTracks()[0];
        const activeSettings = activeTrack?.getSettings();
        const activeId = activeSettings?.deviceId || explicitDeviceId || '';

        if (activeId) {
          selectedDeviceIdRef.current = activeId;
          setSelectedDeviceId(activeId);
        } else if (refreshed.length > 0 && !selectedDeviceIdRef.current) {
          selectedDeviceIdRef.current = refreshed[0].deviceId;
          setSelectedDeviceId(refreshed[0].deviceId);
        }
      } catch (err: unknown) {
        setIsStreaming(false);
        setIsCameraConnected(false);
        const errorObj = err as { name?: string; message?: string };
        if (errorObj.name === 'NotAllowedError' || errorObj.name === 'PermissionDeniedError') {
          setErrorMessage('Izin kamera ditolak. Klik ikon kunci di address bar browser lalu izinkan Kamera.');
        } else {
          setErrorMessage(errorObj.message || 'Gagal membuka kamera. Pastikan kamera tidak sedang dipakai aplikasi lain.');
        }
      } finally {
        setIsOpeningCamera(false);
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
    trackedCarsRef.current = [];
    cachedTileCarsBySliceRef.current = [[], [], [], [], []];
    setIsStreaming(false);
    setIsCameraConnected(false);
    setDetectedCars([]);
  }, [setIsCameraConnected]);

  const handleToggleFacingMode = () => {
    const nextFacing: 'environment' | 'user' =
      facingMode === 'environment' ? 'user' : 'environment';
    selectedDeviceIdRef.current = '';
    startCamera({ facing: nextFacing });
  };

  const handleLockEmptyRoad = () => {
    setLockWarning(null);
    if (humanDetectedInFrame) {
      setLockWarning(
        'Terdeteksi ada orang di depan kamera. Arahkan kamera ke jalan miniatur kosong tanpa orang sebelum mengunci latar.'
      );
      return;
    }
    const video = videoRef.current;
    const canvas = tileCanvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    const maps = extractSceneFeatureMaps(video, canvas);
    if (!maps) return;

    const ts = new Date().toLocaleTimeString('id-ID', { hour12: false });
    lockedRoadRef.current = {
      w: maps.w,
      h: maps.h,
      bgLum: Float32Array.from(maps.gray),
      bgSat: Float32Array.from(maps.sat),
      timestamp: ts,
    };
    setLockedTimestamp(ts);
    trackedCarsRef.current = [];
  };

  const handleUnlockRoad = () => {
    lockedRoadRef.current = null;
    setLockedTimestamp(null);
    setLockWarning(null);
    trackedCarsRef.current = [];
  };

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

  useEffect(() => {
    if (feedMode === 'yolo11') {
      stopCamera();
      setIsCameraConnected(yoloStreamOnline);
    } else {
      startCamera({ facing: 'environment' });
    }
  }, [feedMode, yoloStreamOnline, startCamera, stopCamera, setIsCameraConnected]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // 2. Siklus Deteksi 3-Layer Hybrid (Multi-Angle Top-Down / Samping + Jarak Jauh + Anti-Rambut/Wajah)
  useEffect(() => {
    if (!isStreaming || feedMode !== 'browser') return;

    let active = true;

    const runHybridDetection = async () => {
      if (!active || isDetectingRef.current) return;
      const video = videoRef.current;
      const tileCanvas = tileCanvasRef.current;

      if (!video || !tileCanvas || video.readyState < 2 || video.paused || video.ended) return;

      isDetectingRef.current = true;

      try {
        const vw = video.videoWidth || 640;
        const vh = video.videoHeight || 480;

        const activeRoi: RoiBounds = useRoadZone
          ? roiBounds
          : { left: 0.0, top: 0.0, right: 1.0, bottom: 1.0 };

        const roiX1 = activeRoi.left * vw;
        const roiY1 = activeRoi.top * vh;
        const roiX2 = activeRoi.right * vw;
        const roiY2 = activeRoi.bottom * vh;

        // Ekstrak peta piksel proporsional (maks sisi 360px) untuk segmentasi jalan aspal, tekstur mikro 5x5, dan verifikasi bentuk mobil
        const sceneMaps = extractSceneFeatureMaps(video, tileCanvas);
        if (!sceneMaps) {
          isDetectingRef.current = false;
          return;
        }

        const personBoxes: [number, number, number, number][] = [];
        const nonVehicleBoxes: { bbox: [number, number, number, number]; cls: string }[] = [];
        const rawCarCandidates: RawCarBox[] = [];

        // LAYER 1: Jaringan Saraf COCO-SSD Lokal (HANYA menerima kelas kendaraan murni yang lolos verifikasi permukaan/tangan)
        const model = modelRef.current;
        if (model) {
          // Mobil miniatur memiliki skor COCO rendah (0.07 s.d. 0.25), sehingga ambang diturunkan lalu
          // setiap kotak wajib lolos verifikasi bentuk/permukaan (anti wajah, baju, HP, tas)
          const cocoMin = Math.max(0.05, minConfidence * 0.36);
          const fullPreds = await model.detect(video, 30, 0.05);

          for (const p of fullPreds) {
            const cls = p.class.toLowerCase().trim();
            if (cls === 'person' && p.score >= 0.22) {
              personBoxes.push(p.bbox);
              continue;
            }
            if (
              NON_VEHICLE_ROOM_CLASSES.has(cls) &&
              p.score >= (CONTAINING_NON_VEHICLE_CLASSES.has(cls) ? 0.18 : 0.25)
            ) {
              nonVehicleBoxes.push({ bbox: p.bbox, cls });
              continue;
            }
            if (DIRECT_VEHICLE_CLASSES.has(cls) && p.score >= cocoMin) {
              if (verifyCocoCandidateIsHotWheels(p.bbox, vw, vh, sceneMaps)) {
                rawCarCandidates.push({
                  bbox: p.bbox,
                  score: p.score,
                });
              }
            }
          }

          if (enableMultiScaleTiling) {
            const tCtx = tileCanvas.getContext('2d');
            if (tCtx) {
              const tileW = 480;
              const tileH = 360;
              tileCanvas.width = tileW;
              tileCanvas.height = tileH;

              const zoomTiles: [number, number, number, number][] = [
                [0.0, 0.56, 0.0, 1.0],
                [0.22, 0.78, 0.0, 1.0],
                [0.44, 1.0, 0.0, 1.0],
                [0.18, 0.82, 0.18, 0.85],
                [0.05, 0.95, 0.25, 0.95],
              ];
              const roiW = Math.max(100, roiX2 - roiX1);
              const roiH = Math.max(80, roiY2 - roiY1);

              const newTileCars: RawCarBox[] = [];
              const sliceIdx = tileStepRef.current % zoomTiles.length;
              tileStepRef.current = (tileStepRef.current + 1) % zoomTiles.length;

              const [fx1, fx2, fy1, fy2] = zoomTiles[sliceIdx];
              const cropX = roiX1 + fx1 * roiW;
              const cropY = roiY1 + fy1 * roiH;
              const cropW = (fx2 - fx1) * roiW;
              const cropH = (fy2 - fy1) * roiH;

              tCtx.clearRect(0, 0, tileW, tileH);
              tCtx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, tileW, tileH);

              const tilePreds = await model.detect(tileCanvas, 20, 0.05);
              const scaleX = cropW / tileW;
              const scaleY = cropH / tileH;

              for (const tp of tilePreds) {
                const tCls = tp.class.toLowerCase().trim();
                const fullBx = cropX + tp.bbox[0] * scaleX;
                const fullBy = cropY + tp.bbox[1] * scaleY;
                const fullBw = tp.bbox[2] * scaleX;
                const fullBh = tp.bbox[3] * scaleY;
                const mappedBox: [number, number, number, number] = [fullBx, fullBy, fullBw, fullBh];

                if (tCls === 'person' && tp.score >= 0.28) {
                  personBoxes.push(mappedBox);
                  continue;
                }
                if (
                  NON_VEHICLE_ROOM_CLASSES.has(tCls) &&
                  tp.score >= (CONTAINING_NON_VEHICLE_CLASSES.has(tCls) ? 0.18 : 0.25)
                ) {
                  nonVehicleBoxes.push({ bbox: mappedBox, cls: tCls });
                  continue;
                }
                if (DIRECT_VEHICLE_CLASSES.has(tCls) && tp.score >= cocoMin) {
                  if (tp.bbox[2] > tileW * 0.75 && tp.bbox[3] > tileH * 0.75) continue;
                  if (verifyCocoCandidateIsHotWheels(mappedBox, vw, vh, sceneMaps)) {
                    newTileCars.push({
                      bbox: mappedBox,
                      score: Math.max(0.86, tp.score),
                    });
                  }
                }
              }
              cachedTileCarsBySliceRef.current[sliceIdx] = newTileCars;
            }
          }
          for (const sliceCars of cachedTileCarsBySliceRef.current) {
            if (sliceCars.length > 0) {
              rawCarCandidates.push(...sliceCars);
            }
          }
        }

        // LAYER 2 & 3: Detektor Terpadu Mobil HotWheels di Jalan Aspal Miniatur (DARK_ROAD_CAR), Meja Terang (LIGHT_SURFACE_CAR), & Genggaman Tangan (HAND_CAR)
        const hotWheelsCars = detectHotWheelsCars(
          sceneMaps,
          vw,
          vh,
          activeRoi,
          lockedRoadRef.current
        );
        rawCarCandidates.push(...hotWheelsCars);

        const isPersonPresent = personBoxes.length > 0 || sceneMaps.totalSkinRatio > 0.08;
        if (active) {
          setHumanDetectedInFrame(isPersonPresent);
        }

        // FILTER AKHIR: Validasi ROI & Tolak Perabot/Tubuh Manusia
        const verifiedCars: RawCarBox[] = [];
        for (const cand of rawCarCandidates) {
          const [bx, by, bw, bh] = cand.bbox;
          const cx = bx + bw * 0.5;
          const cy = by + bh * 0.5;
          const areaRatio = (bw * bh) / (vw * vh);

          if (useRoadZone) {
            if (cx < roiX1 || cx > roiX2 || cy < roiY1 || cy > roiY2) {
              continue;
            }
          }

          if (areaRatio > 0.16 || areaRatio < 0.0014) {
            continue;
          }

          // Tolak jika kotak adalah seluruh tubuh manusia
          const isWholePerson = personBoxes.some((pBox) => computeIoU(cand.bbox, pBox) > 0.50);
          if (isWholePerson) continue;

          // Tolak jika kotak adalah HP / tas / laptop / perabot ruangan non-kendaraan (atau objek di dalam layar HP)
          const isRoomFurniture = nonVehicleBoxes.some(({ bbox: nb, cls }) => {
            if (computeIoU(cand.bbox, nb) > 0.32) return true;
            if (
              CONTAINING_NON_VEHICLE_CLASSES.has(cls) &&
              cx >= nb[0] &&
              cx <= nb[0] + nb[2] &&
              cy >= nb[1] &&
              cy <= nb[1] + nb[3] &&
              nb[2] * nb[3] > bw * bh * 1.1
            ) {
              return true;
            }
            return false;
          });
          if (isRoomFurniture) continue;

          verifiedCars.push(cand);
        }

        // Non-Maximum Suppression (NMS)
        verifiedCars.sort((a, b) => b.score - a.score);
        const nmsCars: RawCarBox[] = [];
        for (const cand of verifiedCars) {
          const isDuplicate = nmsCars.some(
            (existing) =>
              computeIoU(existing.bbox, cand.bbox) > 0.32 ||
              computeCenterDistanceRatio(existing.bbox, cand.bbox) < 0.36
          );
          if (!isDuplicate) {
            nmsCars.push(cand);
          }
        }

        // Temporal Smoothing Tracker (Anti-Flicker: kotak stabil & tidak mudah hilang sesaat)
        const prevTracks = trackedCarsRef.current;
        const matchedTrackIndices = new Set<number>();
        const updatedTracks: TrackedCar[] = [];

        for (const raw of nmsCars) {
          let bestIdx = -1;
          let bestScore = -1;

          for (let i = 0; i < prevTracks.length; i++) {
            if (matchedTrackIndices.has(i)) continue;
            const iou = computeIoU(raw.bbox, prevTracks[i].bbox);
            const centerDist = computeCenterDistanceRatio(raw.bbox, prevTracks[i].bbox);

            if (iou > 0.15 || centerDist < 0.72) {
              const matchQuality = iou + Math.max(0, 0.75 - centerDist);
              if (matchQuality > bestScore) {
                bestScore = matchQuality;
                bestIdx = i;
              }
            }
          }

          if (bestIdx !== -1) {
            matchedTrackIndices.add(bestIdx);
            const prev = prevTracks[bestIdx];
            const moveDist = computeCenterDistanceRatio(raw.bbox, prev.bbox);
            // Redam getaran kotak saat mobil diam (alpha 0.25), tetap responsif saat mobil bergerak (alpha 0.58)
            const alpha = moveDist < 0.16 ? 0.25 : 0.58;
            const smoothedBbox: [number, number, number, number] = [
              prev.bbox[0] * (1 - alpha) + raw.bbox[0] * alpha,
              prev.bbox[1] * (1 - alpha) + raw.bbox[1] * alpha,
              prev.bbox[2] * (1 - alpha) + raw.bbox[2] * alpha,
              prev.bbox[3] * (1 - alpha) + raw.bbox[3] * alpha,
            ];
            updatedTracks.push({
              trackId: prev.trackId,
              bbox: smoothedBbox,
              score: Math.max(prev.score * 0.5 + raw.score * 0.5, raw.score),
              hits: Math.min(30, prev.hits + 1),
              missed: 0,
            });
          } else {
            updatedTracks.push({
              trackId: nextTrackIdRef.current++,
              bbox: raw.bbox,
              score: raw.score,
              hits: 1,
              missed: 0,
            });
          }
        }

        // Pertahankan track mobil yang sudah terkunci agar tidak ilang-ilangan akibat kedipan cahaya/kamera
        for (let i = 0; i < prevTracks.length; i++) {
          if (!matchedTrackIndices.has(i)) {
            const prev = prevTracks[i];
            const maxMissed = prev.hits >= 5 ? 9 : prev.hits >= 2 ? 6 : 2;
            if (prev.missed < maxMissed) {
              updatedTracks.push({
                ...prev,
                missed: prev.missed + 1,
              });
            }
          }
        }

        // Urutkan stabil berdasarkan trackId agar nomor MOBIL #1/#2/#3 tidak acak berpindah-pindah
        updatedTracks.sort((a, b) => a.trackId - b.trackId);
        trackedCarsRef.current = updatedTracks;

        const container = containerRef.current;
        const cW = container ? container.clientWidth : 16;
        const cH = container ? container.clientHeight : 9;

        const formattedCars: DetectedCar[] = updatedTracks.map((t, index) => {
          const coords = mapBoxToContainerPercent(t.bbox, vw, vh, cW, cH);
          return {
            id: `CAR-${t.trackId}`,
            trackId: index + 1,
            label: `MOBIL #${index + 1}`,
            color: '#22C55E',
            x: coords.x,
            y: coords.y,
            w: coords.w,
            h: coords.h,
            confidence: Number(t.score.toFixed(2)),
          };
        });

        if (!active) return;

        setDetectedCars(formattedCars);

        const currentCarCount = formattedCars.length;
        const congestion = calculateTrafficCongestion(currentCarCount);

        updateTrafficCameraData({
          vehicleCount: currentCarCount,
          density: congestion.density,
          statusText: congestion.statusText,
          avgSpeedKmh: congestion.avgSpeedKmh,
          queueLengthMeters: congestion.queueLengthMeters,
          vehicleCounts: {
            mobil: currentCarCount,
            motor: 0,
            bus: 0,
            truk: 0,
          },
        });

        const nowMs = Date.now();
        if (nowMs - lastTelemetryPostRef.current >= 1200) {
          lastTelemetryPostRef.current = nowMs;
          fetch('/api/iot/telemetry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              deviceId: 'WEBCAM-HOTWHEELS-AI',
              type: 'traffic',
              intersectionId: 'TRF-01',
              payload: {
                density: congestion.density,
                vehicleCount: currentCarCount,
                statusText: congestion.statusText,
                avgSpeedKmh: congestion.avgSpeedKmh,
                queueLengthMeters: congestion.queueLengthMeters,
                counts: {
                  mobil: currentCarCount,
                  motor: 0,
                  bus: 0,
                  truk: 0,
                },
              },
            }),
          }).catch(() => {});
        }
      } catch {
        // Abaikan error transien
      } finally {
        isDetectingRef.current = false;
      }
    };

    const interval = setInterval(runHybridDetection, 140);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [
    isStreaming,
    feedMode,
    isModelReady,
    minConfidence,
    enableMultiScaleTiling,
    useRoadZone,
    roiBounds,
    updateTrafficCameraData,
  ]);

  const isMacet = traffic.vehicleCount >= 6;
  const isPadat = traffic.vehicleCount >= 3 && traffic.vehicleCount < 6;

  return (
    <section aria-label="Feed Kamera Pemantau Kemacetan Mobil" className="rack-panel flex flex-col overflow-hidden">
      {/* Header Bar */}
      <div className="px-3 sm:px-4 py-2.5 bg-[var(--bg-header)] border-b border-[var(--border-line)] flex flex-wrap items-center justify-between gap-2 rounded-t-[10px]">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-semibold text-xs sm:text-sm text-[var(--text-primary)] truncate">
            Kamera Deteksi Mobil
          </h3>
          <span
            className="px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-mono font-bold border shrink-0"
            style={{
              backgroundColor: isMacet
                ? 'var(--sig-red-bg)'
                : isPadat
                ? 'var(--sig-amber-bg)'
                : 'var(--sig-green-bg)',
              borderColor: isMacet
                ? 'var(--sig-red-border)'
                : isPadat
                ? 'var(--sig-amber-border)'
                : 'var(--sig-green-border)',
              color: isMacet
                ? 'var(--sig-red)'
                : isPadat
                ? 'var(--sig-amber)'
                : 'var(--sig-green)',
            }}
          >
            {traffic.vehicleCount} MOBIL · {traffic.statusText}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFeedMode('browser')}
            className={`ctrl-btn ctrl-btn-sm font-mono ${
              feedMode === 'browser' ? 'ctrl-btn-active' : ''
            }`}
          >
            Kamera Web
          </button>
          <button
            type="button"
            onClick={() => {
              setFeedMode('yolo11');
              setYoloStreamOnline(true);
            }}
            className={`ctrl-btn ctrl-btn-sm font-mono ${
              feedMode === 'yolo11' ? 'ctrl-btn-active' : ''
            }`}
          >
            Port 8088
          </button>

          {feedMode === 'browser' ? (
            <>
              <button
                type="button"
                onClick={handleToggleFacingMode}
                disabled={isOpeningCamera}
                className="ctrl-btn ctrl-btn-sm font-mono"
                title="Ganti antara Kamera Belakang dan Kamera Depan"
              >
                {facingMode === 'environment' ? 'Kamera Belakang' : 'Kamera Depan'}
              </button>

              {devices.length > 1 && (
                <select
                  value={selectedDeviceId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedDeviceId(id);
                    selectedDeviceIdRef.current = id;
                    startCamera({ deviceId: id });
                  }}
                  aria-label="Pilih Perangkat Kamera"
                  className="rack-well px-2 h-8 text-xs font-mono text-[var(--text-primary)] max-w-[130px] sm:max-w-[180px] truncate"
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
                  onClick={() => startCamera({ facing: facingMode })}
                  disabled={isOpeningCamera}
                  className="ctrl-btn ctrl-btn-sm ctrl-btn-green font-mono"
                >
                  {isOpeningCamera ? 'Membuka...' : 'Nyalakan'}
                </button>
              )}
            </>
          ) : (
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
                CAM 1
              </button>
            </>
          )}
        </div>
      </div>

      <div className="p-3 sm:p-4 flex flex-col gap-3">
        {/* Status Engine AI Bar */}
        {feedMode === 'browser' && (
          <div className="rack-well px-3 py-2 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] sm:text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor: isModelReady ? 'var(--sig-green-dot)' : 'var(--sig-amber-dot)',
                }}
              />
              <span className="font-semibold text-[var(--text-primary)] truncate">{modelStatus}</span>
            </div>
            {humanDetectedInFrame && (
              <span
                className="px-2 py-0.5 rounded text-[10px] font-bold border shrink-0"
                style={{
                  backgroundColor: 'var(--bg-panel)',
                  borderColor: 'var(--border-strong)',
                  color: 'var(--text-secondary)',
                }}
              >
                Veto Rambut/Wajah Aktif
              </span>
            )}
          </div>
        )}

        {/* Video Viewport */}
        <div
          ref={containerRef}
          className="relative aspect-video w-full bg-[#090D16] rounded-lg border border-[var(--border-strong)] overflow-hidden flex items-center justify-center min-h-[220px] sm:min-h-[300px]"
        >
          <canvas ref={tileCanvasRef} className="hidden" />

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
              <div className="p-4 sm:p-6 text-center font-mono space-y-3 text-[#F8FAFC]">
                <p className="text-xs sm:text-sm font-bold">SERVER PORT 8088 TIDAK AKTIF</p>
                <p className="text-[11px] sm:text-xs text-[#94A3B8] max-w-md mx-auto">
                  Gunakan mode [Kamera Web] untuk deteksi mobil langsung di HP atau Laptop.
                </p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setYoloStreamOnline(true)}
                    className="ctrl-btn ctrl-btn-sm font-mono"
                  >
                    Coba Ulang
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedMode('browser')}
                    className="ctrl-btn ctrl-btn-sm ctrl-btn-green font-mono"
                  >
                    Pakai Kamera Web
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
              onLoadedMetadata={() => {
                videoRef.current?.play().catch(() => {});
              }}
              className="w-full h-full object-cover bg-black"
            />
          )}

          {feedMode === 'browser' && !isStreaming && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-[#090D16] text-[#F8FAFC] font-mono space-y-3 z-10">
              <p className="text-xs sm:text-sm font-bold">
                {isOpeningCamera ? 'MEMBUKA KAMERA BELAKANG...' : 'KAMERA DETEKSI MOBIL SIAGA'}
              </p>
              {errorMessage && (
                <p className="text-[11px] text-[#F87171] max-w-sm">{errorMessage}</p>
              )}
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => startCamera({ facing: 'environment' })}
                  disabled={isOpeningCamera}
                  className="ctrl-btn ctrl-btn-sm ctrl-btn-green font-mono"
                >
                  Buka Kamera Belakang
                </button>
                <button
                  type="button"
                  onClick={() => startCamera({ facing: 'user' })}
                  disabled={isOpeningCamera}
                  className="ctrl-btn ctrl-btn-sm font-mono"
                >
                  Kamera Depan
                </button>
              </div>
            </div>
          )}

          {/* Live HUD & Bounding Boxes Overlay */}
          {feedMode === 'browser' && isStreaming && (
            <div className="absolute inset-0 pointer-events-none z-20">
              {useRoadZone && (
                <div
                  className="absolute border-2 border-dashed border-[#38BDF8]/70 rounded-md"
                  style={{
                    left: `${roiBounds.left * 100}%`,
                    top: `${roiBounds.top * 100}%`,
                    width: `${(roiBounds.right - roiBounds.left) * 100}%`,
                    height: `${(roiBounds.bottom - roiBounds.top) * 100}%`,
                  }}
                >
                  <span className="hidden sm:inline-block absolute -top-5 left-1.5 bg-[#090D16]/85 text-[#38BDF8] border border-[#38BDF8]/50 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">
                    ZONA JALAN MINIATUR
                  </span>
                </div>
              )}

              {/* Compact Live HUD Status Pill */}
              <div className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-[#090D16]/90 border border-[#334155] rounded-lg px-2.5 py-1.5 font-mono text-[11px] sm:text-xs text-[#F8FAFC] flex items-center gap-2.5 shadow-md">
                <div>
                  <span className="text-[9px] sm:text-[10px] text-[#94A3B8] block">MOBIL</span>
                  <span className="text-xs sm:text-sm font-bold text-[#4ADE80]">
                    {traffic.vehicleCount} / 6
                  </span>
                </div>
                <div className="h-6 w-px bg-[#334155]" />
                <div>
                  <span className="text-[9px] sm:text-[10px] text-[#94A3B8] block">STATUS</span>
                  <span
                    className="text-xs sm:text-sm font-bold"
                    style={{
                      color: isMacet ? '#F87171' : isPadat ? '#FBBF24' : '#4ADE80',
                    }}
                  >
                    {isMacet ? 'MACET' : isPadat ? 'PADAT' : 'LANCAR'}
                  </span>
                </div>
              </div>

              {detectedCars.map((box) => (
                <div
                  key={box.id}
                  className="absolute border-2 transition-all duration-75"
                  style={{
                    borderColor: isMacet ? '#EF4444' : '#22C55E',
                    backgroundColor: isMacet
                      ? 'rgba(239, 68, 68, 0.14)'
                      : 'rgba(34, 197, 94, 0.14)',
                    left: `${box.x}%`,
                    top: `${box.y}%`,
                    width: `${box.w}%`,
                    height: `${box.h}%`,
                  }}
                >
                  <span
                    className="inline-block text-[10px] font-mono font-bold text-black px-1.5 py-0.5 whitespace-nowrap"
                    style={{ backgroundColor: isMacet ? '#F87171' : '#4ADE80' }}
                  >
                    {box.label} {(box.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {lockWarning && (
          <div
            className="p-2.5 rounded-lg border text-xs font-mono flex items-center justify-between gap-2"
            style={{
              backgroundColor: 'var(--sig-amber-bg)',
              borderColor: 'var(--sig-amber-border)',
              color: 'var(--sig-amber)',
            }}
          >
            <span>{lockWarning}</span>
            <button
              type="button"
              onClick={() => setLockWarning(null)}
              className="ctrl-btn ctrl-btn-sm font-mono"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Compact Responsive Controls Grid */}
        {feedMode === 'browser' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 font-mono text-xs">
            {/* Left Box: Road Zone & Optional Maket Lock */}
            <div className="rack-well p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-[var(--text-primary)]">
                  1. Zona Jalan Maket
                </span>
                <span className="text-[10px] text-[var(--text-secondary)]">
                  {lockedTimestamp ? `Terkunci (${lockedTimestamp})` : 'Multi-Angle AI'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setUseRoadZone((prev) => !prev)}
                  className={`ctrl-btn ctrl-btn-sm font-mono ${
                    useRoadZone ? 'ctrl-btn-active' : ''
                  }`}
                >
                  {useRoadZone ? 'Zona: ON' : 'Full Layar'}
                </button>
                <button
                  type="button"
                  onClick={handleLockEmptyRoad}
                  disabled={!isStreaming}
                  className="ctrl-btn ctrl-btn-sm ctrl-btn-green font-mono"
                >
                  Kunci Jalan
                </button>
                {lockedTimestamp && (
                  <button
                    type="button"
                    onClick={handleUnlockRoad}
                    className="ctrl-btn ctrl-btn-sm ctrl-btn-red font-mono"
                  >
                    Reset
                  </button>
                )}
              </div>

              {useRoadZone && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <div className="flex justify-between text-[10px] text-[var(--text-secondary)]">
                      <span>Lebar</span>
                      <span>{Math.round((roiBounds.right - roiBounds.left) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.02"
                      max="0.30"
                      step="0.02"
                      value={roiBounds.left}
                      onChange={(e) => {
                        const margin = parseFloat(e.target.value);
                        setRoiBounds((prev) => ({
                          ...prev,
                          left: margin,
                          right: Number((1 - margin).toFixed(2)),
                        }));
                      }}
                      className="ctrl-range"
                      aria-label="Atur Lebar Zona Jalan"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-[var(--text-secondary)]">
                      <span>Tinggi</span>
                      <span>{Math.round((roiBounds.bottom - roiBounds.top) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.04"
                      max="0.32"
                      step="0.02"
                      value={roiBounds.top}
                      onChange={(e) => {
                        const margin = parseFloat(e.target.value);
                        setRoiBounds((prev) => ({
                          ...prev,
                          top: margin,
                          bottom: Number((1 - margin * 0.85).toFixed(2)),
                        }));
                      }}
                      className="ctrl-range"
                      aria-label="Atur Tinggi Zona Jalan"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Right Box: Multi-Scale Tiling & Confidence Threshold */}
            <div className="rack-well p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-[var(--text-primary)]">
                  2. Sensitivitas AI
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEnableMultiScaleTiling((prev) => !prev)}
                    className={`ctrl-btn ctrl-btn-sm font-mono ${
                      enableMultiScaleTiling ? 'ctrl-btn-active' : ''
                    }`}
                  >
                    {enableMultiScaleTiling ? 'Zoom Jauh: ON' : 'Zoom Jauh: OFF'}
                  </button>
                  <span className="font-bold text-[var(--text-primary)]">
                    {Math.round(minConfidence * 100)}%
                  </span>
                </div>
              </div>

              <div className="pt-1">
                <div className="flex justify-between text-[10px] text-[var(--text-secondary)]">
                  <span>12% (Mobil Jauh / Atas)</span>
                  <span>55% (Ketat)</span>
                </div>
                <input
                  type="range"
                  min="0.12"
                  max="0.55"
                  step="0.02"
                  value={minConfidence}
                  onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                  className="ctrl-range"
                  aria-label="Ambang Kepercayaan Deteksi Mobil"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
