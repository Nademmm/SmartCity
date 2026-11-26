# ==========================================================
# SMARTCITY - ESP32 SERIAL BRIDGE KE DASHBOARD NEXT.JS
# Membaca data serial USB dari COM3 (Sensor Touch + Dual Traffic Light)
# dan mengirim telemetri otomatis ke https://smartcity-esp32.vercel.app & localhost
# ==========================================================

$portName = "COM3"
$baudRate = 115200
$cloudUrl = "https://smartcity-esp32.vercel.app"
$localUrl = "http://127.0.0.1:3000"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "     SMARTCITY ESP32 - SERIAL BRIDGE KE DASHBOARD (COM3)  " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$currentGas = 650
$currentGasMode = "AUTO"
$currentStatusPolusi = "UDARA BERSIH"
$currentTouchKanan = $false
$currentTouchKiri = $false
$currentLampu = "NORMAL"
$currentCountdown = 0
$currentBuzzerSeberang = $false
$currentLdr = 1200
$currentKondisi = "TERANG"
$currentPju = "MATI"
$currentPjuMode = "AUTO"
$lastSendTime = [DateTime]::MinValue
$lastCommandPollTime = [DateTime]::MinValue

function Test-LocalServerActive {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $async = $tcp.BeginConnect("127.0.0.1", 3000, $null, $null)
        $wait = $async.AsyncWaitHandle.WaitOne(120, $false)
        if ($wait -and $tcp.Connected) {
            $tcp.Close()
            return $true
        }
        $tcp.Close()
    } catch {}
    return $false
}

function Get-StatusRingkasan($fase) {
    switch ($fase) {
        "KUNING_KENDARAAN" { return "KENDARAAN BERSIAP" }
        "KUNING_PEJALAN"   { return "PEJALAN BERSIAP" }
        "MENYEBRANG"       { return "SILAKAN MENYEBRANG" }
        "KUNING_PENUTUP"   { return "WAKTU HABIS" }
        default            { return "NORMAL" }
    }
}

