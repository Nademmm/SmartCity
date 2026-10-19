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

# Ctrl+C x 2
ser.write(b'\r\x03\x03')
time.sleep(0.3)
ser.read_all()

# Ctrl+A -> enter raw REPL
ser.write(b'\x01')
time.sleep(0.3)
resp = ser.read_all()
print("Raw REPL prompt:", repr(resp))

# Run test code
code = """
from machine import Pin, I2C
i2c = I2C(0, scl=Pin(22), sda=Pin(21), freq=100000)
devs = i2c.scan()
print("I2C_DEVICES_FOUND:", [hex(d) for d in devs])
"""

ser.write(code.strip().encode('utf-8'))
ser.write(b'\x04') # Execute
time.sleep(0.5)

result = ser.read_all()
print("Result of I2C scan:")
print(result.decode('utf-8', errors='ignore'))

# Exit raw REPL
ser.write(b'\x02')
time.sleep(0.2)
ser.close()
