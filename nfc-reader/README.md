# NFC Reader - Hardware Integration

This component interfaces with the **ACR1311U-N2 NFC Reader** hardware.

## ⚠️ Windows Requirement

On Windows, this package requires **Visual Studio Build Tools** to compile native C++ modules.

### Install Build Tools

**Option 1: Visual Studio Installer**
1. Download from: https://visualstudio.microsoft.com/downloads/
2. Install "Build Tools for Visual Studio 2022"
3. Select workload: **"Desktop development with C++"**

**Option 2: Command Line**
```powershell
winget install Microsoft.VisualStudio.2022.BuildTools
```

After installation:
```powershell
npm install
```

## 📝 This Component is Optional

**You don't need the NFC reader to use the platform!**

The backend and frontend work perfectly without it. You can:
- Register cards manually through the dashboard
- Use the REST API to create cards
- Test with sample data from `npm run seed`

Only install this if you have the ACR1311U-N2 hardware and want automatic tag registration.

## Usage

### 1. Configure

```powershell
copy .env.example .env
notepad .env
```

Set your tenant ID:
```
TENANT_ID=SCHOOL_01
```

### 2. Test Hardware

```powershell
npm run test
```

This verifies the ACR1311U-N2 reader is detected.

### 3. Start Scanning

```powershell
npm start
```

Place NFC tags near the reader to automatically register them.

## Troubleshooting

### "Cannot find module '@pokusew/pcsclite'"
You need to install Visual Studio Build Tools (see above).

### "No PC/SC Readers found"
1. Ensure ACR1311U-N2 is connected via USB
2. Check if Smart Card service is running:
   ```powershell
   Get-Service -Name "SCardSvr"
   Start-Service -Name "SCardSvr"
   ```
3. Try unplugging and replugging the reader

### Reader detected but no cards
- Place the NFC tag directly on the reader surface
- Try different NFC tags (NTAG213, NTAG215, Mifare Classic)
- Check if the tag has any protective coating

## Alternative: Manual Registration

Without the hardware reader, register cards via API:

```powershell
$body = @{
    tagId = "MANUAL001"
    businessUrl = "https://example.com/profile"
    metadata = @{ name = "John Doe" }
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/cards" `
  -Method Post `
  -Body $body `
  -ContentType "application/json" `
  -Headers @{"x-tenant-id"="SCHOOL_01"}
```

## Hardware Info

**ACR1311U-N2 Specifications:**
- Interface: USB (PC/SC) or Bluetooth
- Supported Tags: ISO 14443 Type A/B, MIFARE, FeliCa
- Read Range: Up to 50mm
- LED indicators for status

**Recommended Mode:** USB PC/SC (more stable than Bluetooth)

---

**Need Help?** Check the main [README.md](../README.md) or [QUICKSTART.md](../QUICKSTART.md)
