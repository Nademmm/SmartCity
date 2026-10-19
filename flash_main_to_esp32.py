import serial
import time
import base64
import os

source_file = r"c:\Users\nadem\OneDrive\Documents\urbanpulse\firmware\main_thonny_micropython.py"

print("Membaca file firmware lokal...")
with open(source_file, "rb") as f:
    content = f.read()

b64_data = base64.b64encode(content).decode("ascii")

print("Membuka COM3...")
ser = serial.Serial()
ser.port = "COM3"
ser.baudrate = 115200
ser.timeout = 2
ser.dtr = False
ser.rts = False
ser.open()
time.sleep(0.3)

# Masuk ke Raw REPL
ser.write(b"\r\x03\x03")
time.sleep(0.3)
ser.read_all()

ser.write(b"\x01") # Ctrl+A
time.sleep(0.3)
prompt = ser.read_all().decode("utf-8", errors="ignore")
if "raw REPL" not in prompt:
    ser.write(b"\r\x03\x03\x01")
    time.sleep(0.5)
    prompt = ser.read_all().decode("utf-8", errors="ignore")

print("Raw REPL terhubung:", repr(prompt))

# Buat file main.py dan tulis dalam chunk base64
init_code = "import ubinascii\nf = open('main.py', 'wb')\n"
ser.write(init_code.encode("utf-8"))
ser.write(b"\x04")
time.sleep(0.2)
ser.read_all()

chunk_size = 256
total_chunks = (len(b64_data) + chunk_size - 1) // chunk_size
print(f"Mengirim {len(b64_data)} bytes base64 dalam {total_chunks} chunk...")

for i in range(0, len(b64_data), chunk_size):
    chunk = b64_data[i:i + chunk_size]
    write_cmd = f"f.write(ubinascii.a2b_base64('{chunk}'))\n"
    ser.write(write_cmd.encode("utf-8"))
    ser.write(b"\x04")
    time.sleep(0.04)
    resp = ser.read_all()

# Tutup file
close_code = "f.close()\nimport os\nprint('SAVED_MAIN_SIZE:', os.stat('main.py')[6])\n"
ser.write(close_code.encode("utf-8"))
ser.write(b"\x04")
time.sleep(0.5)
res = ser.read_all().decode("utf-8", errors="ignore")
print("Hasil simpan:", res)

# Soft reboot agar main.py langsung jalan
print("Melakukan Soft Reboot (Ctrl+D)...")
ser.write(b"\x02") # Keluar dari raw REPL
time.sleep(0.2)
ser.write(b"\x04") # Soft reboot
time.sleep(1)

# Baca 10 baris pertama
print("\n--- Output Program ESP32 Setelah Booting ---")
start_t = time.time()
while time.time() - start_t < 4:
    if ser.in_waiting:
        line = ser.readline().decode("utf-8", errors="ignore").strip()
        if line:
            print("ESP32 >>", line)
    time.sleep(0.05)

ser.close()
print("Selesai!")
