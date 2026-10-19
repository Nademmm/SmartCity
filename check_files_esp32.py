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

# Enter raw REPL
ser.write(b'\r\x03\x03\x01')
time.sleep(0.4)
ser.read_all()

code = """
import os
print("FILES_ON_ESP32:", os.listdir())
try:
    print("MAIN_PY_SIZE:", os.stat('main.py')[6])
except Exception as e:
    print("STAT_ERR:", e)
"""

ser.write(code.strip().encode('utf-8'))
ser.write(b'\x04')
time.sleep(0.5)

res = ser.read_all().decode('utf-8', errors='ignore')
print(res)

ser.write(b'\x02')
ser.close()
