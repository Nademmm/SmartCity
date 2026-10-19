import serial
import time
import base64

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
ser.read_all()

def upload_file(local_path, remote_name):
    with open(local_path, "rb") as f:
        data = f.read()
    b64 = base64.b64encode(data).decode("ascii")
    print(f"Uploading {remote_name} ({len(data)} bytes)...")
    
    init = f"import ubinascii\nf = open('{remote_name}', 'wb')\n"
    ser.write(init.encode())
    ser.write(b"\x04")
    ser.read_until(b">")
    
    chunk_sz = 96
    for i in range(0, len(b64), chunk_sz):
        c = b64[i:i+chunk_sz]
        ser.write(f"f.write(ubinascii.a2b_base64('{c}'))\n".encode())
        ser.write(b"\x04")
        ser.read_until(b">")
        
    ser.write(b"f.close()\n\x04")
    ser.read_until(b">")
    print(f"Upload {remote_name} SUKSES!")

# Upload lcd_api.py dan esp8266_i2c_lcd.py
upload_file(r"c:\Users\nadem\OneDrive\Documents\urbanpulse\lcd_api.py", "lcd_api.py")
upload_file(r"c:\Users\nadem\OneDrive\Documents\urbanpulse\esp8266_i2c_lcd.py", "esp8266_i2c_lcd.py")

# Sekarang jalankan script test langsung menggunakan library Dave Hylands!
test_script = """
from machine import Pin, I2C
from esp8266_i2c_lcd import I2cLcd
import time

i2c = I2C(0, scl=Pin(22), sda=Pin(21), freq=100000)
print("I2C_SCAN:", [hex(d) for d in i2c.scan()])

lcd = I2cLcd(i2c, 0x27, 2, 16)
lcd.clear()
lcd.move_to(0, 0)
lcd.putstr("Selamat Datang")
lcd.move_to(0, 1)
lcd.putstr("Di Kota Pintar")
print("TEST_DAVE_HYLANDS_SELESAI")
"""

print("\nMenjalankan script tes Dave Hylands...")
ser.write(test_script.strip().encode())
ser.write(b"\x04")
time.sleep(1)
res = ser.read_until(b">").decode("utf-8", errors="ignore")
print("Output Hasil Tes:")
print(res)

ser.write(b"\x02")
ser.close()
