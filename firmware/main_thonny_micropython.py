from machine import Pin, ADC, I2C, SoftI2C, time_pulse_us
import time
import sys
import uselect
import network
import usocket as socket
import ussl as ssl
import ujson as json
import _thread
from i2c_lcd import I2cLcd

# ==================================================
# 0. PENGATURAN WI-FI & CLOUD DASHBOARD VERCEL
# ==================================================
# Masukkan nama WiFi (SSID) dan password jaringan Anda di sini.
# Catatan: ESP32 hanya mendukung frekuensi 2.4 GHz (bukan 5 GHz).
# Anda dapat mendaftarkan beberapa WiFi (misal WiFi rumah & Hotspot HP).
WIFI_NETWORKS = [
    ("NAMA_WIFI_ANDA", "PASSWORD_WIFI_ANDA"),
    ("Dedem", "NNN12814"),
]

CLOUD_HOST = "smartcity-esp32.vercel.app"
CLOUD_PORT = 443
CLOUD_PATH = "/api/iot/telemetry"
DEVICE_ID = "ESP32-MINIATURE"

wifi_status = "DISCONNECTED"
wifi_ip = "0.0.0.0"
latest_telemetry_payload = {}

# ==================================================
# 1. LCD I2C (Otomatis Mendeteksi Pin SCL & SDA + SoftI2C)
# ==================================================
i2c = None
alamat_lcd = []

for scl_p, sda_p in [(22, 21), (21, 22), (19, 18)]:
    try:
        temp_i2c = SoftI2C(scl=Pin(scl_p), sda=Pin(sda_p), freq=100000)
        scan_res = temp_i2c.scan()
        if len(scan_res) > 0:
            i2c = temp_i2c
            alamat_lcd = scan_res
            print(f"[I2C OK] Terdeteksi pada SCL={scl_p}, SDA={sda_p} -> Alamat: {[hex(x) for x in alamat_lcd]}")
            break
    except Exception:
        pass

lcd = None
if i2c is not None and len(alamat_lcd) > 0:
    try:
        lcd = I2cLcd(i2c, alamat_lcd[0], 2, 16)
        lcd.clear()
        lcd.move_to(0, 0)
        lcd.putstr("SELAMAT DATANG")
        lcd.move_to(0, 1)
        lcd.putstr("DI SMART CITY")
        time.sleep(3)
        lcd.clear()
        print("[LCD] Berhasil terhubung dan teks ditampilkan!")
    except Exception as e:
        lcd = None
        print("[LCD ERR] Gagal inisialisasi LCD:", e)
else:
    print("[I2C ERR] Perangkat LCD I2C tidak terdeteksi!")

# ==================================================
# 2. SENSOR GAS MQ (PIN 39)
# ==================================================
sensor_gas = ADC(Pin(39))
sensor_gas.atten(ADC.ATTN_11DB)
BATAS_GAS = 1500

# ==================================================
# 3. SENSOR ULTRASONIK (DUAL)
# ==================================================
TRIG_KANAN = Pin(32, Pin.OUT)
ECHO_KANAN = Pin(34, Pin.IN)

TRIG_KIRI = Pin(33, Pin.OUT)
ECHO_KIRI = Pin(35, Pin.IN)

TRIG_KANAN.off()
TRIG_KIRI.off()

BATAS_KANAN = 17
BATAS_KIRI = 25

# ==================================================
# 4. SENSOR LDR (PIN 36)
# ==================================================
ldr = ADC(Pin(36))
ldr.atten(ADC.ATTN_11DB)
THRESHOLD_LDR = 2000

# ==================================================
# 5. LED DAN BUZZER (AKTUATOR)
# ==================================================
led_merah = Pin(25, Pin.OUT)  # PJU Merah
led_putih = Pin(26, Pin.OUT)  # PJU Putih

led_hijau = Pin(12, Pin.OUT)              # Penyeberangan Hijau
led_kuning = Pin(14, Pin.OUT)             # Penyeberangan Kuning
led_merah_penyeberangan = Pin(27, Pin.OUT)# Penyeberangan Merah

