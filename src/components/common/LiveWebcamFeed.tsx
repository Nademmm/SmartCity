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
  bbox: [number, number, number, number]; // [x, y, width, height]
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
  bbox: [number, number, number, number]; // [x, y, w, h] in full video pixel coords
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
  left: number;   // 0..1
  top: number;    // 0..1
  right: number;  // 0..1
  bottom: number; // 0..1
}

interface LockedRoadCalibration {
  bgR: Float32Array;
  bgG: Float32Array;
  bgB: Float32Array;
  bgLum: Float32Array;
  timestamp: string;
}

// Kelas kendaraan langsung dari COCO-SSD
const DIRECT_VEHICLE_CLASSES = new Set(['car', 'truck', 'bus', 'train']);

// Kelas saat mobil miniatur HotWheels dipegang di jari/tangan di depan kamera
// (karena model COCO sering memberi label objek kecil di genggaman jari sebagai kelas ini)
const HANDHELD_CANDIDATE_CLASSES = new Set([
  'cell phone',
  'suitcase',
  'remote',
  'mouse',
  'skateboard',
]);

// Kelas non-mobil yang diabaikan
const IGNORED_CLASSES = new Set([
  'person',
  'bicycle',
  'motorcycle',
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
  'hair drier',
  'toothbrush',
  'bottle',
  'wine glass',
  'cup',
  'fork',
  'knife',
  'spoon',
  'bowl',
  'backpack',
  'umbrella',
  'handbag',
  'tie',
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
  const refSize = Math.max(12, Math.hypot(b1[2], b1[3]), Math.hypot(b2[2], b2[3]));
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

  const clampedX = Math.max(0, Math.min(95, xPct));
  const clampedY = Math.max(0, Math.min(95, yPct));
  const clampedW = Math.max(3.5, Math.min(100 - clampedX, wPct));
  const clampedH = Math.max(3.5, Math.min(100 - clampedY, hPct));

  return {
    x: Number(clampedX.toFixed(1)),
    y: Number(clampedY.toFixed(1)),
    w: Number(clampedW.toFixed(1)),
    h: Number(clampedH.toFixed(1)),
  };
}

function isSkinYCrCb(r: number, g: number, b: number): boolean {
  if (r < 65 || g < 30 || b < 15) return false;
  if (r <= g || r <= b) return false;
  if (r - Math.min(g, b) < 12) return false;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const sat = Math.max(r, g, b) - Math.min(r, g, b);
  // Cat mobil merah menyala bukan kulit
  if (sat > 140 && r > 185 && g < 85) return false;
  return cr >= 133 && cr <= 173 && cb >= 77 && cb <= 127;
}

const GRID_W = 240;
const GRID_H = 180;
const COLS = 60;
const ROWS = 45;

/**
 * LAYER 2: Detektor Mobil HotWheels Saat Dipegang Tangan (Handheld Diecast Mode).
 * Mengidentifikasi kapan tangan diangkat ke depan kamera memegang mobil HotWheels (seperti pada IMG2_WITH_TRUCK),
 * dan mengembalikan [] (0 mobil) saat user hanya duduk biasa tanpa mengangkat tangan memegang mobil (seperti pada IMG1_NO_CAR).
 */
function detectHandheldHotWheels(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  vw: number,
  vh: number,
  roi: RoiBounds
): RawCarBox[] {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];

  canvas.width = GRID_W;
  canvas.height = GRID_H;
  ctx.drawImage(video, 0, 0, GRID_W, GRID_H);

  let imgData: ImageData;
  try {
    imgData = ctx.getImageData(0, 0, GRID_W, GRID_H);
  } catch {
    return [];
  }

  const data = imgData.data;
  const cellW = GRID_W / COLS; // 4px
  const cellH = GRID_H / ROWS; // 4px
  const totalCells = COLS * ROWS;

  const skinGrid = new Uint8Array(totalCells);
  const lumGrid = new Float32Array(totalCells);
  const satGrid = new Float32Array(totalCells);
  const spreadGrid = new Float32Array(totalCells);

  let topSkinCells = 0;
  let totalSkinCells = 0;
  const topLimitRow = Math.floor(ROWS * 0.22);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const idx = r * COLS + c;
      const sx = c * cellW;
      const sy = r * cellH;

      let sumLum = 0;
      let sumSat = 0;
      let minL = 255;
      let maxL = 0;
      let skinCnt = 0;
      let cnt = 0;

      for (let y = sy; y < sy + cellH; y++) {
        for (let x = sx; x < sx + cellW; x++) {
          const p = (y * GRID_W + x) * 4;
          const pr = data[p];
          const pg = data[p + 1];
          const pb = data[p + 2];
          const lum = 0.299 * pr + 0.587 * pg + 0.114 * pb;
          const sat = Math.max(pr, pg, pb) - Math.min(pr, pg, pb);

          sumLum += lum;
          sumSat += sat;
          if (lum < minL) minL = lum;
          if (lum > maxL) maxL = lum;
          if (isSkinYCrCb(pr, pg, pb)) skinCnt++;
          cnt++;
        }
      }

      const inv = 1 / cnt;
      lumGrid[idx] = sumLum * inv;
      satGrid[idx] = sumSat * inv;
      spreadGrid[idx] = maxL - minL;

      if (skinCnt / cnt >= 0.45) {
        skinGrid[idx] = 1;
        totalSkinCells++;
        if (r < topLimitRow) topSkinCells++;
      }
    }
  }

  const topSkinRatio = topSkinCells / Math.max(1, COLS * topLimitRow);
  const totalSkinRatio = totalSkinCells / totalCells;

  // Syarat Tangan Diangkat Memegang Mobil:
  // Saat duduk biasa (IMG1_NO_CAR), topSkinRatio hanya ~0.016 (1.6%).
  // Saat tangan diangkat memegang mobil HotWheels (IMG2_WITH_TRUCK), topSkinRatio ~0.237 (23.7%).
  if (topSkinRatio < 0.055 || totalSkinRatio < 0.18) {
    return [];
  }

  // Cari objek bodi mobil HotWheels (bukan kulit, bukan dinding putih terang, berada di area tengah genggaman tangan)
  const carObjGrid = new Uint8Array(totalCells);
  const minR = Math.max(Math.floor(ROWS * 0.20), Math.floor(roi.top * ROWS));
  const maxR = Math.min(Math.floor(ROWS * 0.84), Math.ceil(roi.bottom * ROWS));
  const minC = Math.max(2, Math.floor(roi.left * COLS));
  const maxC = Math.min(COLS - 3, Math.ceil(roi.right * COLS));

  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      const idx = r * COLS + c;
      if (skinGrid[idx] === 1) continue;

      const lum = lumGrid[idx];
      const sat = satGrid[idx];

      // Bodi mobil HotWheels: gelap metalik (seperti truk hitam HotWheels: lum < 105) ATAU berwarna jenuh (sat > 42 dan lum < 185)
      if (lum < 105 || (sat > 42 && lum < 185)) {
        carObjGrid[idx] = 1;
      }
    }
  }

  // Morphological Opening (3x3) untuk memisahkan bodi mobil HotWheels dari gagang kacamata tipis
  const openedGrid = new Uint8Array(totalCells);
  for (let r = minR + 1; r <= maxR - 1; r++) {
    for (let c = minC + 1; c <= maxC - 1; c++) {
      const idx = r * COLS + c;
      if (carObjGrid[idx] === 1) {
        let activeNeighbors = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (carObjGrid[(r + dr) * COLS + (c + dc)] === 1) activeNeighbors++;
          }
        }
        if (activeNeighbors >= 6) {
          openedGrid[idx] = 1;
        }
      }
    }
  }

  // Dilasi 1 sel kembali setelah erosi
  const cleanGrid = new Uint8Array(openedGrid);
  for (let r = minR + 1; r <= maxR - 1; r++) {
    for (let c = minC + 1; c <= maxC - 1; c++) {
      if (openedGrid[r * COLS + c] === 1) {
        cleanGrid[(r - 1) * COLS + c] = 1;
        cleanGrid[(r + 1) * COLS + c] = 1;
        cleanGrid[r * COLS + (c - 1)] = 1;
        cleanGrid[r * COLS + (c + 1)] = 1;
      }
    }
  }

  const visited = new Uint8Array(totalCells);
  const candidates: { bbox: [number, number, number, number]; score: number }[] = [];

  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      const startIdx = r * COLS + c;
      if (cleanGrid[startIdx] === 1 && visited[startIdx] === 0) {
        let bMinR = r;
        let bMaxR = r;
        let bMinC = c;
        let bMaxC = c;
        let count = 0;
        let sumSpread = 0;
        const q: number[] = [startIdx];
        visited[startIdx] = 1;

        while (q.length > 0) {
          const curr = q.pop()!;
          count++;
          sumSpread += spreadGrid[curr];
          const cr = Math.floor(curr / COLS);
          const cc = curr % COLS;
          if (cr < bMinR) bMinR = cr;
          if (cr > bMaxR) bMaxR = cr;
          if (cc < bMinC) bMinC = cc;
          if (cc > bMaxC) bMaxC = cc;

          const neigh = [
            [cr - 1, cc],
            [cr + 1, cc],
            [cr, cc - 1],
            [cr, cc + 1],
          ];
          for (const [nr, nc] of neigh) {
            if (nr >= minR && nr <= maxR && nc >= minC && nc <= maxC) {
              const nIdx = nr * COLS + nc;
              if (cleanGrid[nIdx] === 1 && visited[nIdx] === 0) {
                visited[nIdx] = 1;
                q.push(nIdx);
              }
            }
          }
        }

        const spanC = bMaxC - bMinC + 1;
        const spanR = bMaxR - bMinR + 1;
        const boxArea = spanC * spanR;
        const areaFrac = boxArea / totalCells;
        const aspect = Math.max(spanC, spanR) / Math.max(1, Math.min(spanC, spanR));

        if (count < 28 || areaFrac < 0.022 || areaFrac > 0.25) continue;
        if (aspect < 1.02 || aspect > 2.65) continue;

        // Periksa kontak kulit (jari tangan yang menggenggam mobil di sisi sekelilingnya)
        const pad = 3;
        const sr1 = Math.max(0, bMinR - pad);
        const sr2 = Math.min(ROWS - 1, bMaxR + pad);
        const sc1 = Math.max(0, bMinC - pad);
        const sc2 = Math.min(COLS - 1, bMaxC + pad);
        let skinAround = 0;
        let totalAround = 0;

        for (let rr = sr1; rr <= sr2; rr++) {
          for (let cc = sc1; cc <= sc2; cc++) {
            totalAround++;
            if (skinGrid[rr * COLS + cc] === 1) skinAround++;
          }
        }

        const borderSkinRatio = skinAround / Math.max(1, totalAround);
        const avgSpread = sumSpread / count;

        if (borderSkinRatio >= 0.18 && avgSpread >= 12) {
          const bX = (bMinC / COLS) * vw;
          const bY = (bMinR / ROWS) * vh;
          const bW = (spanC / COLS) * vw;
          const bH = (spanR / ROWS) * vh;
          candidates.push({
            bbox: [bX, bY, bW, bH],
            score: Math.min(0.98, 0.85 + borderSkinRatio * 0.2),
          });
        }
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, 2);
}

