# SmartCity: Design Direction

## Identity & Purpose
- **Product**: SmartCity ESP32 Hardware Control Console
- **Audience**: Operator mikrokontroler ESP32 & miniatur kota cerdas
- **Personality**: Precision industrial instrument console. Navigasi segmented track terpusat, kartu modul dengan bar header terstruktur, tombol kontrol proporsional (`36px` utama / `30px` sekunder pada desktop, `>= 44px` pada perangkat sentuh), serta pembacaan sensor angka tabular presisi.
- **Dial**: `ENERGY 2 / RHYTHM 2 / MOTION 1`

## Color System (R-01, R-25, R-29, R-34)
Maksimal 2 warna dasar netral + 1 aksen kontrol + warna sinyal fisik LED yang lolos kontras WCAG AA:

### Light Mode (Default Precision Slate)
- **Base Canvas**: `#F8FAFC`
- **Module Surface**: `#FFFFFF`
- **Module Header / Recessed Well**: `#F1F5F9`
- **Structural Border**: `#E2E8F0` / `#CBD5E1`
- **Primary Ink**: `#0F172A` (17.06:1 terhadap `#F8FAFC`, 17.85:1 terhadap `#FFFFFF`)
- **Muted Label**: `#475569` (7.58:1 terhadap `#FFFFFF`, 6.92:1 terhadap `#F1F5F9`)
- **Primary Control Accent**: `#1D4ED8` / `#1E40AF` pada `#EFF6FF` (8.01:1)
- **Hardware Status Signals**:
  - Hijau / Aman / Menyala: `#166534` pada `#DCFCE7` (6.49:1)
  - Kuning / Sedang / Gelap: `#92400E` pada `#FEF3C7` (6.37:1)
  - Merah / Bahaya / Stop: `#991B1B` pada `#FEE2E2` (6.80:1)

### Dark Mode (Deep Navy Console)
- **Base Canvas**: `#0B0F17`
- **Module Surface**: `#111827`
- **Recessed Well**: `#090D16`
- **Structural Border**: `#1E293B` / `#334155`
- **Primary Ink**: `#F8FAFC` (16.96:1 terhadap `#111827`)
- **Muted Label**: `#94A3B8` (6.92:1 terhadap `#111827`)
- **Primary Control Accent**: `#60A5FA` (6.98:1 terhadap `#111827`)
- **Hardware Status Signals**:
  - Hijau / Aman / Menyala: `#4ADE80` (10.18:1 terhadap `#111827`)
  - Kuning / Sedang / Gelap: `#FBBF24` (10.63:1 terhadap `#111827`)
  - Merah / Bahaya / Stop: `#F87171` (6.41:1 terhadap `#111827`)

## Typography (R-06)
- **UI & Label**: `IBM Plex Sans`: proporsi teknis ringkas untuk navigasi segmented, header modul, dan tombol kontrol.
- **Angka, Pin GPIO & Layar LCD 16x2**: `IBM Plex Mono` (`tabular-nums`): lebar digit tetap agar nilai ADC (0-4095), jarak ultrasonik (cm), dan siklus milidetik tidak bergeser saat diperbarui tiap 50ms.

## Layout & Motif Identitas (R-05, R-11, R-31)
- **Motif Identitas**: Bar header struktural bernomor (`01`, `02`, `03`, `04`) lengkap dengan tag pin GPIO fisik (`ADC 39`, `GPIO 12/14/27`, `LDR 36`, `GPIO 25/26`, `GPIO 4`) dan layar karakter LCD 16x2 (`#6EE7B7` pada `#0D1F17`, rasio kontras 11.24:1).
- **Radius**: `10px` untuk kartu modul (`.rack-panel`), `8px` untuk grup segmented & well (`.seg-group`, `.rack-well`), `7px`/`6px` untuk tombol kontrol (`.ctrl-btn`, `.ctrl-btn-sm`), dan `5px` untuk tag teknis (`.rack-tag`).
- **Motion (MOTION 1)**: Transisi status instan dan state `:hover` / `:focus-visible` yang tegas.
