import fs from 'fs';
import path from 'path';
import os from 'os';

export interface TelemetryPacket {
  deviceId: string;
  type: string;
  timestamp: string;
  zone?: string;
  nodeId?: string;
  intersectionId?: string;
  crossingId?: string;
  payload: Record<string, any>;
}

export interface CommandPacket {
  id: string;
  targetDeviceId: string;
  action: string;
  value?: any;
  createdAt: string;
  status: 'PENDING' | 'DISPATCHED' | 'ACKNOWLEDGED';
}

interface IoTStoreState {
  latestTelemetry: Record<string, TelemetryPacket>;
  telemetryHistory: TelemetryPacket[];
  commandsQueue: CommandPacket[];
  updatedAt: number;
}

const STORE_FILE_PATH = path.join(os.tmpdir(), 'smartcity_iot_store_v2.json');

declare global {
  var __smartcity_store_v2: IoTStoreState | undefined;
}

function getInitialState(): IoTStoreState {
  return {
    latestTelemetry: {},
    telemetryHistory: [],
    commandsQueue: [],
    updatedAt: Date.now(),
  };
}

export function readIoTStore(): IoTStoreState {
  if (!global.__smartcity_store_v2) {
    global.__smartcity_store_v2 = getInitialState();
  }

  try {
    if (fs.existsSync(STORE_FILE_PATH)) {
      const raw = fs.readFileSync(STORE_FILE_PATH, 'utf-8');
      const diskState = JSON.parse(raw) as IoTStoreState;
      if (diskState && diskState.updatedAt >= (global.__smartcity_store_v2.updatedAt || 0)) {
        global.__smartcity_store_v2 = diskState;
      }
    }
  } catch {
    // Fallback ke in-memory state jika gagal baca /tmp
  }

  // Bersihkan perintah PENDING yang sudah kedaluwarsa (> 30 detik)
  const now = Date.now();
  global.__smartcity_store_v2.commandsQueue = (global.__smartcity_store_v2.commandsQueue || []).filter(
    (cmd) => now - new Date(cmd.createdAt).getTime() < 30000
  );

  return global.__smartcity_store_v2;
}

export function writeIoTStore(state: IoTStoreState): void {
  state.updatedAt = Date.now();
  global.__smartcity_store_v2 = state;
  try {
    fs.writeFileSync(STORE_FILE_PATH, JSON.stringify(state), 'utf-8');
  } catch {
    // Abaikan jika gagal tulis ke /tmp
  }
}

