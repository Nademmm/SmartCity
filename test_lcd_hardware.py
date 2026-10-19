import serial
import time

ser = serial.Serial()
ser.port = 'COM3'
ser.baudrate = 115200
ser.timeout = 1
ser.dtr = False
ser.rts = False
ser.open()
time.sleep(0.3)

# Masuk ke REPL
ser.write(b'\r\x03\x03')
time.sleep(0.3)
ser.read_all()

# Kirim script test LCD
script = """
from machine import Pin, I2C
import time

i2c = I2C(0, scl=Pin(22), sda=Pin(21), freq=100000)
devs = i2c.scan()
print("I2C_ADDRS:", [hex(x) for x in devs])

addr = devs[0] if devs else 0x27

# Test backlight toggle 3x untuk konfirmasi komunikasi I2C hardware bekerja 100%
print("TEST TOGGLE BACKLIGHT 3X...")
for i in range(3):
    i2c.writeto(addr, bytes([0x00])) # Backlight OFF
    time.sleep(0.3)
    i2c.writeto(addr, bytes([0x08])) # Backlight ON
    time.sleep(0.3)

print("SELESAI_TEST_BACKLIGHT")
"""

ser.write((script + "\r\n").encode())
time.sleep(3)
output = ser.read_all().decode('utf-8', errors='ignore')
print("OUTPUT ESP32:")
print(output)
ser.close()
