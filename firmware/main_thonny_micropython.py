from machine import Pin, ADC, SoftI2C
import time
import sys
import uselect
import gc
import ujson
from i2c_lcd import I2cLcd

try:
    import network
    import socket
    import _thread
    WIFI_AVAILABLE = True
except Exception:
    WIFI_AVAILABLE = False

try:
    import ssl
except Exception:
    try:
        import ussl as ssl
    except Exception:
        ssl = None

# ==================================================
# 0. KONFIGURASI WIFI & CLOUD DASHBOARD (TANPA USB)
# ==================================================
# Isi nama Wi-Fi (2.4 GHz) dan password Anda di sini, ATAU atur langsung dari:
# - Web Dashboard (tab Serial & Log -> Koneksi Wi-Fi ESP32), ATAU
# - Portal Wi-Fi Cadangan ESP32: hubungkan HP ke "SmartCity-ESP32-Setup"
#   (sandi: 12345678) lalu buka http://192.168.4.1
WIFI_DEFAULT_LIST = [
    ("Dedem", "NNN12814"),
]

WIFI_CONFIG_FILE = "wifi_config.json"
AP_SSID = "SmartCity-ESP32-Setup"
AP_PASS = "12345678"

CLOUD_HOST = "broker.emqx.io"
CLOUD_PORT = 1883
MQTT_TOPIC_TELEMETRY = "urbanpulse/smartcity-esp32-nadem-2026/telemetry"
MQTT_TOPIC_CMD = "urbanpulse/smartcity-esp32-nadem-2026/cmd"
DEVICE_ID = "ESP32-MINIATURE"
INTERVAL_CLOUD_MS = 500

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
cloud_kirim_segera = True

# State Wi-Fi & snapshot telemetri untuk worker thread
wifi_terhubung = False
wifi_ssid_aktif = ""
wifi_ip_aktif = ""
wifi_pesan_terakhir = "Belum ada Wi-Fi tersimpan"
wifi_reconnect_flag = False
lcd_pesan_sementara_sampai = 0
lcd_pesan_baris1 = ""
lcd_pesan_baris2 = ""

telemetri_terbaru = {
    "gas": 0,
    "gasMode": "AUTO",
    "statusPolusi": "UDARA BERSIH",
    "touchKanan": False,
    "touchKiri": False,
    "lampu": "NORMAL",
    "countdown": 0,
    "buzzerSeberang": False,
    "ldr": 0,
    "kondisi": "TERANG",
    "pjuStatus": "MATI",
    "pjuMode": "AUTO",
}


def tampilkan_pesan_lcd(b1, b2, durasi_ms=2500):
    global lcd_pesan_sementara_sampai, lcd_pesan_baris1, lcd_pesan_baris2
    lcd_pesan_baris1 = "{:<16}".format(str(b1)[:16])
    lcd_pesan_baris2 = "{:<16}".format(str(b2)[:16])
    lcd_pesan_sementara_sampai = time.ticks_add(time.ticks_ms(), durasi_ms)


def muat_daftar_wifi():
    daftar = []
    try:
        with open(WIFI_CONFIG_FILE, "r") as f:
            cfg = ujson.loads(f.read())
            s = cfg.get("ssid", "").strip()
            p = cfg.get("password", "")
            if s:
                daftar.append((s, p))
    except Exception:
        pass
    for item in WIFI_DEFAULT_LIST:
        if item and item[0]:
            daftar.append((item[0], item[1]))
    return daftar


def simpan_wifi_config(ssid, password):
    global wifi_reconnect_flag
    try:
        with open(WIFI_CONFIG_FILE, "w") as f:
            f.write(ujson.dumps({"ssid": ssid, "password": password}))
        wifi_reconnect_flag = True
        print(">>> WIFI DISIMPAN:", ssid)
        tampilkan_pesan_lcd("WIFI DISIMPAN:", ssid, 2500)
        return True
    except Exception as e:
        print("[WIFI SAVE ERR]", e)
        return False


def url_decode(text):
    text = text.replace("+", " ")
    out = ""
    i = 0
    n = len(text)
    while i < n:
        if text[i] == "%" and i + 2 < n:
            try:
                out += chr(int(text[i + 1:i + 3], 16))
                i += 3
                continue
            except Exception:
                pass
        out += text[i]
        i += 1
    return out


