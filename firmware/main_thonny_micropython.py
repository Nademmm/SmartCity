# ==========================================================
# URBANPULSE - SMART CITY MONITORING & BIDIRECTIONAL CONTROL
# FIRMWARE MICROPYTHON (ESP32)
#
# 3 FITUR UTAMA + KONTROL DASHBOARD:
# 1. Monitoring Polusi Udara  -> Sensor Gas/MQ (Pin 39)
# 2. Smart Penyeberangan      -> 2 Sensor Ultrasonik (Pin 32/34 & 33/35)
#                                + LED Hijau (12), Kuning (14), Merah (27), Buzzer (13)
# 3. Smart PJU Otomatis/Manual-> Sensor LDR (Pin 36) + LED Merah (25) & LED Putih (26)
# ==========================================================

from machine import Pin, ADC, time_pulse_us
import time
import sys
import uselect

# Setup listener serial non-blocking untuk menerima perintah dari Dashboard
spoll = uselect.poll()
spoll.register(sys.stdin, uselect.POLLIN)

# Optional WiFi Telemetry ke Dashboard Next.js
ENABLE_WIFI_TELEMETRY = False
WIFI_SSID = "NAMA_WIFI_KAMU"
WIFI_PASSWORD = "PASSWORD_WIFI"
DASHBOARD_API_URL = "http://192.168.1.100:3000/api/iot/telemetry"

if ENABLE_WIFI_TELEMETRY:
    import network
    import urequests
    import ujson
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if not wlan.isconnected():
        wlan.connect(WIFI_SSID, WIFI_PASSWORD)

# ==================================================
# 1. SENSOR GAS (MQ Pin 39)
# ==================================================
sensor_gas = ADC(Pin(39))
sensor_gas.atten(ADC.ATTN_11DB)

# ==================================================
# 2. SENSOR ULTRASONIK
# ==================================================
TRIG_KANAN = Pin(32, Pin.OUT)
ECHO_KANAN = Pin(34, Pin.IN)

TRIG_KIRI = Pin(33, Pin.OUT)
ECHO_KIRI = Pin(35, Pin.IN)

# ==================================================
# 3. SENSOR LDR (Pin 36)
# ==================================================
ldr = ADC(Pin(36))
ldr.atten(ADC.ATTN_11DB)
THRESHOLD_LDR = 2000

# ==================================================
# 4. LED DAN BUZZER
# ==================================================
led_merah = Pin(25, Pin.OUT)  # PJU
led_putih = Pin(26, Pin.OUT)  # PJU

led_hijau = Pin(12, Pin.OUT)              # Traffic Hijau
led_kuning = Pin(14, Pin.OUT)             # Traffic Kuning
led_merah_penyeberangan = Pin(27, Pin.OUT)# Traffic Merah

buzzer = Pin(13, Pin.OUT)                 # Buzzer Penyeberangan & Alarm

# ==================================================
# 5. PENGATURAN & VARIABEL STATUS KONTROL
# ==================================================
BATAS_KANAN = 17
BATAS_KIRI = 25
WAKTU_KUNING = 1
WAKTU_MENYEBRANG = 5

# Mode PJU: "AUTO" (Sensor LDR), "ON" (Manual Nyala), "OFF" (Manual Mati)
pju_mode = "AUTO"

# Status penyeberangan
siap_menyeberang = True
force_crossing_trigger = False
force_crossing_reset = False

# Kondisi awal aktuator
led_hijau.on()
led_kuning.off()
led_merah_penyeberangan.off()
buzzer.off()
led_merah.off()
led_putih.off()

