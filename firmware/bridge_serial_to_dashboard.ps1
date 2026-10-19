# ==========================================================
# URBANPULSE - ESP32 SERIAL BRIDGE KE DASHBOARD NEXT.JS
# Membaca data serial USB dari COM3 dan mengirim telemetri
# secara otomatis ke http://localhost:3000/api/iot/telemetry
# ==========================================================

$portName = "COM3"
$baudRate = 115200
$apiUrl = "http://127.0.0.1:3000/api/iot/telemetry"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "    URBANPULSE SMART CITY - ESP32 SERIAL BRIDGE (COM3)   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$currentGas = 350
$currentStatusPolusi = "UDARA BERSIH"
$currentJarakKanan = $null
$currentJarakKiri = $null
$currentOrangKanan = $false
$currentOrangKiri = $false
$currentLampu = "HIJAU"
$currentLdr = 1200
$currentKondisi = "TERANG"
$currentPju = "MATI"
$lastSendTime = [DateTime]::MinValue
$lastCommandPollTime = [DateTime]::MinValue

while ($true) {
    $port = New-Object System.IO.Ports.SerialPort $portName, $baudRate, "None", 8, "One"
    $port.ReadTimeout = 2000
    $port.WriteTimeout = 2000
    $port.DtrEnable = $false
    $port.RtsEnable = $false

    try {
        Write-Host "Menghubungkan ke $portName @ $baudRate baud..." -ForegroundColor Yellow
        $port.Open()
        Write-Host "[CONNECTED] Berhasil terhubung ke ESP32 pada $portName!" -ForegroundColor Green
        Write-Host "Mendengarkan data sensor... Tekan Ctrl+C untuk berhenti.`n" -ForegroundColor DarkGray

        while ($port.IsOpen) {
            try {
                $line = $port.ReadLine().Trim()
                if ([string]::IsNullOrWhiteSpace($line)) { continue }

                # Tampilkan di console
                Write-Host "ESP32 >> $line" -ForegroundColor Gray

                # 1. Parsing format JSON langsung jika tersedia
                if ($line.StartsWith("[JSON]")) {
                    $jsonRaw = $line.Substring(6)
                    try {
                        $parsed = ConvertFrom-Json $jsonRaw
                        $currentGas = $parsed.gas
                        $currentGasMode = if ($parsed.gasMode) { $parsed.gasMode } else { "AUTO" }
                        $currentStatusPolusi = $parsed.statusPolusi
                        $currentJarakKanan = $parsed.jarakKanan
                        $currentJarakKiri = $parsed.jarakKiri
                        $currentOrangKanan = [bool]$parsed.orangKanan
                        $currentOrangKiri = [bool]$parsed.orangKiri
                        $currentLampu = $parsed.lampu
                        $currentLdr = $parsed.ldr
                        $currentKondisi = $parsed.kondisi
                        $currentPju = $parsed.pjuStatus
                    } catch {}
                }
                # 2. Parsing teks reguler dari Thonny
                else {
                    if ($line -match "Nilai gas:\s*(\d+)") {
                        $currentGas = [int]$matches[1]
                    }
                    if ($line -match "Status:\s*(.+)") {
                        $currentStatusPolusi = $matches[1].Trim()
                    }
                    if ($line -match "Jarak kanan:\s*([\d.]+)") {
                        $currentJarakKanan = [double]$matches[1]
                        $currentOrangKanan = ($currentJarakKanan -le 17)
                    } elseif ($line -match "Jarak kanan:\s*tidak terbaca") {
                        $currentJarakKanan = $null
                        $currentOrangKanan = $false
                    }
                    if ($line -match "Jarak kiri:\s*([\d.]+)") {
                        $currentJarakKiri = [double]$matches[1]
                        $currentOrangKiri = ($currentJarakKiri -le 25)
                    } elseif ($line -match "Jarak kiri:\s*tidak terbaca") {
                        $currentJarakKiri = $null
                        $currentOrangKiri = $false
                    }
                    if ($line -match "LAMPU KUNING") { $currentLampu = "KUNING" }
                    if ($line -match "LAMPU MERAH") { $currentLampu = "MERAH" }
                    if ($line -match "LAMPU HIJAU") { $currentLampu = "HIJAU" }
                    if ($line -match "Nilai LDR:\s*(\d+)") {
                        $currentLdr = [int]$matches[1]
                        if ($currentLdr -gt 2000) {
                            $currentKondisi = "GELAP"
                            $currentPju = "MENYALA"
                        } else {
                            $currentKondisi = "TERANG"
                            $currentPju = "MATI"
                        }
                    }
                }

                # Kirim telemetri ke Next.js Dashboard setiap ~700ms
                $now = [DateTime]::Now
                if (($now - $lastSendTime).TotalMilliseconds -ge 700) {
                    $lastSendTime = $now
                    $bodyObj = @{
                        deviceId = "ESP32-MINIATURE"
                        type = "miniature-all"
                        payload = @{
                            gas = @{
                                gasValue = $currentGas
                                gasMode = $currentGasMode
                                statusPolusi = $currentStatusPolusi
                                ledPolusi = ($currentGas -ge 1500)
                                ledBersih = ($currentGas -lt 1500)
                            }
                            crossing = @{
                                jarakKanan = $currentJarakKanan
                                jarakKiri = $currentJarakKiri
                                orangKanan = $currentOrangKanan
                                orangKiri = $currentOrangKiri
                                lampu = $currentLampu
                                statusRingkasan = if ($currentOrangKanan -or $currentOrangKiri) { "OBJEK TERDETEKSI" } else { "AMAN" }
                            }
                            pju = @{
                                ldrValue = $currentLdr
                                kondisi = $currentKondisi
                                pjuStatus = $currentPju
                                ledMerah = ($currentLdr -gt 2000)
                                ledPutih = ($currentLdr -gt 2000)
                            }
                        }
                    }

                    $jsonBody = ConvertTo-Json -InputObject $bodyObj -Depth 5 -Compress
                    try {
                        $postRes = Invoke-RestMethod -Uri $apiUrl -Method Post -Body $jsonBody -ContentType "application/json" -TimeoutSec 2
                        Write-Host "-> Terkirim ke Dashboard: Gas=$currentGas, LDR=$currentLdr, Lampu=$currentLampu" -ForegroundColor Green
                    } catch {
                        Write-Host "x Gagal kirim ke Dashboard: $($_.Exception.Message)" -ForegroundColor Red
                    }
                }

                # Periksa dan kirim perintah kontrol tertunda dari Dashboard ke ESP32
                if (($now - $lastCommandPollTime).TotalMilliseconds -ge 400) {
                    $lastCommandPollTime = $now
                    try {
                        $controlRes = Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/iot/control?deviceId=ESP32-MINIATURE" -Method Get -TimeoutSec 2
                        if ($controlRes.commands -and $controlRes.commands.Count -gt 0) {
                            foreach ($cmdItem in $controlRes.commands) {
                                Write-Host ">> MENERUSKAN PERINTAH KE ESP32: $($cmdItem.action)" -ForegroundColor Magenta
                                $port.WriteLine($cmdItem.action)
                            }
                        }
                    } catch {}
                }
            } catch [System.TimeoutException] {
                # Timeout normal saat tidak ada baris baru masuk dalam rentang timeout
            } catch [System.IO.IOException] {
                Write-Host "`n[DISCONNECTED] Koneksi serial terputus: $($_.Exception.Message)" -ForegroundColor Red
                break
            }
        }
    } catch {
        Write-Host "`n[PORT ERROR] $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "Mencoba menghubungkan kembali dalam 2 detik..." -ForegroundColor DarkGray
        Start-Sleep -Seconds 2
    } finally {
        if ($null -ne $port -and $port.IsOpen) {
            $port.Close()
        }
    }
}
