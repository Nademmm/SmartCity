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

interface RawCarBox {
  bbox: [number, number, number, number]; // [x, y, w, h] in video pixel coords
  score: number;
  colorHex: string;
}

interface TrackedCar {
  trackId: number;
  bbox: [number, number, number, number];
  score: number;
  colorHex: string;
  hits: number;
  missed: number;
}

interface RoadCalibration {
  lockedBgR: Float32Array | null;
  lockedBgG: Float32Array | null;
  lockedBgB: Float32Array | null;
  lockedBgLum: Float32Array | null;
  timestamp: string | null;
}

interface RoiBounds {
  left: number;   // 0..1
  top: number;    // 0..1
  right: number;  // 0..1
  bottom: number; // 0..1
}

type SizePreset = 'small' | 'standard' | 'large';

const GRID_COLS = 80;
const GRID_ROWS = 60;
const CANVAS_W = 320;
const CANVAS_H = 240;

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
  // 6 atau lebih mobil = MACET TOTAL
  return {
    density: Math.min(100, 95 + (carCount - 6) * 2),
    statusText: 'MACET TOTAL',
    avgSpeedKmh: Math.max(4, 10 - (carCount - 6)),
    queueLengthMeters: carCount * 6,
  };
}

function isLikelySkinPixel(r: number, g: number, b: number): boolean {
  // Kombinasi aturan RGB dan YCrCb untuk mengenali kulit tangan/jari saat menaruh mobil HotWheels
  if (r <= 75 || g <= 35 || b <= 20) return false;
  if (r <= g || r <= b) return false;
  if (r - Math.min(g, b) <= 15) return false;
  if (Math.abs(r - g) <= 10) return false;

  // Konversi cepat ke Cr dan Cb
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;

  // Tolak merah/oranye menyala khas cat mobil HotWheels (saturasi merah terlalu ekstrim dibanding kulit manusia)
  const sat = Math.max(r, g, b) - Math.min(r, g, b);
  if (sat > 135 && r > 180 && g < 90) return false;

  return cr >= 134 && cr <= 173 && cb >= 78 && cb <= 126;
}

/**
 * Mesin Computer Vision khusus untuk mendeteksi mobil miniatur / HotWheels di jalan maket.
 * Menggunakan estimasi latar jalan spasial (tidak menghilangkan mobil yang diam/berhenti saat macet)
 * ditambah dukungan kalibrasi jalan kosong 1-klik dan pemisah mobil yang berdekatan (bumper-to-bumper).
 */
