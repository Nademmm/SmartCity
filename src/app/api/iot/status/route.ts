import { NextResponse } from 'next/server';
import { readIoTStore } from '@/lib/iotStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  const store = readIoTStore();
  const activeDevices = Object.keys(store.latestTelemetry);

  return NextResponse.json({
    status: 'ONLINE',
    service: 'SmartCity IoT Gateway Engine',
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
