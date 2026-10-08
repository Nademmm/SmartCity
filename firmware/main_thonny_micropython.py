# ==========================================================
# URBANPULSE - SMART CITY MONITORING (MICROPYTHON THONNY)
#
# 3 FITUR:
# 1. Monitoring Polusi Udara  -> Sensor Gas/MQ (Pin 39)
# 2. Smart Penyeberangan      -> 2 Sensor Ultrasonik (Pin 32/34 & 33/35)
# 3. Smart PJU Otomatis       -> Sensor LDR (Pin 36)
# ==========================================================

from machine import Pin, ADC, time_pulse_us
import time

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
# 1. SENSOR GAS
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
# 3. SENSOR LDR
# ==================================================
ldr = ADC(Pin(36))
ldr.atten(ADC.ATTN_11DB)
THRESHOLD_LDR = 2000

# ==================================================
# 4. LED DAN BUZZER
# ==================================================
led_merah = Pin(25, Pin.OUT)  # PJU
led_putih = Pin(26, Pin.OUT)  # PJU

led_hijau = Pin(12, Pin.OUT)
led_kuning = Pin(14, Pin.OUT)
led_merah_penyeberangan = Pin(27, Pin.OUT)

buzzer = Pin(13, Pin.OUT)

# ==================================================
# 5. PENGATURAN
# ==================================================
BATAS_KANAN = 17
BATAS_KIRI = 25     # Deteksi hanya sampai 17 cm di kanan, 25 cm di kiri
WAKTU_KUNING = 1
WAKTU_MENYEBRANG = 5

# Status agar satu objek tidak memicu siklus berulang
siap_menyeberang = True

# Kondisi awal
led_hijau.on()
led_kuning.off()
led_merah_penyeberangan.off()
buzzer.off()
led_merah.off()
led_putih.off()

