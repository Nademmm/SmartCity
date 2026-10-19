from machine import Pin, ADC, I2C, time_pulse_us
import time
import sys
import uselect
from i2c_lcd import I2cLcd

# ==================================================
# 1. LCD I2C (Otomatis Mendeteksi Pin SCL & SDA)
# ==================================================
i2c = None
alamat_lcd = []

for scl_p, sda_p in [(22, 21), (21, 22)]:
    try:
        temp_i2c = I2C(0, scl=Pin(scl_p), sda=Pin(sda_p), freq=100000)
        scan_res = temp_i2c.scan()
        if len(scan_res) > 0:
            i2c = temp_i2c
            alamat_lcd = scan_res
            print(f"Alamat I2C terdeteksi (SCL={scl_p}, SDA={sda_p}):", [hex(x) for x in alamat_lcd])
            break
    except Exception:
        pass

if i2c is None:
    i2c = I2C(0, scl=Pin(21), sda=Pin(22), freq=100000)
    alamat_lcd = i2c.scan()
    print("Alamat I2C:", alamat_lcd)

lcd = None
if len(alamat_lcd) > 0:
    try:
        lcd = I2cLcd(i2c, alamat_lcd[0], 2, 16)
        lcd.clear()
        lcd.move_to(0, 0)
        lcd.putstr("URBANPULSE")
        lcd.move_to(0, 1)
        lcd.putstr("Monitoring Gas")
        time.sleep(2)
        lcd.clear()
        print("[LCD] Berhasil terhubung dan teks ditampilkan!")
    except Exception as e:
        lcd = None
        print("LCD bermasalah:", e)
else:
    print("LCD tidak terdeteksi!")

# ==================================================
# 2. SENSOR GAS MQ
# ==================================================
sensor_gas = ADC(Pin(39))
sensor_gas.atten(ADC.ATTN_11DB)
BATAS_GAS = 1500

# ==================================================
# 3. SENSOR ULTRASONIK
# ==================================================
TRIG_KANAN = Pin(32, Pin.OUT)
ECHO_KANAN = Pin(34, Pin.IN)

TRIG_KIRI = Pin(33, Pin.OUT)
ECHO_KIRI = Pin(35, Pin.IN)

TRIG_KANAN.off()
TRIG_KIRI.off()

# ==================================================
# 4. SENSOR LDR
# ==================================================
ldr = ADC(Pin(36))
ldr.atten(ADC.ATTN_11DB)
THRESHOLD_LDR = 2000

# ==================================================
# 5. LED DAN BUZZER
# ==================================================
led_merah = Pin(25, Pin.OUT)  # PJU
led_putih = Pin(26, Pin.OUT)  # PJU

led_hijau = Pin(12, Pin.OUT)
led_kuning = Pin(14, Pin.OUT)
led_merah_penyeberangan = Pin(27, Pin.OUT)

buzzer = Pin(4, Pin.OUT)

# LED Indikator Gas / Kualitas Udara
try:
    led_polusi_gas = Pin(18, Pin.OUT)
    led_bersih_gas = Pin(19, Pin.OUT)
    led_polusi_gas.off()
    led_bersih_gas.on()
except Exception:
    led_polusi_gas = None
    led_bersih_gas = None

# ==================================================
# 6. PENGATURAN & KONTROL JARINGAN
# ==================================================
BATAS_KANAN = 17
BATAS_KIRI = 25

WAKTU_KUNING = 1000       # 1 detik
WAKTU_MENYEBRANG = 5000   # 5 detik

siap_menyeberang = True
fase_penyeberangan = "HIJAU"
waktu_fase = time.ticks_ms()

pju_manual_mode = "AUTO"  # "AUTO", "ON", atau "OFF"
gas_override_mode = "AUTO"  # "AUTO" atau "MANUAL"
nilai_gas_manual = 650

# Listener serial non-blocking untuk kendali dari Dashboard Web
spoll = uselect.poll()
spoll.register(sys.stdin, uselect.POLLIN)

