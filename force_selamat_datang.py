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

# Masuk ke Raw REPL
ser.write(b"\r\x03\x03\x01")
time.sleep(0.5)
ser.read_all()

# Script MicroPython yang mengunci tampilan HANYA 'Selamat Datang'
script = """
from machine import Pin, SoftI2C
import time

i2c = SoftI2C(scl=Pin(22), sda=Pin(21), freq=100000)
addr = 0x27

class DirectLcd:
    def __init__(self, i2c, addr):
        self.i2c = i2c
        self.addr = addr
        self.bl = 0x08

    def exp(self, d):
        self.i2c.writeto(self.addr, bytes([d | self.bl]))

    def pulse(self, d):
        self.exp(d | 0x04)
        time.sleep_us(5)
        self.exp(d & ~0x04)
        time.sleep_us(50)

    def w4(self, val):
        self.exp(val)
        self.pulse(val)

    def cmd(self, c):
        self.w4(c & 0xF0)
        self.w4((c << 4) & 0xF0)
        time.sleep_ms(2)

    def write_char(self, ch):
        val = ord(ch)
        self.w4((val & 0xF0) | 0x01)
        self.w4(((val << 4) & 0xF0) | 0x01)
        time.sleep_us(50)

    def init(self):
        time.sleep_ms(200)
        self.exp(self.bl)
        time.sleep_ms(800)

        # Reset sequence
        self.w4(0x30)
        time.sleep_ms(10)
        self.w4(0x30)
        time.sleep_ms(10)
        self.w4(0x30)
        time.sleep_ms(10)
        self.w4(0x20) # 4-bit mode
        time.sleep_ms(5)

        self.cmd(0x28) # 2 baris, font 5x8
        time.sleep_ms(2)
        self.cmd(0x08) # display off
        time.sleep_ms(2)
        self.cmd(0x01) # clear
        time.sleep_ms(10)
        self.cmd(0x06) # increment
        time.sleep_ms(2)
        self.cmd(0x0C) # display ON, cursor OFF
        time.sleep_ms(5)
        self.cmd(0x02) # home
        time.sleep_ms(5)

    def set_pos(self, col, row):
        addr = 0x80 + (0x40 if row == 1 else 0x00) + col
        self.cmd(addr)

    def print_line(self, text):
        for c in text:
            self.write_char(c)

print("INIT LCD...")
lcd = DirectLcd(i2c, addr)
lcd.init()

print("PRINTING SELAMAT DATANG...")
lcd.set_pos(0, 0)
lcd.print_line("Selamat Datang")
lcd.set_pos(0, 1)
lcd.print_line("Di Kota Pintar")

print("SELESAI_TERTULIS_DI_LCD")
"""

ser.write(script.strip().encode("utf-8"))
ser.write(b"\x04")

time.sleep(2.5)
out = ser.read_until(b">").decode("utf-8", errors="ignore")
print(out)

ser.write(b"\x02")
ser.close()
