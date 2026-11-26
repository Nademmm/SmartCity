from machine import Pin, ADC, I2C, SoftI2C, time_pulse_us
import time
import sys
import uselect
from i2c_lcd import I2cLcd

# ==================================================
# 1. LCD I2C (Otomatis Mendeteksi Pin SCL & SDA + SoftI2C)
# ==================================================
i2c = None
alamat_lcd = []

# Coba pasangan pin GPIO umum untuk ESP32
for scl_p, sda_p in [(22, 21), (21, 22), (19, 18)]:
    try:
        temp_i2c = SoftI2C(scl=Pin(scl_p), sda=Pin(sda_p), freq=100000)
        scan_res = temp_i2c.scan()
        if len(scan_res) > 0:
            i2c = temp_i2c
            alamat_lcd = scan_res
            print(f"[I2C OK] Terdeteksi pada SCL={scl_p}, SDA={sda_p} -> Alamat: {[hex(x) for x in alamat_lcd]}")
            break
    except Exception as e:
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
        time.sleep(2)
        lcd.clear()
        print("[LCD] Berhasil terhubung dan teks ditampilkan!")
    except Exception as e:
        lcd = None
        print("[LCD ERR] Gagal inisialisasi LCD:", e)
else:
    print("[I2C ERR] Perangkat LCD I2C tidak terdeteksi sama sekali!")

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

# ==================================================
# 6. PENGATURAN & KONTROL JARINGAN
# ==================================================
BATAS_KANAN = 17
BATAS_KIRI = 25

WAKTU_KUNING = 1
WAKTU_MENYEBRANG = 5

siap_menyeberang = True
kanan_siap = True
kiri_siap = True
paksa_seberang = False
batalkan_seberang = False
fase_penyeberangan = "HIJAU"

pju_manual_mode = "AUTO"    # "AUTO", "ON", atau "OFF"
ldr_override_mode = "AUTO"  # "AUTO" atau "MANUAL"
nilai_ldr_manual = 1200

gas_override_mode = "AUTO"  # "AUTO" atau "MANUAL"
nilai_gas_manual = 650
buzzer_muted = False

# Listener serial non-blocking untuk kendali dari Dashboard Web
spoll = uselect.poll()
spoll.register(sys.stdin, uselect.POLLIN)

