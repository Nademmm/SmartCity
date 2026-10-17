# ==========================================================
# URBANPULSE - SMART CITY MONITORING & BIDIRECTIONAL CONTROL
# FIRMWARE MICROPYTHON (ESP32)
#
# FITUR UTAMA + KONTROL DASHBOARD:
# 1. Monitoring Polusi Udara  -> Sensor Gas/MQ (Pin 39)
# 2. Smart Penyeberangan      -> 2 Sensor Ultrasonik (Pin 32/34 & 33/35)
#                                + LED Hijau (12), Kuning (14), Merah (27), Buzzer (13)
# 3. Smart PJU Otomatis/Manual-> Sensor LDR (Pin 36) + LED Merah (25) & LED Putih (26)
# 4. [BARU - REVISI] Monitor Hijau LCD 16x2 I2C (SDA Pin 21, SCL Pin 22)
#    - Menampilkan ucapan: "Selamat Datang Di Kota Pintar"
#    - Berubah otomatis saat polusi naik: "STATUS: BAHAYA! Polusi: TINGGI"
# 5. [BARU - REVISI] 2 LED Tambahan:
#    - LED Peringatan Polusi (Pin 18) -> Menyala saat polusi tinggi
#    - LED Udara Bersih / Status Aman (Pin 19) -> Menyala saat udara bersih
# ==========================================================

from machine import Pin, ADC, I2C, time_pulse_us
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
# 4. LED DAN BUZZER (LAMA)
# ==================================================
led_merah = Pin(25, Pin.OUT)  # PJU Merah
led_putih = Pin(26, Pin.OUT)  # PJU Putih

led_hijau = Pin(12, Pin.OUT)              # Traffic Hijau
led_kuning = Pin(14, Pin.OUT)             # Traffic Kuning
led_merah_penyeberangan = Pin(27, Pin.OUT)# Traffic Merah

buzzer = Pin(13, Pin.OUT)                 # Buzzer Penyeberangan & Alarm

# ==================================================
# 5. [BARU - REVISI] 2 LED INDIKATOR TAMBAHAN
# ==================================================
led_polusi_warning = Pin(18, Pin.OUT)     # LED Peringatan Polusi Naik (Merah/Kuning)
led_udara_bersih   = Pin(19, Pin.OUT)     # LED Status Udara Bersih / Aman (Hijau)

# ==================================================
# 6. [BARU - REVISI] DRIVER LCD 16X2 I2C (MONITOR HIJAU)
# ==================================================
class I2cLcd1602:
    """Driver LCD 1602 I2C berbasis PCF8574 mandiri dan ringan"""
    def __init__(self, i2c_bus, addr, lines=2, cols=16):
        self.i2c = i2c_bus
        self.addr = addr
        self.lines = lines
        self.cols = cols
        self.backlight = 0x08
        time.sleep_ms(50)
        self._write_nibble(0x30)
        time.sleep_ms(5)
        self._write_nibble(0x30)
        time.sleep_us(150)
        self._write_nibble(0x30)
        self._write_nibble(0x20)
        self.cmd(0x28)
        self.cmd(0x0C)
        self.cmd(0x06)
        self.clear()

    def _write_nibble(self, nibble):
        byte = (nibble & 0xF0) | self.backlight
        self.i2c.writeto(self.addr, bytes([byte | 0x04]))
        time.sleep_us(1)
        self.i2c.writeto(self.addr, bytes([byte & ~0x04]))
        time.sleep_us(50)

    def cmd(self, c):
        self._write_nibble(c & 0xF0)
        self._write_nibble((c << 4) & 0xF0)

    def char(self, ch):
        val = ord(ch) if isinstance(ch, str) else ch
        byte1 = (val & 0xF0) | self.backlight | 0x01
        self.i2c.writeto(self.addr, bytes([byte1 | 0x04]))
        time.sleep_us(1)
        self.i2c.writeto(self.addr, bytes([byte1 & ~0x04]))
        time.sleep_us(50)
        byte2 = ((val << 4) & 0xF0) | self.backlight | 0x01
        self.i2c.writeto(self.addr, bytes([byte2 | 0x04]))
        time.sleep_us(1)
        self.i2c.writeto(self.addr, bytes([byte2 & ~0x04]))
        time.sleep_us(50)

    def clear(self):
        self.cmd(0x01)
        time.sleep_ms(2)

    def move_to(self, col, row):
        addr = col & 0x3F
        if row == 1:
            addr += 0x40
        self.cmd(0x80 | addr)

    def print_text(self, text):
        for ch in text:
            self.char(ch)

# Inisialisasi Hardware I2C (Pin 21 SDA, Pin 22 SCL)
lcd_device = None
lcd_tersedia = False

try:
    i2c_bus = I2C(0, scl=Pin(22), sda=Pin(21), freq=100000)
    devices = i2c_bus.scan()
    print("[I2C SCAN] Perangkat terdeteksi di alamat:", [hex(d) for d in devices])

    target_addr = None
    for addr in [0x27, 0x3F, 0x20, 0x38]:
        if addr in devices:
            target_addr = addr
            break
    if target_addr is None and len(devices) > 0:
        target_addr = devices[0]

    if target_addr is not None:
        lcd_device = I2cLcd1602(i2c_bus, target_addr)
        lcd_tersedia = True
        print("[LCD] Monitor Hijau Terhubung pada alamat:", hex(target_addr))
    else:
        print("[LCD] Perhatian: LCD belum terdeteksi. Program tetap berjalan normal.")
except Exception as e:
    print("[LCD WARN] Gagal inisialisasi I2C LCD:", e)
    lcd_tersedia = False

# Cache tampilan LCD agar tidak flicker
cache_line1 = ""
cache_line2 = ""