# ==================================================
# 6. MEMBACA JARAK SENSOR ULTRASONIK
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
# 7. FILTER PEMBACAAN SENSOR
# ==================================================
def baca_jarak_stabil(TRIG, ECHO):
    hasil = []

    for i in range(3):
        jarak = baca_jarak(TRIG, ECHO)

        if jarak is not None:
            hasil.append(jarak)

        if i < 2:
            time.sleep_ms(100)

    if len(hasil) < 2:
        return None

    hasil.sort()
    return hasil[len(hasil) // 2]


# ==================================================
# 8. PROGRAM UTAMA
# ==================================================
while True:
    print("\n================================")
    print("    URBANPULSE SMART CITY")
    print("================================")

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

    print("\nMONITORING POLUSI")
    print("Nilai gas:", nilai_gas)
    print("Status:", status_polusi)

    # ----------------------------------------------
    # FITUR 2: BACA DUA SENSOR
    # ----------------------------------------------
    jarak_kanan = baca_jarak_stabil(
        TRIG_KANAN, ECHO_KANAN
    )

    # Jeda agar sensor tidak saling mengganggu
    time.sleep_ms(80)

    jarak_kiri = baca_jarak_stabil(
        TRIG_KIRI, ECHO_KIRI
    )

    print("\nMONITORING PENYEBERANGAN")

    if jarak_kanan is None:
        print("Jarak kanan: tidak terbaca")
    else:
        print("Jarak kanan:", round(jarak_kanan, 1), "cm")

    if jarak_kiri is None:
        print("Jarak kiri: tidak terbaca")
    else:
        print("Jarak kiri:", round(jarak_kiri, 1), "cm")

    # Deteksi objek dengan batas berbeda
    orang_kanan = (
        jarak_kanan is not None
        and 0 < jarak_kanan <= BATAS_KANAN
    )

    orang_kiri = (
        jarak_kiri is not None
        and 0 < jarak_kiri <= BATAS_KIRI
    )

    ada_orang = orang_kanan or orang_kiri

    # ----------------------------------------------
    # JALANKAN SIKLUS PENYEBERANGAN SEKALI
    # ----------------------------------------------
    if siap_menyeberang and ada_orang:
        siap_menyeberang = False

        print(">>> OBJEK TERDETEKSI!")

        if orang_kanan:
            print(">>> SENSOR KANAN MENDETEKSI")

        if orang_kiri:
            print(">>> SENSOR KIRI MENDETEKSI")

        # Lampu kuning
        led_hijau.off()
        led_kuning.on()
        led_merah_penyeberangan.off()
        buzzer.off()

        print(">>> LAMPU KUNING")
        time.sleep(WAKTU_KUNING)

        # Lampu merah
        led_kuning.off()
        led_merah_penyeberangan.on()

        print(">>> LAMPU MERAH - MENYEBERANG")

        for detik in range(WAKTU_MENYEBRANG, 0, -1):
            print("Sisa waktu:", detik, "detik")

            # Pola bunyi: tototot, tototot
            pola_bunyi = [
                (0.15, 0.10),
                (0.15, 0.10),
                (0.15, 0.35),
                (0.15, 0.10),
                (0.15, 0.10),
                (0.15, 0.35),
            ]

            for bunyi, jeda in pola_bunyi:
                buzzer.on()
                time.sleep(bunyi)
                buzzer.off()
                time.sleep(jeda)

        # Siklus selesai
        buzzer.off()
        led_merah_penyeberangan.off()
        led_kuning.off()
        led_hijau.on()

        print(">>> SELESAI - LAMPU HIJAU")

    elif not siap_menyeberang:
        # Jangan mengulang siklus sampai area kosong
        led_hijau.on()
        led_kuning.off()
        led_merah_penyeberangan.off()
        buzzer.off()

        if not ada_orang:
            siap_menyeberang = True
            print(">>> AREA KOSONG - SIAP MENDETEKSI LAGI")
        else:
            print(">>> OBJEK MASIH TERDETEKSI")
            print(">>> MENUNGGU OBJEK MENJAUH")

    else:
        # Tidak ada objek
        led_hijau.on()
        led_kuning.off()
        led_merah_penyeberangan.off()
        buzzer.off()

        print(">>> AMAN - LAMPU HIJAU")

    # ----------------------------------------------
    # FITUR 3: SMART PJU
    # ----------------------------------------------
    nilai_ldr = ldr.read()

    print("\nSMART PJU")
    print("Nilai LDR:", nilai_ldr)

    if nilai_ldr > THRESHOLD_LDR:
        led_merah.on()
        led_putih.on()
        print("Kondisi: GELAP - PJU MENYALA")
    else:
        led_merah.off()
        led_putih.off()
        print("Kondisi: TERANG - PJU MATI")

    # ----------------------------------------------
    # RINGKASAN
    # ----------------------------------------------
    print("\n========== STATUS KOTA ==========")
    print("Polusi:", status_polusi)
    print("Objek kanan:", orang_kanan)
    print("Objek kiri:", orang_kiri)
    print("PJU:", "MENYALA" if nilai_ldr > THRESHOLD_LDR
          else "MATI")
    print("=================================")

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
                        "lampu": "MERAH" if not siap_menyeberang and led_merah_penyeberangan.value() == 1 else "KUNING" if led_kuning.value() == 1 else "HIJAU",
                        "statusRingkasan": "OBJEK TERDETEKSI" if ada_orang else "AMAN"
                    },
                    "pju": {
                        "ldrValue": nilai_ldr,
                        "thresholdLdr": THRESHOLD_LDR,
                        "kondisi": "GELAP" if nilai_ldr > THRESHOLD_LDR else "TERANG",
                        "pjuStatus": "MENYALA" if nilai_ldr > THRESHOLD_LDR else "MATI",
                        "ledMerah": nilai_ldr > THRESHOLD_LDR,
                        "ledPutih": nilai_ldr > THRESHOLD_LDR
                    }
                }
            }
            urequests.post(DASHBOARD_API_URL, json=payload).close()
        except Exception:
            pass

    # Jeda singkat sebelum membaca ulang
    time.sleep_ms(300)
