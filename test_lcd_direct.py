import serial
import time

ser = serial.Serial()
ser.port = 'COM3'
ser.baudrate = 115200
ser.timeout = 2
ser.dtr = False
ser.rts = False
ser.open()
time.sleep(0.2)

# Ctrl+C x 2, then Ctrl+A
ser.write(b'\r\x03\x03')
time.sleep(0.3)
ser.read_all()
ser.write(b'\x01')
time.sleep(0.3)
ser.read_all()

# Code to test LCD directly
code = """
from machine import Pin, I2C
import time

i2c = I2C(0, scl=Pin(22), sda=Pin(21), freq=100000)
addr = 0x27

def send_byte(b):
    i2c.writeto(addr, bytes([b]))

def pulse(data):
    send_byte(data | 0x04)
    time.sleep_us(50)
    send_byte(data & ~0x04)
    time.sleep_us(50)

def write_nibble(n, mode=0):
    d = (n & 0xF0) | 0x08 | mode
    send_byte(d)
    pulse(d)

def cmd(c):
    write_nibble(c & 0xF0, 0)
    write_nibble((c << 4) & 0xF0, 0)
    time.sleep_ms(2)

def char(ch):
    val = ord(ch)
    write_nibble(val & 0xF0, 1)
    write_nibble((val << 4) & 0xF0, 1)
    time.sleep_us(50)

# Init sequence
time.sleep_ms(100)
write_nibble(0x30, 0)
time.sleep_ms(5)
write_nibble(0x30, 0)
time.sleep_us(200)
write_nibble(0x30, 0)
time.sleep_us(200)
write_nibble(0x20, 0)
time.sleep_ms(2)

cmd(0x28) # 2 lines 5x8
cmd(0x08) # display off
cmd(0x01) # clear
time.sleep_ms(3)
cmd(0x06) # entry mode
cmd(0x0C) # display on

# Tulis kata 'SELAMAT DATANG'
cmd(0x80)
for c in "Selamat Datang":
    char(c)

cmd(0xC0)
for c in "Di Kota Pintar":
    char(c)

print("TEKS_TERKIRIM_KE_LCD_SUKSES")
"""

ser.write(code.strip().encode('utf-8'))
ser.write(b'\x04')
time.sleep(1)

result = ser.read_all().decode('utf-8', errors='ignore')
print("Status pengiriman teks ke LCD:")
print(result)

ser.write(b'\x02')
ser.close()
