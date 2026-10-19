import serial
import time
import base64
import os

source_file = r"c:\Users\nadem\OneDrive\Documents\urbanpulse\firmware\main_thonny_micropython.py"

with open(source_file, "rb") as f:
    local_bytes = f.read()

b64 = base64.b64encode(local_bytes).decode("ascii")
print(f"File lokal: {len(local_bytes)} bytes, base64: {len(b64)} chars")

ser = serial.Serial()
ser.port = "COM3"
ser.baudrate = 115200
ser.timeout = 2
ser.dtr = False
ser.rts = False
ser.open()
time.sleep(0.3)

# Masuk ke Raw REPL
ser.write(b"\r\x03\x03\x01")
time.sleep(0.5)
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
