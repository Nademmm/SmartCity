from machine import Pin, ADC, SoftI2C
import time
import sys
import uselect
from i2c_lcd import I2cLcd

# ==================================================
# 1. LCD I2C (AUTO-DETEKSI SCL & SDA)
# ==================================================
i2c = None
alamat_lcd = []

for scl_p, sda_p in [(22, 21), (21, 22), (19, 18)]:
    try:
        temp_i2c = SoftI2C(
            scl=Pin(scl_p),
            sda=Pin(sda_p),
            freq=100000
        )
        scan_res = temp_i2c.scan()

        if len(scan_res) > 0:
            i2c = temp_i2c
            alamat_lcd = scan_res
            print(
                "[I2C OK] SCL={}, SDA={} -> Alamat: {}".format(
                    scl_p, sda_p, [hex(x) for x in alamat_lcd]
                )
            )
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
        time.sleep(2)
        lcd.clear()
        print("[LCD] Berhasil terhubung!")
    except Exception as e:
        lcd = None
        print("[LCD ERR]", e)
else:
    print("[I2C ERR] LCD tidak terdeteksi!")

# ==================================================
# 2. SENSOR GAS MQ
# ==================================================
sensor_gas = ADC(Pin(39))
sensor_gas.atten(ADC.ATTN_11DB)
BATAS_GAS = 1500

# ==================================================
# 3. SENSOR LDR
# ==================================================
ldr = ADC(Pin(36))
ldr.atten(ADC.ATTN_11DB)
THRESHOLD_LDR = 2000

# ==================================================
# 4. SENSOR TOUCH (OUTPUT HIGH SAAT DISENTUH)
# ==================================================
touch_kanan = Pin(17, Pin.IN, Pin.PULL_DOWN)
touch_kiri = Pin(16, Pin.IN, Pin.PULL_DOWN)

touch_kanan_sebelumnya = False
touch_kiri_sebelumnya = False
waktu_touch_terakhir = 0
WAKTU_DEBOUNCE_TOUCH = 150  # ms anti-glitch sentuhan

# ==================================================
# 5. TRAFFIC LIGHT 1: KENDARAAN
# ==================================================
led_kendaraan_hijau = Pin(12, Pin.OUT)
led_kendaraan_kuning = Pin(14, Pin.OUT)
led_kendaraan_merah = Pin(32, Pin.OUT)

# ==================================================
# 6. TRAFFIC LIGHT 2: PEJALAN KAKI
# ==================================================
led_pejalan_merah = Pin(27, Pin.OUT)
led_pejalan_kuning = Pin(33, Pin.OUT)
led_pejalan_hijau = Pin(23, Pin.OUT)

# ==================================================
# 7. SMART PJU DAN BUZZER
# ==================================================
led_pju_merah = Pin(25, Pin.OUT)
led_pju_putih = Pin(26, Pin.OUT)
buzzer = Pin(4, Pin.OUT)

# ==================================================
# 8. PENGATURAN WAKTU, STATE, DAN KONTROL WEB
# ==================================================
WAKTU_KUNING_KENDARAAN = 3000  # 3 detik
WAKTU_KUNING_PEJALAN = 2000    # 2 detik
WAKTU_MENYEBRANG = 10000       # 10 detik

# Urutan state machine:
# NORMAL -> KUNING_KENDARAAN (3s) -> KUNING_PEJALAN (2s)
# -> MENYEBRANG (10s) -> KUNING_PENUTUP (2s) -> NORMAL
fase_penyeberangan = "NORMAL"
fase_lampu_aktif = ""
waktu_fase = time.ticks_ms()

pju_manual_mode = "AUTO"    # "AUTO", "ON", atau "OFF"
ldr_override_mode = "AUTO"  # "AUTO" atau "MANUAL"
nilai_ldr_manual = 1200

gas_override_mode = "AUTO"  # "AUTO" atau "MANUAL"
nilai_gas_manual = 650
buzzer_muted = False
buzzer_test_sampai = 0

# Flag kirim telemetri segera ketika ada perubahan state
kirim_segera = True

# ==================================================
# 9. SERIAL LISTENER NON-BLOCKING UNTUK WEB DASHBOARD
# ==================================================
spoll = uselect.poll()
spoll.register(sys.stdin, uselect.POLLIN)