buzzer = Pin(4, Pin.OUT)

# ==================================================
# 6. STATUS & LOGIKA PERANGKAT
# ==================================================
WAKTU_KUNING = 1000       # 1 detik
WAKTU_MENYEBRANG = 5000   # 5 detik

siap_menyeberang = True
fase_penyeberangan = "HIJAU"
waktu_fase = time.ticks_ms()

pju_manual_mode = "AUTO"  # "AUTO", "ON", atau "OFF"
ldr_override_mode = "AUTO"
nilai_ldr_manual = 1200
gas_override_mode = "AUTO"
nilai_gas_manual = 650

def eksekusi_perintah(line):
    global siap_menyeberang, fase_penyeberangan, waktu_fase
    global pju_manual_mode, ldr_override_mode, nilai_ldr_manual
    global gas_override_mode, nilai_gas_manual

    line = line.strip()
    if not line:
        return

    print(">>> EKSEKUSI PERINTAH:", line)

    if line == "CMD:PJU_ON":
        pju_manual_mode = "ON"
        led_merah.on()
        led_putih.on()
        print(">>> STATUS PJU: MANUAL ON (KONTROL CLOUD)")

    elif line == "CMD:PJU_OFF":
        pju_manual_mode = "OFF"
        led_merah.off()
        led_putih.off()
        print(">>> STATUS PJU: MANUAL OFF (KONTROL CLOUD)")

    elif line == "CMD:PJU_AUTO":
        pju_manual_mode = "AUTO"
        ldr_override_mode = "AUTO"
        print(">>> STATUS PJU: OTOMATIS SENSOR LDR")

    elif line.startswith("CMD:LDR_SET:"):
        try:
            nilai_ldr_manual = int(line.split(":")[2])
            ldr_override_mode = "MANUAL"
            print(">>> STATUS LDR: MANUAL SET KE", nilai_ldr_manual)
        except Exception as ex:
            print("[ERR_LDR_SET]", ex)

    elif line in ("CMD:FORCE_CROSSING", "CMD:CROSSING_TRIGGER"):
        if fase_penyeberangan in ("HIJAU", "TUNGGU_KOSONG"):
            siap_menyeberang = False
            fase_penyeberangan = "KUNING"
            waktu_fase = time.ticks_ms()
            print(">>> PENYEBERANGAN DIPAKSA DARI CLOUD!")

    elif line == "CMD:CROSSING_RESET":
        siap_menyeberang = True
        fase_penyeberangan = "HIJAU"
        waktu_fase = time.ticks_ms()
        led_hijau.on()
        led_kuning.off()
        led_merah_penyeberangan.off()
        buzzer.off()
        print(">>> PENYEBERANGAN DIRESET KE HIJAU")

    elif line in ("CMD:BUZZER_TEST", "CMD:ALARM_TEST"):
        buzzer.on()
        time.sleep_ms(300)
        buzzer.off()
        print(">>> UJI BUZZER 300ms SUKSES")

    elif line == "CMD:BUZZER_MUTE":
        buzzer.off()
        print(">>> BUZZER DIBISUKAN")

    elif line == "CMD:GAS_AUTO":
        gas_override_mode = "AUTO"
        print(">>> STATUS GAS: OTOMATIS SENSOR MQ PIN 39")

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

    elif line in ("CMD:GAS_TINGGI", "CMD:GAS_BAHAYA"):
        gas_override_mode = "MANUAL"
        nilai_gas_manual = 2100
        print(">>> STATUS GAS: MANUAL POLUSI TINGGI (2100)")

    elif line.startswith("CMD:GAS_SET:"):
        try:
            nilai_gas_manual = int(line.split(":")[2])
            gas_override_mode = "MANUAL"
            print(">>> STATUS GAS: MANUAL SET KE", nilai_gas_manual)
        except Exception as ex:
            print("[ERR_GAS_SET]", ex)