# ==================================================
# 9. DISPATCHER PERINTAH (USB SERIAL + WIFI CLOUD)
# ==================================================
spoll = uselect.poll()
spoll.register(sys.stdin, uselect.POLLIN)


def mulai_penyeberangan(sumber="TOUCH"):
    global fase_penyeberangan, waktu_fase, kirim_segera, cloud_kirim_segera

    if fase_penyeberangan == "NORMAL":
        fase_penyeberangan = "KUNING_KENDARAAN"
        waktu_fase = time.ticks_ms()
        kirim_segera = True
        cloud_kirim_segera = True
        print(">>> PERMINTAAN PENYEBERANGAN DITERIMA:", sumber)


def reset_penyeberangan():
    global fase_penyeberangan, waktu_fase, kirim_segera, cloud_kirim_segera

    fase_penyeberangan = "NORMAL"
    waktu_fase = time.ticks_ms()
    kirim_segera = True
    cloud_kirim_segera = True
    atur_traffic_light("NORMAL")
    print(">>> PENYEBERANGAN DIRESET KE NORMAL")


def eksekusi_perintah(line):
    global pju_manual_mode, ldr_override_mode, nilai_ldr_manual
    global gas_override_mode, nilai_gas_manual, buzzer_muted
    global buzzer_test_sampai, kirim_segera, cloud_kirim_segera
    global wifi_reconnect_flag

    line = line.strip()
    if not line:
        return

    print(">>> PERINTAH DITERIMA:", line)

    if line == "CMD:PJU_ON":
        pju_manual_mode = "ON"
        kirim_segera = True
        cloud_kirim_segera = True
        print(">>> PJU MANUAL ON")

    elif line == "CMD:PJU_OFF":
        pju_manual_mode = "OFF"
        kirim_segera = True
        cloud_kirim_segera = True
        print(">>> PJU MANUAL OFF")

    elif line == "CMD:PJU_AUTO":
        pju_manual_mode = "AUTO"
        ldr_override_mode = "AUTO"
        kirim_segera = True
        cloud_kirim_segera = True
        print(">>> PJU OTOMATIS LDR")

    elif line.startswith("CMD:LDR_SET:"):
        try:
            nilai_ldr_manual = int(line.split(":")[2])
            ldr_override_mode = "MANUAL"
            kirim_segera = True
            cloud_kirim_segera = True
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
        cloud_kirim_segera = True
        print(">>> BUZZER GAS DIBISUKAN")

    elif line == "CMD:GAS_AUTO":
        gas_override_mode = "AUTO"
        buzzer_muted = False
        kirim_segera = True
        cloud_kirim_segera = True
        print(">>> GAS OTOMATIS SENSOR MQ PIN 39")

    elif line == "CMD:GAS_BERSIH":
        gas_override_mode = "MANUAL"
        nilai_gas_manual = 650
        buzzer_muted = False
        kirim_segera = True
        cloud_kirim_segera = True
        print(">>> GAS MANUAL BERSIH (650)")

    elif line == "CMD:GAS_SEDANG":
        gas_override_mode = "MANUAL"
        nilai_gas_manual = 1250
        buzzer_muted = False
        kirim_segera = True
        cloud_kirim_segera = True
        print(">>> GAS MANUAL SEDANG (1250)")

    elif line in ("CMD:GAS_TINGGI", "CMD:GAS_BAHAYA"):
        gas_override_mode = "MANUAL"
        nilai_gas_manual = 2100
        buzzer_muted = False
        kirim_segera = True
        cloud_kirim_segera = True
        print(">>> GAS MANUAL TINGGI (2100)")

    elif line.startswith("CMD:GAS_SET:"):
        try:
            nilai_gas_manual = int(line.split(":")[2])
            gas_override_mode = "MANUAL"
            buzzer_muted = False
            kirim_segera = True
            cloud_kirim_segera = True
            print(">>> GAS MANUAL SET:", nilai_gas_manual)
        except Exception as ex:
            print("[ERR_GAS_SET]", ex)

    elif line.startswith("CMD:WIFI_SET:"):
        try:
            payload = line[len("CMD:WIFI_SET:"):]
            if "|" in payload:
                ssid_baru, pass_baru = payload.split("|", 1)
            else:
                ssid_baru, pass_baru = payload, ""
            ssid_baru = ssid_baru.strip()
            if ssid_baru:
                simpan_wifi_config(ssid_baru, pass_baru)
        except Exception as ex:
            print("[ERR_WIFI_SET]", ex)

    elif line == "CMD:WIFI_STATUS":
        print(
            "[WIFI STATUS] Connected={} SSID={} IP={}".format(
                wifi_terhubung, wifi_ssid_aktif, wifi_ip_aktif
            )
        )

    elif line == "CMD:WIFI_RESET":
        try:
            import os
            os.remove(WIFI_CONFIG_FILE)
        except Exception:
            pass
        wifi_reconnect_flag = True
        print(">>> KONFIGURASI WIFI DIHAPUS, MEMBUKA PORTAL AP")