# ==================================================
# 6. FUNGSI PEMBACAAN SERIAL DARI DASHBOARD (NON-BLOCKING)
# ==================================================
def cek_perintah_serial():
    global pju_mode, force_crossing_trigger, force_crossing_reset
    while spoll.poll(0):
        try:
            raw_line = sys.stdin.readline()
            if not raw_line:
                break
            cmd = raw_line.strip()
            if not cmd:
                continue

            print("[ACK] Perintah Diterima:", cmd)

            # 1. KONTROL PJU (LED Pin 25 & 26)
            if cmd == "CMD:PJU_ON":
                pju_mode = "ON"
                led_merah.on()
                led_putih.on()
                print(">>> KONTROL PJU: MANUAL ON (LED Merah 25 & Putih 26 MENYALA)")

            elif cmd == "CMD:PJU_OFF":
                pju_mode = "OFF"
                led_merah.off()
                led_putih.off()
                print(">>> KONTROL PJU: MANUAL OFF (LED Merah 25 & Putih 26 MATI)")

            elif cmd == "CMD:PJU_AUTO":
                pju_mode = "AUTO"
                print(">>> KONTROL PJU: MODE OTOMATIS (SENSOR LDR)")

            # 2. KONTROL PENYEBERANGAN (LAMPU & BUZZER)
            elif cmd == "CMD:CROSSING_TRIGGER":
                force_crossing_trigger = True
                print(">>> KONTROL PENYEBERANGAN: DIPICU DARI DASHBOARD!")

            elif cmd == "CMD:CROSSING_RESET":
                force_crossing_reset = True
                siap_menyeberang = True
                led_merah_penyeberangan.off()
                led_kuning.off()
                led_hijau.on()
                buzzer.off()
                print(">>> KONTROL PENYEBERANGAN: DIRESET KE STATUS AMAN (HIJAU)")

            # 3. KONTROL BUZZER & ALARM
            elif cmd == "CMD:BUZZER_ON":
                buzzer.on()
                print(">>> KONTROL BUZZER: PIN 13 HIGH")

            elif cmd == "CMD:BUZZER_OFF":
                buzzer.off()
                print(">>> KONTROL BUZZER: PIN 13 LOW")

            elif cmd == "CMD:ALARM_TEST":
                print(">>> KONTROL ALARM: UJI POLA NADA BUZZER")
                for _ in range(3):
                    buzzer.on()
                    time.sleep_ms(150)
                    buzzer.off()
                    time.sleep_ms(100)

        except Exception as e:
            print("[ERR_SERIAL]", e)

# ==================================================
# 7. MEMBACA JARAK SENSOR ULTRASONIK
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