# Listener serial UART non-blocking (tetap aktif jika dicolok USB)
spoll = uselect.poll()
spoll.register(sys.stdin, uselect.POLLIN)

def cek_perintah_serial():
    while spoll.poll(0):
        try:
            line = sys.stdin.readline().strip()
            if not line:
                break
            eksekusi_perintah(line)
        except Exception as err:
            print("[ERR_SERIAL]", err)
            break

# ==================================================
# 7. KONEKSI WI-FI & SINKRONISASI CLOUD HTTPS
# ==================================================
wlan = network.WLAN(network.STA_IF)

def hubungkan_wifi():
    global wifi_status, wifi_ip
    wlan.active(True)
    if wlan.isconnected():
        wifi_status = "CONNECTED"
        wifi_ip = wlan.ifconfig()[0]
        return True

    for ssid, password in WIFI_NETWORKS:
        if not ssid or ssid == "NAMA_WIFI_ANDA":
            continue

        print(f"[WIFI] Mencari & menghubungkan ke SSID '{ssid}'...")
        if lcd is not None:
            try:
                lcd.clear()
                lcd.move_to(0, 0)
                lcd.putstr("WIFI CONNECTING")
                lcd.move_to(0, 1)
                lcd.putstr(ssid[:16])
            except Exception:
                pass

        wlan.connect(ssid, password)
        t_mulai = time.ticks_ms()
        while not wlan.isconnected() and time.ticks_diff(time.ticks_ms(), t_mulai) < 12000:
            time.sleep_ms(300)

        if wlan.isconnected():
            wifi_ip = wlan.ifconfig()[0]
            wifi_status = "CONNECTED"
            print(f"[WIFI OK] Terhubung ke {ssid}! IP: {wifi_ip}")
            if lcd is not None:
                try:
                    lcd.clear()
                    lcd.move_to(0, 0)
                    lcd.putstr("WIFI TERHUBUNG")
                    lcd.move_to(0, 1)
                    lcd.putstr(wifi_ip[:16])
                    time.sleep(2)
                    lcd.clear()
                except Exception:
                    pass
            return True

    wifi_status = "FAILED"
    print("[WIFI] Belum dapat terhubung ke WiFi. Sensor tetap berjalan offline.")
    return False

def kirim_telemetri_https(payload_dict):
    """
    Mengirim telemetri ke Vercel via HTTPS (Port 443 dengan SNI)
    dan mengembalikan daftar perintah yang sedang menunggu dari Web.
    """
    s = socket.socket()
    s.settimeout(4)
    try:
        addr = socket.getaddrinfo(CLOUD_HOST, CLOUD_PORT)[0][-1]
        s.connect(addr)
        s = ssl.wrap_socket(s, server_hostname=CLOUD_HOST)

        body = json.dumps({
            "deviceId": DEVICE_ID,
            "type": "miniature-all",
            "payload": payload_dict
        })

        req = (
            f"POST {CLOUD_PATH} HTTP/1.1\r\n"
            f"Host: {CLOUD_HOST}\r\n"
            f"Content-Type: application/json\r\n"
            f"Content-Length: {len(body)}\r\n"
            f"Connection: close\r\n\r\n{body}"
        )
        s.write(req.encode('utf-8'))

        raw_resp = b""
        while True:
            chunk = s.read(512)
            if not chunk:
                break
            raw_resp += chunk

        resp_str = raw_resp.decode('utf-8', 'ignore')
        start = resp_str.find("{")
        end = resp_str.rfind("}")
        if start != -1 and end != -1 and end > start:
            parsed = json.loads(resp_str[start:end+1])
            return parsed.get("commands", [])
        return []
    except Exception as ex:
        # Kesalahan timeout atau jaringan
        return []
    finally:
        try:
            s.close()
        except Exception:
            pass