def cek_perintah_jaringan():
    while spoll.poll(0):
        try:
            line = sys.stdin.readline().strip()
            if not line:
                break
            eksekusi_perintah(line)
        except Exception as err:
            print("[ERR_CMD]", err)
            break


# ==================================================
# 10. WORKER WIFI + PORTAL SETUP AP + MQTT REAL-TIME CLOUD SYNC
# ==================================================
def mqtt_encode_varint(n):
    out = bytearray()
    while True:
        digit = n % 128
        n //= 128
        if n > 0:
            digit |= 0x80
        out.append(digit)
        if n == 0:
            break
    return bytes(out)


def mqtt_encode_str(s):
    b = s.encode("utf-8")
    return len(b).to_bytes(2, "big") + b


def mqtt_buka_koneksi():
    sock = None
    try:
        gc.collect()
        addr = socket.getaddrinfo(CLOUD_HOST, CLOUD_PORT, socket.AF_INET)[0][-1]
        sock = socket.socket()
        sock.settimeout(5)
        sock.connect(addr)

        # MQTT 3.1.1 CONNECT (Clean Session, KeepAlive 60s)
        cid = "esp32_sc_" + str(time.ticks_ms() % 100000)
        vh = b"\x00\x04MQTT\x04\x02\x00\x3c"
        pl = mqtt_encode_str(cid)
        pkt = b"\x10" + mqtt_encode_varint(len(vh) + len(pl)) + vh + pl
        sock.send(pkt)
        ack = sock.recv(4)
        if len(ack) < 4 or ack[0] != 0x20 or ack[3] != 0x00:
            raise OSError("MQTT CONNACK invalid")

        # SUBSCRIBE ke topik perintah kontrol dari Web Dashboard
        sub_vh = b"\x00\x01"
        sub_pl = mqtt_encode_str(MQTT_TOPIC_CMD) + b"\x00"
        sub_pkt = b"\x82" + mqtt_encode_varint(len(sub_vh) + len(sub_pl)) + sub_vh + sub_pl
        sock.send(sub_pkt)
        sock.settimeout(0.08)
        print("[CLOUD OK] MQTT Real-Time terhubung ke", CLOUD_HOST)
        return sock
    except Exception as e:
        print("[CLOUD ERR]", e)
        try:
            if sock is not None:
                sock.close()
        except Exception:
            pass
        return None


def mqtt_publish_json(sock, topic, payload_str):
    tb = mqtt_encode_str(topic)
    pb = payload_str.encode("utf-8")
    pkt = b"\x30" + mqtt_encode_varint(len(tb) + len(pb)) + tb + pb
    sock.send(pkt)


def mqtt_proses_masuk(sock, buf):
    try:
        chunk = sock.recv(512)
        if chunk == b"":
            return None, False
        if chunk:
            buf += chunk
    except OSError:
        # Timeout 80ms normal saat tidak ada pesan baru
        pass

    while len(buf) >= 2:
        hdr = buf[0]
        mult = 1
        rem_len = 0
        idx = 1
        lengkap = False
        while idx < len(buf) and idx <= 4:
            b = buf[idx]
            rem_len += (b & 0x7F) * mult
            idx += 1
            if (b & 0x80) == 0:
                lengkap = True
                break
            mult *= 128
        if not lengkap or len(buf) < idx + rem_len:
            break

        body = buf[idx:idx + rem_len]
        buf = buf[idx + rem_len:]

        if (hdr & 0xF0) == 0x30 and len(body) >= 2:
            tlen = (body[0] << 8) | body[1]
            qos = (hdr >> 1) & 0x03
            pstart = 2 + tlen + (2 if qos > 0 else 0)
            if pstart <= len(body):
                cmd_str = body[pstart:].decode("utf-8", "ignore").strip()
                if cmd_str:
                    eksekusi_perintah(cmd_str)

    return buf, True