def update_monitor_lcd(baris1, baris2):
    """Memperbarui teks pada Monitor Hijau 16x2 hanya jika teks berubah"""
    global cache_line1, cache_line2, lcd_tersedia
    if not lcd_tersedia or lcd_device is None:
        return
    try:
        # Padded tepat 16 karakter agar menghapus sisa karakter lama
        b1 = (baris1[:16] + " " * 16)[:16]
        b2 = (baris2[:16] + " " * 16)[:16]

        if b1 != cache_line1:
            lcd_device.move_to(0, 0)
            lcd_device.print_text(b1)
            cache_line1 = b1

        if b2 != cache_line2:
            lcd_device.move_to(0, 1)
            lcd_device.print_text(b2)
            cache_line2 = b2
    except Exception as e:
        print("[LCD ERR]", e)
        lcd_tersedia = False

# ==================================================
# 7. PENGATURAN & VARIABEL STATUS KONTROL
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

# Kondisi awal 2 LED Baru
led_polusi_warning.off()
led_udara_bersih.on()

# Tampilkan ucapan sambutan pertama kali pada Monitor Hijau
update_monitor_lcd("Selamat Datang", "Di Kota Pintar")

# ==================================================
# 8. FUNGSI PEMBACAAN SERIAL DARI DASHBOARD (NON-BLOCKING)
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

            # 4. UJI 2 LED TAMBAHAN
            elif cmd == "CMD:TEST_NEW_LEDS":
                print(">>> UJI 2 LED TAMBAHAN (Pin 18 & 19)")
                led_polusi_warning.on()
                led_udara_bersih.on()
                time.sleep_ms(500)
                led_polusi_warning.off()
                led_udara_bersih.off()
                time.sleep_ms(300)

        except Exception as e:
            print("[ERR_SERIAL]", e)

# ==================================================
# 9. MEMBACA JARAK SENSOR ULTRASONIK
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
# 10. PROGRAM UTAMA
# ==================================================
print("\n================================")
print(" URBANPULSE SMART CITY (ESP32)  ")
print(" KONTROL SERIAL DUA ARAH AKTIF  ")
print(" MONITOR HIJAU & 2 LED AKTIF    ")
print("================================")

siklus_tampilan_lcd = 0

while True:
    # 0. Cek instruksi masuk dari dashboard secara instan
    cek_perintah_serial()

    # ----------------------------------------------
    # FITUR 1: MONITORING GAS & LOGIKA MONITOR HIJAU / 2 LED
    # ----------------------------------------------
    nilai_gas = sensor_gas.read()

    if nilai_gas >= 1500:
        status_polusi = "POLUSI TINGGI"
        # 2 LED Tambahan: Peringatan Polusi MENYALA, Bersih MATI
        led_polusi_warning.on()
        led_udara_bersih.off()
        # Monitor Hijau: Menampilkan peringatan bahaya polusi
        update_monitor_lcd("STATUS: BAHAYA!", "Polusi: TINGGI")

    elif nilai_gas >= 1000:
        status_polusi = "POLUSI SEDANG"
        # 2 LED Tambahan: Keduanya menyala (waspada)
        led_polusi_warning.on()
        led_udara_bersih.on()
        # Monitor Hijau: Menampilkan status waspada
        update_monitor_lcd("STATUS: WASPADA", "Gas: " + str(nilai_gas) + " Sedang")

    else:
        status_polusi = "UDARA BERSIH"
        # 2 LED Tambahan: Peringatan MATI, Udara Bersih MENYALA
        led_polusi_warning.off()
        led_udara_bersih.on()

        # Monitor Hijau: Bergantian menampilkan ucapan selamat datang dan kualitas udara
        siklus_tampilan_lcd = (siklus_tampilan_lcd + 1) % 6
        if siklus_tampilan_lcd < 3:
            update_monitor_lcd("Selamat Datang", "Di Kota Pintar")
        else:
            update_monitor_lcd("UrbanPulse Aman", "Gas: " + str(nilai_gas) + " Bersih")

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
    print("[JSON]{\"gas\":" + str(nilai_gas) + ",\"statusPolusi\":\"" + status_polusi + "\",\"jarakKanan\":" + j_kanan + ",\"jarakKiri\":" + j_kiri + ",\"orangKanan\":" + ("true" if orang_kanan else "false") + ",\"orangKiri\":" + ("true" if orang_kiri else "false") + ",\"siapMenyeberang\":" + ("true" if siap_menyeberang else "false") + ",\"lampu\":\"" + lampu_status + "\",\"ldr\":" + str(nilai_ldr) + ",\"kondisi\":\"" + kondisi_pju + "\",\"pjuStatus\":\"" + pju_status + "\",\"pjuMode\":\"" + pju_mode + "\",\"ledPolusi\":" + ("true" if led_polusi_warning.value() == 1 else "false") + ",\"ledBersih\":" + ("true" if led_udara_bersih.value() == 1 else "false") + ",\"lcdTersedia\":" + ("true" if lcd_tersedia else "false") + "}")

    # Kirim Telemetri ke Next.js Dashboard jika WiFi aktif
    if ENABLE_WIFI_TELEMETRY:
        try:
            payload = {
                "deviceId": "ESP32-MINIATURE",
                "type": "miniature-all",
                "payload": {
                    "gas": {
                        "gasValue": nilai_gas,
                        "statusPolusi": status_polusi,
                        "ledPolusi": led_polusi_warning.value() == 1,
                        "ledBersih": led_udara_bersih.value() == 1
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
                    },
                    "monitorLcd": {
                        "tersedia": lcd_tersedia,
                        "baris1": cache_line1,
                        "baris2": cache_line2
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