def cek_perintah_jaringan():
    global siap_menyeberang, fase_penyeberangan, waktu_fase, pju_manual_mode, gas_override_mode, nilai_gas_manual
    if spoll.poll(0):
        try:
            line = sys.stdin.readline().strip()
            if not line:
                return

            print(">>> PERINTAH DITERIMA:", line)

            # 1. KONTROL SMART PJU
            if line == "CMD:PJU_ON":
                pju_manual_mode = "ON"
                led_merah.on()
                led_putih.on()
                print(">>> STATUS PJU: MANUAL ON (DIKENDALIKAN WEB)")

            elif line == "CMD:PJU_OFF":
                pju_manual_mode = "OFF"
                led_merah.off()
                led_putih.off()
                print(">>> STATUS PJU: MANUAL OFF (DIKENDALIKAN WEB)")

            elif line == "CMD:PJU_AUTO":
                pju_manual_mode = "AUTO"
                print(">>> STATUS PJU: OTOMATIS SENSOR LDR")

            # 2. KONTROL PENYEBERANGAN (PELICAN CROSSING)
            elif line in ["CMD:FORCE_CROSSING", "CMD:CROSSING_TRIGGER"]:
                if fase_penyeberangan == "HIJAU":
                    siap_menyeberang = False
                    fase_penyeberangan = "KUNING"
                    waktu_fase = time.ticks_ms()
                    print(">>> PENYEBERANGAN DIPAKSA AKTIF DARI WEB!")

            elif line == "CMD:CROSSING_RESET":
                fase_penyeberangan = "HIJAU"
                siap_menyeberang = True
                waktu_fase = time.ticks_ms()
                led_hijau.on()
                led_kuning.off()
                led_merah_penyeberangan.off()
                buzzer.off()
                print(">>> PENYEBERANGAN DIRESET AMAN (HIJAU)")

            # 3. KONTROL BUZZER
            elif line in ["CMD:BUZZER_TEST", "CMD:ALARM_TEST"]:
                buzzer.on()
                time.sleep_ms(350)
                buzzer.off()
                print(">>> UJI BUZZER SUKSES")

            elif line == "CMD:BUZZER_MUTE":
                buzzer.off()
                print(">>> BUZZER DIBISUKAN")

            # 4. KONTROL SENSOR GAS & SIMULASI POLUSI DARI DEVICE
            elif line == "CMD:GAS_AUTO":
                gas_override_mode = "AUTO"
                print(">>> STATUS GAS: MODE OTOMATIS SENSOR FISIK PIN 39")

            elif line == "CMD:GAS_BERSIH":
                gas_override_mode = "MANUAL"
                nilai_gas_manual = 650
                buzzer.off()
                print(">>> STATUS GAS: MANUAL UDARA BERSIH (650)")

            elif line == "CMD:GAS_SEDANG":
                gas_override_mode = "MANUAL"
                nilai_gas_manual = 1250
                buzzer.off()
                print(">>> STATUS GAS: MANUAL POLUSI SEDANG (1250)")

            elif line in ["CMD:GAS_TINGGI", "CMD:GAS_BAHAYA"]:
                gas_override_mode = "MANUAL"
                nilai_gas_manual = 2100
                print(">>> STATUS GAS: MANUAL POLUSI TINGGI (2100)")

            elif line.startswith("CMD:GAS_SET:"):
                try:
                    val_str = line.split(":")[2]
                    nilai_gas_manual = int(val_str)
                    gas_override_mode = "MANUAL"
                    print(">>> STATUS GAS: MANUAL DITETAPKAN KE", nilai_gas_manual)
                except Exception as ex:
                    print("[ERR_GAS_SET]", ex)

        except Exception as err:
            print("[ERR_CMD]", err)

# Pengaturan pola buzzer
INTERVAL_GAS = 800
WAKTU_GANTI_MODE = 2500

POLA_SEBERANG = [
    (150, 100),
    (150, 100),
    (150, 350),
    (150, 100),
    (150, 100),
    (150, 350),
]

jenis_alarm_sebelumnya = "none"
waktu_awal_alarm = time.ticks_ms()

# ==================================================
# 7. KONDISI AWAL
# ==================================================
led_hijau.on()
led_kuning.off()
led_merah_penyeberangan.off()
buzzer.off()
led_merah.off()
led_putih.off()

# ==================================================
# 8. MEMBACA JARAK ULTRASONIK
# ==================================================
def baca_jarak(TRIG, ECHO):
    TRIG.off()
    time.sleep_us(5)
    TRIG.on()
    time.sleep_us(10)
    TRIG.off()

    try:
        durasi = time_pulse_us(ECHO, 1, 30000)

        if durasi <= 0:
            return None

        jarak = (durasi * 0.0343) / 2

        if jarak < 2 or jarak > 400:
            return None

        return jarak
    except Exception:
        return None

