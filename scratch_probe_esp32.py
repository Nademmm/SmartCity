import serial
import time
import sys

PORT = "COM3"
BAUD = 115200

print(f"Membuka {PORT} tanpa reset DTR/RTS...")
ser = serial.Serial()
ser.port = PORT
ser.baudrate = BAUD
ser.timeout = 1
ser.dtr = False
ser.rts = False
ser.open()
time.sleep(0.3)

# Kirim Ctrl+C 2x untuk membatalkan loop/program yang berjalan
ser.write(b'\r\x03\x03')
time.sleep(0.5)

# Bersihkan buffer masuk
resp = ser.read_all().decode('utf-8', errors='ignore')
print("Buffer awal:", repr(resp))

# Kirim perintah Python untuk test I2C langsung!
test_cmd = """
from machine import Pin, I2C
try:
    i2c = I2C(0, scl=Pin(22), sda=Pin(21), freq=100000)
    devs = i2c.scan()
    print("I2C_DEVICES:", [hex(x) for x in devs])
except Exception as e:
    print("I2C_ERR:", e)
"""

print("Mengirim script uji I2C...")
for line in test_cmd.strip().split('\n'):
    ser.write((line + '\r\n').encode('utf-8'))
    time.sleep(0.1)

time.sleep(1)
out = ser.read_all().decode('utf-8', errors='ignore')
print("Hasil Uji I2C di ESP32:")
print(out)

ser.close()
