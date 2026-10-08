import { NextResponse } from 'next/server';

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

    // Simpan data terbaru
    global.__urbanpulse_latest_telemetry![type] = packet;
    global.__urbanpulse_latest_telemetry![deviceId] = packet;

    // Jika mengirim paket all-in-one miniatur
    if (type === 'miniature-all') {
      if (payload.gas) {
        global.__urbanpulse_latest_telemetry!['air-quality'] = {
          deviceId,
          type: 'air-quality',
          timestamp: packet.timestamp,
          payload: payload.gas,
        };
      }
      if (payload.crossing) {
        global.__urbanpulse_latest_telemetry!['pedestrian'] = {
          deviceId,
          type: 'pedestrian',
          timestamp: packet.timestamp,
          payload: payload.crossing,
        };
      }
      if (payload.pju) {
        global.__urbanpulse_latest_telemetry!['pju'] = {
          deviceId,
          type: 'pju',
          timestamp: packet.timestamp,
          payload: payload.pju,
        };
      }
    }

    // Normalisasi 'gas' alias ke 'air-quality'
    if (type === 'gas') {
      global.__urbanpulse_latest_telemetry!['air-quality'] = packet;
    }

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