def cloud_worker_thread():
    """Thread latar belakang pada Core 0 untuk mengurus Wi-Fi dan Cloud Vercel."""
    print("[THREAD] Cloud Worker berjalan di Core 0...")
    while True:
        try:
            if not wlan.isconnected():
                hubungkan_wifi()
                time.sleep(4)
                continue

            if latest_telemetry_payload:
                snapshot = dict(latest_telemetry_payload)
                cmds = kirim_telemetri_https(snapshot)
                if cmds:
                    for cmd in cmds:
                        action = cmd.get("action")
                        if action:
                            eksekusi_perintah(action)

            time.sleep_ms(1200) # Sinkronisasi cloud setiap 1.2 detik
        except Exception as err:
            time.sleep_ms(2000)

# Jalankan worker Wi-Fi / Cloud pada thread terpisah agar sensor tidak macet
try:
    _thread.start_new_thread(cloud_worker_thread, ())
    print("[THREAD OK] Worker Cloud berhasil diluncurkan!")
except Exception as ex:
    print("[THREAD ERR] Gagal meluncurkan thread, fallback single-core:", ex)

# ==================================================
# 8. BUZZER DUA FUNGSI & POLA NADA
# ==================================================
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

# Kondisi Awal LED & Aktuator
led_hijau.on()
led_kuning.off()
led_merah_penyeberangan.off()
buzzer.off()
led_merah.off()
led_putih.off()

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
# 9. PEMBACAAN JARAK ULTRASONIK
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
        jarak = baca_jarak(TRIG, ECHO)
        if jarak is not None:
            hasil.append(jarak)
        if i < 2:
            time.sleep_ms(30)

    if len(hasil) == 0:
        return None
    hasil.sort()
    return hasil[len(hasil) // 2]

# ==================================================
# 10. PROGRAM UTAMA (LOOP REAL-TIME CORE 1)
# ==================================================
while True:
    # 0. Periksa input serial USB jika dicolok kabel
    cek_perintah_serial()

    # ----------------------------------------------
    # FITUR 1: SENSOR GAS MQ & LCD 16x2
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

    alarm_gas = (nilai_gas >= BATAS_GAS)

    # Ikon status Wi-Fi pada baris pertama LCD
    tag_wifi = "[W]" if wlan.isconnected() else "[X]"

    if lcd is not None:
        try:
            lcd.move_to(0, 0)
            lcd.putstr("MQ:{:4d}      {}".format(nilai_gas, tag_wifi))
            lcd.move_to(0, 1)
            lcd.putstr("{:<16}".format(status_polusi[:16]))
        except Exception:
            pass

    # ----------------------------------------------
    # FITUR 2: BACA DUA SENSOR ULTRASONIK
    # ----------------------------------------------
    jarak_kanan = baca_jarak_stabil(TRIG_KANAN, ECHO_KANAN)
    time.sleep_ms(40)
    jarak_kiri = baca_jarak_stabil(TRIG_KIRI, ECHO_KIRI)

    orang_kanan = (jarak_kanan is not None and 0 < jarak_kanan <= BATAS_KANAN)
    orang_kiri = (jarak_kiri is not None and 0 < jarak_kiri <= BATAS_KIRI)
    ada_orang = orang_kanan or orang_kiri

    # ----------------------------------------------
    # FITUR 3: SIKLUS LAMPU PENYEBERANGAN
    # ----------------------------------------------
    sekarang = time.ticks_ms()

    if fase_penyeberangan == "HIJAU":
        if siap_menyeberang and ada_orang:
            siap_menyeberang = False
            fase_penyeberangan = "KUNING"
            waktu_fase = sekarang
            print(">>> OBJEK TERDETEKSI DI ZEBRACROSS!")

    elif fase_penyeberangan == "KUNING":
        if time.ticks_diff(sekarang, waktu_fase) >= WAKTU_KUNING:
            fase_penyeberangan = "MERAH"
            waktu_fase = sekarang
            print(">>> LAMPU MERAH: KENDARAAN BERHENTI, PEJALAN MENYEBERANG")

    elif fase_penyeberangan == "MERAH":
        if time.ticks_diff(sekarang, waktu_fase) >= WAKTU_MENYEBRANG:
            fase_penyeberangan = "TUNGGU_KOSONG"
            print(">>> WAKTU MENYEBERANG SELESAI, MENUNGGU AREA KOSONG")

    elif fase_penyeberangan == "TUNGGU_KOSONG":
        if not ada_orang:
            siap_menyeberang = True
            fase_penyeberangan = "HIJAU"
            print(">>> AREA KOSONG: KEMBALI KE LAMPU HIJAU")

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
    # FITUR 4: BUZZER DUA FUNGSI (PIN 4)
    # ----------------------------------------------
    update_buzzer(alarm_gas, alarm_seberang)

    # ----------------------------------------------
    # FITUR 5: SMART PJU (LDR PIN 36 & LED 25/26)
    # ----------------------------------------------
    if ldr_override_mode == "MANUAL":
        nilai_ldr = nilai_ldr_manual
    else:
        nilai_ldr = ldr.read()

    if pju_manual_mode == "ON":
        led_merah.on()
        led_putih.on()
        kondisi_pju = "MANUAL_ON"
        status_pju = "MENYALA"
    elif pju_manual_mode == "OFF":
        led_merah.off()
        led_putih.off()
        kondisi_pju = "MANUAL_OFF"
        status_pju = "MATI"
    else:
        if nilai_ldr > THRESHOLD_LDR:
            led_merah.on()
            led_putih.on()
            kondisi_pju = "GELAP"
            status_pju = "MENYALA"
        else:
            led_merah.off()
            led_putih.off()
            kondisi_pju = "TERANG"
            status_pju = "MATI"

    # ----------------------------------------------
    # UPDATE SNAPSHOT TELEMETRI UNTUK CLOUD THREAD
    # ----------------------------------------------
    jk_val = round(jarak_kanan, 1) if jarak_kanan is not None else None
    jkr_val = round(jarak_kiri, 1) if jarak_kiri is not None else None

    latest_telemetry_payload = {
        "gas": {
            "gasValue": nilai_gas,
            "gasMode": gas_override_mode,
            "statusPolusi": status_polusi,
            "ledPolusi": alarm_gas,
            "ledBersih": not alarm_gas,
            "lcdBaris1": "MQ:{:4d}      {}".format(nilai_gas, tag_wifi),
            "lcdBaris2": "{:<16}".format(status_polusi[:16]),
        },
        "crossing": {
            "jarakKanan": jk_val,
            "jarakKiri": jkr_val,
            "orangKanan": orang_kanan,
            "orangKiri": orang_kiri,
            "lampu": fase_penyeberangan,
            "buzzer": alarm_seberang,
            "siapMenyeberang": siap_menyeberang,
            "statusRingkasan": (
                "ORANG MENYEBRANG" if alarm_seberang
                else "MENUNGGU KOSONG" if fase_penyeberangan == "TUNGGU_KOSONG"
                else "ORANG TERDETEKSI" if (orang_kanan or orang_kiri or fase_penyeberangan == "KUNING")
                else "AMAN"
            ),
        },
        "pju": {
            "ldrValue": nilai_ldr,
            "kondisi": kondisi_pju,
            "pjuStatus": status_pju,
            "pjuMode": pju_manual_mode,
            "ledMerah": (status_pju == "MENYALA"),
            "ledPutih": (status_pju == "MENYALA"),
        }
    }

    # Cetak JSON ke Serial UART untuk pemantauan jika dicolok ke PC
    print(f'[JSON]{{"gas":{nilai_gas},"gasMode":"{gas_override_mode}","statusPolusi":"{status_polusi}","jarakKanan":{jk_val},"jarakKiri":{jkr_val},"orangKanan":{"true" if orang_kanan else "false"},"orangKiri":{"true" if orang_kiri else "false"},"lampu":"{fase_penyeberangan}","ldr":{nilai_ldr},"kondisi":"{kondisi_pju}","pjuStatus":"{status_pju}","pjuMode":"{pju_manual_mode}","wifi":"{wifi_status}"}}')

    time.sleep_ms(50)