def hubungkan_wifi_sta(sta, daftar_wifi):
    global wifi_terhubung, wifi_ssid_aktif, wifi_ip_aktif, wifi_pesan_terakhir

    sta.active(True)
    if not daftar_wifi:
        wifi_pesan_terakhir = "Belum ada Wi-Fi tersimpan"
        return False

    for ssid, pwd in daftar_wifi:
        if not ssid:
            continue
        print("[WIFI] Menghubungkan ke:", ssid)
        tampilkan_pesan_lcd("Hubung Wi-Fi:", ssid, 2000)
        try:
            if sta.isconnected():
                sta.disconnect()
                time.sleep_ms(200)
            sta.connect(ssid, pwd)
        except Exception as e:
            print("[WIFI CONN ERR]", e)
            wifi_pesan_terakhir = "Gagal mulai koneksi ke " + ssid
            continue

        t0 = time.ticks_ms()
        while not sta.isconnected() and time.ticks_diff(time.ticks_ms(), t0) < 11000:
            if wifi_reconnect_flag:
                return False
            time.sleep_ms(250)

        if sta.isconnected():
            wifi_terhubung = True
            wifi_ssid_aktif = ssid
            wifi_ip_aktif = sta.ifconfig()[0]
            wifi_pesan_terakhir = "Terhubung ke " + ssid + " (" + wifi_ip_aktif + ")"
            print("[WIFI OK] Terhubung ke {} | IP: {}".format(ssid, wifi_ip_aktif))
            tampilkan_pesan_lcd("WIFI TERHUBUNG", wifi_ip_aktif, 3000)
            return True
        else:
            wifi_pesan_terakhir = "Gagal terhubung ke " + ssid + " (cek sandi / pastikan 2.4 GHz)"

    wifi_terhubung = False
    wifi_ssid_aktif = ""
    wifi_ip_aktif = ""
    return False


def scan_wifi_terdekat(sta):
    hasil = []
    sudah = set()
    try:
        sta.active(True)
        raw_nets = sta.scan()
        raw_nets.sort(key=lambda x: x[3], reverse=True)
        for item in raw_nets:
            nama = item[0].decode("utf-8", "ignore").strip()
            rssi = item[3]
            if nama and nama != AP_SSID and nama not in sudah:
                sudah.add(nama)
                hasil.append((nama, rssi))
                if len(hasil) >= 10:
                    break
    except Exception as e:
        print("[WIFI SCAN ERR]", e)
    return hasil


def escape_html(text):
    return (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#39;")
    )