export function enqueueCommand(targetDeviceId: string, action: string, value?: any): CommandPacket {
  const store = readIoTStore();
  const command: CommandPacket = {
    id: `cmd-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    targetDeviceId,
    action,
    value,
    createdAt: new Date().toISOString(),
    status: 'PENDING',
  };

  store.commandsQueue.unshift(command);
  if (store.commandsQueue.length > 50) {
    store.commandsQueue = store.commandsQueue.slice(0, 50);
  }

  // Update optimistic state di server agar browser yang melakukan polling langsung melihat perubahan
  applyOptimisticCommandToTelemetry(store, action, value);

  writeIoTStore(store);
  return command;
}

export function popPendingCommands(deviceId: string): CommandPacket[] {
  const store = readIoTStore();
  const pending = store.commandsQueue.filter(
    (cmd) => cmd.targetDeviceId === deviceId && cmd.status === 'PENDING'
  );

  if (pending.length > 0) {
    pending.forEach((cmd) => {
      cmd.status = 'DISPATCHED';
    });
    writeIoTStore(store);
  }

  return pending;
}

function applyOptimisticCommandToTelemetry(store: IoTStoreState, action: string, value?: any) {
  const nowIso = new Date().toISOString();

  // Optimistic update untuk Gas MQ
  if (action.startsWith('CMD:GAS_')) {
    const existingGas = store.latestTelemetry['air-quality']?.payload || {
      gasValue: 650,
      gasMode: 'AUTO',
      statusPolusi: 'UDARA BERSIH',
    };
    let nextMode = existingGas.gasMode || 'AUTO';
    let nextVal = existingGas.gasValue ?? 650;

    if (action === 'CMD:GAS_AUTO') {
      nextMode = 'AUTO';
    } else if (action === 'CMD:GAS_BERSIH') {
      nextMode = 'MANUAL';
      nextVal = 650;
    } else if (action === 'CMD:GAS_SEDANG') {
      nextMode = 'MANUAL';
      nextVal = 1250;
    } else if (action === 'CMD:GAS_BAHAYA' || action === 'CMD:GAS_TINGGI') {
      nextMode = 'MANUAL';
      nextVal = 2100;
    } else if (action.startsWith('CMD:GAS_SET:')) {
      const parsed = parseInt(action.split(':')[2], 10);
      if (!isNaN(parsed)) {
        nextMode = 'MANUAL';
        nextVal = parsed;
      }
    } else if (typeof value === 'number') {
      nextMode = 'MANUAL';
      nextVal = value;
    }

    const statusPolusi =
      nextVal < 1000 ? 'UDARA BERSIH' : nextVal < 1500 ? 'POLUSI SEDANG' : 'POLUSI TINGGI';

    store.latestTelemetry['air-quality'] = {
      deviceId: 'ESP32-MINIATURE',
      type: 'air-quality',
      timestamp: nowIso,
      payload: {
        ...existingGas,
        gasValue: nextVal,
        gasMode: nextMode,
        statusPolusi,
      },
    };
  }

  // Optimistic update untuk Smart PJU
  if (action.startsWith('CMD:PJU_') || action.startsWith('CMD:LDR_SET:')) {
    const existingPju = store.latestTelemetry['pju']?.payload || {
      ldrValue: 1200,
      kondisi: 'TERANG',
      pjuStatus: 'MATI',
      pjuMode: 'AUTO',
    };
    let pjuMode = existingPju.pjuMode || 'AUTO';
    let ldrValue = existingPju.ldrValue ?? 1200;

    if (action === 'CMD:PJU_ON') {
      pjuMode = 'ON';
    } else if (action === 'CMD:PJU_OFF') {
      pjuMode = 'OFF';
    } else if (action === 'CMD:PJU_AUTO') {
      pjuMode = 'AUTO';
    } else if (action.startsWith('CMD:LDR_SET:')) {
      const parsed = parseInt(action.split(':')[2], 10);
      if (!isNaN(parsed)) {
        ldrValue = parsed;
      }
    }

    const isDark = ldrValue > 2000;
    const kondisi =
      pjuMode === 'ON' ? 'MANUAL_ON' : pjuMode === 'OFF' ? 'MANUAL_OFF' : isDark ? 'GELAP' : 'TERANG';
    const pjuStatus = kondisi === 'MANUAL_ON' || kondisi === 'GELAP' ? 'MENYALA' : 'MATI';
    const ledsOn = pjuStatus === 'MENYALA';

    store.latestTelemetry['pju'] = {
      deviceId: 'ESP32-MINIATURE',
      type: 'pju',
      timestamp: nowIso,
      payload: {
        ...existingPju,
        ldrValue,
        pjuMode,
        kondisi,
        pjuStatus,
        ledMerah: ledsOn,
        ledPutih: ledsOn,
      },
    };
  }

  // Optimistic update untuk Penyeberangan
  if (action === 'CMD:FORCE_CROSSING' || action === 'CMD:CROSSING_TRIGGER') {
    const existingPed = store.latestTelemetry['pedestrian']?.payload || {
      jarakKanan: 35,
      jarakKiri: 42,
      orangKanan: false,
      orangKiri: false,
      lampu: 'HIJAU',
    };
    store.latestTelemetry['pedestrian'] = {
      deviceId: 'ESP32-MINIATURE',
      type: 'pedestrian',
      timestamp: nowIso,
      payload: {
        ...existingPed,
        lampu: 'MERAH',
        buzzer: true,
        siapMenyeberang: false,
      },
    };
  } else if (action === 'CMD:CROSSING_RESET') {
    const existingPed = store.latestTelemetry['pedestrian']?.payload || {};
    store.latestTelemetry['pedestrian'] = {
      deviceId: 'ESP32-MINIATURE',
      type: 'pedestrian',
      timestamp: nowIso,
      payload: {
        ...existingPed,
        jarakKanan: 35,
        jarakKiri: 42,
        orangKanan: false,
        orangKiri: false,
        lampu: 'HIJAU',
        buzzer: false,
        siapMenyeberang: true,
      },
    };
  }
}