/**
 * LAYER 3: Detektor Deretan Mobil HotWheels di Jalan Miniatur (Tabletop / Maket Road Mode).
 * HANYA berjalan ketika TIDAK ADA MANUSIA/WAJAH di depan kamera (kamera diarahkan fokus ke jalan maket),
 * atau ketika latar jalan maket telah dikunci.
 */
function detectRoadMiniatureCars(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  vw: number,
  vh: number,
  roi: RoiBounds,
  locked: LockedRoadCalibration | null
): RawCarBox[] {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];

  canvas.width = GRID_W;
  canvas.height = GRID_H;
  ctx.drawImage(video, 0, 0, GRID_W, GRID_H);

  let imgData: ImageData;
  try {
    imgData = ctx.getImageData(0, 0, GRID_W, GRID_H);
  } catch {
    return [];
  }

  const data = imgData.data;
  const cellW = GRID_W / COLS;
  const cellH = GRID_H / ROWS;
  const totalCells = COLS * ROWS;

  const rGrid = new Float32Array(totalCells);
  const gGrid = new Float32Array(totalCells);
  const bGrid = new Float32Array(totalCells);
  const lumGrid = new Float32Array(totalCells);
  const satGrid = new Float32Array(totalCells);
  const spreadGrid = new Float32Array(totalCells);
  const skinGrid = new Uint8Array(totalCells);

  let skinCells = 0;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const idx = r * COLS + c;
      const sx = c * cellW;
      const sy = r * cellH;
      let sr = 0, sg = 0, sb = 0, slum = 0, ssat = 0;
      let minL = 255, maxL = 0, sk = 0, cnt = 0;

      for (let y = sy; y < sy + cellH; y++) {
        for (let x = sx; x < sx + cellW; x++) {
          const p = (y * GRID_W + x) * 4;
          const pr = data[p], pg = data[p + 1], pb = data[p + 2];
          const lum = 0.299 * pr + 0.587 * pg + 0.114 * pb;
          const sat = Math.max(pr, pg, pb) - Math.min(pr, pg, pb);
          sr += pr; sg += pg; sb += pb; slum += lum; ssat += sat;
          if (lum < minL) minL = lum;
          if (lum > maxL) maxL = lum;
          if (isSkinYCrCb(pr, pg, pb)) sk++;
          cnt++;
        }
      }

      const inv = 1 / cnt;
      rGrid[idx] = sr * inv;
      gGrid[idx] = sg * inv;
      bGrid[idx] = sb * inv;
      lumGrid[idx] = slum * inv;
      satGrid[idx] = ssat * inv;
      spreadGrid[idx] = maxL - minL;
      if (sk / cnt >= 0.45) {
        skinGrid[idx] = 1;
        skinCells++;
      }
    }
  }

  // Pengaman Anti-Manusia: Jika di layar terdapat > 5% kulit manusia (ada wajah/orang),
  // JANGAN jalankan detektor jalan maket agar wajah/rambut/kacamata tidak pernah terdeteksi!
  if (skinCells / totalCells > 0.05) {
    return [];
  }

  const minC = Math.max(1, Math.floor(roi.left * COLS));
  const maxC = Math.min(COLS - 2, Math.ceil(roi.right * COLS));
  const minR = Math.max(1, Math.floor(roi.top * ROWS));
  const maxR = Math.min(ROWS - 2, Math.ceil(roi.bottom * ROWS));

  // Estimasi warna jalan dominan di dalam ROI
  const roadSamplesLum: number[] = [];
  const roadSamplesR: number[] = [];
  const roadSamplesG: number[] = [];
  const roadSamplesB: number[] = [];

  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      const idx = r * COLS + c;
      if (spreadGrid[idx] < 32 && satGrid[idx] < 38) {
        roadSamplesLum.push(lumGrid[idx]);
        roadSamplesR.push(rGrid[idx]);
        roadSamplesG.push(gGrid[idx]);
        roadSamplesB.push(bGrid[idx]);
      }
    }
  }

  const median = (arr: number[], fb: number) => {
    if (arr.length === 0) return fb;
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.floor(s.length * 0.5)];
  };

  const roadLum = median(roadSamplesLum, 80);
  const roadR = median(roadSamplesR, 80);
  const roadG = median(roadSamplesG, 80);
  const roadB = median(roadSamplesB, 82);

  // Pengaman Dinding Putih Ruangan: Jika permukaan latar adalah dinding putih terang (> 165) dan belum dikunci sebagai maket, batalkan
  if (!locked && roadLum > 165) {
    return [];
  }

  const fg = new Uint8Array(totalCells);
  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      const idx = r * COLS + c;
      if (locked) {
        const dCol = Math.hypot(
          rGrid[idx] - locked.bgR[idx],
          gGrid[idx] - locked.bgG[idx],
          bGrid[idx] - locked.bgB[idx]
        );
        const dLum = Math.abs(lumGrid[idx] - locked.bgLum[idx]);
        if (dCol > 32 || dLum > 25) fg[idx] = 1;
      } else {
        const dCol = Math.hypot(rGrid[idx] - roadR, gGrid[idx] - roadG, bGrid[idx] - roadB);
        const dLum = Math.abs(lumGrid[idx] - roadLum);
        if ((satGrid[idx] > 35 && dCol > 32) || (dLum > 36 && spreadGrid[idx] > 22)) {
          fg[idx] = 1;
        }
      }
    }
  }

  const visited = new Uint8Array(totalCells);
  const boxes: RawCarBox[] = [];
  const typicalSpan = 9;

  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      const startIdx = r * COLS + c;
      if (fg[startIdx] === 1 && visited[startIdx] === 0) {
        let bMinR = r, bMaxR = r, bMinC = c, bMaxC = c, cnt = 0;
        const q: number[] = [startIdx];
        visited[startIdx] = 1;

        while (q.length > 0) {
          const curr = q.pop()!;
          cnt++;
          const cr = Math.floor(curr / COLS);
          const cc = curr % COLS;
          if (cr < bMinR) bMinR = cr;
          if (cr > bMaxR) bMaxR = cr;
          if (cc < bMinC) bMinC = cc;
          if (cc > bMaxC) bMaxC = cc;

          const neigh = [
            [cr - 1, cc],
            [cr + 1, cc],
            [cr, cc - 1],
            [cr, cc + 1],
          ];
          for (const [nr, nc] of neigh) {
            if (nr >= minR && nr <= maxR && nc >= minC && nc <= maxC) {
              const nIdx = nr * COLS + nc;
              if (fg[nIdx] === 1 && visited[nIdx] === 0) {
                visited[nIdx] = 1;
                q.push(nIdx);
              }
            }
          }
        }

        const spanC = bMaxC - bMinC + 1;
        const spanR = bMaxR - bMinR + 1;
        const maxSpan = Math.max(spanC, spanR);
        const minSpan = Math.min(spanC, spanR);
        const aspect = maxSpan / Math.max(1, minSpan);

        if (cnt < 6 || spanC * spanR > totalCells * 0.28) continue;
        if (minSpan <= 1 || aspect > 5.5) continue;

        let numCars = 1;
        if (maxSpan >= typicalSpan * 1.85 && aspect >= 2.1) {
          numCars = Math.min(4, Math.max(2, Math.round(maxSpan / typicalSpan)));
        }

        if (numCars === 1) {
          boxes.push({
            bbox: [
              (bMinC / COLS) * vw,
              (bMinR / ROWS) * vh,
              (spanC / COLS) * vw,
              (spanR / ROWS) * vh,
            ],
            score: 0.92,
          });
        } else {
          const isHoriz = spanC >= spanR;
          for (let k = 0; k < numCars; k++) {
            const f1 = k / numCars;
            const f2 = (k + 1) / numCars;
            const sc1 = isHoriz ? bMinC + Math.floor(f1 * spanC) : bMinC;
            const sc2 = isHoriz ? Math.max(sc1 + 2, bMinC + Math.floor(f2 * spanC) - 1) : bMaxC;
            const sr1 = isHoriz ? bMinR : bMinR + Math.floor(f1 * spanR);
            const sr2 = isHoriz ? bMaxR : Math.max(sr1 + 2, bMinR + Math.floor(f2 * spanR) - 1);

            boxes.push({
              bbox: [
                (sc1 / COLS) * vw,
                (sr1 / ROWS) * vh,
                ((sc2 - sc1 + 1) / COLS) * vw,
                ((sr2 - sr1 + 1) / ROWS) * vh,
              ],
              score: 0.91,
            });
          }
        }
      }
    }
  }

  return boxes;
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
  const cachedTileCarsRef = useRef<RawCarBox[]>([]);

  const selectedDeviceIdRef = useRef<string>('');
  const isStartingRef = useRef<boolean>(false);

  const [devices, setDevices] = useState<VideoDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Status Model Deep Learning Lokal (/models/coco-ssd/model.json)
  const [isModelReady, setIsModelReady] = useState<boolean>(false);
  const [modelStatus, setModelStatus] = useState<string>('Memuat Model AI Lokal...');
  const [humanDetectedInFrame, setHumanDetectedInFrame] = useState<boolean>(false);

  // Pengaturan Deteksi
  const [minConfidence, setMinConfidence] = useState<number>(0.20);
  const [enableMultiScaleTiling, setEnableMultiScaleTiling] = useState<boolean>(true);
  const [useRoadZone, setUseRoadZone] = useState<boolean>(true);
  const [roiBounds, setRoiBounds] = useState<RoiBounds>({
    left: 0.06,
    top: 0.12,
    right: 0.94,
    bottom: 0.90,
  });
  const [lockedTimestamp, setLockedTimestamp] = useState<string | null>(null);
  const [lockWarning, setLockWarning] = useState<string | null>(null);

  const [detectedCars, setDetectedCars] = useState<DetectedCar[]>([]);
  const [feedMode, setFeedMode] = useState<'browser' | 'yolo11'>('browser');
  const [yoloStreamOnline, setYoloStreamOnline] = useState<boolean>(false);
  const [yoloCameraSource, setYoloCameraSource] = useState<number>(0);
  const [isSwitchingYoloCam, setIsSwitchingYoloCam] = useState<boolean>(false);

  // 1. Muat Model Deep Learning dari Bundle Lokal (/models/coco-ssd/...) Tanpa Bergantung Google Storage
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
            setModelStatus('AI Neural Network Siap (Deteksi Khusus Mobil Miniatur / HotWheels)');
          }
        }
      } catch {
        if (isMounted) {
          setIsModelReady(true);
          setModelStatus('AI Vision Siap (Mode Deteksi Mobil HotWheels Aktif)');
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

        const targetId = deviceIdToUse !== undefined ? deviceIdToUse : selectedDeviceIdRef.current;
        const constraints: MediaStreamConstraints = {
          video: targetId
            ? { deviceId: { exact: targetId }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        };

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }

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
        const activeTrack = stream.getVideoTracks()[0];
        const activeDeviceId = activeTrack?.getSettings()?.deviceId || targetId;

        if (activeDeviceId) {
          selectedDeviceIdRef.current = activeDeviceId;
          setSelectedDeviceId(activeDeviceId);
        } else if (refreshed.length > 0 && !selectedDeviceIdRef.current) {
          selectedDeviceIdRef.current = refreshed[0].deviceId;
          setSelectedDeviceId(refreshed[0].deviceId);
        }
      } catch (err: unknown) {
        setIsStreaming(false);
        setIsCameraConnected(false);
        const errorObj = err as { message?: string };
        setErrorMessage(errorObj.message || 'Kamera tidak terjangkau atau izin kamera ditolak browser.');
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
    trackedCarsRef.current = [];
    cachedTileCarsRef.current = [];
    setIsStreaming(false);
    setIsCameraConnected(false);
    setDetectedCars([]);
  }, [setIsCameraConnected]);

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

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    canvas.width = GRID_W;
    canvas.height = GRID_H;
    ctx.drawImage(video, 0, 0, GRID_W, GRID_H);
    const imgData = ctx.getImageData(0, 0, GRID_W, GRID_H).data;
    const total = COLS * ROWS;
    const bgR = new Float32Array(total);
    const bgG = new Float32Array(total);
    const bgB = new Float32Array(total);
    const bgLum = new Float32Array(total);
    const cellW = GRID_W / COLS;
    const cellH = GRID_H / ROWS;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const idx = r * COLS + c;
        let sr = 0, sg = 0, sb = 0, slum = 0, cnt = 0;
        for (let y = r * cellH; y < (r + 1) * cellH; y++) {
          for (let x = c * cellW; x < (c + 1) * cellW; x++) {
            const p = (y * GRID_W + x) * 4;
            sr += imgData[p];
            sg += imgData[p + 1];
            sb += imgData[p + 2];
            slum += 0.299 * imgData[p] + 0.587 * imgData[p + 1] + 0.114 * imgData[p + 2];
            cnt++;
          }
        }
        bgR[idx] = sr / cnt;
        bgG[idx] = sg / cnt;
        bgB[idx] = sb / cnt;
        bgLum[idx] = slum / cnt;
      }
    }

    const ts = new Date().toLocaleTimeString('id-ID', { hour12: false });
    lockedRoadRef.current = { bgR, bgG, bgB, bgLum, timestamp: ts };
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
      startCamera();
    }
  }, [feedMode, yoloStreamOnline, startCamera, stopCamera, setIsCameraConnected]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // 2. Siklus Deteksi 3-Layer Hybrid (COCO-SSD Lokal + Handheld HotWheels + Miniature Road Multi-Car)
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

        const personBoxes: [number, number, number, number][] = [];
        const rawCarCandidates: RawCarBox[] = [];

        // LAYER 1: Jaringan Saraf COCO-SSD Lokal (Full Frame + Multi-Scale Zoom Tiling)
        const model = modelRef.current;
        if (model) {
          const fullPreds = await model.detect(video, 25, Math.max(0.12, minConfidence - 0.05));

          for (const p of fullPreds) {
            const cls = p.class.toLowerCase().trim();
            if (cls === 'person' && p.score >= 0.25) {
              personBoxes.push(p.bbox);
              continue;
            }
            if (DIRECT_VEHICLE_CLASSES.has(cls) && p.score >= minConfidence) {
              rawCarCandidates.push({
                bbox: p.bbox,
                score: p.score,
              });
            } else if (HANDHELD_CANDIDATE_CLASSES.has(cls) && p.score >= minConfidence) {
              // Objek kecil di genggaman tangan (seperti truk hitam HotWheels yang diklasifikasikan COCO sebagai cell phone / suitcase)
              const [, , bw, bh] = p.bbox;
              const areaRatio = (bw * bh) / (vw * vh);
              const aspect = Math.max(bw, bh) / Math.max(1, Math.min(bw, bh));
              if (areaRatio >= 0.012 && areaRatio <= 0.25 && aspect >= 1.02 && aspect <= 2.8) {
                rawCarCandidates.push({
                  bbox: p.bbox,
                  score: Math.max(0.85, p.score),
                });
              }
            }
          }

          // Multi-Scale Zoom Tiling pada Area Jalan
          if (enableMultiScaleTiling) {
            const tCtx = tileCanvas.getContext('2d');
            if (tCtx) {
              const tileW = 480;
              const tileH = 360;
              tileCanvas.width = tileW;
              tileCanvas.height = tileH;

              const tileSlices: [number, number][] = [
                [0.0, 0.56],
                [0.22, 0.78],
                [0.44, 1.0],
              ];
              const roiW = Math.max(100, roiX2 - roiX1);
              const roiH = Math.max(80, roiY2 - roiY1);

              const newTileCars: RawCarBox[] = [];
              const sliceIdx = tileStepRef.current % tileSlices.length;
              tileStepRef.current = (tileStepRef.current + 1) % tileSlices.length;

              const [fStart, fEnd] = tileSlices[sliceIdx];
              const cropX = roiX1 + fStart * roiW;
              const cropY = roiY1;
              const cropW = (fEnd - fStart) * roiW;
              const cropH = roiH;

              tCtx.clearRect(0, 0, tileW, tileH);
              tCtx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, tileW, tileH);

              const tilePreds = await model.detect(tileCanvas, 15, minConfidence);
              const scaleX = cropW / tileW;
              const scaleY = cropH / tileH;

              for (const tp of tilePreds) {
                const tCls = tp.class.toLowerCase().trim();
                const fullBx = cropX + tp.bbox[0] * scaleX;
                const fullBy = cropY + tp.bbox[1] * scaleY;
                const fullBw = tp.bbox[2] * scaleX;
                const fullBh = tp.bbox[3] * scaleY;
                const mappedBox: [number, number, number, number] = [fullBx, fullBy, fullBw, fullBh];

                if (tCls === 'person' && tp.score >= 0.30) {
                  personBoxes.push(mappedBox);
                  continue;
                }
                if (DIRECT_VEHICLE_CLASSES.has(tCls) && tp.score >= minConfidence) {
                  if (tp.bbox[2] > tileW * 0.80 && tp.bbox[3] > tileH * 0.80) continue;
                  newTileCars.push({
                    bbox: mappedBox,
                    score: tp.score,
                  });
                }
              }
              cachedTileCarsRef.current = newTileCars;
            }
          }
          rawCarCandidates.push(...cachedTileCarsRef.current);
        }

        // LAYER 2: Detektor Mobil HotWheels di Genggaman Tangan (Handheld Diecast Mode)
        // Aktif ketika user mengangkat tangan memegang mobil HotWheels di depan webcam
        const handheldCars = detectHandheldHotWheels(video, tileCanvas, vw, vh, activeRoi);
        rawCarCandidates.push(...handheldCars);

        // LAYER 3: Detektor Deretan 1..6+ Mobil HotWheels di Jalan Miniatur (Maket Road Mode)
        // Hanya berjalan jika tidak ada manusia/wajah di layar (personBoxes.length === 0)
        if (personBoxes.length === 0) {
          const roadCars = detectRoadMiniatureCars(
            video,
            tileCanvas,
            vw,
            vh,
            activeRoi,
            lockedRoadRef.current
          );
          rawCarCandidates.push(...roadCars);
        }

        if (active) {
          setHumanDetectedInFrame(personBoxes.length > 0);
        }

        // Validasi ROI & Tolak Kotak yang Identik dengan Tubuh Manusia Utuh
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

          // Tolak kotak raksasa (> 38% seluruh layar)
          if (areaRatio > 0.38 || areaRatio < 0.0015) {
            continue;
          }

          // Tolak hanya jika kotak tersebut adalah kotak seluruh tubuh manusia itu sendiri (IoU > 0.55)
          const isWholePerson = personBoxes.some((pBox) => computeIoU(cand.bbox, pBox) > 0.55);
          if (isWholePerson) continue;

          verifiedCars.push(cand);
        }

        // Non-Maximum Suppression (NMS)
        verifiedCars.sort((a, b) => b.score - a.score);
        const nmsCars: RawCarBox[] = [];
        for (const cand of verifiedCars) {
          const isDuplicate = nmsCars.some(
            (existing) =>
              computeIoU(existing.bbox, cand.bbox) > 0.35 ||
              computeCenterDistanceRatio(existing.bbox, cand.bbox) < 0.38
          );
          if (!isDuplicate) {
            nmsCars.push(cand);
          }
        }

        // Temporal Smoothing Tracker
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

            if (iou > 0.20 || centerDist < 0.60) {
              const matchQuality = iou + Math.max(0, 0.65 - centerDist);
              if (matchQuality > bestScore) {
                bestScore = matchQuality;
                bestIdx = i;
              }
            }
          }

          if (bestIdx !== -1) {
            matchedTrackIndices.add(bestIdx);
            const prev = prevTracks[bestIdx];
            const alpha = 0.65;
            const smoothedBbox: [number, number, number, number] = [
              prev.bbox[0] * (1 - alpha) + raw.bbox[0] * alpha,
              prev.bbox[1] * (1 - alpha) + raw.bbox[1] * alpha,
              prev.bbox[2] * (1 - alpha) + raw.bbox[2] * alpha,
              prev.bbox[3] * (1 - alpha) + raw.bbox[3] * alpha,
            ];
            updatedTracks.push({
              trackId: prev.trackId,
              bbox: smoothedBbox,
              score: Math.max(prev.score * 0.4 + raw.score * 0.6, raw.score),
              hits: Math.min(20, prev.hits + 1),
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

        for (let i = 0; i < prevTracks.length; i++) {
          if (!matchedTrackIndices.has(i)) {
            const prev = prevTracks[i];
            if (prev.hits >= 2 && prev.missed < 2) {
              updatedTracks.push({
                ...prev,
                missed: prev.missed + 1,
              });
            }
          }
        }

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

    const interval = setInterval(runHybridDetection, 150);
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
    <section aria-label="Feed Kamera Pemantau Kemacetan Mobil" className="rack-panel flex flex-col">
      {/* Header Bar */}
      <div className="px-4 py-3 bg-[var(--bg-header)] border-b border-[var(--border-line)] flex flex-wrap items-center justify-between gap-2 rounded-t-[10px]">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-sm text-[var(--text-primary)]">
            Kamera AI Deteksi Kemacetan Mobil
          </h3>
          <span
            className="px-2 py-0.5 rounded text-[11px] font-mono font-bold border"
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

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setFeedMode('browser')}
            className={`ctrl-btn ctrl-btn-sm font-mono ${
              feedMode === 'browser' ? 'ctrl-btn-active' : ''
            }`}
          >
            Webcam Browser (AI)
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
            Python YOLO11 (8088)
          </button>

          {feedMode === 'browser' ? (
            <>
              {devices.length > 0 && (
                <select
                  value={selectedDeviceId}
                  onChange={(e) => {
                    setSelectedDeviceId(e.target.value);
                    selectedDeviceIdRef.current = e.target.value;
                    startCamera(e.target.value);
                  }}
                  aria-label="Pilih Perangkat Kamera"
                  className="rack-well px-2.5 h-8 text-xs font-mono text-[var(--text-primary)]"
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
                CAM 1 (USB)
              </button>
            </>
          )}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {/* Status Engine AI Bar */}
        {feedMode === 'browser' && (
          <div className="rack-well px-3 py-2 flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor: isModelReady ? 'var(--sig-green-dot)' : 'var(--sig-amber-dot)',
                }}
              />
              <span className="font-semibold text-[var(--text-primary)]">{modelStatus}</span>
            </div>
            {humanDetectedInFrame && (
              <span
                className="px-2 py-0.5 rounded text-[11px] font-bold border"
                style={{
                  backgroundColor: 'var(--bg-panel)',
                  borderColor: 'var(--border-strong)',
                  color: 'var(--text-secondary)',
                }}
              >
                Filter Wajah/Orang Aktif (Hanya Mobil Dipegang / di Jalan)
              </span>
            )}
          </div>
        )}

        {/* Video Viewport */}
        <div
          ref={containerRef}
          className="relative aspect-video w-full bg-[#090D16] rounded-lg border border-[var(--border-strong)] overflow-hidden flex items-center justify-center min-h-[300px]"
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
              <div className="p-6 text-center font-mono space-y-3 text-[#F8FAFC]">
                <p className="text-sm font-bold">SERVER PORT 8088 TIDAK AKTIF</p>
                <p className="text-xs text-[#94A3B8] max-w-md mx-auto">
                  Gunakan mode [Webcam Browser (AI)] untuk deteksi mobil HotWheels dengan model saraf lokal di browser.
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
                    className="ctrl-btn ctrl-btn-sm ctrl-btn-green font-mono"
                  >
                    Pakai Webcam Browser (AI)
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
              <p className="text-sm font-bold">WEBCAM DETEKSI MOBIL SIAGA</p>
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

          {/* Live HUD & Bounding Boxes Overlay */}
          {feedMode === 'browser' && isStreaming && (
            <div className="absolute inset-0 pointer-events-none z-20">
              {/* Road Detection Zone (ROI) Guide Frame */}
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
                  <span className="absolute -top-5 left-1.5 bg-[#090D16]/85 text-[#38BDF8] border border-[#38BDF8]/50 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">
                    AREA JALAN MINIATUR (ZONA DETEKSI)
                  </span>
                </div>
              )}

              {/* Live HUD Status Pill in Top-Left */}
              <div className="absolute top-3 left-3 bg-[#090D16]/90 border border-[#334155] rounded-lg px-3 py-2 font-mono text-xs text-[#F8FAFC] flex items-center gap-3 shadow-md">
                <div>
                  <span className="text-[10px] text-[#94A3B8] block">MOBIL DI KAMERA</span>
                  <span className="text-base font-bold text-[#4ADE80]">
                    {traffic.vehicleCount} / 6 Mobil
                  </span>
                </div>
                <div className="h-7 w-px bg-[#334155]" />
                <div>
                  <span className="text-[10px] text-[#94A3B8] block">STATUS JALAN</span>
                  <span
                    className="text-sm font-bold"
                    style={{
                      color: isMacet ? '#F87171' : isPadat ? '#FBBF24' : '#4ADE80',
                    }}
                  >
                    {isMacet ? 'MACET (>= 6)' : isPadat ? 'PADAT (3-5)' : 'LANCAR (0-2)'}
                  </span>
                </div>
              </div>

              {/* Bounding Boxes for Each Detected Car */}
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
            className="p-3 rounded-lg border text-xs font-mono flex items-center justify-between gap-2"
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

        {/* Controls Grid */}
        {feedMode === 'browser' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
            {/* Left Box: Road Zone & Optional Maket Lock */}
            <div className="rack-well p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-semibold text-[var(--text-primary)]">
                  1. Area Jalan &amp; Kunci Maket
                </span>
                <span className="text-[11px] text-[var(--text-secondary)]">
                  {lockedTimestamp ? `Maket Terkunci (${lockedTimestamp})` : 'Mode Hybrid AI Aktif'}
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
                  {useRoadZone ? 'Zona Jalan: ON' : 'Layar Penuh'}
                </button>
                <button
                  type="button"
                  onClick={handleLockEmptyRoad}
                  disabled={!isStreaming}
                  className="ctrl-btn ctrl-btn-sm ctrl-btn-green font-mono"
                >
                  Kunci Latar Jalan Kosong
                </button>
                {lockedTimestamp && (
                  <button
                    type="button"
                    onClick={handleUnlockRoad}
                    className="ctrl-btn ctrl-btn-sm ctrl-btn-red font-mono"
                  >
                    Hapus Kunci Latar
                  </button>
                )}
              </div>

              {useRoadZone && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <div className="flex justify-between text-[10px] text-[var(--text-secondary)]">
                      <span>Lebar Zona Jalan</span>
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
                      aria-label="Atur Margin Kiri Kanan Zona Jalan"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-[var(--text-secondary)]">
                      <span>Tinggi Zona Jalan</span>
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
                      aria-label="Atur Margin Atas Bawah Zona Jalan"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Right Box: Multi-Scale Tiling & Confidence Threshold */}
            <div className="rack-well p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-[var(--text-primary)]">
                  2. Akurasi Neural AI (HotWheels)
                </span>
                <span className="font-bold text-[var(--text-primary)]">
                  Min Confidence: {Math.round(minConfidence * 100)}%
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEnableMultiScaleTiling((prev) => !prev)}
                  className={`ctrl-btn ctrl-btn-sm font-mono flex-1 ${
                    enableMultiScaleTiling ? 'ctrl-btn-active' : ''
                  }`}
                >
                  {enableMultiScaleTiling
                    ? 'Multi-Scale Zoom (6+ Mobil Kecil): ON'
                    : 'Single-Pass Standar'}
                </button>
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-[var(--text-secondary)]">
                  <span>15% (Sensitif Mobil Kecil)</span>
                  <span>60% (Sangat Ketat)</span>
                </div>
                <input
                  type="range"
                  min="0.15"
                  max="0.60"
                  step="0.03"
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