def mulai_penyeberangan(sumber="TOUCH"):
    global fase_penyeberangan, waktu_fase, kirim_segera

    if fase_penyeberangan == "NORMAL":
        fase_penyeberangan = "KUNING_KENDARAAN"
        waktu_fase = time.ticks_ms()
        kirim_segera = True
        print(">>> PERMINTAAN PENYEBERANGAN DITERIMA:", sumber)


def reset_penyeberangan():
    global fase_penyeberangan, waktu_fase, kirim_segera

    fase_penyeberangan = "NORMAL"
    waktu_fase = time.ticks_ms()
    kirim_segera = True
    atur_traffic_light("NORMAL")
    print(">>> PENYEBERANGAN DIRESET KE NORMAL")


def cek_perintah_jaringan():
    global pju_manual_mode, ldr_override_mode, nilai_ldr_manual
    global gas_override_mode, nilai_gas_manual, buzzer_muted
    global buzzer_test_sampai, kirim_segera

    while spoll.poll(0):
        try:
            line = sys.stdin.readline().strip()

            if not line:
                break

            print(">>> PERINTAH DITERIMA:", line)

            if line == "CMD:PJU_ON":
                pju_manual_mode = "ON"
                kirim_segera = True
                print(">>> PJU MANUAL ON")

            elif line == "CMD:PJU_OFF":
                pju_manual_mode = "OFF"
                kirim_segera = True
                print(">>> PJU MANUAL OFF")

            elif line == "CMD:PJU_AUTO":
                pju_manual_mode = "AUTO"
                ldr_override_mode = "AUTO"
                kirim_segera = True
                print(">>> PJU OTOMATIS LDR")

            elif line.startswith("CMD:LDR_SET:"):
                try:
                    nilai_ldr_manual = int(line.split(":")[2])
                    ldr_override_mode = "MANUAL"
                    kirim_segera = True
                    print(">>> LDR MANUAL SET:", nilai_ldr_manual)
                except Exception as ex:
                    print("[ERR_LDR_SET]", ex)

            elif line in ("CMD:FORCE_CROSSING", "CMD:CROSSING_TRIGGER"):
                mulai_penyeberangan("WEB DASHBOARD")

            elif line == "CMD:TOUCH_KANAN":
                mulai_penyeberangan("WEB TOUCH KANAN")

            elif line == "CMD:TOUCH_KIRI":
                mulai_penyeberangan("WEB TOUCH KIRI")

            elif line == "CMD:CROSSING_RESET":
                reset_penyeberangan()

            elif line in ("CMD:BUZZER_TEST", "CMD:ALARM_TEST"):
                buzzer_test_sampai = time.ticks_add(time.ticks_ms(), 300)
                print(">>> UJI BUZZER SUKSES")

            elif line == "CMD:BUZZER_MUTE":
                buzzer_muted = True
                buzzer.off()
                kirim_segera = True
                print(">>> BUZZER GAS DIBISUKAN")

            elif line == "CMD:GAS_AUTO":
                gas_override_mode = "AUTO"
                buzzer_muted = False
                kirim_segera = True
                print(">>> GAS OTOMATIS SENSOR MQ PIN 39")

            elif line == "CMD:GAS_BERSIH":
                gas_override_mode = "MANUAL"
                nilai_gas_manual = 650
                buzzer_muted = False
                kirim_segera = True
                print(">>> GAS MANUAL BERSIH (650)")

            elif line == "CMD:GAS_SEDANG":
                gas_override_mode = "MANUAL"
                nilai_gas_manual = 1250
                buzzer_muted = False
                kirim_segera = True
                print(">>> GAS MANUAL SEDANG (1250)")

            elif line in ("CMD:GAS_TINGGI", "CMD:GAS_BAHAYA"):
                gas_override_mode = "MANUAL"
                nilai_gas_manual = 2100
                buzzer_muted = False
                kirim_segera = True
                print(">>> GAS MANUAL TINGGI (2100)")

            elif line.startswith("CMD:GAS_SET:"):
                try:
                    nilai_gas_manual = int(line.split(":")[2])
                    gas_override_mode = "MANUAL"
                    buzzer_muted = False
                    kirim_segera = True
                    print(">>> GAS MANUAL SET:", nilai_gas_manual)
                except Exception as ex:
                    print("[ERR_GAS_SET]", ex)

        except Exception as err:
            print("[ERR_CMD]", err)
            break