def cek_perintah_jaringan():
    global siap_menyeberang, kanan_siap, kiri_siap, paksa_seberang, batalkan_seberang
    global fase_penyeberangan, pju_manual_mode, ldr_override_mode, nilai_ldr_manual
    global gas_override_mode, nilai_gas_manual, buzzer_muted

    while spoll.poll(0):
        try:
            line = sys.stdin.readline().strip()
            if not line:
                break

            print(">>> PERINTAH DITERIMA:", line)

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
                paksa_seberang = True
                batalkan_seberang = False
                print(">>> PENYEBERANGAN DIPAKSA AKTIF DARI WEB!")

            elif line == "CMD:CROSSING_RESET":
                siap_menyeberang = True
                kanan_siap = True
                kiri_siap = True
                paksa_seberang = False
                batalkan_seberang = True
                fase_penyeberangan = "HIJAU"
                led_hijau.on()
                led_kuning.off()
                led_merah_penyeberangan.off()
                buzzer.off()
                print(">>> PENYEBERANGAN DIRESET KE HIJAU")

            elif line in ("CMD:BUZZER_TEST", "CMD:ALARM_TEST"):
                buzzer.on()
                time.sleep_ms(300)
                buzzer.off()
                print(">>> UJI BUZZER SUKSES")

            elif line == "CMD:BUZZER_MUTE":
                buzzer_muted = True
                buzzer.off()
                print(">>> BUZZER DIBISUKAN")

            elif line == "CMD:GAS_AUTO":
                gas_override_mode = "AUTO"
                buzzer_muted = False
                print(">>> STATUS GAS: OTOMATIS SENSOR MQ PIN 39")

            elif line == "CMD:GAS_BERSIH":
                gas_override_mode = "MANUAL"
                nilai_gas_manual = 650
                buzzer_muted = False
                buzzer.off()
                print(">>> STATUS GAS: MANUAL UDARA BERSIH (650)")

            elif line == "CMD:GAS_SEDANG":
                gas_override_mode = "MANUAL"
                nilai_gas_manual = 1250
                buzzer_muted = False
                buzzer.off()
                print(">>> STATUS GAS: MANUAL POLUSI SEDANG (1250)")

            elif line in ("CMD:GAS_TINGGI", "CMD:GAS_BAHAYA"):
                gas_override_mode = "MANUAL"
                nilai_gas_manual = 2100
                buzzer_muted = False
                print(">>> STATUS GAS: MANUAL POLUSI TINGGI (2100)")

            elif line.startswith("CMD:GAS_SET:"):
                try:
                    nilai_gas_manual = int(line.split(":")[2])
                    gas_override_mode = "MANUAL"
                    buzzer_muted = False
                    print(">>> STATUS GAS: MANUAL SET KE", nilai_gas_manual)
                except Exception as ex:
                    print("[ERR_GAS_SET]", ex)
        except Exception as err:
            print("[ERR_CMD]", err)
            break

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

        if jarak <= 0 or jarak > 400:
            return None

        # Jika objek sangat dekat (< 2 cm), tetap anggap terdeteksi pada 1.5 cm
        if jarak < 2:
            jarak = 1.5

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
            time.sleep_ms(30)

    if len(hasil) == 0:
        return None

    hasil.sort()
    return hasil[len(hasil) // 2]

# ==================================================
# 10. CETAK PAKET JSON UNTUK WEB DASHBOARD
# ==================================================
def cetak_json_telemetri(nilai_gas, status_polusi, jarak_kanan, jarak_kiri, orang_kanan, orang_kiri, lampu_fase, nilai_ldr, kondisi_pju, status_pju, countdown=0):
    jk_str = str(round(jarak_kanan, 1)) if jarak_kanan is not None else "null"
    jkr_str = str(round(jarak_kiri, 1)) if jarak_kiri is not None else "null"
    ok_str = "true" if orang_kanan else "false"
    okr_str = "true" if orang_kiri else "false"
    print(f'[JSON]{{"gas":{nilai_gas},"gasMode":"{gas_override_mode}","statusPolusi":"{status_polusi}","jarakKanan":{jk_str},"jarakKiri":{jkr_str},"orangKanan":{ok_str},"orangKiri":{okr_str},"lampu":"{lampu_fase}","countdown":{countdown},"ldr":{nilai_ldr},"kondisi":"{kondisi_pju}","pjuStatus":"{status_pju}","pjuMode":"{pju_manual_mode}"}}')

# ==================================================
# 11. PROGRAM UTAMA
# ==================================================
while True:
    # 0. Periksa instruksi kendali dari Web Dashboard
    cek_perintah_jaringan()

    print("\n================================")
    print("      SISTEM SMART CITY")
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

    alarm_gas = (nilai_gas >= BATAS_GAS) and (not buzzer_muted)

    print("\nMONITORING POLUSI")
    print("Nilai gas:", nilai_gas)
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
    time.sleep_ms(50)
    jarak_kiri = baca_jarak_stabil(TRIG_KIRI, ECHO_KIRI)

    print("\nMONITORING PENYEBERANGAN")
    if jarak_kanan is None:
        print("Jarak kanan: tidak terbaca")
    else:
        print("Jarak kanan:", round(jarak_kanan, 1), "cm")

    if jarak_kiri is None:
        print("Jarak kiri: tidak terbaca")
    else:
        print("Jarak kiri:", round(jarak_kiri, 1), "cm")

    orang_kanan = (jarak_kanan is not None and 0 < jarak_kanan <= BATAS_KANAN)
    orang_kiri = (jarak_kiri is not None and 0 < jarak_kiri <= BATAS_KIRI)
    ada_orang = orang_kanan or orang_kiri

    print("Deteksi kanan:", orang_kanan)
    print("Deteksi kiri:", orang_kiri)

    # Reset kesiapan per sisi segera saat sisi tersebut sudah kosong
    if not orang_kanan:
        kanan_siap = True
    if not orang_kiri:
        kiri_siap = True
    if not ada_orang:
        siap_menyeberang = True

    # ----------------------------------------------
    # FITUR 5: SMART PJU (OTOMATIS / KONTROL WEB)
    # ----------------------------------------------
    if ldr_override_mode == "MANUAL":
        nilai_ldr = nilai_ldr_manual
    else:
        nilai_ldr = ldr.read()

    print("\nSMART PJU")
    print("Nilai LDR:", nilai_ldr)

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
    # FITUR 3 & 4: SIKLUS LAMPU PENYEBERANGAN & BUZZER
    # ----------------------------------------------
    pemicu_kanan = orang_kanan and kanan_siap
    pemicu_kiri = orang_kiri and kiri_siap

    if pemicu_kanan or pemicu_kiri or paksa_seberang:
        siap_menyeberang = False
        if orang_kanan:
            kanan_siap = False
        if orang_kiri:
            kiri_siap = False
        paksa_seberang = False
        batalkan_seberang = False

        print(">>> OBJEK TERDETEKSI!")
        if orang_kanan:
            print(">>> SENSOR KANAN MENDETEKSI")
        if orang_kiri:
            print(">>> SENSOR KIRI MENDETEKSI")

        # 1. Lampu kuning (1 detik)
        fase_penyeberangan = "KUNING"
        led_hijau.off()
        led_kuning.on()
        led_merah_penyeberangan.off()
        buzzer.off()

        print(">>> LAMPU KUNING")
        cetak_json_telemetri(nilai_gas, status_polusi, jarak_kanan, jarak_kiri, orang_kanan, orang_kiri, "KUNING", nilai_ldr, kondisi_pju, status_pju, WAKTU_KUNING)
        time.sleep(WAKTU_KUNING)

        # 2. Lampu merah penyeberangan (5 detik + pola buzzer)
        fase_penyeberangan = "MERAH"
        led_kuning.off()
        led_merah_penyeberangan.on()

        print(">>> LAMPU MERAH - MENYEBERANG")

        pola_bunyi = [
            (0.15, 0.10),
            (0.15, 0.10),
            (0.15, 0.35),
            (0.15, 0.10),
            (0.15, 0.10),
            (0.15, 0.35),
        ]

        for detik in range(WAKTU_MENYEBRANG, 0, -1):
            cek_perintah_jaringan()
            if batalkan_seberang:
                break

            print("Sisa waktu:", detik, "detik")
            cetak_json_telemetri(nilai_gas, status_polusi, jarak_kanan, jarak_kiri, orang_kanan, orang_kiri, "MERAH", nilai_ldr, kondisi_pju, status_pju, detik)

            for bunyi, jeda in pola_bunyi:
                cek_perintah_jaringan()
                if batalkan_seberang:
                    break
                buzzer.on()
                time.sleep(bunyi)
                buzzer.off()
                time.sleep(jeda)

        # 3. Siklus selesai -> kembali ke Lampu Hijau
        buzzer.off()
        led_merah_penyeberangan.off()
        led_kuning.off()
        led_hijau.on()
        fase_penyeberangan = "HIJAU"

        print(">>> SELESAI - LAMPU HIJAU")
        cetak_json_telemetri(nilai_gas, status_polusi, jarak_kanan, jarak_kiri, orang_kanan, orang_kiri, "HIJAU", nilai_ldr, kondisi_pju, status_pju, 0)

    else:
        # Kondisi normal Lampu Hijau
        fase_penyeberangan = "HIJAU"
        led_hijau.on()
        led_kuning.off()
        led_merah_penyeberangan.off()

        if not siap_menyeberang:
            if not ada_orang:
                siap_menyeberang = True
                print(">>> AREA KOSONG - SIAP MENDETEKSI LAGI")
            else:
                print(">>> MENUNGGU OBJEK MENJAUH")

        # Bunyikan alarm gas jika polusi tinggi (>= 1500) saat tidak sedang menyeberang
        if alarm_gas:
            buzzer.on()
            time.sleep_ms(120)
            buzzer.off()
            time.sleep_ms(100)
            buzzer.on()
            time.sleep_ms(120)
            buzzer.off()
        else:
            buzzer.off()

        # Cetak paket JSON untuk Web Dashboard
        cetak_json_telemetri(nilai_gas, status_polusi, jarak_kanan, jarak_kiri, orang_kanan, orang_kiri, fase_penyeberangan, nilai_ldr, kondisi_pju, status_pju, 0)

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
