import { NextResponse } from 'next/server';

// In-memory telemetry cache untuk menyimpan paket data terakhir yang diterima dari ESP32
export interface TelemetryPacket {
  deviceId: string;
  type: 'traffic' | 'pju' | 'pedestrian' | 'air-quality';
  timestamp: string;
  zone?: string;
  nodeId?: string;
  intersectionId?: string;
  crossingId?: string;
  payload: Record<string, any>;
}

// Global store dalam lifecycle Next.js server
declare global {
  var __urbanpulse_latest_telemetry: Record<string, TelemetryPacket> | undefined;
  var __urbanpulse_telemetry_history: TelemetryPacket[] | undefined;
}

if (!global.__urbanpulse_latest_telemetry) {
  global.__urbanpulse_latest_telemetry = {};
}
if (!global.__urbanpulse_telemetry_history) {
  global.__urbanpulse_telemetry_history = [];
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
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

    // Simpan paket data terbaru
    global.__urbanpulse_latest_telemetry![type] = packet;
    global.__urbanpulse_latest_telemetry![deviceId] = packet;

    // Simpan riwayat paket (maksimal 100 paket terakhir)
    global.__urbanpulse_telemetry_history!.unshift(packet);
    if (global.__urbanpulse_telemetry_history!.length > 100) {
      global.__urbanpulse_telemetry_history!.pop();
    }

    return NextResponse.json({
      success: true,
      message: 'Telemetry data successfully received and ingested into UrbanPulse Engine',
      receivedAt: packet.timestamp,
      packet,
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

export async function GET() {
  return NextResponse.json({
    success: true,
    totalPacketsStored: global.__urbanpulse_telemetry_history?.length || 0,
    latestBySubsystem: global.__urbanpulse_latest_telemetry || {},
    recentHistory: (global.__urbanpulse_telemetry_history || []).slice(0, 20),
  });
}
