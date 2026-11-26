import serial
import serial.tools.list_ports
import time
import base64
import sys

source_file = r"firmware\main_thonny_micropython.py"

def detect_esp32_port():
    if len(sys.argv) > 1 and sys.argv[1].upper().startswith("COM"):
        return sys.argv[1].upper()
    ports = list(serial.tools.list_ports.comports())
    if not ports:
        raise RuntimeError("Tidak ada perangkat USB Serial (ESP32) yang terdeteksi! Periksa kabel USB.")
    # Prioritaskan adapter USB-to-Serial umum ESP32 (CH340, CP210x, FTDI, USB-SERIAL)
    for p in ports:
        desc = f"{p.description} {p.manufacturer or ''}".upper()
        if any(k in desc for k in ("CH340", "CP210", "FTDI", "USB-SERIAL", "SILICON LABS", "UART")):
            return p.device
    return ports[0].device

port_name = detect_esp32_port()
print(f"[USB DETECTED] Menggunakan port ESP32: {port_name}")

with open(source_file, "rb") as f:
    local_bytes = f.read()

b64 = base64.b64encode(local_bytes).decode("ascii")
print(f"File lokal: {len(local_bytes)} bytes, base64: {len(b64)} chars")

ser = serial.Serial()
ser.port = port_name
ser.baudrate = 115200
ser.timeout = 2
ser.dtr = False
ser.rts = False
ser.open()
time.sleep(0.3)

# Masuk ke Raw REPL (kirim Ctrl+C beberapa kali untuk menghentikan loop main.py)
ser.write(b"\r\x03\x03\x03")
time.sleep(0.4)
ser.read_all()
ser.write(b"\x01")
time.sleep(0.4)
init_resp = ser.read_all().decode("utf-8", errors="ignore")
print("Prompt Raw REPL:", repr(init_resp))

# Siapkan fungsi penerima di ESP32
setup_code = """
import ubinascii
f = open('main.py', 'wb')
def w(s):
    f.write(ubinascii.a2b_base64(s))
def done():
    f.close()
    import os
    return os.stat('main.py')[6]
"""
ser.write(setup_code.strip().encode("utf-8"))
ser.write(b"\x04")
time.sleep(0.3)
setup_res = ser.read_until(b">").decode("utf-8", errors="ignore")
print("Setup receiver:", setup_res)

# Kirim chunk dengan konfirmasi respon setiap chunk
chunk_size = 96
total = (len(b64) + chunk_size - 1) // chunk_size
print(f"Mengirim {total} chunks...")

for i in range(0, len(b64), chunk_size):
    chunk = b64[i:i + chunk_size]
    call = f'w("{chunk}")'.encode("ascii")
    ser.write(call)
    ser.write(b"\x04")
    ack = ser.read_until(b">")
    if (i // chunk_size) % 30 == 0:
        print(f"Chunk {i // chunk_size}/{total} OK")

# Selesai dan cek ukuran
ser.write(b"print('FINAL_SIZE:', done())\r\n\x04")
time.sleep(0.5)
final_res = ser.read_until(b">").decode("utf-8", errors="ignore")
print("Hasil Final:", final_res)

# Soft Reboot (Ctrl+B lalu Ctrl+D)
print("Melakukan Soft Reboot...")
ser.write(b"\x02")
time.sleep(0.2)
ser.write(b"\x04")
time.sleep(1.5)

print("\n--- Output Program ESP32 Live ---")
start_t = time.time()
while time.time() - start_t < 6:
    if ser.in_waiting:
        line = ser.readline().decode("utf-8", errors="ignore").strip()
        if line:
            print("ESP32 >>", line)
    time.sleep(0.05)

ser.close()
print("Selesai!")