def jalankan_portal_setup_ap(ap, sta):
    global wifi_reconnect_flag
    ap.active(True)
    try:
        ap.config(essid=AP_SSID, password=AP_PASS, authmode=3)
    except Exception:
        try:
            ap.config(ssid=AP_SSID, key=AP_PASS, security=3)
        except Exception:
            try:
                ap.config(essid=AP_SSID)
            except Exception:
                pass

    print("[WIFI AP] Mode Setup Aktif! Hubungkan HP ke '{}' (sandi: {}) lalu buka http://192.168.4.1".format(AP_SSID, AP_PASS))
    tampilkan_pesan_lcd("AP:SmartCity", "192.168.4.1", 5000)

    daftar_scan = scan_wifi_terdekat(sta)

    srv = None
    try:
        srv = socket.socket()
        srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        srv.bind(("0.0.0.0", 80))
        srv.listen(3)
        srv.settimeout(0.5)

        t_retry = time.ticks_ms()
        while not wifi_reconnect_flag:
            # Coba ulang Wi-Fi tersimpan setiap 30 detik jika ada
            if time.ticks_diff(time.ticks_ms(), t_retry) >= 30000:
                t_retry = time.ticks_ms()
                daftar = muat_daftar_wifi()
                if daftar and hubungkan_wifi_sta(sta, daftar):
                    break

            try:
                conn, _ = srv.accept()
            except Exception:
                continue

            try:
                conn.settimeout(2)
                req = conn.recv(1024).decode("utf-8", "ignore")
                if "GET /scan" in req:
                    daftar_scan = scan_wifi_terdekat(sta)
                elif "GET /save?" in req:
                    q_start = req.find("?") + 1
                    q_end = req.find(" ", q_start)
                    query = req[q_start:q_end] if q_end != -1 else req[q_start:]
                    ssid_in = ""
                    pass_in = ""
                    for pair in query.split("&"):
                        if pair.startswith("ssid="):
                            ssid_in = url_decode(pair[5:]).strip()
                        elif pair.startswith("pass="):
                            pass_in = url_decode(pair[5:])
                    if ssid_in:
                        simpan_wifi_config(ssid_in, pass_in)
                        html = (
                            "HTTP/1.0 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nConnection: close\r\n\r\n"
                            "<!DOCTYPE html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'>"
                            "<title>SmartCity Wi-Fi Tersimpan</title></head>"
                            "<body style='font-family:sans-serif;max-width:420px;margin:24px auto;padding:18px;background:#f8fafc;color:#0f172a'>"
                            "<div style='background:#fff;border:1px solid #cbd5e1;border-radius:12px;padding:18px'>"
                            "<h2 style='margin:0 0 8px;color:#15803d'>Wi-Fi Tersimpan!</h2>"
                            "<p style='font-size:14px;line-height:1.5'>ESP32 sedang menghubungkan ke <b>"
                            + escape_html(ssid_in) +
                            "</b>. Tunggu 5 detik, lalu buka dashboard <b>smartcity-esp32.vercel.app</b> dan pastikan status berubah menjadi <b>WIFI AKTIF</b>.</p>"
                            "<p style='font-size:12px;color:#64748b'>Jika gagal terhubung (salah sandi), Wi-Fi SmartCity-ESP32-Setup akan muncul kembali otomatis.</p>"
                            "</div></body></html>"
                        )
                        conn.send(html.encode("utf-8"))
                        conn.close()
                        break

                tombol_wifi = ""
                for nama_w, rssi_w in daftar_scan:
                    nama_esc = escape_html(nama_w)
                    tombol_wifi += (
                        "<button type='button' onclick=\"document.getElementById('ssid').value='"
                        + nama_esc.replace("&#39;", "\\'")
                        + "';document.getElementById('pass').focus();\" "
                        "style='display:flex;justify-content:space-between;width:100%;padding:9px 11px;margin:4px 0;"
                        "background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;cursor:pointer'>"
                        "<span>" + nama_esc + "</span><span style='color:#64748b'>" + str(rssi_w) + " dBm</span></button>"
                    )
                if not tombol_wifi:
                    tombol_wifi = "<p style='font-size:12px;color:#64748b'>Tidak ada Wi-Fi 2.4 GHz terdeteksi. Ketik manual di bawah atau klik Scan Ulang.</p>"

                html = (
                    "HTTP/1.0 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nConnection: close\r\n\r\n"
                    "<!DOCTYPE html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'>"
                    "<title>Setup Wi-Fi SmartCity ESP32</title></head>"
                    "<body style='font-family:sans-serif;max-width:440px;margin:16px auto;padding:14px;background:#f8fafc;color:#0f172a'>"
                    "<div style='background:#fff;border:1px solid #cbd5e1;border-radius:12px;padding:16px'>"
                    "<h2 style='margin:0 0 6px'>Setup Wi-Fi SmartCity ESP32</h2>"
                    "<p style='font-size:12px;color:#475569;margin:0 0 12px'>Status: <b>" + escape_html(wifi_pesan_terakhir) + "</b></p>"
                    "<div style='margin-bottom:12px'>"
                    "<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:6px'>"
                    "<b style='font-size:13px'>Pilih Wi-Fi / Hotspot HP (2.4 GHz):</b>"
                    "<a href='/scan' style='font-size:12px;color:#2563eb;text-decoration:none;font-weight:bold'>Scan Ulang</a>"
                    "</div>" + tombol_wifi + "</div>"
                    "<form action='/save' method='get'>"
                    "<label style='font-size:13px;font-weight:bold'>Nama Wi-Fi (SSID)</label><br>"
                    "<input id='ssid' name='ssid' required placeholder='Ketik atau klik Wi-Fi di atas' "
                    "style='width:100%;box-sizing:border-box;padding:10px;margin:5px 0 12px;border:1px solid #94a3b8;border-radius:8px'><br>"
                    "<label style='font-size:13px;font-weight:bold'>Password Wi-Fi</label><br>"
                    "<input id='pass' name='pass' type='password' placeholder='Kosongkan jika tanpa sandi' "
                    "style='width:100%;box-sizing:border-box;padding:10px;margin:5px 0 16px;border:1px solid #94a3b8;border-radius:8px'><br>"
                    "<button type='submit' style='width:100%;padding:12px;background:#16a34a;color:#fff;border:0;border-radius:8px;font-size:14px;font-weight:bold;cursor:pointer'>"
                    "Simpan &amp; Hubungkan</button>"
                    "</form></div></body></html>"
                )
                conn.send(html.encode("utf-8"))
                conn.close()
            except Exception:
                try:
                    conn.close()
                except Exception:
                    pass
    except Exception as e:
        print("[AP ERR]", e)
    finally:
        try:
            if srv is not None:
                srv.close()
        except Exception:
            pass


