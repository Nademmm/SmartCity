import serial
import time

ser = serial.Serial()
ser.port = "COM3"
ser.baudrate = 115200
ser.timeout = 2
ser.dtr = False
ser.rts = False
ser.open()
time.sleep(0.3)

# Enter raw REPL
ser.write(b"\r\x03\x03\x01")
time.sleep(0.4)
ser.read_all()

script = """
from machine import Pin, SoftI2C, I2C
import time

# Coba scan dengan SoftI2C
i2c = SoftI2C(scl=Pin(22), sda=Pin(21), freq=100000)
devs = i2c.scan()
print("SOFT_I2C_DEVS:", [hex(d) for d in devs])

if devs:
    addr = devs[0]
    print("MENGUJI KEDIPKAN BACKLIGHT PADA ALAMAT:", hex(addr))
    for i in range(5):
        # Matikan backlight (bit 3 = 0)
        i2c.writeto(addr, bytes([0x00]))
        time.sleep(0.5)
        # Nyalakan backlight (bit 3 = 1)
        i2c.writeto(addr, bytes([0x08]))
        time.sleep(0.5)
    print("KEDIPKAN_BACKLIGHT_SELESAI")
else:
    print("TIDAK_ADA_DEVICE")
"""

ser.write(script.strip().encode("utf-8"))
ser.write(b"\x04")

res = ser.read_until(b">").decode("utf-8", errors="ignore")
print(res)

ser.write(b"\x02")
ser.close()
