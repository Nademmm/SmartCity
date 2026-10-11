$portName = "COM3"
$baudRate = 115200
$sourceFile = "c:\Users\nadem\OneDrive\Documents\urbanpulse\firmware\main_thonny_micropython.py"

Write-Output "Membuka port $portName..."
$port = New-Object System.IO.Ports.SerialPort $portName, $baudRate, "None", 8, "One"
$port.ReadTimeout = 4000
$port.WriteTimeout = 4000

try {
    $port.Open()
    Start-Sleep -Milliseconds 300
    
    # 1. Masuk ke raw REPL: Ctrl+C, Ctrl+C, Ctrl+A
    $port.Write([byte[]]@(3, 3, 1), 0, 3)
    Start-Sleep -Milliseconds 400
    $resp = ""
    while ($port.BytesToRead -gt 0) {
        $resp += [char]$port.ReadByte()
    }
    Write-Output "Masuk ke Raw REPL ESP32..."

    # 2. Baca isi file firmware lokal
    $fileBytes = [System.IO.File]::ReadAllBytes($sourceFile)
    $b64 = [Convert]::ToBase64String($fileBytes)
    $chunkSize = 256

    # 3. Kirim perintah buka file main.py untuk penulisan
    $cmdInit = "import ubinascii`r`nf = open('main.py', 'wb')`r`n"
    $port.Write($cmdInit)
    Start-Sleep -Milliseconds 100

    # 4. Kirim chunk base64
    for ($i = 0; $i -lt $b64.Length; $i += $chunkSize) {
        $len = [Math]::Min($chunkSize, $b64.Length - $i)
        $chunk = $b64.Substring($i, $len)
        $cmdChunk = "f.write(ubinascii.a2b_base64('$chunk'))`r`n"
        $port.Write($cmdChunk)
        Start-Sleep -Milliseconds 30
    }

    # 5. Tutup file dan cetak tanda selesai
    $cmdDone = "f.close()`r`nimport os`r`nprint('MAIN_SAVED_SIZE:', os.stat('main.py')[6])`r`n"
    $port.Write($cmdDone)
    Start-Sleep -Milliseconds 100

    # 6. Eksekusi penulisan dengan Ctrl+D
    $port.Write([byte[]]@(4), 0, 1)
    Start-Sleep -Milliseconds 1000

    $saveResp = ""
    while ($port.BytesToRead -gt 0) {
        $saveResp += [char]$port.ReadByte()
    }
    Write-Output "Hasil Simpan: $saveResp"

    # 7. Keluar dari raw REPL dan lakukan Soft Reboot (Ctrl+B lalu Ctrl+D) agar main.py langsung jalan otomatis
    $port.Write([byte[]]@(2), 0, 1)
    Start-Sleep -Milliseconds 200
    $port.Write([byte[]]@(4), 0, 1)
    Start-Sleep -Milliseconds 1200

    Write-Output "Membaca output pertama dari main.py di ESP32:"
    for ($k = 0; $k -lt 25; $k++) {
        if ($port.BytesToRead -gt 0) {
            $line = $port.ReadLine()
            Write-Output "ESP32 >> $line"
        }
        Start-Sleep -Milliseconds 100
    }

    $port.Close()
    Write-Output "FLASH_SELESAI_SUKSES"
} catch {
    Write-Output "ERROR: $($_.Exception.Message)"
    if ($port.IsOpen) {
        $port.Close()
    }
}