def worker_wifi_cloud():
    global wifi_terhubung, wifi_reconnect_flag, cloud_kirim_segera

    sta = network.WLAN(network.STA_IF)
    ap = network.WLAN(network.AP_IF)
    ap.active(False)
    sta.active(True)

    mqtt_sock = None
    mqtt_buf = b""
    waktu_cloud_terakhir = 0
    waktu_ping_terakhir = 0

    while True:
        try:
            if wifi_reconnect_flag:
                wifi_reconnect_flag = False
                wifi_terhubung = False
                if mqtt_sock is not None:
                    try:
                        mqtt_sock.close()
                    except Exception:
                        pass
                    mqtt_sock = None
                try:
                    sta.disconnect()
                except Exception:
                    pass

            if not sta.isconnected():
                wifi_terhubung = False
                if mqtt_sock is not None:
                    try:
                        mqtt_sock.close()
                    except Exception:
                        pass
                    mqtt_sock = None
                daftar = muat_daftar_wifi()
                if hubungkan_wifi_sta(sta, daftar):
                    ap.active(False)
                    cloud_kirim_segera = True
                else:
                    jalankan_portal_setup_ap(ap, sta)
                    continue

            if mqtt_sock is None:
                mqtt_sock = mqtt_buka_koneksi()
                mqtt_buf = b""
                if mqtt_sock is None:
                    time.sleep_ms(2000)
                    continue
                waktu_ping_terakhir = time.ticks_ms()
                cloud_kirim_segera = True

            # 1. Baca perintah masuk dari Web Dashboard (non-blocking 80ms)
            mqtt_buf, hidup = mqtt_proses_masuk(mqtt_sock, mqtt_buf)
            if not hidup:
                try:
                    mqtt_sock.close()
                except Exception:
                    pass
                mqtt_sock = None
                continue

            sekarang_w = time.ticks_ms()

            # 2. KeepAlive PING setiap 20 detik
            if time.ticks_diff(sekarang_w, waktu_ping_terakhir) >= 20000:
                waktu_ping_terakhir = sekarang_w
                mqtt_sock.send(b"\xc0\x00")

            # 3. Kirim telemetri real-time setiap 500ms atau langsung saat status berubah
            if cloud_kirim_segera or time.ticks_diff(sekarang_w, waktu_cloud_terakhir) >= INTERVAL_CLOUD_MS:
                waktu_cloud_terakhir = sekarang_w
                cloud_kirim_segera = False

                snap = dict(telemetri_terbaru)
                mqtt_publish_json(mqtt_sock, MQTT_TOPIC_TELEMETRY, ujson.dumps(snap))

            time.sleep_ms(40)
        except Exception as err:
            print("[WIFI LOOP ERR]", err)
            if mqtt_sock is not None:
                try:
                    mqtt_sock.close()
                except Exception:
                    pass
                mqtt_sock = None
            time.sleep_ms(1000)


# ==================================================
# 11. BUZZER DUA FUNGSI: GAS DAN PENYEBERANGAN
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
# 12. FUNGSI KONTROL KEDUA TRAFFIC LIGHT (BEBAS FLICKER)
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
# 13. KONDISI AWAL & MULAI WORKER WIFI BACKGROUND
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
print(" Wi-Fi Cloud + USB Serial + Dual TL")
print("======================================")

if WIFI_AVAILABLE:
    try:
        _thread.start_new_thread(worker_wifi_cloud, ())
        print("[WIFI] Worker latar belakang aktif (tanpa mengganggu sensor)")
    except Exception as e:
        print("[WIFI THREAD ERR]", e)