# ==================================================
# 10. BUZZER DUA FUNGSI: GAS DAN PENYEBERANGAN
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

DURASI_SIKLUS_SEBERANG = sum(b + j for b, j in POLA_SEBERANG)
jenis_alarm_sebelumnya = "none"
waktu_awal_alarm = time.ticks_ms()


def update_buzzer(alarm_gas, alarm_seberang, sekarang):
    global jenis_alarm_sebelumnya, waktu_awal_alarm

    # Prioritas uji buzzer non-blocking dari Web Dashboard
    if buzzer_test_sampai != 0 and time.ticks_diff(buzzer_test_sampai, sekarang) > 0:
        buzzer.on()
        return

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
        mode_gas = (
            waktu_aktif % (WAKTU_GANTI_MODE * 2)
            < WAKTU_GANTI_MODE
        )
    elif jenis_alarm == "gas":
        mode_gas = True
    else:
        mode_gas = False

    if mode_gas:
        fase = sekarang % INTERVAL_GAS
        if fase < 100 or 150 <= fase < 250:
            buzzer.on()
        else:
            buzzer.off()
    else:
        waktu_pola = (
            time.ticks_diff(sekarang, waktu_awal_alarm)
            % DURASI_SIKLUS_SEBERANG
        )

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
# 11. FUNGSI KONTROL KEDUA TRAFFIC LIGHT (BEBAS FLICKER)
# ==================================================
def atur_traffic_light(fase):
    global fase_lampu_aktif

    if fase == fase_lampu_aktif:
        return
    fase_lampu_aktif = fase

    led_kendaraan_hijau.off()
    led_kendaraan_kuning.off()
    led_kendaraan_merah.off()

    led_pejalan_merah.off()
    led_pejalan_kuning.off()
    led_pejalan_hijau.off()

    if fase == "NORMAL":
        led_kendaraan_hijau.on()
        led_pejalan_merah.on()

    elif fase == "KUNING_KENDARAAN":
        led_kendaraan_kuning.on()
        led_pejalan_merah.on()

    elif fase == "KUNING_PEJALAN":
        led_kendaraan_merah.on()
        led_pejalan_kuning.on()

    elif fase == "MENYEBRANG":
        led_kendaraan_merah.on()
        led_pejalan_hijau.on()

    elif fase == "KUNING_PENUTUP":
        led_kendaraan_merah.on()
        led_pejalan_kuning.on()


def hitung_sisa_detik(fase, sekarang):
    if fase == "NORMAL":
        return 0
    if fase == "KUNING_KENDARAAN":
        durasi = WAKTU_KUNING_KENDARAAN
    elif fase == "KUNING_PEJALAN":
        durasi = WAKTU_KUNING_PEJALAN
    elif fase == "MENYEBRANG":
        durasi = WAKTU_MENYEBRANG
    elif fase == "KUNING_PENUTUP":
        durasi = WAKTU_KUNING_PEJALAN
    else:
        return 0

    sisa_ms = durasi - time.ticks_diff(sekarang, waktu_fase)
    if sisa_ms <= 0:
        return 0
    return (sisa_ms + 999) // 1000


# ==================================================
# 12. KONDISI AWAL
# ==================================================
atur_traffic_light("NORMAL")
buzzer.off()
led_pju_merah.off()
led_pju_putih.off()

waktu_lcd_terakhir = 0
waktu_telemetri_terakhir = 0
lcd_baris1_terakhir = ""
lcd_baris2_terakhir = ""
status_pju_terakhir = ""
status_polusi_terakhir = ""

INTERVAL_LCD_MS = 350
INTERVAL_TELEMETRI_MS = 350

print("======================================")
print(" URBANPULSE SMART CITY - SISTEM AKTIF")
print(" Sensor Touch + Dual Traffic Light")
print("======================================")


