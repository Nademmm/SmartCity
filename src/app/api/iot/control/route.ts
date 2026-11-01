import { NextResponse } from 'next/server';
import { readIoTStore, enqueueCommand, popPendingCommands } from '@/lib/iotStore';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { targetDeviceId, action, value } = body;

    if (!targetDeviceId || !action) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing targetDeviceId or action',
        },
        { status: 400 }
      );
    }

    const command = enqueueCommand(targetDeviceId, action, value);

    return NextResponse.json({
      success: true,
      message: `Command '${action}' queued for device ${targetDeviceId}`,
      command,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Invalid JSON' },
      { status: 400 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get('deviceId');

  if (!deviceId) {
    const store = readIoTStore();
    return NextResponse.json({
      success: true,
      totalQueued: store.commandsQueue.length,
      allCommands: store.commandsQueue,
    });
  }

  const pendingCommands = popPendingCommands(deviceId);

  return NextResponse.json({
    success: true,
    deviceId,
    commands: pendingCommands,
  });
}