def baca_jarak_stabil(TRIG, ECHO):
    hasil = []
    for i in range(3):
        cek_perintah_serial()
        jarak = baca_jarak(TRIG, ECHO)
        if jarak is not None:
            hasil.append(jarak)
        if i < 2:
            time.sleep_ms(60)
    if len(hasil) < 2:
        return None
    hasil.sort()
    return hasil[len(hasil) // 2]

# ==================================================
# 8. PROGRAM UTAMA
# ==================================================
print("\n================================")
print(" URBANPULSE SMART CITY (ESP32)  ")
print(" KONTROL SERIAL DUA ARAH AKTIF  ")
print("================================")

while True:
    # 0. Cek instruksi masuk dari dashboard secara instan
    cek_perintah_serial()

    # ----------------------------------------------
    # FITUR 1: MONITORING GAS
    # ----------------------------------------------
    nilai_gas = sensor_gas.read()
    if nilai_gas < 1000:
        status_polusi = "UDARA BERSIH"
    elif nilai_gas < 1500:
        status_polusi = "POLUSI SEDANG"
    else:
        status_polusi = "POLUSI TINGGI"

    # ----------------------------------------------
    # FITUR 2: BACA DUA SENSOR ULTRASONIK
    # ----------------------------------------------
    jarak_kanan = baca_jarak_stabil(TRIG_KANAN, ECHO_KANAN)
    time.sleep_ms(40)
    cek_perintah_serial()
    jarak_kiri = baca_jarak_stabil(TRIG_KIRI, ECHO_KIRI)

    # Deteksi objek fisik
    orang_kanan = (jarak_kanan is not None and 0 < jarak_kanan <= BATAS_KANAN)
    orang_kiri = (jarak_kiri is not None and 0 < jarak_kiri <= BATAS_KIRI)
    ada_orang = orang_kanan or orang_kiri

    # Periksa apakah dipicu oleh objek sensor ATAU tombol dashboard
    pemicu_penyeberangan = (siap_menyeberang and ada_orang) or force_crossing_trigger

    # ----------------------------------------------
    # SIKLUS PENYEBERANGAN (DAPAT DIKONTROL DASHBOARD)
    # ----------------------------------------------
    if pemicu_penyeberangan:
        siap_menyeberang = False
        force_crossing_trigger = False
        force_crossing_reset = False

        print(">>> SIKLUS PENYEBERANGAN DIMULAI!")
        if ada_orang:
            print(">>> DIPICU OLEH SENSOR ULTRASONIK")
        else:
            print(">>> DIPICU OLEH KONTROL DASHBOARD")

        # Fase 1: Lampu Kuning (1 Detik)
        led_hijau.off()
        led_kuning.on()
        led_merah_penyeberangan.off()
        buzzer.off()
        print(">>> LAMPU KUNING")

        for _ in range(10):
            cek_perintah_serial()
            if force_crossing_reset:
                break
            time.sleep_ms(100)

        # Fase 2: Lampu Merah + Buzzer (5 Detik)
        if not force_crossing_reset:
            led_kuning.off()
            led_merah_penyeberangan.on()
            print(">>> LAMPU MERAH - PENYEBERANG JALAN")

            pola_bunyi = [
                (0.15, 0.10),
                (0.15, 0.10),
                (0.15, 0.35),
                (0.15, 0.10),
                (0.15, 0.10),
                (0.15, 0.35),
            ]

            for detik in range(WAKTU_MENYEBRANG, 0, -1):
                if force_crossing_reset:
                    break
                print("Sisa waktu:", detik, "detik")

                for bunyi, jeda in pola_bunyi:
                    cek_perintah_serial()
                    if force_crossing_reset:
                        break
                    buzzer.on()
                    time.sleep(bunyi)
                    buzzer.off()
                    time.sleep(jeda)

        # Siklus selesai atau direset
        buzzer.off()
        led_merah_penyeberangan.off()
        led_kuning.off()
        led_hijau.on()
        force_crossing_reset = False
        print(">>> SELESAI - KEMBALI KE LAMPU HIJAU")

    elif not siap_menyeberang:
        led_hijau.on()
        led_kuning.off()
        led_merah_penyeberangan.off()
        buzzer.off()
        if not ada_orang:
            siap_menyeberang = True
            print(">>> AREA KOSONG - SIAP MENDETEKSI LAGI")

    else:
        led_hijau.on()
        led_kuning.off()
        led_merah_penyeberangan.off()
        buzzer.off()

    # ----------------------------------------------
    # FITUR 3: SMART PJU (KONTROL AUTO / MANUAL DASHBOARD)
    # ----------------------------------------------
    nilai_ldr = ldr.read()

    if pju_mode == "ON":
        led_merah.on()
        led_putih.on()
        pju_status = "MENYALA"
        kondisi_pju = "MANUAL_ON"
    elif pju_mode == "OFF":
        led_merah.off()
        led_putih.off()
        pju_status = "MATI"
        kondisi_pju = "MANUAL_OFF"
    else:
        # MODE AUTO (Mengikuti Sensor LDR)
        if nilai_ldr > THRESHOLD_LDR:
            led_merah.on()
            led_putih.on()
            pju_status = "MENYALA"
            kondisi_pju = "GELAP"
        else:
            led_merah.off()
            led_putih.off()
            pju_status = "MATI"
            kondisi_pju = "TERANG"

    # ----------------------------------------------
    # KIRIM FORMAT TELEMETRI SERIAL & JSON KE DASHBOARD
    # ----------------------------------------------
    lampu_status = "MERAH" if not siap_menyeberang and led_merah_penyeberangan.value() == 1 else "KUNING" if led_kuning.value() == 1 else "HIJAU"
    j_kanan = str(round(jarak_kanan, 1)) if jarak_kanan is not None else "null"
    j_kiri = str(round(jarak_kiri, 1)) if jarak_kiri is not None else "null"

    # Baris JSON untuk komunikasi langsung dengan Web Serial / Bridge
    print("[JSON]{\"gas\":" + str(nilai_gas) + ",\"statusPolusi\":\"" + status_polusi + "\",\"jarakKanan\":" + j_kanan + ",\"jarakKiri\":" + j_kiri + ",\"orangKanan\":" + ("true" if orang_kanan else "false") + ",\"orangKiri\":" + ("true" if orang_kiri else "false") + ",\"siapMenyeberang\":" + ("true" if siap_menyeberang else "false") + ",\"lampu\":\"" + lampu_status + "\",\"ldr\":" + str(nilai_ldr) + ",\"kondisi\":\"" + kondisi_pju + "\",\"pjuStatus\":\"" + pju_status + "\",\"pjuMode\":\"" + pju_mode + "\"}")

    # Kirim Telemetri ke Next.js Dashboard jika WiFi aktif
    if ENABLE_WIFI_TELEMETRY:
        try:
            payload = {
                "deviceId": "ESP32-MINIATURE",
                "type": "miniature-all",
                "payload": {
                    "gas": {
                        "gasValue": nilai_gas,
                        "statusPolusi": status_polusi
                    },
                    "crossing": {
                        "jarakKanan": jarak_kanan,
                        "jarakKiri": jarak_kiri,
                        "orangKanan": orang_kanan,
                        "orangKiri": orang_kiri,
                        "batasKanan": BATAS_KANAN,
                        "batasKiri": BATAS_KIRI,
                        "lampu": lampu_status,
                        "statusRingkasan": "OBJEK TERDETEKSI" if ada_orang else "AMAN"
                    },
                    "pju": {
                        "ldrValue": nilai_ldr,
                        "thresholdLdr": THRESHOLD_LDR,
                        "kondisi": kondisi_pju,
                        "pjuStatus": pju_status,
                        "pjuMode": pju_mode,
                        "ledMerah": led_merah.value() == 1,
                        "ledPutih": led_putih.value() == 1
                    }
                }
            }
            urequests.post(DASHBOARD_API_URL, json=payload).close()
        except Exception:
            pass

    # Jeda singkat sebelum membaca ulang sambil memeriksa serial
    for _ in range(3):
        cek_perintah_serial()
        time.sleep_ms(100)