function detectHotWheelsCars(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  vw: number,
  vh: number,
  roi: RoiBounds,
  sensitivity: number, // 0.20 .. 0.85 (semakin tinggi = semakin sensitif)
  sizePreset: SizePreset,
  calibration: RoadCalibration,
  shouldCaptureCalibration: boolean
): { boxes: RawCarBox[]; calibratedNow: boolean } {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { boxes: [], calibratedNow: false };

  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  ctx.drawImage(video, 0, 0, CANVAS_W, CANVAS_H);

  let imgData: ImageData;
  try {
    imgData = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
  } catch {
    return { boxes: [], calibratedNow: false };
  }

  const data = imgData.data;
  const cellW = CANVAS_W / GRID_COLS; // 4 px
  const cellH = CANVAS_H / GRID_ROWS; // 4 px
  const totalCells = GRID_COLS * GRID_ROWS;

  const cellR = new Float32Array(totalCells);
  const cellG = new Float32Array(totalCells);
  const cellB = new Float32Array(totalCells);
  const cellLum = new Float32Array(totalCells);
  const cellSat = new Float32Array(totalCells);
  const cellSpread = new Float32Array(totalCells);
  const cellSkin = new Uint8Array(totalCells);

  const minC = Math.max(1, Math.floor(roi.left * GRID_COLS));
  const maxC = Math.min(GRID_COLS - 2, Math.ceil(roi.right * GRID_COLS));
  const minR = Math.max(1, Math.floor(roi.top * GRID_ROWS));
  const maxR = Math.min(GRID_ROWS - 2, Math.ceil(roi.bottom * GRID_ROWS));

  // 1. Ekstraksi fitur warna, luminansi, saturasi, dan kontras internal pada tiap sel 4x4
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const idxCell = r * GRID_COLS + c;
      const startX = Math.floor(c * cellW);
      const startY = Math.floor(r * cellH);
      const endX = Math.floor((c + 1) * cellW);
      const endY = Math.floor((r + 1) * cellH);

      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let sumLum = 0;
      let minLum = 255;
      let maxLum = 0;
      let skinPixels = 0;
      let count = 0;

      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const pIdx = (y * CANVAS_W + x) * 4;
          const pr = data[pIdx];
          const pg = data[pIdx + 1];
          const pb = data[pIdx + 2];
          const lum = 0.299 * pr + 0.587 * pg + 0.114 * pb;

          sumR += pr;
          sumG += pg;
          sumB += pb;
          sumLum += lum;
          if (lum < minLum) minLum = lum;
          if (lum > maxLum) maxLum = lum;
          if (isLikelySkinPixel(pr, pg, pb)) {
            skinPixels++;
          }
          count++;
        }
      }

      const inv = count > 0 ? 1 / count : 0;
      const avgR = sumR * inv;
      const avgG = sumG * inv;
      const avgB = sumB * inv;
      const avgLum = sumLum * inv;
      const sat = Math.max(avgR, avgG, avgB) - Math.min(avgR, avgG, avgB);

      cellR[idxCell] = avgR;
      cellG[idxCell] = avgG;
      cellB[idxCell] = avgB;
      cellLum[idxCell] = avgLum;
      cellSat[idxCell] = sat;
      cellSpread[idxCell] = maxLum - minLum;

      if (count > 0 && skinPixels / count > 0.45) {
        cellSkin[idxCell] = 1;
      }
    }
  }

  // Jika user menekan tombol "Kalibrasi Jalan Kosong", simpan referensi latar jalan saat ini
  if (shouldCaptureCalibration) {
    calibration.lockedBgR = new Float32Array(cellR);
    calibration.lockedBgG = new Float32Array(cellG);
    calibration.lockedBgB = new Float32Array(cellB);
    calibration.lockedBgLum = new Float32Array(cellLum);
    calibration.timestamp = new Date().toLocaleTimeString('id-ID', { hour12: false });
    return { boxes: [], calibratedNow: true };
  }

  // 2. Dilasi mask kulit untuk menolak tangan yang masuk ke area jalan saat memindahkan mobil
  const skinComponentMask = new Uint8Array(totalCells);
  // Hanya anggap sebagai tangan jika kumpulan sel kulit cukup besar (>= 16 sel)
  const skinVisited = new Uint8Array(totalCells);
  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      const startIdx = r * GRID_COLS + c;
      if (cellSkin[startIdx] === 1 && skinVisited[startIdx] === 0) {
        const comp: number[] = [];
        const q: number[] = [startIdx];
        skinVisited[startIdx] = 1;
        while (q.length > 0) {
          const curr = q.pop()!;
          comp.push(curr);
          const cr = Math.floor(curr / GRID_COLS);
          const cc = curr % GRID_COLS;
          const neigh = [
            [cr - 1, cc],
            [cr + 1, cc],
            [cr, cc - 1],
            [cr, cc + 1],
          ];
          for (const [nr, nc] of neigh) {
            if (nr >= 0 && nr < GRID_ROWS && nc >= 0 && nc < GRID_COLS) {
              const nIdx = nr * GRID_COLS + nc;
              if (cellSkin[nIdx] === 1 && skinVisited[nIdx] === 0) {
                skinVisited[nIdx] = 1;
                q.push(nIdx);
              }
            }
          }
        }
        // Tangan manusia biasanya berukuran besar (> 24 sel), sedangkan mobil merah/oranye kecil tidak dihapus
        if (comp.length >= 24) {
          for (const idx of comp) {
            skinComponentMask[idx] = 1;
            const cr = Math.floor(idx / GRID_COLS);
            const cc = idx % GRID_COLS;
            for (let dr = -1; dr <= 1; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                const nr = cr + dr;
                const nc = cc + dc;
                if (nr >= 0 && nr < GRID_ROWS && nc >= 0 && nc < GRID_COLS) {
                  skinComponentMask[nr * GRID_COLS + nc] = 1;
                }
              }
            }
          }
        }
      }
    }
  }

  // 3. Estimasi warna dominan permukaan jalan di dalam ROI (Spatial Road Surface Estimation)
  const roadSamplesR: number[] = [];
  const roadSamplesG: number[] = [];
  const roadSamplesB: number[] = [];
  const roadSamplesLum: number[] = [];
  const roadSamplesSat: number[] = [];

  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      const idx = r * GRID_COLS + c;
      if (skinComponentMask[idx] === 1) continue;
      // Permukaan jalan biasanya memiliki saturasi rendah-sedang dan spread internal rendah
      if (cellSpread[idx] < 38 && cellSat[idx] < 45) {
        roadSamplesR.push(cellR[idx]);
        roadSamplesG.push(cellG[idx]);
        roadSamplesB.push(cellB[idx]);
        roadSamplesLum.push(cellLum[idx]);
        roadSamplesSat.push(cellSat[idx]);
      }
    }
  }

  const getMedian = (arr: number[], fallback: number): number => {
    if (arr.length === 0) return fallback;
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.5)];
  };

  const dominantRoadR = getMedian(roadSamplesR, 75);
  const dominantRoadG = getMedian(roadSamplesG, 75);
  const dominantRoadB = getMedian(roadSamplesB, 78);
  const dominantRoadLum = getMedian(roadSamplesLum, 76);
  const dominantRoadSat = getMedian(roadSamplesSat, 14);

  // Skala threshold dari sensitivitas user (sensitivity 0.25 .. 0.85)
  // Semakin tinggi nilai sensitivity, semakin rendah ambang batas deteksi
  const sensFactor = 1.35 - sensitivity; // 1.10 (ketat) .. 0.50 (sensitif)
  const hasLockedBg =
    calibration.lockedBgR !== null &&
    calibration.lockedBgG !== null &&
    calibration.lockedBgB !== null &&
    calibration.lockedBgLum !== null;

  // 4. Pembentukan Mask Objek Mobil pada Grid 80x60
  const fgGrid = new Uint8Array(totalCells);
  const edgeGrid = new Float32Array(totalCells);

  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      const idx = r * GRID_COLS + c;
      if (skinComponentMask[idx] === 1) continue;

      const lum = cellLum[idx];
      const sat = cellSat[idx];
      const spread = cellSpread[idx];

      // Hitung gradien tepi lokal terhadap 4 tetangga
      let localGrad = 0;
      const nCoords = [
        [r - 1, c],
        [r + 1, c],
        [r, c - 1],
        [r, c + 1],
      ];
      for (const [nr, nc] of nCoords) {
        const nIdx = nr * GRID_COLS + nc;
        const dLum = Math.abs(lum - cellLum[nIdx]);
        const dCol =
          Math.abs(cellR[idx] - cellR[nIdx]) +
          Math.abs(cellG[idx] - cellG[nIdx]) +
          Math.abs(cellB[idx] - cellB[nIdx]);
        localGrad += Math.max(dLum, dCol * 0.35);
      }
      localGrad *= 0.25;
      edgeGrid[idx] = localGrad;

      if (hasLockedBg) {
        // Mode Terkalibrasi: Bandingkan langsung dengan foto jalan kosong yang dikunci
        const dR = cellR[idx] - calibration.lockedBgR![idx];
        const dG = cellG[idx] - calibration.lockedBgG![idx];
        const dB = cellB[idx] - calibration.lockedBgB![idx];
        const colorDist = Math.hypot(dR, dG, dB);
        const lumDist = Math.abs(lum - calibration.lockedBgLum![idx]);

        if (
          colorDist > 28 * sensFactor ||
          lumDist > 22 * sensFactor ||
          (colorDist > 18 * sensFactor && (localGrad > 11 * sensFactor || spread > 28 * sensFactor))
        ) {
          fgGrid[idx] = 1;
        }
      } else {
        // Mode Otomatis Spasial: Bandingkan dengan permukaan jalan dominan + struktur 3D mobil
        const dR = cellR[idx] - dominantRoadR;
        const dG = cellG[idx] - dominantRoadG;
        const dB = cellB[idx] - dominantRoadB;
        const roadColorDist = Math.hypot(dR, dG, dB);
        const roadLumDist = Math.abs(lum - dominantRoadLum);
        const satExcess = Math.max(0, sat - dominantRoadSat);

        // Kriteria 1: Mobil berwarna (merah, biru, kuning, hijau, oranye, ungu, dll.)
        const isColoredCarBody = satExcess > 24 * sensFactor && roadColorDist > 26 * sensFactor;

        // Kriteria 2: Mobil kontras terang/gelap (putih, silver, chrome, hitam glossy) dengan tepian 3D
        const isHighContrastCarBody =
          roadLumDist > 34 * sensFactor && (localGrad > 11 * sensFactor || spread > 26 * sensFactor);

        // Kriteria 3: Bagian kaca/roda/atap mobil dengan ketajaman tepi tinggi
        const isDetailedCarPart =
          roadColorDist > 22 * sensFactor && localGrad > 15 * sensFactor && spread > 30 * sensFactor;

        if (isColoredCarBody || isHighContrastCarBody || isDetailedCarPart) {
          fgGrid[idx] = 1;
        }
      }
    }
  }

  // 5. Pembersihan Morfologi Halus: tutup celah 1-sel di dalam bodi mobil (antara kaca dan kap mesin)
  // tanpa menggabungkan mobil yang terpisah
  const closedGrid = new Uint8Array(fgGrid);
  for (let r = minR + 1; r <= maxR - 1; r++) {
    for (let c = minC + 1; c <= maxC - 1; c++) {
      const idx = r * GRID_COLS + c;
      if (fgGrid[idx] === 0) {
        // Hanya isi jika diapit langsung secara horizontal atau vertikal oleh sel aktif
        const horiz = fgGrid[idx - 1] === 1 && fgGrid[idx + 1] === 1;
        const vert = fgGrid[idx - GRID_COLS] === 1 && fgGrid[idx + GRID_COLS] === 1;
        if (horiz || vert) {
          closedGrid[idx] = 1;
        }
      } else {
        // Hapus bintik noise 1-sel yang berdiri sendiri tanpa tetangga
        let nCount = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            if (fgGrid[(r + dr) * GRID_COLS + (c + dc)] === 1) nCount++;
          }
        }
        if (nCount === 0) {
          closedGrid[idx] = 0;
        }
      }
    }
  }

  // Parameter ukuran mobil HotWheels berdasarkan preset jarak kamera
  const minCells = sizePreset === 'small' ? 5 : sizePreset === 'standard' ? 8 : 14;
  const typicalCarCellsSpan = sizePreset === 'small' ? 7 : sizePreset === 'standard' ? 11 : 16;

  // 6. Connected Components Extraction + Pemisahan Mobil Berdempetan (Bumper-to-Bumper Splitter)
  const visited = new Uint8Array(totalCells);
  const rawBoxes: RawCarBox[] = [];

  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      const startIdx = r * GRID_COLS + c;
      if (closedGrid[startIdx] === 1 && visited[startIdx] === 0) {
        let bMinR = r;
        let bMaxR = r;
        let bMinC = c;
        let bMaxC = c;
        const cells: [number, number][] = [];
        const queue: number[] = [startIdx];
        visited[startIdx] = 1;

        while (queue.length > 0) {
          const curr = queue.pop()!;
          const cr = Math.floor(curr / GRID_COLS);
          const cc = curr % GRID_COLS;
          cells.push([cr, cc]);

          if (cr < bMinR) bMinR = cr;
          if (cr > bMaxR) bMaxR = cr;
          if (cc < bMinC) bMinC = cc;
          if (cc > bMaxC) bMaxC = cc;

          const neighbors = [
            [cr - 1, cc],
            [cr + 1, cc],
            [cr, cc - 1],
            [cr, cc + 1],
          ];
          for (const [nr, nc] of neighbors) {
            if (nr >= minR && nr <= maxR && nc >= minC && nc <= maxC) {
              const nIdx = nr * GRID_COLS + nc;
              if (closedGrid[nIdx] === 1 && visited[nIdx] === 0) {
                visited[nIdx] = 1;
                queue.push(nIdx);
              }
            }
          }
        }

        const spanC = bMaxC - bMinC + 1;
        const spanR = bMaxR - bMinR + 1;
        const boxCellsArea = spanC * spanR;
        const fillRatio = cells.length / Math.max(1, boxCellsArea);

        // Abaikan bintik terlalu kecil atau objek raksasa yang memenuhi seluruh layar (> 35% area)
        if (cells.length < minCells || boxCellsArea > totalCells * 0.35) continue;
        if (fillRatio < 0.25) continue;

        const maxSpan = Math.max(spanC, spanR);
        const minSpan = Math.min(spanC, spanR);
        const aspect = maxSpan / Math.max(1, minSpan);

        // Tolak garis marka jalan yang sangat tipis memanjang (seperti garis tepi jalan lurus)
        if (minSpan <= 1 && maxSpan >= 6) continue;
        if (aspect > 6.5) continue;

        // Evaluasi fitur internal blob untuk membedakan mobil HotWheels dari garis marka jalan putih polos
        let sumEdge = 0;
        let sumSat = 0;
        let minBlobLum = 255;
        let maxBlobLum = 0;
        let sumR = 0;
        let sumG = 0;
        let sumB = 0;

        for (const [cr, cc] of cells) {
          const cIdx = cr * GRID_COLS + cc;
          sumEdge += edgeGrid[cIdx];
          sumSat += cellSat[cIdx];
          sumR += cellR[cIdx];
          sumG += cellG[cIdx];
          sumB += cellB[cIdx];
          if (cellLum[cIdx] < minBlobLum) minBlobLum = cellLum[cIdx];
          if (cellLum[cIdx] > maxBlobLum) maxBlobLum = cellLum[cIdx];
        }

        const avgEdge = sumEdge / cells.length;
        const avgSat = sumSat / cells.length;
        const lumDynamicRange = maxBlobLum - minBlobLum;

        // Garis putus-putus putih di jalan: warnanya putih polos (saturasi rendah), tipis (minSpan <= 2),
        // dan tidak punya variasi gelap-terang kaca/roda (lumDynamicRange rendah)
        if (!hasLockedBg && minSpan <= 2 && avgSat < 22 && lumDynamicRange < 38 && avgEdge < 18) {
          continue;
        }

        // Hitung estimasi berapa mobil di dalam blob ini (jika ada 2-3 mobil HotWheels parkir berdempetan saat macet)
        let numCarsInBlob = 1;
        if (maxSpan >= typicalCarCellsSpan * 1.85 && aspect >= 2.1) {
          numCarsInBlob = Math.min(4, Math.max(2, Math.round(maxSpan / typicalCarCellsSpan)));
        } else if (cells.length >= typicalCarCellsSpan * typicalCarCellsSpan * 1.65 && maxSpan >= typicalCarCellsSpan * 1.45) {
          numCarsInBlob = Math.min(3, Math.max(2, Math.round(maxSpan / typicalCarCellsSpan)));
        }

        const confScore = Math.min(
          0.99,
          Math.max(0.76, 0.72 + Math.min(0.15, avgSat / 250) + Math.min(0.12, avgEdge / 180))
        );

        if (numCarsInBlob === 1) {
          const bX = (bMinC / GRID_COLS) * vw;
          const bY = (bMinR / GRID_ROWS) * vh;
          const bW = (spanC / GRID_COLS) * vw;
          const bH = (spanR / GRID_ROWS) * vh;

          rawBoxes.push({
            bbox: [bX, bY, bW, bH],
            score: confScore,
            colorHex: '#22C55E',
          });
        } else {
          // Pisahkan blob panjang menjadi masing-masing mobil HotWheels sepanjang sumbu terpanjangnya
          const isHorizontal = spanC >= spanR;
          for (let k = 0; k < numCarsInBlob; k++) {
            const fracStart = k / numCarsInBlob;
            const fracEnd = (k + 1) / numCarsInBlob;

            let subMinC = bMinC;
            let subMaxC = bMaxC;
            let subMinR = bMinR;
            let subMaxR = bMaxR;

            if (isHorizontal) {
              subMinC = bMinC + Math.floor(fracStart * spanC);
              subMaxC = Math.max(subMinC + 2, bMinC + Math.floor(fracEnd * spanC) - 1);
            } else {
              subMinR = bMinR + Math.floor(fracStart * spanR);
              subMaxR = Math.max(subMinR + 2, bMinR + Math.floor(fracEnd * spanR) - 1);
            }

            const bX = (subMinC / GRID_COLS) * vw;
            const bY = (subMinR / GRID_ROWS) * vh;
            const bW = ((subMaxC - subMinC + 1) / GRID_COLS) * vw;
            const bH = ((subMaxR - subMinR + 1) / GRID_ROWS) * vh;

            rawBoxes.push({
              bbox: [bX, bY, bW, bH],
              score: confScore,
              colorHex: '#22C55E',
            });
          }
        }
      }
    }
  }

  // 7. Non-Maximum Suppression (NMS) agar 1 mobil tidak memiliki 2 kotak yang bertumpuk
  rawBoxes.sort((a, b) => b.score - a.score);
  const deduped: RawCarBox[] = [];
  for (const cand of rawBoxes) {
    const isOverlap = deduped.some((existing) => computeIoU(existing.bbox, cand.bbox) > 0.42);
    if (!isOverlap) {
      deduped.push(cand);
    }
  }

  return { boxes: deduped.slice(0, 20), calibratedNow: false };
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

