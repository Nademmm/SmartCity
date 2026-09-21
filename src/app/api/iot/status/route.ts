import { NextResponse } from 'next/server';

export async function GET() {
  const latestTelemetry = global.__urbanpulse_latest_telemetry || {};
  const activeDevices = Object.keys(latestTelemetry);

  return NextResponse.json({
    status: 'ONLINE',
    service: 'UrbanPulse IoT Gateway Engine',
    timestamp: new Date().toISOString(),
    endpoints: {
      telemetry: '/api/iot/telemetry',
      control: '/api/iot/control',
      status: '/api/iot/status',
    },
    activeDeviceCount: activeDevices.length,
    registeredSensors: activeDevices,
  });
}