# ==================================================
# 14. PROGRAM UTAMA (NON-BLOCKING & TEROPTIMASI)
# ==================================================
while True:
    sekarang = time.ticks_ms()

    # 0. Periksa instruksi kendali dari USB Serial
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
        cloud_kirim_segera = True

    alarm_gas = (nilai_gas >= BATAS_GAS) and (not buzzer_muted)

    # Refresh LCD hanya tiap 350ms dan hanya jika teks berubah (mencegah flicker I2C)
    if lcd is not None and time.ticks_diff(sekarang, waktu_lcd_terakhir) >= INTERVAL_LCD_MS:
        waktu_lcd_terakhir = sekarang
        if lcd_pesan_sementara_sampai != 0 and time.ticks_diff(lcd_pesan_sementara_sampai, sekarang) > 0:
            baris1 = lcd_pesan_baris1
            baris2 = lcd_pesan_baris2
        else:
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
        cloud_kirim_segera = True

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
            cloud_kirim_segera = True
            print(">>> KENDARAAN MERAH, PEJALAN KAKI KUNING")

    elif fase_penyeberangan == "KUNING_PEJALAN":
        if time.ticks_diff(sekarang, waktu_fase) >= WAKTU_KUNING_PEJALAN:
            fase_penyeberangan = "MENYEBRANG"
            waktu_fase = sekarang
            kirim_segera = True
            cloud_kirim_segera = True
            print(">>> PEJALAN KAKI HIJAU - SILAKAN MENYEBRANG")

    elif fase_penyeberangan == "MENYEBRANG":
        if time.ticks_diff(sekarang, waktu_fase) >= WAKTU_MENYEBRANG:
            fase_penyeberangan = "KUNING_PENUTUP"
            waktu_fase = sekarang
            kirim_segera = True
            cloud_kirim_segera = True
            print(">>> WAKTU MENYEBRANG SELESAI")

    elif fase_penyeberangan == "KUNING_PENUTUP":
        if time.ticks_diff(sekarang, waktu_fase) >= WAKTU_KUNING_PEJALAN:
            fase_penyeberangan = "NORMAL"
            waktu_fase = sekarang
            kirim_segera = True
            cloud_kirim_segera = True
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
        cloud_kirim_segera = True

    sisa_detik = hitung_sisa_detik(fase_penyeberangan, sekarang)

    # Perbarui snapshot untuk worker Wi-Fi Cloud
    telemetri_terbaru["gas"] = nilai_gas
    telemetri_terbaru["gasMode"] = gas_override_mode
    telemetri_terbaru["statusPolusi"] = status_polusi
    telemetri_terbaru["touchKanan"] = touch_kanan_aktif
    telemetri_terbaru["touchKiri"] = touch_kiri_aktif
    telemetri_terbaru["lampu"] = fase_penyeberangan
    telemetri_terbaru["countdown"] = sisa_detik
    telemetri_terbaru["buzzerSeberang"] = alarm_seberang
    telemetri_terbaru["ldr"] = nilai_ldr
    telemetri_terbaru["kondisi"] = kondisi_pju
    telemetri_terbaru["pjuStatus"] = status_pju
    telemetri_terbaru["pjuMode"] = pju_manual_mode

    # ----------------------------------------------
    # FITUR 6: KIRIM JSON & LOG RINGKAS (TIAP 350ms ATAU SAAT BERUBAH)
    # ----------------------------------------------
    if kirim_segera or time.ticks_diff(sekarang, waktu_telemetri_terakhir) >= INTERVAL_TELEMETRI_MS:
        waktu_telemetri_terakhir = sekarang
        kirim_segera = False

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
            '"pjuMode":"' + pju_manual_mode + '",'
            '"wifi":' + ("true" if wifi_terhubung else "false") + ','
            '"wifiIp":"' + wifi_ip_aktif + '"'
            '}'
        )

        print(
            "[STATUS] Gas:{} ({}) | Touch R:{} L:{} | Fase:{} ({}s) | PJU:{} ({}) | WiFi:{}".format(
                nilai_gas,
                status_polusi,
                1 if touch_kanan_aktif else 0,
                1 if touch_kiri_aktif else 0,
                fase_penyeberangan,
                sisa_detik,
                status_pju,
                pju_manual_mode,
                wifi_ip_aktif if wifi_terhubung else "AP/OFF",
            )
        )

    time.sleep_ms(15)
