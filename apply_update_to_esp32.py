import serial
import time
import base64
import os

ser = serial.Serial()
ser.port = "COM3"
ser.baudrate = 115200
ser.timeout = 2
ser.dtr = False
ser.rts = False

try:
    ser.open()
except Exception as e:
    print("Gagal membuka port serial COM3:", e)
    exit(1)

time.sleep(0.3)

# 1. Masuk ke Raw REPL
ser.write(b"\r\x03\x03\x01")
time.sleep(0.5)
init_resp = ser.read_all().decode("utf-8", errors="ignore")
print("Prompt Raw REPL:", repr(init_resp))

def upload_file(local_path, target_remote_name):
    with open(local_path, "rb") as f:
        content_bytes = f.read()

    b64 = base64.b64encode(content_bytes).decode("ascii")
    print(f"\n--- Mengunggah {target_remote_name} ({len(content_bytes)} bytes) ---")

    setup_code = f"""
import ubinascii
f = open('{target_remote_name}', 'wb')
def w(s):
    f.write(ubinascii.a2b_base64(s))
def done():
    f.close()
    import os
    return os.stat('{target_remote_name}')[6]
"""
    ser.write(setup_code.strip().encode("utf-8"))
    ser.write(b"\x04")
    time.sleep(0.3)
    ser.read_until(b">")

    chunk_size = 96
    total = (len(b64) + chunk_size - 1) // chunk_size

    for i in range(0, len(b64), chunk_size):
        chunk = b64[i:i + chunk_size]
        ser.write(f'w("{chunk}")'.encode("ascii"))
        ser.write(b"\x04")
        ser.read_until(b">")
        if (i // chunk_size) % 25 == 0:
            print(f"Progress {target_remote_name}: {i // chunk_size + 1}/{total} chunks")

    ser.write(b"print('SIZE_WRITTEN:', done())\r\n\x04")
    time.sleep(0.3)
    res = ser.read_until(b">").decode("utf-8", errors="ignore")
    print("Hasil simpan:", res.strip())

# Upload library LCD
upload_file(r"c:\Users\nadem\OneDrive\Documents\urbanpulse\lcd_api.py", "lcd_api.py")
upload_file(r"c:\Users\nadem\OneDrive\Documents\urbanpulse\esp8266_i2c_lcd.py", "esp8266_i2c_lcd.py")
upload_file(r"c:\Users\nadem\OneDrive\Documents\urbanpulse\i2c_lcd.py", "i2c_lcd.py")

# Upload main_thonny_micropython.py sebagai main.py
upload_file(r"c:\Users\nadem\OneDrive\Documents\urbanpulse\firmware\main_thonny_micropython.py", "main.py")

# Verifikasi file di ESP32
print("\n--- Verifikasi File di ESP32 ---")
ser.write(b"import os; print('DAFTAR FILE:', os.listdir())\r\n\x04")
time.sleep(0.5)
verify_res = ser.read_until(b">").decode("utf-8", errors="ignore")
print(verify_res.strip())

# Soft Reboot (Ctrl+B lalu Ctrl+D)
print("\nMelakukan Soft Reboot pada ESP32...")
ser.write(b"\x02") # Normal REPL
time.sleep(0.2)
ser.write(b"\x04") # Soft reboot
time.sleep(1.0)

print("\n--- Membaca Output Live ESP32 (8 detik) ---")
start_time = time.time()
while time.time() - start_time < 8.0:
    if ser.in_waiting:
        line = ser.readline().decode("utf-8", errors="ignore").strip()
        if line:
            print("ESP32 >>", line)
    time.sleep(0.04)

ser.close()
print("\nProses upload dan pengujian selesai!")
