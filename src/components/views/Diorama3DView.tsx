'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useSmartCity } from '@/context/SmartCityContext';

type VisualMode = 'auto' | 'day' | 'blueprint' | 'night';
type CameraPresetId = 'overview' | 'front' | 'top' | 'wiring' | 'rear';

interface HotspotMeta {
  id: 'sensor-box' | 'piezo-buzzer' | 'i2c-lcd' | 'traffic-gantry' | 'smart-pju' | 'esp32-wiring';
  label: string;
  tag: string;
  pos: [number, number, number];
  camPos: [number, number, number];
  lookAt: [number, number, number];
  desc: string;
}

const HOTSPOTS: HotspotMeta[] = [
  {
    id: 'sensor-box',
    label: 'Sensor Gas MQ (Pin 39)',
    tag: 'Sensor Polusi Atap',
    pos: [-2.1, 7.1, 3.6],
    camPos: [-6.2, 9.2, 7.5],
    lookAt: [-2.1, 6.4, 3.2],
    desc: 'Kotak sensor gas MQ di sudut atap gedung depan-kiri. Saat nilai ADC >= 1000 atau >= 1500, kepulan asap polusi dan lampu peringatan di 3D langsung aktif mengikuti pembacaan ESP32.',
  },
  {
    id: 'piezo-buzzer',
    label: 'Piezo Buzzer (Pin 4)',
    tag: 'Aktuator Alarm',
    pos: [-2.1, 6.85, -4.2],
    camPos: [-6.5, 9.0, -7.2],
    lookAt: [-2.1, 6.2, -3.6],
    desc: 'Buzzer piezo dua fungsi di atap gedung belakang-kiri. Memancarkan gelombang bunyi merah untuk alarm gas (>= 1500 ADC), hijau/biru untuk fase menyeberang, dan bergantian tiap 2.5 detik jika keduanya aktif.',
  },
  {
    id: 'i2c-lcd',
    label: 'LCD I2C 16x2 (SDA/SCL)',
    tag: 'Layar Status Langsung',
    pos: [-1.85, 5.1, -2.5],
    camPos: [3.8, 6.4, -1.8],
    lookAt: [-1.85, 4.9, -2.5],
    desc: 'Modul LCD I2C 16x2 yang tertanam pada fasad gedung belakang-kiri. Teks dua baris di layar 3D diperbarui langsung mengikuti nilai gas dan status polusi pada perangkat ESP32.',
  },
  {
    id: 'traffic-gantry',
    label: 'Dual Traffic Light & Touch',
    tag: 'Penyeberangan 5-Fase',
    pos: [0.4, 4.35, 5.4],
    camPos: [2.8, 5.4, 10.6],
    lookAt: [0, 2.8, 5.2],
    desc: 'Gantry overhead (TL 1 Kendaraan Pin 32/14/12), tiang vertikal kiri (TL 2 Pejalan Kaki Pin 27/33/23), serta 2 modul Sensor Touch (Pin 17 kanan dan Pin 16 kiri). Figur pejalan kaki ikut melintas saat fase MENYEBRANG.',
  },
  {
    id: 'smart-pju',
    label: 'Smart PJU & LDR (Pin 25/26)',
    tag: 'Penerangan Otomatis',
    pos: [-1.2, 5.5, -0.3],
    camPos: [4.5, 7.2, 3.5],
    lookAt: [-0.8, 4.4, -0.5],
    desc: 'Dua tiang lampu jalan PJU (LED Pin 25 dan 26) yang menyala otomatis saat sensor LDR Pin 36 mendeteksi gelap (> 2000) atau dikendalikan manual dari web.',
  },
  {
    id: 'esp32-wiring',
    label: 'ESP32 & Jalur Kabel',
    tag: 'Pengendali Utama',
    pos: [3.8, 1.2, -0.4],
    camPos: [9.4, 5.6, -1.2],
    lookAt: [3.2, 1.2, -0.4],
    desc: 'Board mikrokontroler ESP32 MicroPython dan breadboard mini di belakang gedung sisi kanan, menghubungkan semua sensor dan aktuator secara real-time dengan dashboard.',
  },
];

const CAMERA_PRESETS: { id: CameraPresetId; label: string; pos: [number, number, number]; look: [number, number, number] }[] = [
  { id: 'overview', label: '3/4 Overview', pos: [11.5, 9.5, 13.5], look: [0, 2.0, 0] },
  { id: 'front', label: 'Zebra & Gantry', pos: [0.2, 5.2, 14.2], look: [0, 2.4, 1.5] },
  { id: 'top', label: 'Peta Atas', pos: [0.01, 18.5, 0.5], look: [0, 0.5, 0] },
  { id: 'wiring', label: 'ESP32 & Kabel', pos: [11.8, 6.2, -0.5], look: [2.8, 1.5, -0.3] },
  { id: 'rear', label: 'Sudut Belakang', pos: [-10.5, 8.8, -12.5], look: [0, 2.2, 0] },
];

