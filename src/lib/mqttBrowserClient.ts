// Dual-Broker MQTT 3.1.1 over Secure WebSocket (WSS) client
// Terhubung paralel ke HiveMQ + EMQX sehingga selalu sinkron dengan ESP32 walau salah satu broker sibuk,
// plus auto-reconnect instan saat HP dibuka dari sleep (visibilitychange / online) dan PINGRESP watchdog.

export const MQTT_WSS_BROKERS = [
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://broker.emqx.io:8084/mqtt',
];
export const MQTT_TOPIC_TELEMETRY = 'urbanpulse/smartcity-esp32-nadem-2026/telemetry';
export const MQTT_TOPIC_CMD = 'urbanpulse/smartcity-esp32-nadem-2026/cmd';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function encodeVarInt(len: number): number[] {
  const bytes: number[] = [];
  let x = len;
  do {
    let digit = x % 128;
    x = Math.floor(x / 128);
    if (x > 0) digit |= 0x80;
    bytes.push(digit);
  } while (x > 0);
  return bytes;
}

function encodeUtf8String(str: string): Uint8Array {
  const encoded = textEncoder.encode(str);
  const out = new Uint8Array(2 + encoded.length);
  out[0] = (encoded.length >> 8) & 0xff;
  out[1] = encoded.length & 0xff;
  out.set(encoded, 2);
  return out;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

function buildConnectPacket(clientId: string): Uint8Array {
  const varHeader = new Uint8Array([0x00, 0x04, 0x4d, 0x51, 0x54, 0x54, 0x04, 0x02, 0x00, 0x2d]);
  const payload = encodeUtf8String(clientId);
  const remLen = encodeVarInt(varHeader.length + payload.length);
  return concatBytes([new Uint8Array([0x10, ...remLen]), varHeader, payload]);
}

function buildSubscribePacket(packetId: number, topic: string): Uint8Array {
  const varHeader = new Uint8Array([(packetId >> 8) & 0xff, packetId & 0xff]);
  const topicBytes = encodeUtf8String(topic);
  const qos = new Uint8Array([0x00]);
  const remLen = encodeVarInt(varHeader.length + topicBytes.length + qos.length);
  return concatBytes([new Uint8Array([0x82, ...remLen]), varHeader, topicBytes, qos]);
}

function buildPublishPacket(topic: string, payloadStr: string): Uint8Array {
  const topicBytes = encodeUtf8String(topic);
  const payloadBytes = textEncoder.encode(payloadStr);
  const remLen = encodeVarInt(topicBytes.length + payloadBytes.length);
  return concatBytes([new Uint8Array([0x30, ...remLen]), topicBytes, payloadBytes]);
}

class SingleBrokerConnection {
  private url: string;
  private ws: WebSocket | null = null;
  private closed = false;
  public isConnected = false;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private recvBuf: Uint8Array = new Uint8Array(0);
  private onMessage: (topic: string, payload: string) => void;
  private onState: () => void;

  constructor(url: string, onMessage: (topic: string, payload: string) => void, onState: () => void) {
    this.url = url;
    this.onMessage = onMessage;
    this.onState = onState;
  }

  public connect(): void {
    if (this.closed || typeof window === 'undefined') return;
    this.cleanupSocket();

    try {
      const ws = new WebSocket(this.url, ['mqtt']);
      ws.binaryType = 'arraybuffer';
      this.ws = ws;

      ws.onopen = () => {
        if (this.closed || this.ws !== ws) return;
        const cid = `sc_web_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
        ws.send(buildConnectPacket(cid));
      };

      ws.onmessage = (ev: MessageEvent) => {
        if (this.closed || this.ws !== ws) return;
        if (!(ev.data instanceof ArrayBuffer)) return;
        const incoming = new Uint8Array(ev.data);
        this.recvBuf = concatBytes([this.recvBuf, incoming]);
        this.processBuffer();
      };

      ws.onerror = () => {
        // Ditangani otomatis di onclose
      };

      ws.onclose = () => {
        const wasConnected = this.isConnected;
        this.isConnected = false;
        this.stopPing();
        if (wasConnected) this.onState();
        if (!this.closed) {
          this.scheduleReconnect(1800);
        }
      };
    } catch {
      this.scheduleReconnect(2500);
    }
  }

  public ensureAlive(): void {
    if (this.closed) return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isConnected) {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      this.connect();
      return;
    }
    // Kirim PINGREQ segera saat tab HP kembali aktif untuk cek socket zombie
    this.sendPing();
  }

  private processBuffer(): void {
    while (this.recvBuf.length >= 2) {
      const header = this.recvBuf[0];
      let mult = 1;
      let remLen = 0;
      let idx = 1;
      let completeVarInt = false;

      while (idx < this.recvBuf.length && idx <= 4) {
        const byte = this.recvBuf[idx];
        remLen += (byte & 0x7f) * mult;
        idx++;
        if ((byte & 0x80) === 0) {
          completeVarInt = true;
          break;
        }
        mult *= 128;
      }

      if (!completeVarInt) return;
      const totalLen = idx + remLen;
      if (this.recvBuf.length < totalLen) return;

      const packetBody = this.recvBuf.slice(idx, totalLen);
      this.recvBuf = this.recvBuf.slice(totalLen);

      const pktType = header & 0xf0;
      if (pktType === 0x20 && packetBody.length >= 2 && packetBody[1] === 0x00) {
        this.isConnected = true;
        this.onState();
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(buildSubscribePacket(1, MQTT_TOPIC_TELEMETRY));
        }
        this.startPing();
      } else if (pktType === 0xd0) {
        // PINGRESP diterima -> koneksi masih hidup
        if (this.pongTimeout) {
          clearTimeout(this.pongTimeout);
          this.pongTimeout = null;
        }
      } else if (pktType === 0x30 && packetBody.length >= 2) {
        const topicLen = (packetBody[0] << 8) | packetBody[1];
        if (2 + topicLen <= packetBody.length) {
          const topic = textDecoder.decode(packetBody.slice(2, 2 + topicLen));
          const qos = (header >> 1) & 0x03;
          const payloadStart = 2 + topicLen + (qos > 0 ? 2 : 0);
          if (payloadStart <= packetBody.length) {
            const payload = textDecoder.decode(packetBody.slice(payloadStart));
            this.onMessage(topic, payload);
          }
        }
      }
    }
  }

  public publishCommand(cmd: string): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isConnected) {
      return false;
    }
    try {
      this.ws.send(buildPublishPacket(MQTT_TOPIC_CMD, cmd));
      return true;
    } catch {
      return false;
    }
  }

  private sendPing(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(new Uint8Array([0xc0, 0x00]));
      if (this.pongTimeout) clearTimeout(this.pongTimeout);
      this.pongTimeout = setTimeout(() => {
        // Tidak ada balasan PINGRESP dalam 5 detik -> socket mati diam-diam, paksa reconnect
        if (!this.closed) {
          this.isConnected = false;
          this.onState();
          this.connect();
        }
      }, 5000);
    } catch {
      if (!this.closed) this.connect();
    }
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => this.sendPing(), 12000);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
  }

  private scheduleReconnect(delayMs: number): void {
    if (this.reconnectTimer || this.closed) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delayMs);
  }

  private cleanupSocket(): void {
    this.stopPing();
    if (this.ws) {
      try {
        this.ws.onclose = null;
        this.ws.onmessage = null;
        this.ws.onerror = null;
        this.ws.onopen = null;
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.recvBuf = new Uint8Array(0);
  }

  public disconnect(): void {
    this.closed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.cleanupSocket();
  }
}

export interface MqttBrowserClientOptions {
  onMessage: (topic: string, payload: string) => void;
  onStatusChange?: (connected: boolean) => void;
}

export class MqttBrowserClient {
  private conns: SingleBrokerConnection[] = [];
  private options: MqttBrowserClientOptions;
  private handleWake: () => void;

  constructor(options: MqttBrowserClientOptions) {
    this.options = options;
    this.handleWake = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      for (const c of this.conns) c.ensureAlive();
    };
  }

  public connect(): void {
    if (typeof window === 'undefined') return;
    this.disconnect();

    const notifyState = () => {
      const anyUp = this.conns.some((c) => c.isConnected);
      this.options.onStatusChange?.(anyUp);
    };

    this.conns = MQTT_WSS_BROKERS.map((url) => {
      const c = new SingleBrokerConnection(url, this.options.onMessage, notifyState);
      c.connect();
      return c;
    });

    window.addEventListener('online', this.handleWake);
    document.addEventListener('visibilitychange', this.handleWake);
  }

  public publishCommand(cmd: string): boolean {
    let sent = false;
    for (const c of this.conns) {
      if (c.publishCommand(cmd)) sent = true;
    }
    if (!sent) {
      for (const c of this.conns) c.ensureAlive();
    }
    return sent;
  }

  public disconnect(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleWake);
      document.removeEventListener('visibilitychange', this.handleWake);
    }
    for (const c of this.conns) c.disconnect();
    this.conns = [];
  }
}
