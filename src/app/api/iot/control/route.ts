import { NextResponse } from 'next/server';

export interface CommandPacket {
  id: string;
  targetDeviceId: string;
  action: string;
  value?: any;
  createdAt: string;
  status: 'PENDING' | 'DISPATCHED' | 'ACKNOWLEDGED';
}

declare global {
  var __urbanpulse_commands_queue: CommandPacket[] | undefined;
}

if (!global.__urbanpulse_commands_queue) {
  global.__urbanpulse_commands_queue = [];
}

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

    const command: CommandPacket = {
      id: `cmd-${Date.now()}`,
      targetDeviceId,
      action,
      value,
      createdAt: new Date().toISOString(),
      status: 'PENDING',
    };

    global.__urbanpulse_commands_queue!.unshift(command);
    if (global.__urbanpulse_commands_queue!.length > 50) {
      global.__urbanpulse_commands_queue!.pop();
    }

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

// Endpoint agar ESP32 bisa mengambil perintah tertunda (Polling Command)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get('deviceId');

  if (!deviceId) {
    return NextResponse.json({
      success: true,
      totalQueued: global.__urbanpulse_commands_queue?.length || 0,
      allCommands: global.__urbanpulse_commands_queue || [],
    });
  }

  // Ambil perintah tertunda untuk deviceId ini
  const pendingCommands = (global.__urbanpulse_commands_queue || []).filter(
    (cmd) => cmd.targetDeviceId === deviceId && cmd.status === 'PENDING'
  );

  // Tandai sebagai DISPATCHED
  pendingCommands.forEach((cmd) => {
    cmd.status = 'DISPATCHED';
  });

  return NextResponse.json({
    success: true,
    deviceId,
    commands: pendingCommands,
  });
}