# ==================================================
# 13. PROGRAM UTAMA (NON-BLOCKING & TEROPTIMASI)
# ==================================================
while True:
    sekarang = time.ticks_ms()

    # 0. Periksa instruksi kendali dari Web Dashboard
    cek_perintah_jaringan()

    # ----------------------------------------------
    # FITUR 1: MONITORING POLUSI GAS MQ
    # ----------------------------------------------
    if gas_override_mode == "MANUAL":
        nilai_gas = nilai_gas_manual
    else:
        nilai_gas = sensor_gas.read()

    if nilai_gas < 1000:
        status_polusi = "UDARA BERSIH"
    elif nilai_gas < BATAS_GAS:
        status_polusi = "POLUSI SEDANG"
    else:
        status_polusi = "POLUSI TINGGI"

    if status_polusi != status_polusi_terakhir:
        status_polusi_terakhir = status_polusi
        kirim_segera = True

    alarm_gas = (nilai_gas >= BATAS_GAS) and (not buzzer_muted)

    # Refresh LCD hanya tiap 350ms dan hanya jika teks berubah (mencegah flicker I2C)
    if lcd is not None and time.ticks_diff(sekarang, waktu_lcd_terakhir) >= INTERVAL_LCD_MS:
        waktu_lcd_terakhir = sekarang
        baris1 = "Nilai MQ: {:4d}  ".format(nilai_gas)
        baris2 = "{:<16}".format(status_polusi[:16])
        if baris1 != lcd_baris1_terakhir or baris2 != lcd_baris2_terakhir:
            try:
                lcd.move_to(0, 0)
                lcd.putstr(baris1)
                lcd.move_to(0, 1)
                lcd.putstr(baris2)
                lcd_baris1_terakhir = baris1
                lcd_baris2_terakhir = baris2
            except Exception as e:
                print("LCD bermasalah:", e)
                lcd = None

    # ----------------------------------------------
    # FITUR 2: DETEKSI PERMINTAAN DARI SENSOR TOUCH
    # ----------------------------------------------
    touch_kanan_aktif = touch_kanan.value() == 1
    touch_kiri_aktif = touch_kiri.value() == 1

    sentuhan_kanan_baru = touch_kanan_aktif and (not touch_kanan_sebelumnya)
    sentuhan_kiri_baru = touch_kiri_aktif and (not touch_kiri_sebelumnya)

    if touch_kanan_aktif != touch_kanan_sebelumnya or touch_kiri_aktif != touch_kiri_sebelumnya:
        kirim_segera = True

    touch_kanan_sebelumnya = touch_kanan_aktif
    touch_kiri_sebelumnya = touch_kiri_aktif

    if sentuhan_kanan_baru or sentuhan_kiri_baru:
        if time.ticks_diff(sekarang, waktu_touch_terakhir) >= WAKTU_DEBOUNCE_TOUCH:
            waktu_touch_terakhir = sekarang
            if sentuhan_kanan_baru:
                print(">>> TOUCH KANAN TERDETEKSI")
                mulai_penyeberangan("TOUCH KANAN")
            if sentuhan_kiri_baru:
                print(">>> TOUCH KIRI TERDETEKSI")
                mulai_penyeberangan("TOUCH KIRI")

    # ----------------------------------------------
    # FITUR 3: URUTAN OTOMATIS DUA TRAFFIC LIGHT
    # ----------------------------------------------
    if fase_penyeberangan == "KUNING_KENDARAAN":
        if time.ticks_diff(sekarang, waktu_fase) >= WAKTU_KUNING_KENDARAAN:
            fase_penyeberangan = "KUNING_PEJALAN"
            waktu_fase = sekarang
            kirim_segera = True
            print(">>> KENDARAAN MERAH, PEJALAN KAKI KUNING")

    elif fase_penyeberangan == "KUNING_PEJALAN":
        if time.ticks_diff(sekarang, waktu_fase) >= WAKTU_KUNING_PEJALAN:
            fase_penyeberangan = "MENYEBRANG"
            waktu_fase = sekarang
            kirim_segera = True
            print(">>> PEJALAN KAKI HIJAU - SILAKAN MENYEBRANG")

    elif fase_penyeberangan == "MENYEBRANG":
        if time.ticks_diff(sekarang, waktu_fase) >= WAKTU_MENYEBRANG:
            fase_penyeberangan = "KUNING_PENUTUP"
            waktu_fase = sekarang
            kirim_segera = True
            print(">>> WAKTU MENYEBRANG SELESAI")

    elif fase_penyeberangan == "KUNING_PENUTUP":
        if time.ticks_diff(sekarang, waktu_fase) >= WAKTU_KUNING_PEJALAN:
            fase_penyeberangan = "NORMAL"
            waktu_fase = sekarang
            kirim_segera = True
            print(">>> KEMBALI KE KONDISI NORMAL")

    atur_traffic_light(fase_penyeberangan)

    alarm_seberang = (fase_penyeberangan == "MENYEBRANG")

    # ----------------------------------------------
    # FITUR 4: BUZZER GAS + PENYEBERANGAN
    # ----------------------------------------------
    update_buzzer(alarm_gas, alarm_seberang, sekarang)

    # ----------------------------------------------
    # FITUR 5: SMART PJU OTOMATIS DENGAN LDR
    # ----------------------------------------------
    if ldr_override_mode == "MANUAL":
        nilai_ldr = nilai_ldr_manual
    else:
        nilai_ldr = ldr.read()

    if pju_manual_mode == "ON":
        led_pju_merah.on()
        led_pju_putih.on()
        kondisi_pju = "MANUAL_ON"
        status_pju = "MENYALA"

    elif pju_manual_mode == "OFF":
        led_pju_merah.off()
        led_pju_putih.off()
        kondisi_pju = "MANUAL_OFF"
        status_pju = "MATI"

    else:
        if nilai_ldr > THRESHOLD_LDR:
            led_pju_merah.on()
            led_pju_putih.on()
            kondisi_pju = "GELAP"
            status_pju = "MENYALA"
        else:
            led_pju_merah.off()
            led_pju_putih.off()
            kondisi_pju = "TERANG"
            status_pju = "MATI"

    if status_pju != status_pju_terakhir:
        status_pju_terakhir = status_pju
        kirim_segera = True

    # ----------------------------------------------
    # FITUR 6: KIRIM JSON & LOG RINGKAS (TIAP 350ms ATAU SAAT BERUBAH)
    # ----------------------------------------------
    if kirim_segera or time.ticks_diff(sekarang, waktu_telemetri_terakhir) >= INTERVAL_TELEMETRI_MS:
        waktu_telemetri_terakhir = sekarang
        kirim_segera = False
        sisa_detik = hitung_sisa_detik(fase_penyeberangan, sekarang)

        print(
            '[JSON]{'
            '"gas":' + str(nilai_gas) + ','
            '"gasMode":"' + gas_override_mode + '",'
            '"statusPolusi":"' + status_polusi + '",'
            '"touchKanan":' + ("true" if touch_kanan_aktif else "false") + ','
            '"touchKiri":' + ("true" if touch_kiri_aktif else "false") + ','
            '"jarakKanan":null,'
            '"jarakKiri":null,'
            '"orangKanan":' + ("true" if touch_kanan_aktif else "false") + ','
            '"orangKiri":' + ("true" if touch_kiri_aktif else "false") + ','
            '"lampu":"' + fase_penyeberangan + '",'
            '"countdown":' + str(sisa_detik) + ','
            '"buzzerSeberang":' + ("true" if alarm_seberang else "false") + ','
            '"alarmGas":' + ("true" if alarm_gas else "false") + ','
            '"ldr":' + str(nilai_ldr) + ','
            '"kondisi":"' + kondisi_pju + '",'
            '"pjuStatus":"' + status_pju + '",'
            '"pjuMode":"' + pju_manual_mode + '"'
            '}'
        )

        print(
            "[STATUS] Gas:{} ({}) | Touch R:{} L:{} | Fase:{} ({}s) | PJU:{} ({})".format(
                nilai_gas,
                status_polusi,
                1 if touch_kanan_aktif else 0,
                1 if touch_kiri_aktif else 0,
                fase_penyeberangan,
                sisa_detik,
                status_pju,
                pju_manual_mode,
            )
        )

    time.sleep_ms(15)
