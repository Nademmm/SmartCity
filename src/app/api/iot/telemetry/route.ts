import { NextResponse } from 'next/server';
import {
  TelemetryPacket,
  readIoTStore,
  writeIoTStore,
  enqueueCommand,
  popPendingCommands,
} from '@/lib/iotStore';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Dukungan antrean perintah langsung di endpoint yang sama (agar 1 serverless instance dengan telemetri)
    if (body.action && (body.targetDeviceId || body.deviceId)) {
      const targetId = body.targetDeviceId || body.deviceId || 'ESP32-MINIATURE';
      const command = enqueueCommand(targetId, body.action, body.value);
      return NextResponse.json({
        success: true,
        message: `Command '${body.action}' queued for device ${targetId}`,
        command,
      });
    }

    const { deviceId, type, payload, zone, nodeId, intersectionId, crossingId } = body;

    if (!deviceId || !type || !payload) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: deviceId, type, payload',
        },
        { status: 400 }
      );
    }

    const store = readIoTStore();

    const packet: TelemetryPacket = {
      deviceId,
      type,
      timestamp: new Date().toISOString(),
      zone,
      nodeId,
      intersectionId,
      crossingId,
      payload,
    };

    store.latestTelemetry[type] = packet;
    store.latestTelemetry[deviceId] = packet;

    if (type === 'miniature-all') {
      if (payload.gas) {
        store.latestTelemetry['air-quality'] = {
          deviceId,
          type: 'air-quality',
          timestamp: packet.timestamp,
          payload: payload.gas,
        };
      }
      if (payload.crossing) {
        store.latestTelemetry['pedestrian'] = {
          deviceId,
          type: 'pedestrian',
          timestamp: packet.timestamp,
          payload: payload.crossing,
        };
      }
      if (payload.pju) {
        store.latestTelemetry['pju'] = {
          deviceId,
          type: 'pju',
          timestamp: packet.timestamp,
          payload: payload.pju,
        };
      }
    }

    if (type === 'gas') {
      store.latestTelemetry['air-quality'] = packet;
    }

    store.telemetryHistory.unshift(packet);
    if (store.telemetryHistory.length > 100) {
      store.telemetryHistory = store.telemetryHistory.slice(0, 100);
    }

    writeIoTStore(store);

    // Kembalikan juga perintah yang sedang antre untuk deviceId ini dalam satu round-trip
    const pendingCommands = popPendingCommands(deviceId);

    return NextResponse.json({
      success: true,
      message: 'Telemetry data successfully received and ingested into SmartCity Engine',
      receivedAt: packet.timestamp,
      packet,
      commands: pendingCommands,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Invalid JSON request body',
      },
      { status: 400 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pollDeviceId = searchParams.get('pollCommandsFor');
  const store = readIoTStore();

  const commands = pollDeviceId ? popPendingCommands(pollDeviceId) : [];

  return NextResponse.json({
    success: true,
    totalPacketsStored: store.telemetryHistory.length,
    latestBySubsystem: store.latestTelemetry,
    recentHistory: store.telemetryHistory.slice(0, 20),
    commands,
  });
}