while ($true) {
    $port = New-Object System.IO.Ports.SerialPort $portName, $baudRate, "None", 8, "One"
    $port.ReadTimeout = 1000
    $port.WriteTimeout = 1000
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

                Write-Host "ESP32 >> $line" -ForegroundColor Gray
                $forceImmediateSend = $false

                # 1. Parsing format JSON langsung dari ESP32
                if ($line.StartsWith("[JSON]")) {
                    $jsonRaw = $line.Substring(6)
                    try {
                        $parsed = ConvertFrom-Json $jsonRaw
                        $currentGas = [int]$parsed.gas
                        $currentGasMode = if ($parsed.gasMode) { $parsed.gasMode } else { "AUTO" }
                        $currentStatusPolusi = $parsed.statusPolusi
                        $newTouchKanan = if ($null -ne $parsed.touchKanan) { [bool]$parsed.touchKanan } else { [bool]$parsed.orangKanan }
                        $newTouchKiri = if ($null -ne $parsed.touchKiri) { [bool]$parsed.touchKiri } else { [bool]$parsed.orangKiri }

                        if ($newTouchKanan -ne $currentTouchKanan -or $newTouchKiri -ne $currentTouchKiri) {
                            $forceImmediateSend = $true
                        }
                        $currentTouchKanan = $newTouchKanan
                        $currentTouchKiri = $newTouchKiri

                        if ($parsed.lampu -ne $currentLampu) {
                            $forceImmediateSend = $true
                        }
                        $currentLampu = $parsed.lampu
                        $currentCountdown = if ($null -ne $parsed.countdown) { [int]$parsed.countdown } else { 0 }
                        $currentBuzzerSeberang = if ($null -ne $parsed.buzzerSeberang) { [bool]$parsed.buzzerSeberang } else { ($currentLampu -eq "MENYEBRANG") }
                        $currentLdr = [int]$parsed.ldr
                        $currentKondisi = $parsed.kondisi
                        $currentPju = $parsed.pjuStatus
                        $currentPjuMode = if ($parsed.pjuMode) { $parsed.pjuMode } else { "AUTO" }
                        $forceImmediateSend = $true
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
                    if ($line -match "Touch kanan:\s*(True|False)") {
                        $currentTouchKanan = ($matches[1] -eq "True")
                    }
                    if ($line -match "Touch kiri:\s*(True|False)") {
                        $currentTouchKiri = ($matches[1] -eq "True")
                    }
                    if ($line -match "Fase traffic light:\s*(\S+)") {
                        $currentLampu = $matches[1].Trim()
                        $currentBuzzerSeberang = ($currentLampu -eq "MENYEBRANG")
                    } elseif ($line -match "PERMINTAAN PENYEBERANGAN DITERIMA") {
                        $currentLampu = "KUNING_KENDARAAN"
                        $currentCountdown = 3
                        $currentBuzzerSeberang = $false
                        $forceImmediateSend = $true
                    } elseif ($line -match "KENDARAAN MERAH, PEJALAN KAKI KUNING") {
                        $currentLampu = "KUNING_PEJALAN"
                        $currentCountdown = 2
                        $currentBuzzerSeberang = $false
                        $forceImmediateSend = $true
                    } elseif ($line -match "PEJALAN KAKI HIJAU") {
                        $currentLampu = "MENYEBRANG"
                        $currentCountdown = 10
                        $currentBuzzerSeberang = $true
                        $forceImmediateSend = $true
                    } elseif ($line -match "WAKTU MENYEBRANG SELESAI") {
                        $currentLampu = "KUNING_PENUTUP"
                        $currentCountdown = 2
                        $currentBuzzerSeberang = $false
                        $forceImmediateSend = $true
                    } elseif ($line -match "KEMBALI KE KONDISI NORMAL" -or $line -match "DIRESET KE NORMAL") {
                        $currentLampu = "NORMAL"
                        $currentCountdown = 0
                        $currentBuzzerSeberang = $false
                        $forceImmediateSend = $true
                    }
                    if ($line -match "Nilai LDR:\s*(\d+)") {
                        $currentLdr = [int]$matches[1]
                    }
                    if ($line -match "Kondisi:\s*MANUAL_ON") {
                        $currentKondisi = "MANUAL_ON"
                        $currentPju = "MENYALA"
                        $currentPjuMode = "ON"
                    } elseif ($line -match "Kondisi:\s*MANUAL_OFF") {
                        $currentKondisi = "MANUAL_OFF"
                        $currentPju = "MATI"
                        $currentPjuMode = "OFF"
                    } elseif ($line -match "Kondisi:\s*GELAP") {
                        $currentKondisi = "GELAP"
                        $currentPju = "MENYALA"
                        $currentPjuMode = "AUTO"
                    } elseif ($line -match "Kondisi:\s*TERANG") {
                        $currentKondisi = "TERANG"
                        $currentPju = "MATI"
                        $currentPjuMode = "AUTO"
                    }
                }

                # Kirim telemetri ke Dashboard setiap [JSON] / perubahan fase atau minimal 400ms
                $now = [DateTime]::Now
                if ($forceImmediateSend -or (($now - $lastSendTime).TotalMilliseconds -ge 400)) {
                    $lastSendTime = $now
                    $isPjuActive = ($currentPju -eq "MENYALA")
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
                                lcdBaris1 = ("Nilai MQ: {0,4}  " -f $currentGas)
                                lcdBaris2 = ("{0,-16}" -f $currentStatusPolusi)
                            }
                            crossing = @{
                                touchKanan = $currentTouchKanan
                                touchKiri = $currentTouchKiri
                                lampu = $currentLampu
                                countdown = $currentCountdown
                                buzzer = $currentBuzzerSeberang
                                siapMenyeberang = ($currentLampu -eq "NORMAL")
                                statusRingkasan = (Get-StatusRingkasan $currentLampu)
                            }
                            pju = @{
                                ldrValue = $currentLdr
                                kondisi = $currentKondisi
                                pjuStatus = $currentPju
                                pjuMode = $currentPjuMode
                                ledMerah = $isPjuActive
                                ledPutih = $isPjuActive
                            }
                        }
                    }

                    $jsonBody = ConvertTo-Json -InputObject $bodyObj -Depth 5 -Compress

                    $activeUrls = @($cloudUrl)
                    if (Test-LocalServerActive) {
                        $activeUrls += $localUrl
                    }

                    foreach ($baseUrl in $activeUrls) {
                        try {
                            $postRes = Invoke-RestMethod -Uri "$baseUrl/api/iot/telemetry" -Method Post -Body $jsonBody -ContentType "application/json" -TimeoutSec 2
                            Write-Host "-> Terkirim ($baseUrl): Gas=$currentGas, TouchR=$currentTouchKanan, TouchL=$currentTouchKiri, Fase=$currentLampu (${currentCountdown}s)" -ForegroundColor Green
                            if ($postRes.commands -and $postRes.commands.Count -gt 0) {
                                foreach ($cmdItem in $postRes.commands) {
                                    Write-Host ">> MENERUSKAN PERINTAH KE ESP32 ($baseUrl): $($cmdItem.action)" -ForegroundColor Magenta
                                    $port.WriteLine($cmdItem.action)
                                }
                            }
                        } catch {
                            Write-Host "x Gagal kirim ($baseUrl): $($_.Exception.Message)" -ForegroundColor Red
                        }
                    }
                }
            } catch [System.TimeoutException] {
                $now = [DateTime]::Now
                if (($now - $lastCommandPollTime).TotalMilliseconds -ge 500) {
                    $lastCommandPollTime = $now
                    try {
                        $controlRes = Invoke-RestMethod -Uri "$cloudUrl/api/iot/control?deviceId=ESP32-MINIATURE" -Method Get -TimeoutSec 2
                        if ($controlRes.commands -and $controlRes.commands.Count -gt 0) {
                            foreach ($cmdItem in $controlRes.commands) {
                                Write-Host ">> MENERUSKAN PERINTAH KE ESP32: $($cmdItem.action)" -ForegroundColor Magenta
                                $port.WriteLine($cmdItem.action)
                            }
                        }
                    } catch {}
                }
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