export const LiveWebcamFeed: React.FC = () => {
  const { traffic, setIsCameraConnected, updateTrafficCameraData } = useSmartCity();

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionLoopRef = useRef<NodeJS.Timeout | null>(null);

  const calibrationRef = useRef<RoadCalibration>({
    lockedBgR: null,
    lockedBgG: null,
    lockedBgB: null,
    lockedBgLum: null,
    timestamp: null,
  });
  const requestCalibrationCaptureRef = useRef<boolean>(false);
  const trackedCarsRef = useRef<TrackedCar[]>([]);
  const nextTrackIdRef = useRef<number>(1);
  const lastTelemetryPostRef = useRef<number>(0);

  const selectedDeviceIdRef = useRef<string>('');
  const isStartingRef = useRef<boolean>(false);

  const [devices, setDevices] = useState<VideoDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pengaturan AI Deteksi HotWheels
  const [sensitivity, setSensitivity] = useState<number>(0.55);
  const [sizePreset, setSizePreset] = useState<SizePreset>('standard');
  const [useRoadZone, setUseRoadZone] = useState<boolean>(true);
  const [roiBounds, setRoiBounds] = useState<RoiBounds>({
    left: 0.08,
    top: 0.14,
    right: 0.92,
    bottom: 0.88,
  });
  const [calibrationTime, setCalibrationTime] = useState<string | null>(null);

  const [detectedCars, setDetectedCars] = useState<DetectedCar[]>([]);
  const [feedMode, setFeedMode] = useState<'browser' | 'yolo11'>('browser');
  const [yoloStreamOnline, setYoloStreamOnline] = useState<boolean>(false);
  const [yoloCameraSource, setYoloCameraSource] = useState<number>(0);
  const [isSwitchingYoloCam, setIsSwitchingYoloCam] = useState<boolean>(false);

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
    if (detectionLoopRef.current) {
      clearInterval(detectionLoopRef.current);
      detectionLoopRef.current = null;
    }
    trackedCarsRef.current = [];
    setIsStreaming(false);
    setIsCameraConnected(false);
    setDetectedCars([]);
  }, [setIsCameraConnected]);

  const handleCalibrateEmptyRoad = () => {
    requestCalibrationCaptureRef.current = true;
    trackedCarsRef.current = [];
  };

  const handleResetCalibration = () => {
    calibrationRef.current = {
      lockedBgR: null,
      lockedBgG: null,
      lockedBgB: null,
      lockedBgLum: null,
      timestamp: null,
    };
    setCalibrationTime(null);
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

  // Siklus Deteksi AI HotWheels Real-Time (Hanya menghitung mobil yang tampil di kamera saat ini)
  useEffect(() => {
    if (!isStreaming || feedMode !== 'browser') return;

    const runDetectionCycle = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2 || video.paused || video.ended) return;

      const vw = video.videoWidth || 640;
      const vh = video.videoHeight || 480;

      const activeRoi: RoiBounds = useRoadZone
        ? roiBounds
        : { left: 0.02, top: 0.04, right: 0.98, bottom: 0.96 };

      const captureNow = requestCalibrationCaptureRef.current;
      requestCalibrationCaptureRef.current = false;

      const { boxes: rawBoxes, calibratedNow } = detectHotWheelsCars(
        video,
        canvas,
        vw,
        vh,
        activeRoi,
        sensitivity,
        sizePreset,
        calibrationRef.current,
        captureNow
      );

      if (calibratedNow && calibrationRef.current.timestamp) {
        setCalibrationTime(calibrationRef.current.timestamp);
      }

      // Temporal Tracker: Menstabilkan kotak deteksi mobil yang sedang ada di jalan
      const prevTracks = trackedCarsRef.current;
      const matchedTrackIndices = new Set<number>();
      const updatedTracks: TrackedCar[] = [];

      for (const raw of rawBoxes) {
        let bestIdx = -1;
        let bestScore = -1;

        for (let i = 0; i < prevTracks.length; i++) {
          if (matchedTrackIndices.has(i)) continue;
          const iou = computeIoU(raw.bbox, prevTracks[i].bbox);
          const centerDist = computeCenterDistanceRatio(raw.bbox, prevTracks[i].bbox);

          if (iou > 0.25 || centerDist < 0.65) {
            const matchQuality = iou + Math.max(0, 0.7 - centerDist);
            if (matchQuality > bestScore) {
              bestScore = matchQuality;
              bestIdx = i;
            }
          }
        }

        if (bestIdx !== -1) {
          matchedTrackIndices.add(bestIdx);
          const prev = prevTracks[bestIdx];
          // Interpolasi halus posisi kotak agar tidak bergetar
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
            score: Math.max(prev.score * 0.4 + raw.score * 0.6, 0.82),
            colorHex: raw.colorHex,
            hits: Math.min(20, prev.hits + 1),
            missed: 0,
          });
        } else {
          updatedTracks.push({
            trackId: nextTrackIdRef.current++,
            bbox: raw.bbox,
            score: raw.score,
            colorHex: raw.colorHex,
            hits: 1,
            missed: 0,
          });
        }
      }

      // Pertahankan mobil selama maks 2 siklus singkat (240ms) jika terkena bayangan sesaat,
      // namun segera hapus begitu mobil diangkat/keluar dari kamera
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

      // Filter mobil yang valid tampil saat ini di kamera
      const confirmedTracks = updatedTracks.filter((t) => t.hits >= 1);

      const container = containerRef.current;
      const cW = container ? container.clientWidth : 16;
      const cH = container ? container.clientHeight : 9;

      const formattedCars: DetectedCar[] = confirmedTracks.map((t, index) => {
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

      setDetectedCars(formattedCars);

      // Hitung jumlah mobil yang tampil di kamera SAAT INI SAJA
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

      // Sinkronkan telemetri kamera ke endpoint /api/iot/telemetry setiap 1.2 detik
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
    };

    const interval = setInterval(runDetectionCycle, 120);
    detectionLoopRef.current = interval;
    return () => clearInterval(interval);
  }, [
    isStreaming,
    feedMode,
    sensitivity,
    sizePreset,
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
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-[var(--text-primary)]">
            Kamera Deteksi Kemacetan Mobil (HotWheels AI)
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
            Webcam Browser
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
            Python Port 8088
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
        {/* Video Viewport */}
        <div
          ref={containerRef}
          className="relative aspect-video w-full bg-[#090D16] rounded-lg border border-[var(--border-strong)] overflow-hidden flex items-center justify-center min-h-[300px]"
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
                <p className="text-sm font-bold">SERVER PORT 8088 TIDAK AKTIF</p>
                <p className="text-xs text-[#94A3B8] max-w-md mx-auto">
                  Gunakan mode [Webcam Browser] untuk deteksi mobil HotWheels langsung dari kamera browser tanpa server tambahan.
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
                    Pakai Webcam Browser
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

        {/* Calibration & Road Zone Controls */}
        {feedMode === 'browser' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
            {/* Left Box: Road Calibration & Zone Width */}
            <div className="rack-well p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-semibold text-[var(--text-primary)]">
                  1. Kalibrasi &amp; Area Jalan
                </span>
                <span className="text-[11px] text-[var(--text-secondary)]">
                  {calibrationTime ? `Terkalibrasi (${calibrationTime})` : 'Mode Auto-Spasial'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCalibrateEmptyRoad}
                  disabled={!isStreaming}
                  className="ctrl-btn ctrl-btn-sm ctrl-btn-green font-mono"
                  title="Klik saat jalan miniatur sedang kosong (0 mobil) untuk akurasi 100%"
                >
                  Kalibrasi Jalan Kosong
                </button>
                {calibrationTime && (
                  <button
                    type="button"
                    onClick={handleResetCalibration}
                    className="ctrl-btn ctrl-btn-sm font-mono"
                  >
                    Reset Kalibrasi
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setUseRoadZone((prev) => !prev)}
                  className={`ctrl-btn ctrl-btn-sm font-mono ${
                    useRoadZone ? 'ctrl-btn-active' : ''
                  }`}
                >
                  {useRoadZone ? 'Zona Jalan: ON' : 'Layar Penuh'}
                </button>
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

            {/* Right Box: HotWheels Size Preset & Sensitivity */}
            <div className="rack-well p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-[var(--text-primary)]">
                  2. Ukuran HotWheels &amp; Sensitivitas
                </span>
                <span className="font-bold text-[var(--text-primary)]">
                  {Math.round(sensitivity * 100)}%
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setSizePreset('small')}
                  className={`ctrl-btn ctrl-btn-sm font-mono ${
                    sizePreset === 'small' ? 'ctrl-btn-active' : ''
                  }`}
                >
                  Kecil / Jauh
                </button>
                <button
                  type="button"
                  onClick={() => setSizePreset('standard')}
                  className={`ctrl-btn ctrl-btn-sm font-mono ${
                    sizePreset === 'standard' ? 'ctrl-btn-active' : ''
                  }`}
                >
                  HotWheels Standar
                </button>
                <button
                  type="button"
                  onClick={() => setSizePreset('large')}
                  className={`ctrl-btn ctrl-btn-sm font-mono ${
                    sizePreset === 'large' ? 'ctrl-btn-active' : ''
                  }`}
                >
                  Besar / Dekat
                </button>
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-[var(--text-secondary)]">
                  <span>Ketat (Hindari Noise)</span>
                  <span>Sensitif (Tangkap Semua Mobil)</span>
                </div>
                <input
                  type="range"
                  min="0.25"
                  max="0.85"
                  step="0.05"
                  value={sensitivity}
                  onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                  className="ctrl-range"
                  aria-label="Sensitivitas Deteksi Mobil HotWheels"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
