import serial
import time

ser = serial.Serial()
ser.port = "COM3"
ser.baudrate = 115200
ser.timeout = 3
ser.dtr = False
ser.rts = False
ser.open()
time.sleep(0.3)

# Masuk ke Raw REPL
ser.write(b"\r\x03\x03\x01")
time.sleep(0.5)
ser.read_all()

script = """
from machine import Pin, SoftI2C
import time

# Gunakan SoftI2C di GPIO 22 (SCL) dan GPIO 21 (SDA)
i2c = SoftI2C(scl=Pin(22), sda=Pin(21), freq=100000)
devs = i2c.scan()
print("I2C_DEVICES:", [hex(d) for d in devs])

addr = 0x27 if 0x27 in devs else (devs[0] if devs else 0x27)
print("ALAMAT_LCD:", hex(addr))

# Implementasi identik 100% dengan Arduino LiquidCrystal_I2C resmi
class ArduinoLcd:
    def __init__(self, i2c, addr):
        self.i2c = i2c
        self.addr = addr
        self.backlightval = 0x08

    def expanderWrite(self, data):
        self.i2c.writeto(self.addr, bytes([data | self.backlightval]))

    def pulseEnable(self, data):
        self.expanderWrite(data | 0x04) # En HIGH
        time.sleep_us(1)
        self.expanderWrite(data & ~0x04) # En LOW
        time.sleep_us(50)

    def write4bits(self, value):
        self.expanderWrite(value)
        self.pulseEnable(value)

    def send(self, value, mode):
        highnib = value & 0xF0
        lownib = (value << 4) & 0xF0
        self.write4bits(highnib | mode)
        self.write4bits(lownib | mode)

    def command(self, val):
        self.send(val, 0)

    def write(self, val):
        self.send(val, 1)

    def init(self):
        time.sleep_ms(100)
        self.expanderWrite(self.backlightval)
        time.sleep_ms(600)

        # 4-bit init sequence
        self.write4bits(0x03 << 4)
        time.sleep_ms(5)
        self.write4bits(0x03 << 4)
        time.sleep_ms(5)
        self.write4bits(0x03 << 4)
        time.sleep_us(150)
        self.write4bits(0x02 << 4)
        time.sleep_ms(3)

        self.command(0x28) # 2 baris
        time.sleep_ms(1)
        self.command(0x08) # display off
        time.sleep_ms(1)
        self.command(0x01) # clear
        time.sleep_ms(5)
        self.command(0x06) # entry mode increment
        time.sleep_ms(1)
        self.command(0x0C) # display on, cursor off
        time.sleep_ms(5)
        self.command(0x02) # home
        time.sleep_ms(3)

    def setCursor(self, col, row):
        offsets = [0x00, 0x40]
        self.command(0x80 | (col + offsets[row]))
        time.sleep_us(50)

    def print_text(self, text):
        for ch in text:
            self.write(ord(ch))

print("MEMULAI INISIALISASI ARDUINO LCD...")
lcd = ArduinoLcd(i2c, addr)
lcd.init()

print("MENULIS TEKS KE LCD...")
lcd.setCursor(0, 0)
lcd.print_text("Selamat Datang  ")
lcd.setCursor(0, 1)
lcd.print_text("Di Kota Pintar  ")
print("HASIL_SELESAI_100_PERSEN")
"""

ser.write(script.strip().encode("utf-8"))
ser.write(b"\x04")

time.sleep(2)
res = ser.read_until(b">").decode("utf-8", errors="ignore")
print("OUTPUT:")
print(res)

ser.write(b"\x02")
ser.close()