// =========================================================================
// PROCEDURAL TEXTURE GENERATORS (CEL-SHADED ARCHITECTURAL ILLUSTRATION)
// =========================================================================
function createToonGradient(steps = 3): THREE.DataTexture {
  const data = new Uint8Array(steps * 4);
  for (let i = 0; i < steps; i++) {
    const val = Math.round(135 + (i / (steps - 1)) * 120);
    data[i * 4] = val;
    data[i * 4 + 1] = val;
    data[i * 4 + 2] = val;
    data[i * 4 + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, steps, 1, THREE.RGBAFormat);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  return texture;
}

function createCharcoalCardboardTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#2b2a29';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 140; i++) {
    const x = Math.random() * 256;
    const w = 3 + Math.random() * 14;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(62, 59, 56, 0.25)' : 'rgba(22, 21, 20, 0.28)';
    ctx.fillRect(x, 0, w, 256);
  }
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createWindowFacadeTexture(hasLcdCutout = false): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 640;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#2b2a29';
  ctx.fillRect(0, 0, 512, 640);
  for (let i = 0; i < 180; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(65, 62, 58, 0.25)' : 'rgba(20, 19, 18, 0.28)';
    ctx.fillRect(Math.random() * 512, 0, 4 + Math.random() * 16, 640);
  }

  const cols = [68, 206, 344];
  const rows = [95, 255, 415];
  const winW = 100;
  const winH = 115;

  rows.forEach((y, rIdx) => {
    cols.forEach((x, cIdx) => {
      if (hasLcdCutout && rIdx === 0 && cIdx === 1) return;
      ctx.fillStyle = '#f2efe9';
      ctx.beginPath();
      ctx.moveTo(x + (Math.random() - 0.5) * 3, y + (Math.random() - 0.5) * 3);
      ctx.lineTo(x + winW + (Math.random() - 0.5) * 3, y + (Math.random() - 0.5) * 3);
      ctx.lineTo(x + winW + (Math.random() - 0.5) * 3, y + winH + (Math.random() - 0.5) * 3);
      ctx.lineTo(x + (Math.random() - 0.5) * 3, y + winH + (Math.random() - 0.5) * 3);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(43, 42, 41, 0.12)';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  });

  return new THREE.CanvasTexture(canvas);
}

function createRoadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1536;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#242426';
  ctx.fillRect(0, 0, 512, 1536);

  for (let i = 0; i < 240; i++) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.fillRect(Math.random() * 512, Math.random() * 1536, 6, 30);
  }

  ctx.fillStyle = '#f3f1ec';
  ctx.fillRect(14, 0, 12, 1536);
  ctx.fillRect(486, 0, 12, 1536);

  for (let y = 240; y < 1296; y += 95) {
    ctx.fillRect(250, y, 12, 48);
  }

  const drawZebra = (startY: number, height: number) => {
    ctx.fillRect(250, startY, 12, height);
    const leftStripes = [45, 98, 151, 202];
    const rightStripes = [278, 331, 384, 437];
    [...leftStripes, ...rightStripes].forEach((sx) => {
      ctx.fillStyle = '#f3f1ec';
      ctx.fillRect(sx, startY, 34, height);
    });
  };

  drawZebra(48, 145);
  drawZebra(1343, 145);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  return tex;
}

function drawLcdCanvas(
  canvas: HTMLCanvasElement,
  line1: string,
  line2: string,
  gasLevel: 'clean' | 'medium' | 'high',
  isNight: boolean
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (gasLevel === 'high') {
    ctx.fillStyle = '#991b1b';
  } else if (gasLevel === 'medium') {
    ctx.fillStyle = '#92400e';
  } else {
    ctx.fillStyle = isNight ? '#0369a1' : '#102a54';
  }
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#090d16';
  ctx.lineWidth = 10;
  ctx.strokeRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = gasLevel === 'high' ? '#fecaca' : gasLevel === 'medium' ? '#fef3c7' : '#e0f2fe';
  ctx.font = 'bold 21px monospace';
  ctx.fillText(line1.trim().slice(0, 16), 20, 42);
  ctx.font = 'bold 18px monospace';
  ctx.fillText(line2.trim().slice(0, 16), 20, 72);
}

export const Diorama3DView: React.FC = () => {
  const {
    gas,
    crossing,
    pju,
    traffic,
    buzzerMode,
    isHardwareConnected,
    isSerialConnected,
    controlPjuManual,
    triggerCrossingDetection,
    resetCrossingToSafe,
    testBuzzerAlarm,
    controlGasManual,
  } = useSmartCity();

  const stageRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const pinElementsRef = useRef<Record<string, HTMLButtonElement | null>>({});

  const [visualMode, setVisualMode] = useState<VisualMode>('auto');
  const [activePreset, setActivePreset] = useState<CameraPresetId>('overview');
  const [showPins, setShowPins] = useState<boolean>(true);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [syncCarsWithCam, setSyncCarsWithCam] = useState<boolean>(false);
  const [selectedHotspotId, setSelectedHotspotId] = useState<HotspotMeta['id'] | null>(null);
  const [isFullMode, setIsFullMode] = useState<boolean>(false);
  const [showFullControls, setShowFullControls] = useState<boolean>(false);

  // Live hardware ref read inside requestAnimationFrame without recreating the WebGL scene
  const liveStateRef = useRef({
    gas,
    crossing,
    pju,
    traffic,
    buzzerMode,
    visualMode,
    showPins,
    autoRotate,
    syncCarsWithCam,
    buzzerTestUntil: 0,
  });

  useEffect(() => {
    liveStateRef.current.gas = gas;
    liveStateRef.current.crossing = crossing;
    liveStateRef.current.pju = pju;
    liveStateRef.current.traffic = traffic;
    liveStateRef.current.buzzerMode = buzzerMode;
    liveStateRef.current.visualMode = visualMode;
    liveStateRef.current.showPins = showPins;
    liveStateRef.current.autoRotate = autoRotate;
    liveStateRef.current.syncCarsWithCam = syncCarsWithCam;
  }, [gas, crossing, pju, traffic, buzzerMode, visualMode, showPins, autoRotate, syncCarsWithCam]);

  // Camera transition controller ref
  const camTransitionRef = useRef({
    active: false,
    targetPos: new THREE.Vector3(11.5, 9.5, 13.5),
    targetLook: new THREE.Vector3(0, 2.0, 0),
  });

  // Reference to controls & visual theme switcher inside Three.js closure
  const controlsRef = useRef<OrbitControls | null>(null);
  const applyThemeRef = useRef<((effectiveTheme: 'day' | 'blueprint' | 'night') => void) | null>(null);
  const lcdUpdaterRef = useRef<(() => void) | null>(null);
  const lastEffectiveThemeRef = useRef<'day' | 'blueprint' | 'night'>('day');

  const flyTo = useCallback((pos: [number, number, number], look: [number, number, number]) => {
    camTransitionRef.current.targetPos.set(pos[0], pos[1], pos[2]);
    camTransitionRef.current.targetLook.set(look[0], look[1], look[2]);
    camTransitionRef.current.active = true;
  }, []);

  const handleSelectPreset = useCallback(
    (preset: CameraPresetId) => {
      setActivePreset(preset);
      const found = CAMERA_PRESETS.find((p) => p.id === preset) || CAMERA_PRESETS[0];
      flyTo(found.pos, found.look);
    },
    [flyTo]
  );

  const handleSelectHotspot = useCallback(
    (spot: HotspotMeta) => {
      setSelectedHotspotId(spot.id);
      flyTo(spot.camPos, spot.lookAt);
    },
    [flyTo]
  );

  const handleBuzzerTestWith3D = useCallback(() => {
    liveStateRef.current.buzzerTestUntil = Date.now() + 1400;
    testBuzzerAlarm();
  }, [testBuzzerAlarm]);

  const enterFullMode = useCallback(() => {
    setIsFullMode(true);
    try {
      const el = stageRef.current;
      if (el && el.requestFullscreen && !document.fullscreenElement) {
        el.requestFullscreen().catch(() => {});
      }
    } catch {
      // Fallback ke CSS fixed full-viewport jika browser (misal iOS Safari) tidak mendukung Fullscreen API
    }
  }, []);

  const exitFullMode = useCallback(() => {
    setIsFullMode(false);
    setShowFullControls(false);
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    } catch {}
  }, []);

  const toggleFullMode = useCallback(() => {
    if (isFullMode) {
      exitFullMode();
    } else {
      enterFullMode();
    }
  }, [isFullMode, enterFullMode, exitFullMode]);

  // Sinkronkan jika user keluar dari browser fullscreen memakai tombol ESC bawaan browser
  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullMode(false);
        setShowFullControls(false);
      }
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Kunci scroll halaman di belakang saat Full Mode aktif
  useEffect(() => {
    if (!isFullMode) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isFullMode]);

  // Sync AutoRotate directly to OrbitControls
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
      controlsRef.current.autoRotateSpeed = 1.6;
    }
  }, [autoRotate]);

  // Sync LCD Canvas Texture whenever gas reading or mode changes
  useEffect(() => {
    if (lcdUpdaterRef.current) {
      lcdUpdaterRef.current();
    }
  }, [gas.gasValue, gas.statusPolusi, gas.lcdBaris1, gas.lcdBaris2, visualMode, pju.pjuStatus, pju.kondisi]);

  // Sync Effective Visual Mode (Auto follows real PJU/LDR dark state!)
  useEffect(() => {
    const isRealDark = pju.kondisi === 'GELAP' || pju.pjuStatus === 'MENYALA';
    const effective: 'day' | 'blueprint' | 'night' =
      visualMode === 'auto' ? (isRealDark ? 'night' : 'day') : visualMode;

    if (applyThemeRef.current && effective !== lastEffectiveThemeRef.current) {
      lastEffectiveThemeRef.current = effective;
      applyThemeRef.current(effective);
    }
  }, [visualMode, pju.kondisi, pju.pjuStatus]);

  // Close hotspot card or exit Full Mode with Escape key (a11y R-26)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedHotspotId) {
          setSelectedHotspotId(null);
        } else if (isFullMode) {
          exitFullMode();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedHotspotId, isFullMode, exitFullMode]);

  // =========================================================================
  // THREE.JS SCENE LIFECYCLE
  // =========================================================================
  useEffect(() => {
    const container = viewportRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 520;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f2eb);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(11.5, 9.5, 13.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.target.set(0, 2.0, 0);
    controls.minDistance = 5;
    controls.maxDistance = 32;
    controls.maxPolarAngle = Math.PI * 0.48;
    controlsRef.current = controls;

    controls.addEventListener('start', () => {
      camTransitionRef.current.active = false;
    });

    // Studio Lighting
    const hemiLight = new THREE.HemisphereLight(0xfffdf8, 0xd6d3cd, 0.92);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfffbeb, 0.78);
    dirLight.position.set(10, 18, 12);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const toonGradient3 = createToonGradient(3);

    // Track per-material originals cleanly (fixes multi-material restoration on Blueprint toggle!)
    interface RegisteredMaterialEntry {
      material: THREE.MeshToonMaterial;
      origColor: THREE.Color;
      origMap: THREE.Texture | null;
    }
    const registeredMaterials: RegisteredMaterialEntry[] = [];
    const registeredOutlines: (THREE.LineSegments | THREE.Mesh)[] = [];
    const disposableTextures: THREE.Texture[] = [toonGradient3];

    const createToonMaterial = (colorHex: number, options: THREE.MeshToonMaterialParameters = {}) => {
      const mat = new THREE.MeshToonMaterial({
        color: colorHex,
        gradientMap: toonGradient3,
        ...options,
      });
      registeredMaterials.push({
        material: mat,
        origColor: mat.color.clone(),
        origMap: mat.map || null,
      });
      return mat;
    };

    const makeInkMesh = (
      geometry: THREE.BufferGeometry,
      material: THREE.Material | THREE.Material[],
      edgeThreshold: number | null = 25,
      addHullOutline = false,
      hullThickness = 0.03
    ) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      if (edgeThreshold !== null) {
        const edges = new THREE.EdgesGeometry(geometry, edgeThreshold);
        const lineMat = new THREE.LineBasicMaterial({ color: 0x181615 });
        const lineSegments = new THREE.LineSegments(edges, lineMat);
        mesh.add(lineSegments);
        registeredOutlines.push(lineSegments);
      }

      if (addHullOutline) {
        const hullMat = new THREE.MeshBasicMaterial({
          color: 0x181615,
          side: THREE.BackSide,
        });
        const hullMesh = new THREE.Mesh(geometry, hullMat);
        hullMesh.scale.set(1 + hullThickness, 1 + hullThickness, 1 + hullThickness);
        mesh.add(hullMesh);
        registeredOutlines.push(hullMesh);
      }

      return mesh;
    };

    // Animated IoT Scene Handles
    const dioramaGroup = new THREE.Group();
    scene.add(dioramaGroup);

    const charcoalTex = createCharcoalCardboardTexture();
    const frontLeftFacadeTex = createWindowFacadeTexture(false);
    const backLeftFacadeTex = createWindowFacadeTexture(true);
    const roadTex = createRoadTexture();
    disposableTextures.push(charcoalTex, frontLeftFacadeTex, backLeftFacadeTex, roadTex);

    // -----------------------------------------------------------------------
    // A. BASE BOARD & CENTRAL TWO-LANE ROAD
    // -----------------------------------------------------------------------
    const baseBoard = makeInkMesh(new THREE.BoxGeometry(10.6, 0.24, 13.8), createToonMaterial(0x828482), 20);
    baseBoard.position.set(0, -0.12, 0);
    dioramaGroup.add(baseBoard);

    const roadMesh = makeInkMesh(
      new THREE.BoxGeometry(4.1, 0.04, 13.8),
      createToonMaterial(0xffffff, { map: roadTex }),
      30
    );
    roadMesh.position.set(0, 0.02, 0);
    dioramaGroup.add(roadMesh);

    // -----------------------------------------------------------------------
    // B. FOUR DARK CHARCOAL BUILDINGS + MQ SENSOR + I2C LCD + PIEZO BUZZER
    // -----------------------------------------------------------------------
    const darkWallMat = createToonMaterial(0xffffff, { map: charcoalTex });

    // 1. FRONT-LEFT BUILDING
    const flH = 6.2;
    const flMats = [
      createToonMaterial(0xffffff, { map: frontLeftFacadeTex }),
      darkWallMat,
      darkWallMat,
      darkWallMat,
      darkWallMat,
      darkWallMat,
    ];
    const flBuilding = makeInkMesh(new THREE.BoxGeometry(2.9, flH, 4.4), flMats, 20);
    flBuilding.position.set(-3.65, flH / 2, 2.75);
    dioramaGroup.add(flBuilding);

    // Sensor Gas MQ Box on Front-Left Roof
    const sensorBoxGroup = new THREE.Group();
    sensorBoxGroup.position.set(-2.55, flH, 4.45);
    dioramaGroup.add(sensorBoxGroup);

    const sBoxMesh = makeInkMesh(new THREE.BoxGeometry(0.95, 0.55, 1.05), createToonMaterial(0xdcb482), 20);
    sBoxMesh.position.y = 0.275;
    sensorBoxGroup.add(sBoxMesh);

    const cylSensor = makeInkMesh(new THREE.CylinderGeometry(0.24, 0.24, 0.42, 16), createToonMaterial(0x9ca3af), 25);
    cylSensor.position.set(0, 0.48, 0);
    sensorBoxGroup.add(cylSensor);

    // MQ Status Beacon LED + Animated Pollution Smoke Puffs
    const mqBeaconMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const mqBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), mqBeaconMat);
    mqBeacon.position.set(0.32, 0.58, 0.32);
    sensorBoxGroup.add(mqBeacon);

    const mqLight = new THREE.PointLight(0xef4444, 0, 5.0);
    mqLight.position.set(0, 0.9, 0);
    sensorBoxGroup.add(mqLight);

    const smokePuffs: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; offset: number; xDrift: number; zDrift: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const puffMat = new THREE.MeshBasicMaterial({
        color: 0xf87171,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.22 + (i % 3) * 0.06, 10, 10), puffMat);
      puff.position.set(0, 0.7, 0);
      sensorBoxGroup.add(puff);
      smokePuffs.push({
        mesh: puff,
        mat: puffMat,
        offset: i / 6,
        xDrift: (i % 2 === 0 ? 1 : -1) * (0.12 + (i % 3) * 0.06),
        zDrift: (i % 3 === 0 ? 0.14 : -0.1),
      });
    }

    // 2. BACK-LEFT BUILDING + LIVE I2C LCD + PIEZO BUZZER
    const blH = 6.3;
    const blMats = [
      createToonMaterial(0xffffff, { map: backLeftFacadeTex }),
      darkWallMat,
      darkWallMat,
      darkWallMat,
      darkWallMat,
      darkWallMat,
    ];
    const blBuilding = makeInkMesh(new THREE.BoxGeometry(2.9, blH, 4.3), blMats, 20);
    blBuilding.position.set(-3.65, blH / 2, -2.55);
    dioramaGroup.add(blBuilding);

    // Live Dynamic I2C LCD 16x2
    const lcdCanvas = document.createElement('canvas');
    lcdCanvas.width = 256;
    lcdCanvas.height = 96;
    drawLcdCanvas(lcdCanvas, liveStateRef.current.gas.lcdBaris1, liveStateRef.current.gas.lcdBaris2, 'clean', false);
    const lcdTexture = new THREE.CanvasTexture(lcdCanvas);
    disposableTextures.push(lcdTexture);

    const lcdGeo = new THREE.BoxGeometry(0.12, 0.62, 1.15);
    const lcdFaceMat = new THREE.MeshBasicMaterial({ map: lcdTexture });
    const lcdSideMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const lcdMesh = new THREE.Mesh(lcdGeo, [lcdFaceMat, lcdSideMat, lcdSideMat, lcdSideMat, lcdSideMat, lcdSideMat]);
    lcdMesh.position.set(-2.16, 4.95, -2.55);
    lcdMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(lcdGeo), new THREE.LineBasicMaterial({ color: 0x181615 })));
    dioramaGroup.add(lcdMesh);

    const lcdLight = new THREE.PointLight(0x38bdf8, 0.3, 3.2);
    lcdLight.position.set(-1.9, 4.95, -2.55);
    dioramaGroup.add(lcdLight);

    lcdUpdaterRef.current = () => {
      const g = liveStateRef.current.gas;
      const level = g.gasValue >= 1500 ? 'high' : g.gasValue >= 1000 ? 'medium' : 'clean';
      const isNightNow = lastEffectiveThemeRef.current === 'night';
      drawLcdCanvas(lcdCanvas, g.lcdBaris1, g.lcdBaris2, level, isNightNow);
      lcdTexture.needsUpdate = true;
      if (level === 'high') {
        lcdLight.color.setHex(0xef4444);
        lcdLight.intensity = 1.1;
      } else if (level === 'medium') {
        lcdLight.color.setHex(0xf59e0b);
        lcdLight.intensity = 0.7;
      } else {
        lcdLight.color.setHex(0x38bdf8);
        lcdLight.intensity = isNightNow ? 0.9 : 0.25;
      }
    };

    // White Circular Piezo Buzzer on Back-Left Roof
    const buzzerGroup = new THREE.Group();
    buzzerGroup.position.set(-2.55, blH, -4.15);
    dioramaGroup.add(buzzerGroup);

    const buzzerBody = makeInkMesh(new THREE.CylinderGeometry(0.38, 0.38, 0.28, 20), createToonMaterial(0xf4f3ef), 25);
    buzzerBody.position.y = 0.14;
    buzzerGroup.add(buzzerBody);

    const earMesh = makeInkMesh(new THREE.BoxGeometry(1.02, 0.08, 0.24), createToonMaterial(0xf4f3ef), 20);
    earMesh.position.y = 0.06;
    earMesh.rotation.y = 0.4;
    buzzerGroup.add(earMesh);

    const buzzerWaves: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial }[] = [];
    for (let i = 0; i < 3; i++) {
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
      });
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.52, 24), ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.34 + i * 0.22;
      buzzerGroup.add(ring);
      buzzerWaves.push({ mesh: ring, mat: ringMat });
    }

    const buzzerLight = new THREE.PointLight(0xef4444, 0, 4.5);
    buzzerLight.position.set(0, 0.65, 0);
    buzzerGroup.add(buzzerLight);

    // 3. FRONT-RIGHT BUILDING
    const frBuilding = makeInkMesh(new THREE.BoxGeometry(3.0, 6.1, 4.6), darkWallMat, 20);
    frBuilding.position.set(3.65, 3.05, 2.35);
    dioramaGroup.add(frBuilding);

    // 4. BACK-RIGHT BUILDING
    const brBuilding = makeInkMesh(new THREE.BoxGeometry(2.85, 4.9, 3.6), darkWallMat, 20);
    brBuilding.position.set(3.6, 2.45, -2.55);
    dioramaGroup.add(brBuilding);

    // -----------------------------------------------------------------------
    // C. WAVY CARDBOARD BUSHES
    // -----------------------------------------------------------------------
    const createWavyBush = (lengthZ: number, heightBase: number, humps: number, colorHex: number) => {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(0, heightBase * 0.7);
      const step = lengthZ / humps;
      for (let i = 0; i < humps; i++) {
        const x0 = i * step;
        const xMid = x0 + step * 0.5;
        const x1 = x0 + step;
        const peak = heightBase + (i % 2 === 0 ? 0.25 : 0.05);
        shape.quadraticCurveTo(xMid, peak, x1, heightBase * 0.72);
      }
      shape.lineTo(lengthZ, 0);
      shape.closePath();

      const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false });
      geo.rotateY(Math.PI / 2);
      return makeInkMesh(geo, createToonMaterial(colorHex), 25);
    };

    const leftBush = createWavyBush(9.4, 1.15, 11, 0x458b37);
    leftBush.position.set(-2.12, 0.02, 4.9);
    dioramaGroup.add(leftBush);

    const rightGapBush = createWavyBush(1.2, 0.95, 2, 0x7c5a38);
    rightGapBush.position.set(2.15, 0.02, 0.1);
    dioramaGroup.add(rightGapBush);

    // -----------------------------------------------------------------------
    // D. TWO SMART PJU STREETLIGHTS (SYNCED LIVE WITH pju.pjuStatus)
    // -----------------------------------------------------------------------
    const pjuLights: THREE.PointLight[] = [];
    const pjuCones: THREE.MeshBasicMaterial[] = [];
    const pjuBulbs: THREE.MeshBasicMaterial[] = [];

    const createSmartPJU = (isLeftSide: boolean) => {
      const pjuGroup = new THREE.Group();

      const pad = makeInkMesh(new THREE.BoxGeometry(0.45, 0.08, 0.45), createToonMaterial(0xb8b5ad), 20);
      pad.position.y = 0.04;
      pjuGroup.add(pad);

      const poleH = 5.4;
      const vPole = makeInkMesh(new THREE.BoxGeometry(0.18, poleH, 0.22), createToonMaterial(0xc4c7c9), 20);
      vPole.position.y = poleH / 2;
      pjuGroup.add(vPole);

      const armDir = isLeftSide ? 1 : -1;
      const armLen = 1.9;
      const hArm = makeInkMesh(new THREE.BoxGeometry(armLen, 0.16, 0.2), createToonMaterial(0xd1d5db), 20);
      hArm.position.set(armDir * (armLen / 2 - 0.05), poleH - 0.15, 0);
      hArm.rotation.z = armDir * -0.06;
      pjuGroup.add(hArm);

      const headX = armDir * (armLen - 0.15);
      const headY = poleH - 0.34;
      const capHead = makeInkMesh(
        new THREE.CylinderGeometry(0.36, 0.36, 0.28, 18),
        createToonMaterial(0xe5e7eb),
        22
      );
      capHead.position.set(headX, headY, 0);
      pjuGroup.add(capHead);

      const bulbMat = new THREE.MeshBasicMaterial({ color: 0xe5e7eb });
      const bulbDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.04, 16), bulbMat);
      bulbDisc.position.set(headX, headY - 0.15, 0);
      pjuGroup.add(bulbDisc);
      pjuBulbs.push(bulbMat);

      const ptLight = new THREE.PointLight(0xfff3c4, 0, 10, 1.4);
      ptLight.position.set(headX, headY - 0.35, 0);
      pjuGroup.add(ptLight);
      pjuLights.push(ptLight);

      const coneGeo = new THREE.ConeGeometry(2.1, 4.9, 24, 1, true);
      const coneMat = new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const lightCone = new THREE.Mesh(coneGeo, coneMat);
      lightCone.position.set(headX, headY - 2.6, 0);
      pjuGroup.add(lightCone);
      pjuCones.push(coneMat);

      return pjuGroup;
    };

    const leftPju = createSmartPJU(true);
    leftPju.position.set(-2.55, 0.02, -0.2);
    dioramaGroup.add(leftPju);

    const rightPju = createSmartPJU(false);
    rightPju.position.set(2.55, 0.02, -5.35);
    dioramaGroup.add(rightPju);

    // -----------------------------------------------------------------------
    // E. DUAL TRAFFIC LIGHTS (TL 1 KENDARAAN + TL 2 PEJALAN) + DUAL TOUCH SENSORS
    // -----------------------------------------------------------------------
    const createLedBulb = (colorHex: number, pos: THREE.Vector3) => {
      const mat = new THREE.MeshBasicMaterial({ color: colorHex });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.125, 14, 14), mat);
      mesh.position.copy(pos);
      mesh.add(
        new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.SphereGeometry(0.13, 8, 8)),
          new THREE.LineBasicMaterial({ color: 0x181615 })
        )
      );
      return { mesh, mat };
    };

    // 1. FRONT-RIGHT OVERHEAD GANTRY -> TRAFFIC LIGHT 1: KENDARAAN (Pin 32 Merah, 14 Kuning, 12 Hijau)
    const gantryGroup = new THREE.Group();
    gantryGroup.position.set(2.45, 0.02, 5.35);
    dioramaGroup.add(gantryGroup);

    const gPole = makeInkMesh(new THREE.BoxGeometry(0.18, 4.35, 0.18), createToonMaterial(0xc4c7c9), 20);
    gPole.position.y = 2.175;
    gantryGroup.add(gPole);

    const gArm = makeInkMesh(new THREE.BoxGeometry(3.2, 0.22, 0.16), createToonMaterial(0xd1d5db), 20);
    gArm.position.set(-1.52, 4.25, 0);
    gArm.rotation.z = 0.04;
    gantryGroup.add(gArm);

    // Touch Sensor Kanan (Pin 17) on Front-Right Gantry
    const touchRightMat = createToonMaterial(0xdc2626);
    const btnRight = makeInkMesh(new THREE.BoxGeometry(0.18, 0.34, 0.26), touchRightMat, 20);
    btnRight.position.set(-0.14, 1.05, 0);
    gantryGroup.add(btnRight);

    const touchRightRingMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
    });
    const touchRightRing = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.3, 20), touchRightRingMat);
    touchRightRing.rotation.y = Math.PI / 2;
    touchRightRing.position.set(-0.26, 1.05, 0);
    gantryGroup.add(touchRightRing);

    const gantryRed = createLedBulb(0xff2a2a, new THREE.Vector3(-2.95, 4.18, 0.13));
    const gantryYellow = createLedBulb(0xfacc15, new THREE.Vector3(-2.68, 4.19, 0.13));
    const gantryGreen = createLedBulb(0x22c55e, new THREE.Vector3(-2.41, 4.20, 0.13));
    gantryGroup.add(gantryRed.mesh, gantryYellow.mesh, gantryGreen.mesh);

    const gantryLight = new THREE.PointLight(0x22c55e, 0.8, 4.5);
    gantryLight.position.set(-2.68, 4.1, 0.45);
    gantryGroup.add(gantryLight);

    // 2. FRONT-LEFT VERTICAL POST -> TRAFFIC LIGHT 2: PEJALAN KAKI (Pin 27 Merah, 33 Kuning, 23 Hijau)
    const leftPostGroup = new THREE.Group();
    leftPostGroup.position.set(-2.5, 0.02, 5.35);
    dioramaGroup.add(leftPostGroup);

    const lPole = makeInkMesh(new THREE.BoxGeometry(0.16, 2.85, 0.16), createToonMaterial(0x262626), 20);
    lPole.position.y = 1.425;
    leftPostGroup.add(lPole);

    const lHousing = makeInkMesh(new THREE.BoxGeometry(0.24, 0.88, 0.24), createToonMaterial(0x1f2937), 20);
    lHousing.position.set(0.12, 1.85, 0.05);
    leftPostGroup.add(lHousing);

    const postRed = createLedBulb(0xff2a2a, new THREE.Vector3(0.25, 2.12, 0.08));
    const postYellow = createLedBulb(0xfacc15, new THREE.Vector3(0.25, 1.85, 0.08));
    const postGreen = createLedBulb(0x22c55e, new THREE.Vector3(0.25, 1.58, 0.08));
    leftPostGroup.add(postRed.mesh, postYellow.mesh, postGreen.mesh);

    const postLight = new THREE.PointLight(0xff2a2a, 0.7, 3.8);
    postLight.position.set(0.55, 1.85, 0.25);
    leftPostGroup.add(postLight);

    // Touch Sensor Kiri (Pin 16) on Front-Left Post
    const touchLeftMat = createToonMaterial(0xdc2626);
    const btnLeft = makeInkMesh(new THREE.BoxGeometry(0.22, 0.3, 0.2), touchLeftMat, 20);
    btnLeft.position.set(0.12, 0.85, 0.12);
    leftPostGroup.add(btnLeft);

    const touchLeftRingMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
    });
    const touchLeftRing = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.28, 20), touchLeftRingMat);
    touchLeftRing.position.set(0.12, 0.85, 0.25);
    leftPostGroup.add(touchLeftRing);

    // 3. Pedestrian Figurine (Walks smoothly across front zebra crossing when MENYEBRANG!)
    const figGroup = new THREE.Group();
    figGroup.position.set(2.85, 0.02, 6.05);
    dioramaGroup.add(figGroup);

    const dress = makeInkMesh(new THREE.CylinderGeometry(0.14, 0.28, 0.62, 16), createToonMaterial(0x60a5fa), 30, true, 0.04);
    dress.position.y = 0.31;
    figGroup.add(dress);

    const head = makeInkMesh(new THREE.SphereGeometry(0.18, 16, 16), createToonMaterial(0xfde68a), 35, true, 0.04);
    head.position.y = 0.74;
    figGroup.add(head);

    const hair = makeInkMesh(new THREE.SphereGeometry(0.195, 16, 16), createToonMaterial(0xfacc15), 35);
    hair.position.set(-0.02, 0.78, -0.02);
    figGroup.add(hair);

    const hairBun = makeInkMesh(new THREE.SphereGeometry(0.11, 14, 14), createToonMaterial(0xfacc15), 35, true, 0.05);
    hairBun.position.set(0, 0.98, -0.03);
    figGroup.add(hairBun);

    // -----------------------------------------------------------------------
    // F. SIX DIE-CAST HOTWHEELS TOY CARS (WITH HEADLIGHTS & BRAKE LIGHTS)
    // -----------------------------------------------------------------------
    const carMeshes: THREE.Group[] = [];
    const carHeadlightMats: THREE.MeshBasicMaterial[] = [];
    const carBrakelightMats: THREE.MeshBasicMaterial[] = [];

    const createToyCar = ({
      bodyColor,
      stripeColor = null,
      style = 'sports',
    }: {
      bodyColor: number;
      stripeColor?: number | null;
      style?: 'sports' | 'pickup' | 'hotrod';
    }) => {
      const car = new THREE.Group();
      const bodyW = 0.68;
      const bodyH = style === 'pickup' ? 0.28 : 0.22;
      const bodyL = 1.38;

      const chassis = makeInkMesh(
        new THREE.BoxGeometry(bodyW, bodyH, bodyL),
        createToonMaterial(bodyColor),
        20,
        true,
        0.03
      );
      chassis.position.y = 0.18;
      car.add(chassis);

      if (style === 'sports') {
        const cabin = makeInkMesh(new THREE.BoxGeometry(0.54, 0.18, 0.68), createToonMaterial(0x1e293b), 20);
        cabin.position.set(0, 0.34, -0.05);
        car.add(cabin);
      } else if (style === 'pickup') {
        const cab = makeInkMesh(new THREE.BoxGeometry(0.58, 0.24, 0.52), createToonMaterial(bodyColor), 20);
        cab.position.set(0, 0.38, 0.22);
        car.add(cab);
      } else {
        const engine = makeInkMesh(new THREE.BoxGeometry(0.32, 0.22, 0.42), createToonMaterial(0xfbbf24), 20);
        engine.position.set(0, 0.32, 0.32);
        car.add(engine);
      }

      if (stripeColor) {
        const stripe = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.02, bodyL + 0.01),
          new THREE.MeshBasicMaterial({ color: stripeColor })
        );
        stripe.position.set(0, 0.295, 0);
        car.add(stripe);
      }

      // Front Headlights (+Z) & Rear Brake Lights (-Z)
      const hlMat = new THREE.MeshBasicMaterial({ color: 0xfef9c3 });
      const blMat = new THREE.MeshBasicMaterial({ color: 0x450a0a });
      carHeadlightMats.push(hlMat);
      carBrakelightMats.push(blMat);

      [-0.22, 0.22].forEach((lx) => {
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.03), hlMat);
        hl.position.set(lx, 0.19, bodyL / 2 + 0.015);
        car.add(hl);

        const bl = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.07, 0.03), blMat);
        bl.position.set(lx, 0.19, -bodyL / 2 - 0.015);
        car.add(bl);
      });

      const wheelGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.12, 14);
      wheelGeo.rotateZ(Math.PI / 2);
      const wheelMat = createToonMaterial(0x171717);
      [
        [-0.35, 0.13, 0.42],
        [0.35, 0.13, 0.42],
        [-0.35, 0.13, -0.42],
        [0.35, 0.13, -0.42],
      ].forEach(([wx, wy, wz]) => {
        const wheel = makeInkMesh(wheelGeo, wheelMat, 30);
        wheel.position.set(wx, wy, wz);
        car.add(wheel);
      });

      return car;
    };

    const carConfigs: {
      bodyColor: number;
      stripeColor?: number | null;
      style: 'sports' | 'pickup' | 'hotrod';
      pos: [number, number, number];
      rotY: number;
    }[] = [
      { bodyColor: 0x94a3b8, stripeColor: 0x2563eb, style: 'sports', pos: [-0.98, 0.04, 3.15], rotY: 0 },
      { bodyColor: 0x1d4ed8, stripeColor: 0xf8fafc, style: 'sports', pos: [-0.98, 0.04, 0.65], rotY: 0 },
      { bodyColor: 0xdc2626, style: 'sports', pos: [-0.98, 0.04, -2.15], rotY: 0 },
      { bodyColor: 0x1f2937, stripeColor: 0x64748b, style: 'sports', pos: [0.98, 0.04, 2.75], rotY: Math.PI },
      { bodyColor: 0x27272a, style: 'pickup', pos: [0.98, 0.04, -0.15], rotY: Math.PI },
      { bodyColor: 0xb91c1c, stripeColor: 0xfacc15, style: 'hotrod', pos: [0.98, 0.04, -2.85], rotY: Math.PI },
    ];

    carConfigs.forEach((cfg) => {
      const car = createToyCar(cfg);
      car.position.set(...cfg.pos);
      car.rotation.y = cfg.rotY;
      dioramaGroup.add(car);
      carMeshes.push(car);
    });

    // -----------------------------------------------------------------------
    // G. BREADBOARD, ESP32 MICROCONTROLLER & JUMPER WIRE HARNESS
    // -----------------------------------------------------------------------
    const breadboard = makeInkMesh(new THREE.BoxGeometry(0.95, 0.14, 1.85), createToonMaterial(0xf8fafc), 20);
    breadboard.position.set(3.45, 0.09, -0.25);
    dioramaGroup.add(breadboard);

    const esp32 = makeInkMesh(new THREE.BoxGeometry(0.65, 0.16, 1.25), createToonMaterial(0x1e293b), 20);
    esp32.position.set(4.35, 0.12, -0.35);
    dioramaGroup.add(esp32);

    // ESP32 Blue Status LED
    const espLedMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const espLed = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), espLedMat);
    espLed.position.set(4.35, 0.23, 0.05);
    dioramaGroup.add(espLed);

    const createWireRibbon = (points: [number, number, number][], colorHex: number, radius = 0.024) => {
      const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
      const tubeGeo = new THREE.TubeGeometry(curve, 28, radius, 6, false);
      return makeInkMesh(tubeGeo, createToonMaterial(colorHex), null);
    };

    const wireColors = [0xdc2626, 0x2563eb, 0x16a34a, 0xeab308, 0xf97316, 0x171717];
    wireColors.forEach((col, idx) => {
      const offset = idx * 0.048;
      dioramaGroup.add(
        createWireRibbon(
          [
            [2.45, 0.15, 5.35],
            [3.6 + offset, 0.06, 5.15],
            [5.12 - offset * 0.4, 0.06, 4.7],
            [5.15 - offset * 0.4, 0.06, -0.3],
            [5.12 - offset * 0.4, 0.06, -4.8],
            [4.2, 0.06, -6.55 + offset],
            [-2.5, 0.06, -6.55 + offset],
          ],
          col
        )
      );
    });

    [0xf97316, 0xdc2626, 0x171717].forEach((col, idx) => {
      const zOff = idx * 0.05;
      dioramaGroup.add(
        createWireRibbon(
          [
            [-2.95, 6.45, 4.4 + zOff],
            [-5.12, 6.25, 4.4 + zOff],
            [-5.18, 3.0, 4.3 + zOff],
            [-5.12, 0.1, 4.1 + zOff],
          ],
          col
        )
      );
    });

    [0xdc2626, 0x171717].forEach((col, idx) => {
      const zOff = idx * 0.05;
      dioramaGroup.add(
        createWireRibbon(
          [
            [-2.95, 6.38, -4.15 + zOff],
            [-5.12, 6.28, -4.15 + zOff],
            [-5.18, 3.0, -4.2 + zOff],
            [-5.12, 0.1, -4.4 + zOff],
          ],
          col
        )
      );
    });

    // Soft Architectural Ground Contact Shadow
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d')!;
    const grad = sCtx.createRadialGradient(64, 64, 15, 64, 64, 62);
    grad.addColorStop(0, 'rgba(24, 22, 21, 0.22)');
    grad.addColorStop(1, 'rgba(24, 22, 21, 0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 128, 128);
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    disposableTextures.push(shadowTex);

    const shadowGeo = new THREE.PlaneGeometry(13.5, 16.5);
    shadowGeo.rotateX(-Math.PI / 2);
    const groundShadow = new THREE.Mesh(
      shadowGeo,
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
    );
    groundShadow.position.y = -0.25;
    scene.add(groundShadow);

    // Theme Switcher (Day / Blueprint / Night)
    applyThemeRef.current = (effective: 'day' | 'blueprint' | 'night') => {
      if (effective === 'day') {
        scene.background = new THREE.Color(0xf5f2eb);
        hemiLight.intensity = 0.92;
        dirLight.intensity = 0.78;
        registeredMaterials.forEach((entry) => {
          entry.material.color.copy(entry.origColor);
          entry.material.map = entry.origMap;
          entry.material.needsUpdate = true;
        });
        registeredOutlines.forEach((o) => {
          const m = o.material as THREE.LineBasicMaterial | THREE.MeshBasicMaterial;
          if (m && m.color) m.color.setHex(0x181615);
        });
      } else if (effective === 'blueprint') {
        scene.background = new THREE.Color(0xeff6ff);
        hemiLight.intensity = 1.15;
        dirLight.intensity = 0.25;
        registeredMaterials.forEach((entry) => {
          entry.material.color.setHex(0xf8fafc);
          entry.material.map = null;
          entry.material.needsUpdate = true;
        });
        registeredOutlines.forEach((o) => {
          const m = o.material as THREE.LineBasicMaterial | THREE.MeshBasicMaterial;
          if (m && m.color) m.color.setHex(0x1d4ed8);
        });
      } else {
        scene.background = new THREE.Color(0x0b1120);
        hemiLight.intensity = 0.30;
        dirLight.intensity = 0.24;
        registeredMaterials.forEach((entry) => {
          entry.material.color.copy(entry.origColor);
          entry.material.map = entry.origMap;
          entry.material.needsUpdate = true;
        });
        registeredOutlines.forEach((o) => {
          const m = o.material as THREE.LineBasicMaterial | THREE.MeshBasicMaterial;
          if (m && m.color) m.color.setHex(0x020617);
        });
      }
      if (lcdUpdaterRef.current) lcdUpdaterRef.current();
    };

    // Apply initial theme immediately
    const initDark = liveStateRef.current.pju.kondisi === 'GELAP' || liveStateRef.current.pju.pjuStatus === 'MENYALA';
    const initEffective: 'day' | 'blueprint' | 'night' =
      liveStateRef.current.visualMode === 'auto' ? (initDark ? 'night' : 'day') : liveStateRef.current.visualMode;
    lastEffectiveThemeRef.current = initEffective;
    applyThemeRef.current(initEffective);

    // Responsive ResizeObserver for container (works cleanly inside Next.js layout & mobile!)
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(200, entry.contentRect.width);
        const h = Math.max(260, entry.contentRect.height);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(container);

    // =========================================================================
    // LIVE DIGITAL TWIN ANIMATION LOOP
    // =========================================================================
    const clock = new THREE.Clock();
    const projectedVec = new THREE.Vector3();
    let animFrameId = 0;

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const nowMs = Date.now();
      const st = liveStateRef.current;

      // 1. Smooth Camera Flight
      if (camTransitionRef.current.active) {
        camera.position.lerp(camTransitionRef.current.targetPos, 0.07);
        controls.target.lerp(camTransitionRef.current.targetLook, 0.07);
        if (
          camera.position.distanceTo(camTransitionRef.current.targetPos) < 0.05 &&
          controls.target.distanceTo(camTransitionRef.current.targetLook) < 0.05
        ) {
          camTransitionRef.current.active = false;
        }
      }

      // 2. LIVE SYNC: DUAL TRAFFIC LIGHTS (TL 1 Kendaraan & TL 2 Pejalan Kaki)
      const vLamp = st.crossing.lampuKendaraan; // HIJAU | KUNING | MERAH
      const pLamp = st.crossing.lampuPejalan; // MERAH | KUNING | HIJAU

      gantryRed.mat.color.setHex(vLamp === 'MERAH' ? 0xff2a2a : 0x3b0a0a);
      gantryYellow.mat.color.setHex(vLamp === 'KUNING' ? 0xfacc15 : 0x3d2a06);
      gantryGreen.mat.color.setHex(vLamp === 'HIJAU' ? 0x22c55e : 0x063619);
      gantryLight.color.setHex(vLamp === 'MERAH' ? 0xff2a2a : vLamp === 'KUNING' ? 0xfacc15 : 0x22c55e);
      gantryLight.intensity = lastEffectiveThemeRef.current === 'night' ? 1.5 : 0.45;

      postRed.mat.color.setHex(pLamp === 'MERAH' ? 0xff2a2a : 0x3b0a0a);
      postYellow.mat.color.setHex(pLamp === 'KUNING' ? 0xfacc15 : 0x3d2a06);
      postGreen.mat.color.setHex(pLamp === 'HIJAU' ? 0x22c55e : 0x063619);
      postLight.color.setHex(pLamp === 'MERAH' ? 0xff2a2a : pLamp === 'KUNING' ? 0xfacc15 : 0x22c55e);
      postLight.intensity = lastEffectiveThemeRef.current === 'night' ? 1.3 : 0.4;

      // 3. LIVE SYNC: DUAL TOUCH SENSORS (Pin 17 Kanan & Pin 16 Kiri)
      if (st.crossing.touchKanan) {
        touchRightMat.color.setHex(0xfbbf24);
        const pulse = (elapsed * 3) % 1;
        touchRightRing.scale.set(1 + pulse * 1.4, 1 + pulse * 1.4, 1);
        touchRightRingMat.opacity = (1 - pulse) * 0.9;
      } else {
        touchRightMat.color.setHex(lastEffectiveThemeRef.current === 'blueprint' ? 0xf8fafc : 0xdc2626);
        touchRightRingMat.opacity = 0;
      }

      if (st.crossing.touchKiri) {
        touchLeftMat.color.setHex(0xfbbf24);
        const pulse = (elapsed * 3) % 1;
        touchLeftRing.scale.set(1 + pulse * 1.4, 1 + pulse * 1.4, 1);
        touchLeftRingMat.opacity = (1 - pulse) * 0.9;
      } else {
        touchLeftMat.color.setHex(lastEffectiveThemeRef.current === 'blueprint' ? 0xf8fafc : 0xdc2626);
        touchLeftRingMat.opacity = 0;
      }

      // 4. LIVE SYNC: PEDESTRIAN FIGURINE WALKS ACROSS ZEBRA CROSSING DURING MENYEBRANG
      const targetFigX = st.crossing.lampu === 'MENYEBRANG' ? -2.35 : 2.85;
      figGroup.position.x = THREE.MathUtils.lerp(figGroup.position.x, targetFigX, 0.03);
      const isWalking = Math.abs(figGroup.position.x - targetFigX) > 0.08;
      figGroup.position.y = isWalking ? 0.02 + Math.abs(Math.sin(elapsed * 10)) * 0.09 : 0.02;

      // 5. LIVE SYNC: SMART PJU STREETLIGHTS (Pin 25 & 26)
      const pjuOn = st.pju.pjuStatus === 'MENYALA';
      const targetPjuIntensity = pjuOn ? (lastEffectiveThemeRef.current === 'night' ? 2.6 : 1.1) : 0;
      const targetConeOpacity = pjuOn ? (lastEffectiveThemeRef.current === 'night' ? 0.22 : 0.13) : 0;

      pjuLights.forEach((l) => {
        l.intensity = THREE.MathUtils.lerp(l.intensity, targetPjuIntensity, 0.12);
      });
      pjuCones.forEach((c) => {
        c.opacity = THREE.MathUtils.lerp(c.opacity, targetConeOpacity, 0.12);
      });
      pjuBulbs.forEach((b) => {
        b.color.setHex(pjuOn ? 0xfef08a : 0xd1d5db);
      });

      // 6. LIVE SYNC: PIEZO BUZZER WAVES (Pin 4: Gas Alarm / Crossing / Both / Test)
      const isBuzzerTest = nowMs < st.buzzerTestUntil;
      const effectiveBuzzer = isBuzzerTest ? 'test' : st.buzzerMode;

      if (effectiveBuzzer !== 'none') {
        const isGasPulse =
          effectiveBuzzer === 'gas' ||
          (effectiveBuzzer === 'both' && Math.floor(elapsed / 2.5) % 2 === 0);
        const waveHex = effectiveBuzzer === 'test' ? 0xfacc15 : isGasPulse ? 0xef4444 : 0x38bdf8;
        const speed = isGasPulse ? 2.6 : 1.7;

        buzzerWaves.forEach((w, idx) => {
          const phase = (elapsed * speed + idx / buzzerWaves.length) % 1;
          const sc = 0.75 + phase * 1.9;
          w.mesh.scale.set(sc, sc, 1);
          w.mesh.position.y = 0.34 + phase * 0.9;
          w.mat.color.setHex(waveHex);
          w.mat.opacity = (1 - phase) * 0.85;
        });

        buzzerLight.color.setHex(waveHex);
        buzzerLight.intensity = 1.1 + Math.sin(elapsed * 18) * 0.5;
      } else {
        buzzerWaves.forEach((w) => {
          w.mat.opacity = 0;
        });
        buzzerLight.intensity = 0;
      }

      // 7. LIVE SYNC: SENSOR GAS MQ SMOKE & BEACON (Pin 39)
      const gasVal = st.gas.gasValue;
      const isGasHigh = gasVal >= 1500;
      const isGasMed = gasVal >= 1000 && gasVal < 1500;

      if (isGasHigh) {
        const blink = Math.sin(elapsed * 12) > 0;
        mqBeaconMat.color.setHex(blink ? 0xef4444 : 0x7f1d1d);
        mqLight.color.setHex(0xef4444);
        mqLight.intensity = blink ? 1.8 : 0.4;
      } else if (isGasMed) {
        mqBeaconMat.color.setHex(0xf59e0b);
        mqLight.color.setHex(0xf59e0b);
        mqLight.intensity = 0.65;
      } else {
        mqBeaconMat.color.setHex(0x22c55e);
        mqLight.intensity = 0;
      }

      smokePuffs.forEach((puff) => {
        if (isGasHigh || isGasMed) {
          const pPhase = (elapsed * (isGasHigh ? 0.75 : 0.45) + puff.offset) % 1;
          puff.mesh.position.set(
            puff.xDrift * (1 + pPhase * 2.5),
            0.7 + pPhase * 2.1,
            puff.zDrift * (1 + pPhase * 2.5)
          );
          const s = 0.7 + pPhase * 1.6;
          puff.mesh.scale.set(s, s, s);
          puff.mat.color.setHex(isGasHigh ? 0xef4444 : 0xf59e0b);
          puff.mat.opacity = (1 - pPhase) * (isGasHigh ? 0.55 : 0.30);
        } else {
          puff.mat.opacity = 0;
        }
      });

      // 8. LIVE SYNC: CARS VISIBILITY (CAMERA SYNC) + HEADLIGHTS & BRAKE LIGHTS
      const carsStopped = vLamp === 'MERAH' || vLamp === 'KUNING';
      const headlightsOn = pjuOn || lastEffectiveThemeRef.current === 'night';
      carHeadlightMats.forEach((m) => m.color.setHex(headlightsOn ? 0xfef08a : 0xe2e8f0));
      carBrakelightMats.forEach((m) => m.color.setHex(carsStopped ? 0xff2a2a : 0x450a0a));

      carMeshes.forEach((car, idx) => {
        if (st.syncCarsWithCam) {
          car.visible = idx < Math.min(carMeshes.length, st.traffic.vehicleCount);
        } else {
          car.visible = true;
        }
      });

      // ESP32 heartbeat LED blink
      espLedMat.color.setHex(Math.sin(elapsed * 5) > 0 ? 0x38bdf8 : 0x0c4a6e);

      controls.update();

      // 9. Update Projected 2D Hotspot Pin Coordinates inside Container Bounds
      const cW = container.clientWidth;
      const cH = container.clientHeight;
      if (st.showPins) {
        HOTSPOTS.forEach((spot) => {
          const btn = pinElementsRef.current[spot.id];
          if (!btn) return;
          projectedVec.set(spot.pos[0], spot.pos[1], spot.pos[2]).project(camera);
          if (projectedVec.z > 1) {
            btn.style.opacity = '0';
            btn.style.pointerEvents = 'none';
            return;
          }
          const x = (projectedVec.x * 0.5 + 0.5) * cW;
          const y = (-projectedVec.y * 0.5 + 0.5) * cH;
          if (x < -20 || x > cW + 20 || y < -20 || y > cH + 20) {
            btn.style.opacity = '0';
            btn.style.pointerEvents = 'none';
            return;
          }
          btn.style.opacity = '1';
          btn.style.pointerEvents = 'auto';
          btn.style.left = `${x}px`;
          btn.style.top = `${y}px`;
        });
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animFrameId);
      resizeObserver.disconnect();
      controls.dispose();
      disposableTextures.forEach((t) => t.dispose());
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      controlsRef.current = null;
      applyThemeRef.current = null;
      lcdUpdaterRef.current = null;
    };
  }, []);

  const selectedHotspot = HOTSPOTS.find((h) => h.id === selectedHotspotId) || null;
  const isPjuOn = pju.pjuStatus === 'MENYALA';
  const isGasHigh = gas.gasValue >= 1500;
  const isGasMed = gas.gasValue >= 1000 && gas.gasValue < 1500;

  return (
    <div className="space-y-4">
      {/* Top Bar: 3D Controls & Live Visual Mode Switcher */}
      <section aria-label="Pengaturan Tampilan 3D Miniatur" className="rack-panel p-3 sm:px-4 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="font-semibold text-sm text-[var(--text-primary)]">
            3D Digital Twin Miniatur
          </h2>
          <span
            className="px-2 py-0.5 rounded text-[11px] font-mono font-bold border"
            style={{
              backgroundColor:
                isHardwareConnected || isSerialConnected ? 'var(--sig-green-bg)' : 'var(--accent-bg)',
              borderColor:
                isHardwareConnected || isSerialConnected ? 'var(--sig-green-border)' : 'var(--accent-border)',
              color:
                isHardwareConnected || isSerialConnected ? 'var(--sig-green)' : 'var(--accent-text)',
            }}
          >
            {isSerialConnected
              ? 'SINKRON USB LIVE'
              : isHardwareConnected
              ? 'SINKRON BRIDGE LIVE'
              : 'SINKRON SIMULASI'}
          </span>
        </div>

        {/* Visual Mode & Utility Toggles */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="seg-group inline-flex items-center gap-0.5">
            {(
              [
                { id: 'auto', label: 'Auto LDR' },
                { id: 'day', label: 'Siang' },
                { id: 'blueprint', label: 'Blueprint' },
                { id: 'night', label: 'Malam IoT' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setVisualMode(m.id)}
                className={`h-8 px-2.5 rounded-[6px] text-xs font-mono font-semibold transition-colors cursor-pointer ${
                  visualMode === m.id
                    ? 'bg-[var(--bg-panel)] text-[var(--text-primary)] border border-[var(--border-strong)] shadow-2xs'
                    : 'bg-transparent text-[var(--text-secondary)] border border-transparent hover:text-[var(--text-primary)]'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowPins((p) => !p)}
            className={`ctrl-btn ctrl-btn-sm font-mono ${showPins ? 'ctrl-btn-amber' : ''}`}
          >
            Pin: {showPins ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            onClick={() => setAutoRotate((r) => !r)}
            className={`ctrl-btn ctrl-btn-sm font-mono ${autoRotate ? 'ctrl-btn-green' : ''}`}
          >
            Putar 360: {autoRotate ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            onClick={() => setSyncCarsWithCam((s) => !s)}
            className={`ctrl-btn ctrl-btn-sm font-mono ${syncCarsWithCam ? 'ctrl-btn-active' : ''}`}
            title="Sesuaikan jumlah mobil di jalan 3D dengan jumlah mobil yang terdeteksi kamera AI"
          >
            Mobil Kamera: {syncCarsWithCam ? `${traffic.vehicleCount}` : '6 Model'}
          </button>

          <button
            type="button"
            onClick={toggleFullMode}
            className="ctrl-btn ctrl-btn-sm ctrl-btn-active font-mono"
            title="Tampilkan 3D Miniatur layar penuh"
          >
            Full Mode
          </button>
        </div>
      </section>

      {/* Main 3D WebGL Interactive Stage (Normal Card OR Full Mode Edge-to-Edge) */}
      <section
        ref={stageRef}
        aria-label="Kanvas Interaktif 3D Smart City"
        className={
          isFullMode
            ? 'fixed inset-0 z-50 w-screen h-dvh bg-[var(--bg-canvas)] overflow-hidden'
            : 'rack-panel overflow-hidden relative'
        }
      >
        <div
          className={
            isFullMode
              ? 'relative w-full h-full select-none overflow-hidden'
              : 'relative w-full h-[58dvh] min-h-[380px] max-h-[680px] select-none overflow-hidden'
          }
        >
          {/* WebGL Mount Target */}
          <div ref={viewportRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

          {/* Projected 2D Hotspot Pin Overlay */}
          {showPins && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
              {HOTSPOTS.map((spot, idx) => {
                const isSelected = selectedHotspotId === spot.id;
                return (
                  <button
                    key={spot.id}
                    ref={(el) => {
                      pinElementsRef.current[spot.id] = el;
                    }}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectHotspot(spot);
                    }}
                    style={{
                      position: 'absolute',
                      transform: 'translate(-50%, -50%)',
                      opacity: 0,
                    }}
                    className="group pointer-events-auto flex items-center gap-1.5 cursor-pointer bg-transparent border-0 p-1 focus-visible:outline-2"
                    aria-label={`Inspeksi ${spot.label}`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full border-[1.5px] border-[#1c1917] text-[#1c1917] text-[11px] font-mono font-bold flex items-center justify-center shadow transition-transform group-hover:scale-110 ${
                        isSelected ? 'bg-[#38bdf8]' : 'bg-[#fcd34d]'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-[#faf8f3]/95 border border-[#1c1917] text-[#1c1917] text-[11px] font-semibold shadow-sm whitespace-nowrap">
                      {spot.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Top Bar Inside Viewport: Live Status HUD + Full Mode Floating Toolbar */}
          <div className="absolute top-2.5 left-2.5 right-2.5 z-15 pointer-events-none flex flex-wrap items-start justify-between gap-2">
            {/* Top-Left Live Hardware Status HUD */}
            <div className="flex flex-wrap gap-1.5 max-w-full sm:max-w-[60%]">
              <span className="px-2 py-1 rounded-md bg-[#0f172a]/85 text-[#f8fafc] font-mono text-[10px] sm:text-[11px] font-semibold border border-white/15 backdrop-blur-xs">
                TL1: {crossing.lampuKendaraan} | TL2: {crossing.lampuPejalan}
                {crossing.countdownSeconds > 0 ? ` (${crossing.countdownSeconds}s)` : ''}
              </span>
              <span className="px-2 py-1 rounded-md bg-[#0f172a]/85 text-[#f8fafc] font-mono text-[10px] sm:text-[11px] font-semibold border border-white/15 backdrop-blur-xs">
                PJU: {pju.pjuStatus} (LDR {pju.ldrValue})
              </span>
              <span
                className="px-2 py-1 rounded-md font-mono text-[10px] sm:text-[11px] font-semibold border backdrop-blur-xs"
                style={{
                  backgroundColor: isGasHigh ? 'rgba(153,27,27,0.92)' : 'rgba(15,23,42,0.85)',
                  borderColor: isGasHigh ? '#fca5a5' : 'rgba(255,255,255,0.15)',
                  color: '#f8fafc',
                }}
              >
                MQ: {gas.gasValue} ({gas.statusPolusi})
              </span>
              {buzzerMode !== 'none' && (
                <span className="px-2 py-1 rounded-md bg-[#b91c1c]/95 text-white font-mono text-[10px] sm:text-[11px] font-bold border border-[#fca5a5]">
                  BUZZER AKTIF ({buzzerMode.toUpperCase()})
                </span>
              )}
            </div>

            {/* Top-Right Full Mode Controls */}
            <div className="pointer-events-auto flex items-center gap-1.5 flex-wrap justify-end">
              {isFullMode && (
                <>
                  <div className="bg-[var(--bg-panel)]/92 backdrop-blur-md border border-[var(--border-strong)] p-0.5 rounded-lg inline-flex items-center gap-0.5 shadow-sm">
                    {(
                      [
                        { id: 'auto', label: 'Auto' },
                        { id: 'day', label: 'Siang' },
                        { id: 'blueprint', label: 'Ink' },
                        { id: 'night', label: 'Malam' },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setVisualMode(m.id)}
                        className={`h-7 px-2 rounded-[5px] text-[11px] font-mono font-semibold transition-colors cursor-pointer ${
                          visualMode === m.id
                            ? 'bg-[var(--accent-bg)] text-[var(--accent-text)] border border-[var(--accent-border)]'
                            : 'bg-transparent text-[var(--text-secondary)] border border-transparent hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowPins((p) => !p)}
                    className={`ctrl-btn ctrl-btn-sm font-mono ${showPins ? 'ctrl-btn-amber' : ''}`}
                  >
                    Pin
                  </button>

                  <button
                    type="button"
                    onClick={() => setAutoRotate((r) => !r)}
                    className={`ctrl-btn ctrl-btn-sm font-mono ${autoRotate ? 'ctrl-btn-green' : ''}`}
                  >
                    360
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowFullControls((c) => !c)}
                    className={`ctrl-btn ctrl-btn-sm font-mono ${showFullControls ? 'ctrl-btn-active' : ''}`}
                  >
                    Kontrol
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={toggleFullMode}
                className={`ctrl-btn ctrl-btn-sm font-mono shadow-sm ${
                  isFullMode ? 'ctrl-btn-red' : 'ctrl-btn-active'
                }`}
              >
                {isFullMode ? 'Keluar Full' : 'Full Mode'}
              </button>
            </div>
          </div>

          {/* Active Hotspot Inspector Drawer (Top-Right over 3D canvas) */}
          {selectedHotspot && (
            <aside
              aria-label="Detail Modul 3D Terpilih"
              className="absolute right-2.5 left-2.5 sm:left-auto sm:right-3 top-14 sm:top-14 sm:w-80 z-20"
            >
              <div className="bg-[var(--bg-panel)]/95 backdrop-blur-md border-2 border-[var(--text-primary)] rounded-xl p-3.5 shadow-lg space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="rack-tag inline-block mb-1">{selectedHotspot.tag}</span>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] leading-snug">
                      {selectedHotspot.label}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedHotspotId(null)}
                    className="ctrl-btn ctrl-btn-sm font-mono !px-2 shrink-0"
                    aria-label="Tutup panel detail"
                  >
                    Tutup
                  </button>
                </div>

                <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                  {selectedHotspot.desc}
                </p>

                {/* Live Contextual Telemetry & Quick Action inside Selected Hotspot */}
                <div className="rack-well p-2.5 font-mono text-[11px] space-y-1.5">
                  {selectedHotspot.id === 'sensor-box' && (
                    <>
                      <div className="flex justify-between">
                        <span>Nilai ADC Pin 39:</span>
                        <strong>{gas.gasValue} ADC</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Status Polusi:</span>
                        <strong>{gas.statusPolusi}</strong>
                      </div>
                      <div className="grid grid-cols-3 gap-1 pt-1">
                        <button type="button" onClick={() => controlGasManual('BERSIH')} className="ctrl-btn ctrl-btn-sm ctrl-btn-green">
                          650
                        </button>
                        <button type="button" onClick={() => controlGasManual('SEDANG')} className="ctrl-btn ctrl-btn-sm ctrl-btn-amber">
                          1250
                        </button>
                        <button type="button" onClick={() => controlGasManual('BAHAYA')} className="ctrl-btn ctrl-btn-sm ctrl-btn-red">
                          2100
                        </button>
                      </div>
                    </>
                  )}

                  {selectedHotspot.id === 'piezo-buzzer' && (
                    <>
                      <div className="flex justify-between">
                        <span>Pin GPIO:</span>
                        <strong>GPIO 4</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Mode Aktif:</span>
                        <strong>{buzzerMode.toUpperCase()}</strong>
                      </div>
                      <button type="button" onClick={handleBuzzerTestWith3D} className="ctrl-btn ctrl-btn-sm ctrl-btn-amber w-full mt-1">
                        Bunyikan Uji Buzzer
                      </button>
                    </>
                  )}

                  {selectedHotspot.id === 'i2c-lcd' && (
                    <div className="lcd-screen p-2 text-xs">
                      <pre className="m-0 font-bold leading-snug">
                        {gas.lcdBaris1}
                        {'\n'}
                        {gas.lcdBaris2}
                      </pre>
                    </div>
                  )}

                  {selectedHotspot.id === 'traffic-gantry' && (
                    <>
                      <div className="flex justify-between">
                        <span>Fase Aktif:</span>
                        <strong>{crossing.lampu}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Touch 17 / 16:</span>
                        <strong>
                          {crossing.touchKanan ? 'HIGH' : 'LOW'} / {crossing.touchKiri ? 'HIGH' : 'LOW'}
                        </strong>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        <button type="button" onClick={() => triggerCrossingDetection('kanan')} className="ctrl-btn ctrl-btn-sm ctrl-btn-red">
                          Sentuh Touch 17
                        </button>
                        <button type="button" onClick={resetCrossingToSafe} className="ctrl-btn ctrl-btn-sm ctrl-btn-green">
                          Reset Normal
                        </button>
                      </div>
                    </>
                  )}

                  {selectedHotspot.id === 'smart-pju' && (
                    <>
                      <div className="flex justify-between">
                        <span>Sensor LDR (Pin 36):</span>
                        <strong>{pju.ldrValue} ADC</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Status LED 25 &amp; 26:</span>
                        <strong>{pju.pjuStatus} ({pju.pjuMode})</strong>
                      </div>
                      <div className="grid grid-cols-3 gap-1 pt-1">
                        <button type="button" onClick={() => controlPjuManual('ON')} className="ctrl-btn ctrl-btn-sm ctrl-btn-amber">
                          ON
                        </button>
                        <button type="button" onClick={() => controlPjuManual('OFF')} className="ctrl-btn ctrl-btn-sm">
                          OFF
                        </button>
                        <button type="button" onClick={() => controlPjuManual('AUTO')} className="ctrl-btn ctrl-btn-sm ctrl-btn-green">
                          AUTO
                        </button>
                      </div>
                    </>
                  )}

                  {selectedHotspot.id === 'esp32-wiring' && (
                    <>
                      <div className="flex justify-between">
                        <span>Status Koneksi:</span>
                        <strong>{isSerialConnected ? 'USB COM3' : isHardwareConnected ? 'BRIDGE' : 'SIMULASI'}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Mobil di Kamera:</span>
                        <strong>{traffic.vehicleCount} / 6 ({traffic.statusText})</strong>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </aside>
          )}

          {/* Optional Quick Hardware Controls Overlay Inside Full Mode */}
          {isFullMode && showFullControls && (
            <div className="absolute bottom-16 left-2.5 right-2.5 z-20 flex justify-center pointer-events-none">
              <div className="pointer-events-auto bg-[var(--bg-panel)]/95 backdrop-blur-md border border-[var(--border-strong)] rounded-xl p-2.5 shadow-lg flex flex-wrap items-center justify-center gap-2 max-w-4xl">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-mono text-[var(--text-secondary)] mr-0.5">TOUCH:</span>
                  <button type="button" onClick={() => triggerCrossingDetection('kanan')} className="ctrl-btn ctrl-btn-sm font-mono">
                    17
                  </button>
                  <button type="button" onClick={() => triggerCrossingDetection('kiri')} className="ctrl-btn ctrl-btn-sm font-mono">
                    16
                  </button>
                  <button type="button" onClick={resetCrossingToSafe} className="ctrl-btn ctrl-btn-sm ctrl-btn-green font-mono">
                    Normal
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-mono text-[var(--text-secondary)] mr-0.5">PJU:</span>
                  <button type="button" onClick={() => controlPjuManual('ON')} className={`ctrl-btn ctrl-btn-sm font-mono ${pju.pjuMode === 'ON' ? 'ctrl-btn-amber' : ''}`}>
                    ON
                  </button>
                  <button type="button" onClick={() => controlPjuManual('OFF')} className={`ctrl-btn ctrl-btn-sm font-mono ${pju.pjuMode === 'OFF' ? 'ctrl-btn-active' : ''}`}>
                    OFF
                  </button>
                  <button type="button" onClick={() => controlPjuManual('AUTO')} className={`ctrl-btn ctrl-btn-sm font-mono ${pju.pjuMode === 'AUTO' ? 'ctrl-btn-green' : ''}`}>
                    AUTO
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-mono text-[var(--text-secondary)] mr-0.5">MQ:</span>
                  <button type="button" onClick={() => controlGasManual('BERSIH')} className="ctrl-btn ctrl-btn-sm ctrl-btn-green font-mono">
                    650
                  </button>
                  <button type="button" onClick={() => controlGasManual('SEDANG')} className="ctrl-btn ctrl-btn-sm ctrl-btn-amber font-mono">
                    1250
                  </button>
                  <button type="button" onClick={() => controlGasManual('BAHAYA')} className="ctrl-btn ctrl-btn-sm ctrl-btn-red font-mono">
                    2100
                  </button>
                </div>

                <button type="button" onClick={handleBuzzerTestWith3D} className="ctrl-btn ctrl-btn-sm ctrl-btn-amber font-mono">
                  Uji Buzzer
                </button>
              </div>
            </div>
          )}

          {/* Bottom Camera View Presets Bar inside Viewport */}
          <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 flex flex-col items-center gap-1.5 pointer-events-none">
            <div className="bg-[var(--bg-panel)]/92 backdrop-blur-md border border-[var(--border-strong)] p-1 rounded-xl pointer-events-auto flex items-center gap-1 overflow-x-auto max-w-full shadow-sm">
              {CAMERA_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset.id)}
                  className={`ctrl-btn ctrl-btn-sm font-mono whitespace-nowrap ${
                    activePreset === preset.id ? 'ctrl-btn-active' : ''
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-[#0f172a]/80 text-[#f8fafc] text-[10px] font-mono">
              Geser untuk Putar 360° · Scroll/Cubit untuk Zoom · Klik Pin untuk Inspeksi &amp; Uji Langsung
            </span>
          </div>
        </div>
      </section>

      {/* Bottom Live Control Deck: Test Every Physical Hardware Feature While Watching the 3D Miniature */}
      <section aria-label="Panel Uji Langsung Miniatur 3D" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Penyeberangan Touch & Dual Traffic Light */}
        <div className="rack-panel p-3.5 space-y-2.5">
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="font-semibold text-[var(--text-primary)]">Penyeberangan Touch</span>
            <span className="rack-tag">{crossing.lampu}</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => triggerCrossingDetection('kanan')}
              className="ctrl-btn ctrl-btn-sm font-mono"
            >
              Touch 17
            </button>
            <button
              type="button"
              onClick={() => triggerCrossingDetection('kiri')}
              className="ctrl-btn ctrl-btn-sm font-mono"
            >
              Touch 16
            </button>
            <button
              type="button"
              onClick={resetCrossingToSafe}
              className="ctrl-btn ctrl-btn-sm ctrl-btn-green font-mono"
            >
              Normal
            </button>
          </div>
        </div>

        {/* 2. Smart PJU Streetlights */}
        <div className="rack-panel p-3.5 space-y-2.5">
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="font-semibold text-[var(--text-primary)]">Smart PJU (Pin 25/26)</span>
            <span
              className="font-bold"
              style={{ color: isPjuOn ? 'var(--sig-amber)' : 'var(--text-secondary)' }}
            >
              {pju.pjuStatus}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => controlPjuManual('ON')}
              className={`ctrl-btn ctrl-btn-sm font-mono ${pju.pjuMode === 'ON' ? 'ctrl-btn-amber' : ''}`}
            >
              ON
            </button>
            <button
              type="button"
              onClick={() => controlPjuManual('OFF')}
              className={`ctrl-btn ctrl-btn-sm font-mono ${pju.pjuMode === 'OFF' ? 'ctrl-btn-active' : ''}`}
            >
              OFF
            </button>
            <button
              type="button"
              onClick={() => controlPjuManual('AUTO')}
              className={`ctrl-btn ctrl-btn-sm font-mono ${pju.pjuMode === 'AUTO' ? 'ctrl-btn-green' : ''}`}
            >
              AUTO
            </button>
          </div>
        </div>

        {/* 3. Sensor Gas MQ & LCD 16x2 */}
        <div className="rack-panel p-3.5 space-y-2.5">
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="font-semibold text-[var(--text-primary)]">Polusi MQ &amp; LCD</span>
            <span
              className="font-bold"
              style={{
                color: isGasHigh ? 'var(--sig-red)' : isGasMed ? 'var(--sig-amber)' : 'var(--sig-green)',
              }}
            >
              {gas.gasValue} ADC
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            <button
              type="button"
              onClick={() => controlGasManual('AUTO')}
              className={`ctrl-btn ctrl-btn-sm font-mono !px-1.5 ${gas.gasMode === 'AUTO' ? 'ctrl-btn-active' : ''}`}
            >
              AUTO
            </button>
            <button
              type="button"
              onClick={() => controlGasManual('BERSIH')}
              className="ctrl-btn ctrl-btn-sm ctrl-btn-green font-mono !px-1.5"
            >
              650
            </button>
            <button
              type="button"
              onClick={() => controlGasManual('SEDANG')}
              className="ctrl-btn ctrl-btn-sm ctrl-btn-amber font-mono !px-1.5"
            >
              1250
            </button>
            <button
              type="button"
              onClick={() => controlGasManual('BAHAYA')}
              className="ctrl-btn ctrl-btn-sm ctrl-btn-red font-mono !px-1.5"
            >
              2100
            </button>
          </div>
        </div>

        {/* 4. Piezo Buzzer Pin 4 */}
        <div className="rack-panel p-3.5 space-y-2.5">
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="font-semibold text-[var(--text-primary)]">Piezo Buzzer (Pin 4)</span>
            <span
              className="font-bold"
              style={{ color: buzzerMode !== 'none' ? 'var(--sig-red)' : 'var(--text-secondary)' }}
            >
              {buzzerMode === 'none' ? 'OFF' : buzzerMode.toUpperCase()}
            </span>
          </div>
          <button
            type="button"
            onClick={handleBuzzerTestWith3D}
            className="ctrl-btn ctrl-btn-sm ctrl-btn-amber w-full font-mono"
          >
            Uji Buzzer 3D [CMD:BUZZER_TEST]
          </button>
        </div>
      </section>
    </div>
  );
};
