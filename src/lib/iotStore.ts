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

const STORE_FILE_PATH = path.join(os.tmpdir(), 'smartcity_iot_store_v3.json');

declare global {
  var __smartcity_store_v3: IoTStoreState | undefined;
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
  if (!global.__smartcity_store_v3) {
    global.__smartcity_store_v3 = getInitialState();
  }

  try {
    if (fs.existsSync(STORE_FILE_PATH)) {
      const raw = fs.readFileSync(STORE_FILE_PATH, 'utf-8');
      const diskState = JSON.parse(raw) as IoTStoreState;
      if (diskState && diskState.updatedAt >= (global.__smartcity_store_v3.updatedAt || 0)) {
        global.__smartcity_store_v3 = diskState;
      }
    }
  } catch {
    // Fallback ke in-memory state jika gagal baca /tmp
  }

  const now = Date.now();
  global.__smartcity_store_v3.commandsQueue = (global.__smartcity_store_v3.commandsQueue || []).filter(
    (cmd) => now - new Date(cmd.createdAt).getTime() < 30000
  );

  return global.__smartcity_store_v3;
}

export function writeIoTStore(state: IoTStoreState): void {
  state.updatedAt = Date.now();
  global.__smartcity_store_v3 = state;
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
