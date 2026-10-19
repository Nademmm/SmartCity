import serial
import time
import hashlib

source_path = r"c:\Users\nadem\OneDrive\Documents\urbanpulse\firmware\main_thonny_micropython.py"

with open(source_path, "rb") as f:
    local_data = f.read()

local_md5 = hashlib.md5(local_data).hexdigest()
local_len = len(local_data)
print(f"File lokal: {local_len} bytes, MD5: {local_md5}")

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
time.sleep(0.4)
ser.read_all()

# Tulis file secara langsung dengan bytes chunk
ser.write(b"f = open('main.py', 'wb')\r\n\x04")
time.sleep(0.2)
ser.read_all()

chunk_sz = 128
for offset in range(0, local_len, chunk_sz):
    chunk = local_data[offset:offset+chunk_sz]
    cmd = f"f.write({repr(chunk)})\r\n".encode("latin1")
    ser.write(cmd)
    ser.write(b"\x04")
    # Tunggu respon OK
    time.sleep(0.03)

# Tutup file
ser.write(b"f.close()\r\n\x04")
time.sleep(0.3)
ser.read_all()

# Verifikasi ukuran dan hash di ESP32
verify_code = """
import os, hashlib, binascii
sz = os.stat('main.py')[6]
with open('main.py', 'rb') as f:
    m = hashlib.sha256()
    m.update(f.read())
print("VERIFY_SIZE:", sz)
"""
ser.write(verify_code.strip().encode('utf-8'))
ser.write(b"\x04")
time.sleep(0.5)
verify_out = ser.read_all().decode("utf-8", errors="ignore")
print(verify_out)

# Keluar dari raw REPL dan lakukan soft reboot
print("Melakukan Soft Reboot...")
ser.write(b"\x02")
time.sleep(0.2)
ser.write(b"\x04")
time.sleep(1.5)

print("\n--- Output Live dari ESP32 ---")
start_t = time.time()
while time.time() - start_t < 6:
    if ser.in_waiting:
        line = ser.readline().decode("utf-8", errors="ignore").strip()
        if line:
            print("ESP32 >>", line)
    time.sleep(0.05)

ser.close()
