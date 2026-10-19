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

ser.write(b'\r\x03\x03\x01')
time.sleep(0.4)
ser.read_all()

code = """
with open('boot.py', 'r') as f:
    print('BOOT_PY_CONTENT:\\n' + f.read())
"""

ser.write(code.strip().encode('utf-8'))
ser.write(b'\x04')
time.sleep(0.5)

res = ser.read_all().decode('utf-8', errors='ignore')
print(res)

ser.write(b'\x02')
ser.close()