# ==================================================
# 9. FILTER PEMBACAAN JARAK
# ==================================================
def baca_jarak_stabil(TRIG, ECHO):
    hasil = []

    for i in range(3):
        jarak = baca_jarak(TRIG, ECHO)

        if jarak is not None:
            hasil.append(jarak)

        if i < 2:
            time.sleep_ms(40)

    if len(hasil) == 0:
        return None

    hasil.sort()

    if len(hasil) == 1:
        return hasil[0]

    return hasil[len(hasil) // 2]

# ==================================================
# 10. BUZZER DUA FUNGSI
# ==================================================
def update_buzzer(alarm_gas, alarm_seberang):
    global jenis_alarm_sebelumnya, waktu_awal_alarm

    sekarang = time.ticks_ms()

    if alarm_gas and alarm_seberang:
        jenis_alarm = "both"
    elif alarm_gas:
        jenis_alarm = "gas"
    elif alarm_seberang:
        jenis_alarm = "seberang"
    else:
        jenis_alarm = "none"

    if jenis_alarm != jenis_alarm_sebelumnya:
        jenis_alarm_sebelumnya = jenis_alarm
        waktu_awal_alarm = sekarang

    if jenis_alarm == "none":
        buzzer.off()
        return

    if jenis_alarm == "both":
        waktu_aktif = time.ticks_diff(sekarang, waktu_awal_alarm)
        mode_gas = (waktu_aktif % (WAKTU_GANTI_MODE * 2) < WAKTU_GANTI_MODE)
    elif jenis_alarm == "gas":
        mode_gas = True
    else:
        mode_gas = False

    if mode_gas:
        fase = sekarang % INTERVAL_GAS
        if fase < 120 or 220 <= fase < 340:
            buzzer.on()
        else:
            buzzer.off()
    else:
        durasi_siklus = sum(bunyi + jeda for bunyi, jeda in POLA_SEBERANG)
        waktu_pola = time.ticks_diff(sekarang, waktu_awal_alarm) % durasi_siklus
        posisi = 0
        status_buzzer = False

        for bunyi, jeda in POLA_SEBERANG:
            if posisi <= waktu_pola < posisi + bunyi:
                status_buzzer = True
                break
            posisi += bunyi
            if posisi <= waktu_pola < posisi + jeda:
                status_buzzer = False
                break
            posisi += jeda

        if status_buzzer:
            buzzer.on()
        else:
            buzzer.off()

# ==================================================
# 11. PROGRAM UTAMA
# ==================================================
while True:
    # 0. Periksa instruksi kendali dari Web Dashboard (non-blocking)
    cek_perintah_jaringan()

    print("\n================================")
    print("    URBANPULSE SMART CITY")
    print("================================")

    # ----------------------------------------------
    # FITUR 1: MONITORING POLUSI MQ + LCD
    # ----------------------------------------------
    if gas_override_mode == "MANUAL":
        nilai_gas = nilai_gas_manual
    else:
        nilai_gas = sensor_gas.read()

    if nilai_gas < 1000:
        status_polusi = "UDARA BERSIH"
    elif nilai_gas < 1500:
        status_polusi = "POLUSI SEDANG"
    else:
        status_polusi = "POLUSI TINGGI"

    alarm_gas = nilai_gas >= BATAS_GAS

    if led_polusi_gas is not None:
        if alarm_gas or status_polusi == "POLUSI SEDANG":
            led_polusi_gas.on()
        else:
            led_polusi_gas.off()

    if led_bersih_gas is not None:
        if not alarm_gas:
            led_bersih_gas.on()
        else:
            led_bersih_gas.off()

    print("\nMONITORING POLUSI")
    print("Nilai gas:", nilai_gas, f"({gas_override_mode})")
    print("Status:", status_polusi)

    if lcd is not None:
        try:
            lcd.move_to(0, 0)
            lcd.putstr("Nilai MQ: {:4d}  ".format(nilai_gas))
            lcd.move_to(0, 1)
            lcd.putstr("{:<16}".format(status_polusi[:16]))
        except Exception as e:
            print("LCD bermasalah, monitoring dilanjutkan:", e)
            lcd = None

    # ----------------------------------------------
    # FITUR 2: BACA DUA SENSOR ULTRASONIK
    # ----------------------------------------------
    jarak_kanan = baca_jarak_stabil(TRIG_KANAN, ECHO_KANAN)
    time.sleep_ms(60)
    jarak_kiri = baca_jarak_stabil(TRIG_KIRI, ECHO_KIRI)

    print("\nMONITORING PENYEBERANGAN")
    print("Jarak kanan:", "tidak terbaca" if jarak_kanan is None else str(round(jarak_kanan, 1)) + " cm")
    print("Jarak kiri:", "tidak terbaca" if jarak_kiri is None else str(round(jarak_kiri, 1)) + " cm")

    orang_kanan = (jarak_kanan is not None and 0 < jarak_kanan <= BATAS_KANAN)
    orang_kiri = (jarak_kiri is not None and 0 < jarak_kiri <= BATAS_KIRI)
    ada_orang = orang_kanan or orang_kiri

    print("Deteksi kanan:", orang_kanan)
    print("Deteksi kiri:", orang_kiri)

    # ----------------------------------------------
    # FITUR 3: SIKLUS LAMPU PENYEBERANGAN
    # ----------------------------------------------
    sekarang = time.ticks_ms()

    if fase_penyeberangan == "HIJAU":
        if siap_menyeberang and ada_orang:
            siap_menyeberang = False
            fase_penyeberangan = "KUNING"
            waktu_fase = sekarang
            print(">>> OBJEK TERDETEKSI!")
            if orang_kanan:
                print(">>> SENSOR KANAN MENDETEKSI")
            if orang_kiri:
                print(">>> SENSOR KIRI MENDETEKSI")

    elif fase_penyeberangan == "KUNING":
        if time.ticks_diff(sekarang, waktu_fase) >= WAKTU_KUNING:
            fase_penyeberangan = "MERAH"
            waktu_fase = sekarang
            print(">>> LAMPU MERAH - MENYEBERANG")

    elif fase_penyeberangan == "MERAH":
        if time.ticks_diff(sekarang, waktu_fase) >= WAKTU_MENYEBRANG:
            fase_penyeberangan = "TUNGGU_KOSONG"
            print(">>> WAKTU MENYEBERANG SELESAI")

    elif fase_penyeberangan == "TUNGGU_KOSONG":
        if not ada_orang:
            siap_menyeberang = True
            fase_penyeberangan = "HIJAU"
            print(">>> AREA KOSONG - SIAP MENDETEKSI LAGI")
        else:
            print(">>> MENUNGGU OBJEK MENJAUH")

    if fase_penyeberangan == "HIJAU":
        led_hijau.on()
        led_kuning.off()
        led_merah_penyeberangan.off()
    elif fase_penyeberangan == "KUNING":
        led_hijau.off()
        led_kuning.on()
        led_merah_penyeberangan.off()
    elif fase_penyeberangan == "MERAH":
        led_hijau.off()
        led_kuning.off()
        led_merah_penyeberangan.on()
    else:  # TUNGGU_KOSONG
        led_hijau.on()
        led_kuning.off()
        led_merah_penyeberangan.off()

    alarm_seberang = (fase_penyeberangan == "MERAH")

    # ----------------------------------------------
    # FITUR 4: BUZZER DUA FUNGSI
    # ----------------------------------------------
    update_buzzer(alarm_gas, alarm_seberang)

    # ----------------------------------------------
    # FITUR 5: SMART PJU (OTOMATIS / KONTROL WEB)
    # ----------------------------------------------
    nilai_ldr = ldr.read()

    print("\nSMART PJU")
    print("Nilai LDR:", nilai_ldr)

    # Cek apakah mode manual dari web sedang aktif
    if pju_manual_mode == "ON":
        led_merah.on()
        led_putih.on()
        kondisi_pju = "MANUAL_ON"
        status_pju = "MENYALA"
        print("Kondisi: MANUAL ON (KONTROL WEB) - PJU MENYALA")
    elif pju_manual_mode == "OFF":
        led_merah.off()
        led_putih.off()
        kondisi_pju = "MANUAL_OFF"
        status_pju = "MATI"
        print("Kondisi: MANUAL OFF (KONTROL WEB) - PJU MATI")
    else:
        # Mode Otomatis Sensor LDR
        if nilai_ldr > THRESHOLD_LDR:
            led_merah.on()
            led_putih.on()
            kondisi_pju = "GELAP"
            status_pju = "MENYALA"
            print("Kondisi: GELAP - PJU MENYALA")
        else:
            led_merah.off()
            led_putih.off()
            kondisi_pju = "TERANG"
            status_pju = "MATI"
            print("Kondisi: TERANG - PJU MATI")

    # ----------------------------------------------
    # FORMAT JSON UNTUK JEMBATAN WEB DASHBOARD
    # ----------------------------------------------
    jk_str = str(round(jarak_kanan, 1)) if jarak_kanan is not None else "null"
    jkr_str = str(round(jarak_kiri, 1)) if jarak_kiri is not None else "null"
    print(f'[JSON]{{"gas":{nilai_gas},"gasMode":"{gas_override_mode}","statusPolusi":"{status_polusi}","jarakKanan":{jk_str},"jarakKiri":{jkr_str},"orangKanan":{"true" if orang_kanan else "false"},"orangKiri":{"true" if orang_kiri else "false"},"lampu":"{fase_penyeberangan}","ldr":{nilai_ldr},"kondisi":"{kondisi_pju}","pjuStatus":"{status_pju}","pjuMode":"{pju_manual_mode}"}}')

    # ----------------------------------------------
    # RINGKASAN STATUS KOTA
    # ----------------------------------------------
    print("\n========== STATUS KOTA ==========")
    print("Polusi:", status_polusi)
    print("Alarm gas:", alarm_gas)
    print("Objek kanan:", orang_kanan)
    print("Objek kiri:", orang_kiri)
    print("Fase penyeberangan:", fase_penyeberangan)
    print("PJU:", status_pju, f"({pju_manual_mode})")
    print("=================================")

    time.sleep_ms(50)
