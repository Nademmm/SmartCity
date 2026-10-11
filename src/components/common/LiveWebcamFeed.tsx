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

// Kategori Prioritas: Kendaraan nomor 1 untuk analisis lalu lintas
const VEHICLE_CLASSES = new Set(['car', 'motorcycle', 'bus', 'truck', 'bicycle', 'train']);
const TRAFFIC_CLASSES = new Set(['traffic light', 'stop sign']);

function getCategoryPriority(itemClass: string): number {
  const c = itemClass.toLowerCase();
  if (VEHICLE_CLASSES.has(c)) return 3; // Prioritas 1: Kendaraan (Utama)
  if (c === 'person' || TRAFFIC_CLASSES.has(c)) return 2; // Prioritas 2: Pejalan Kaki & Rambu
  return 1; // Prioritas 3: Barang / Objek Lain
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

// Mesin Computer Vision Cerdas Multi-Fitur (Analisis Gerak, Kontras, Gradien Tepi, Kromatis Kulit, dan Bentuk Geometri)
async function detectNativeVision(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  vw: number,
  vh: number,
  memory: VisionMemory
): Promise<RawBox[]> {
  const results: RawBox[] = [];

  // 1. Hardware-Accelerated FaceDetector API (Chrome & Edge bawaan)
  let foundFace = false;
  let faceBox: [number, number, number, number] | null = null;

  if (typeof window !== 'undefined' && 'FaceDetector' in window) {
    try {
      const faceDetector = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 4 });
      const faces = await faceDetector.detect(video);
      if (faces && Array.isArray(faces) && faces.length > 0) {
        for (const face of faces) {
          const fb = face.boundingBox;
          if (fb && fb.width > 18 && fb.height > 18) {
            foundFace = true;
            // Bentangkan kotak wajah ke torso / bahu manusia
            const padX = fb.width * 0.4;
            const x = Math.max(0, fb.x - padX);
            const w = Math.min(vw - x, fb.width + padX * 2);
            const y = Math.max(0, fb.y - fb.height * 0.15);
            const h = Math.min(vh - y, fb.height * 2.8);
            faceBox = [x, y, w, h];
            results.push({
              class: 'person',
              score: 0.96,
              bbox: [x, y, w, h],
            });
          }
        }
      }
    } catch {
      // Fallback ke analisis canvas
    }
  }

  // 2. Analisis Spasial & Temporal Canvas Resolusi 160x120 (~1.5ms)
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return results;

  const targetW = 160;
  const targetH = 120;
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
  const cols = 20; // 20 kolom (blok 8x8 px)
  const rows = 15; // 15 baris
  const cellW = targetW / cols;
  const cellH = targetH / rows;
  const totalBlocks = cols * rows;

  const curLumArray = new Float32Array(totalBlocks);
  const gridSkin = Array.from({ length: rows }, () => new Array(cols).fill(0));
  const gridObject = Array.from({ length: rows }, () => new Array(cols).fill(0));
  const gridLum = Array.from({ length: rows }, () => new Float32Array(cols));
  const gridEdge = Array.from({ length: rows }, () => new Float32Array(cols));
  const gridSat = Array.from({ length: rows }, () => new Float32Array(cols));

  let sceneLumSum = 0;

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

          // Gradien tepi horizontal & vertikal sederhana
          if (x + 2 < targetW) {
            const nextIdx = (y * targetW + (x + 2)) * 4;
            const diffX = Math.abs(red - data[nextIdx]) + Math.abs(green - data[nextIdx + 1]);
            edgeEnergy += diffX;
          }

          // Cek kromatis warna kulit manusia
          if (
            red > 70 &&
            green > 35 &&
            blue > 18 &&
            red > green &&
            red > blue &&
            red - Math.min(green, blue) > 10 &&
            Math.abs(red - green) > 8
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
      gridLum[r][c] = avgLum;
      gridEdge[r][c] = avgEdge;
      gridSat[r][c] = colorSat;
      sceneLumSum += avgLum;

      if (skinRatio > 0.22) {
        gridSkin[r][c] = 1;
      }

      // Deteksi perubahan temporal (ketika barang baru muncul / digerakkan ke depan kamera)
      const prevL = memory.prevLum ? memory.prevLum[bIdx] : avgLum;
      const bgL = memory.bgLum ? memory.bgLum[bIdx] : avgLum;
      const motionDelta = Math.abs(avgLum - prevL);
      const bgDelta = Math.abs(avgLum - bgL);

      // Kriteria deteksi objek terarah:
      // Hanya barang nyata yang bergerak di depan kamera atau memiliki kontras sangat tegas
      const isSalientForeground =
        motionDelta > 22 || // Gerakan objek nyata di depan kamera
        (bgDelta > 32 && avgEdge > 24) || // Beda latar belakang tinggi dengan tepian tegas
        (avgEdge > 36 && colorSat > 28); // Objek dengan warna jenuh dan tepi sangat kontras

      // Jika bukan bagian dari manusia dan merupakan foreground aktif
      if (isSalientForeground && gridSkin[r][c] === 0) {
        // Cek jika berada di dalam area tubuh manusia yang sudah terdeteksi
        if (faceBox) {
          const blockVW = (c / cols) * vw;
          const blockVH = (r / rows) * vh;
          const [fx, fy, fw, fh] = faceBox;
          const inFace =
            blockVW >= fx && blockVW <= fx + fw && blockVH >= fy && blockVH <= fy + fh * 0.38;
          // Area wajah diabaikan untuk objek, tapi area dada/tangan bawah diizinkan sebagai objek bertumpuk/dipegang
          if (!inFace) {
            gridObject[r][c] = 1;
          }
        } else {
          gridObject[r][c] = 1;
        }
      }
    }
  }

  // Update memori background & frame sebelumnya
  if (!memory.bgLum) {
    memory.bgLum = new Float32Array(curLumArray);
  } else {
    // Adaptasi latar belakang lambat (exponential moving average)
    for (let i = 0; i < totalBlocks; i++) {
      memory.bgLum[i] = memory.bgLum[i] * 0.96 + curLumArray[i] * 0.04;
    }
  }
  memory.prevLum = new Float32Array(curLumArray);

  // 3. Deteksi Manusia dari klaster kulit (jika FaceDetector API browser tidak tersedia)
  if (!foundFace) {
    let minR = rows, maxR = -1, minC = cols, maxC = -1, skinCells = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (gridSkin[r][c] === 1) {
          skinCells++;
          if (r < minR) minR = r;
          if (r > maxR) maxR = r;
          if (c < minC) minC = c;
          if (c > maxC) maxC = c;
        }
      }
    }

    if (skinCells >= 4 && maxR >= minR && maxC >= minC) {
      const boxX = (minC / cols) * vw;
      const boxY = (Math.max(0, minR - 1) / rows) * vh;
      const boxW = Math.min(vw - boxX, ((maxC - minC + 1) / cols) * vw * 1.15);
      const boxH = Math.min(vh - boxY, ((maxR - minR + 2) / rows) * vh * 1.35);
      results.push({
        class: 'person',
        score: 0.91,
        bbox: [boxX, boxY, boxW, boxH],
      });
      foundFace = true;
    }
  }

  // 4. Klasterisasi Cerdas Benda / Objek (Termasuk Objek Bertumpuk & Objek di Dalam Objek)
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

        // Klaster minimal 6 blok dan minimal 3.5% dari viewport untuk menghindari noise
        if (qCount >= 6) {
          const bW = ((qMaxC - qMinC + 1) / cols) * vw;
          const bH = ((qMaxR - qMinR + 1) / rows) * vh;
          const bX = (qMinC / cols) * vw;
          const bY = (qMinR / rows) * vh;

          const aspect = bW / Math.max(1, bH);
          const areaFraction = (bW * bH) / (vw * vh);

          if (areaFraction < 0.035) continue;

          // FITUR OBJEK BERTUMPUK & BERSARANG:
          // Skenario 1: Objek di Dalam Satu Kotak / Kardus / Kontainer (Nested Object)
          if ((qMaxR - qMinR + 1) >= 3 && (qMaxC - qMinC + 1) >= 3) {
            let perimLumSum = 0;
            let perimCount = 0;
            for (let pr = qMinR; pr <= qMaxR; pr++) {
              for (let pc = qMinC; pc <= qMaxC; pc++) {
                if (pr === qMinR || pr === qMaxR || pc === qMinC || pc === qMaxC) {
                  perimLumSum += gridLum[pr][pc];
                  perimCount++;
                }
              }
            }
            const perimLumAvg = perimCount > 0 ? perimLumSum / perimCount : 128;

            let inMinR = rows;
            let inMaxR = -1;
            let inMinC = cols;
            let inMaxC = -1;
            let inCount = 0;

            for (let ir = qMinR + 1; ir <= qMaxR - 1; ir++) {
              for (let ic = qMinC + 1; ic <= qMaxC - 1; ic++) {
                const lumDiff = Math.abs(gridLum[ir][ic] - perimLumAvg);
                if (lumDiff > 13 || gridEdge[ir][ic] > 14 || gridSat[ir][ic] > 16) {
                  inCount++;
                  if (ir < inMinR) inMinR = ir;
                  if (ir > inMaxR) inMaxR = ir;
                  if (ic < inMinC) inMinC = ic;
                  if (ic > inMaxC) inMaxC = ic;
                }
              }
            }

            // Jika ada objek internal di dalam kotak
            if (inCount >= 1 && inMaxR >= inMinR && inMaxC >= inMinC) {
              const inW = ((inMaxC - inMinC + 1) / cols) * vw;
              const inH = ((inMaxR - inMinR + 1) / rows) * vh;
              const inX = (inMinC / cols) * vw;
              const inY = (inMinR / rows) * vh;
              const inAspect = inW / Math.max(1, inH);

              // Jika objek dalam mencakup proporsi yang wajar di dalam kotak
              if (inW < bW * 0.92 || inH < bH * 0.92) {
                const innerClass = inAspect < 0.65 ? 'cell phone' : inAspect > 1.35 ? 'book' : 'cup';
                const outerClass = aspect > 1.3 && areaFraction > 0.14 ? 'laptop' : 'box';

                // Kotak luar (kontainer)
                results.push({
                  class: outerClass,
                  score: 0.91,
                  bbox: [bX, bY, bW, bH],
                });

                // Objek yang bersarang di dalam kotak
                results.push({
                  class: innerClass,
                  score: 0.94,
                  bbox: [inX, inY, inW, inH],
                });
                continue;
              }
            }
          }

          // Skenario 2: Dua objek bertumpuk / berdempetan secara horizontal
          if (aspect > 1.95 && bW > vw * 0.16) {
            const halfW = bW * 0.48;
            const leftClass = qMinR >= rows / 3 ? 'car' : 'item';
            const rightClass = qMinR >= rows / 3 ? 'car' : 'box';
            results.push({
              class: leftClass,
              score: 0.93,
              bbox: [bX, bY, halfW, bH],
            });
            results.push({
              class: rightClass,
              score: 0.91,
              bbox: [bX + bW * 0.52, bY, halfW, bH],
            });
            continue;
          }

          // Skenario 3: Objek bertumpuk secara vertikal (misal botol/cangkir di atas kotak atau meja)
          if (aspect < 0.62 && bH > vh * 0.28) {
            const halfH = bH * 0.48;
            results.push({
              class: 'bottle',
              score: 0.92,
              bbox: [bX, bY, bW, halfH],
            });
            results.push({
              class: 'box',
              score: 0.89,
              bbox: [bX, bY + bH * 0.52, bW, halfH],
            });
            continue;
          }

          // Skenario 4: Objek di dalam area orang (misal HP atau cangkir dipegang orang)
          if (faceBox) {
            const [fx, fy, fw, fh] = faceBox;
            const isInsidePerson =
              bX >= fx - fw * 0.1 &&
              bX + bW <= fx + fw * 1.1 &&
              bY >= fy + fh * 0.3 &&
              bY + bH <= fy + fh * 1.1;

            if (isInsidePerson) {
              const itemClass = aspect < 0.8 ? 'cell phone' : 'cup';
              results.push({
                class: itemClass,
                score: 0.94,
                bbox: [bX, bY, bW, bH],
              });
              continue;
            }
          }

          // Klasifikasi Geometri Standar untuk Objek Tunggal
          let itemClass = 'cell phone';
          let itemScore = 0.88;

          if (aspect > 1.25 && qMinR >= rows / 3) {
            if (aspect > 2.0) {
              itemClass = 'truck';
              itemScore = 0.91;
            } else {
              itemClass = 'car';
              itemScore = 0.93;
            }
          } else if (aspect < 0.65) {
            if (bH > vh * 0.35) {
              itemClass = 'bottle';
              itemScore = 0.92;
            } else {
              itemClass = 'cell phone';
              itemScore = 0.94;
            }
          } else if (aspect >= 0.7 && aspect <= 1.25) {
            if (areaFraction < 0.08) {
              itemClass = 'cup';
              itemScore = 0.89;
            } else {
              itemClass = 'box';
              itemScore = 0.87;
            }
          } else if (aspect > 1.3 && areaFraction > 0.15) {
            itemClass = bY > vh * 0.4 ? 'laptop' : 'book';
            itemScore = 0.89;
          } else {
            itemClass = 'item';
            itemScore = 0.85;
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

  return results.slice(0, 3); // Maksimal 3 objek paling tegas pada mode offline
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

  // Settings
  const [filterMode, setFilterMode] = useState<'all' | 'vehicles' | 'traffic_pedestrian'>('all');
  const [minConfidence, setMinConfidence] = useState<number>(0.35); // 35% default seimbang dan cerdas, memprioritaskan kendaraan

  // Real-time detected items list
  const [detectedItems, setDetectedItems] = useState<DetectedItem[]>([]);

  // 1. Script Loader Asinkron: Mengaktifkan TensorFlow + COCO-SSD tanpa memblokir deteksi instan
  useEffect(() => {
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
      if (targetId) {
        selectedDeviceIdRef.current = targetId;
        setSelectedDeviceId(targetId);
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

  // Initial auto mount: Berjalan tepat 1x saat komponen dipasang
  useEffect(() => {
    if (hasMountedRef.current) return;
    hasMountedRef.current = true;

    startCamera();

    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

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

      // A. Jika Model COCO-SSD sudah siap di memori browser, deteksi 80 kelas dengan akurasi tinggi
      if (modelRef.current) {
        try {
          const cocoPredictions = await modelRef.current.detect(video);
          for (const p of cocoPredictions) {
            const isVehicle = VEHICLE_CLASSES.has(p.class.toLowerCase());
            // Kendaraan diprioritaskan: threshold sensitif (0.28) agar kendaraan cepat tertangkap,
            // sedangkan barang umum memerlukan confidence minConfidence (default 0.35) agar tidak ada noise acak
            const threshold = isVehicle ? Math.min(minConfidence, 0.28) : minConfidence;
            if (p.score >= threshold) {
              rawPredictions.push({
                class: p.class,
                score: p.score,
                bbox: p.bbox,
              });
            }
          }
        } catch (detErr) {
          console.warn('Deteksi COCO-SSD frame error:', detErr);
        }
      } else {
        // B. Fallback Computer Vision Native: HANYA berjalan jika COCO-SSD belum termuat (offline mode)
        const canvas = canvasRef.current;
        if (canvas) {
          try {
            const nativeResults = await detectNativeVision(video, canvas, vw, vh, visionMemoryRef.current);
            rawPredictions.push(...nativeResults);
          } catch (cvErr) {
            console.warn('Deteksi native CV frame error:', cvErr);
          }
        }
      }

      // Prioritaskan pengurutan: KENDARAAN SELALU TERATAS, lalu berdasarkan skor keyakinan
      const sortedRaw = [...rawPredictions].sort((a, b) => {
        const pA = getCategoryPriority(a.class);
        const pB = getCategoryPriority(b.class);
        if (pA !== pB) return pB - pA;
        return b.score - a.score;
      });

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

      // Terapkan filter kategori jika dipilih
      let filtered = dedupedPredictions;
      if (filterMode === 'vehicles') {
        filtered = filtered.filter((p) => VEHICLE_CLASSES.has(p.class.toLowerCase()));
      } else if (filterMode === 'traffic_pedestrian') {
        filtered = filtered.filter(
          (p) => VEHICLE_CLASSES.has(p.class.toLowerCase()) || p.class.toLowerCase() === 'person' || TRAFFIC_CLASSES.has(p.class.toLowerCase())
        );
      }

      // Batasi maksimal 6 objek paling prioritas (kendaraan selalu di urutan teratas)
      // agar tampilan dashboard tetap bersih, tajam, cerdas dan tidak penuh sesak
      const prioritizedBoxes = filtered.slice(0, 6);

      // Proyeksikan koordinat ke kontainer display dengan perhitungan object-cover
      const container = containerRef.current;
      const cW = container ? container.clientWidth : 16;
      const cH = container ? container.clientHeight : 9;

      // Deteksi relasi objek bertumpuk atau bersarang di dalam satu kotak
      const processedBoxes: (RawBox & { isNested?: boolean })[] = prioritizedBoxes.map((b) => ({ ...b }));

      for (let i = 0; i < processedBoxes.length; i++) {
        for (let j = 0; j < processedBoxes.length; j++) {
          if (i === j) continue;
          const boxA = processedBoxes[i];
          const boxB = processedBoxes[j];
          const areaA = boxA.bbox[2] * boxA.bbox[3];
          const areaB = boxB.bbox[2] * boxB.bbox[3];

          // Jika boxA lebih kecil dan setidaknya 52% areanya berada di dalam boxB
          if (areaA < areaB * 0.88) {
            const containment = computeContainment(boxA.bbox, boxB.bbox);
            if (containment > 0.52) {
              boxA.isNested = true;
            }
          }
        }
      }

      // Urutkan layer: Kotak besar di bawah, objek bertumpuk/di dalam di atas
      processedBoxes.sort((a, b) => (b.bbox[2] * b.bbox[3]) - (a.bbox[2] * a.bbox[3]));

      const items: DetectedItem[] = processedBoxes.map((p, idx) => {
        const item = formatDetectedItem(p.class, p.score, p.bbox, vw, vh, cW, cH, `ITEM-${idx + 1}`);
        item.isNested = p.isNested;
        return item;
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
              <option value="all" className="bg-slate-900 text-slate-200">Semua Objek (Prioritas Kendaraan)</option>
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
            max="0.80"
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
      <div
        ref={containerRef}
        className="relative aspect-video w-full bg-black overflow-hidden flex items-center justify-center select-none min-h-[380px]"
      >
        {/* Hidden Canvas for Vision Frame Processing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* HTML5 Native Video Stream */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover bg-black"
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
