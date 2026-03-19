# Quick Start Guide

## Installation (5 minutes)

### 1. Install Dependencies

```powershell
# Backend
cd backend
npm install

# Frontend (in a new terminal)
cd frontend
npm install

# NFC Reader (OPTIONAL - only if you have the hardware)
cd nfc-reader
npm install
# Note: Requires Visual Studio Build Tools on Windows
# See troubleshooting section if npm install fails
```

### 2. Configure Environment

```powershell
# Backend
cd backend
copy .env.example .env

# NFC Reader
cd nfc-reader
copy .env.example .env
```

### 3. Start MySQL

```powershell
# If not installed, install MySQL
# Option 1: XAMPP (recommended for Windows) - https://www.apachefriends.org/
# Option 2: MySQL Community Server - https://dev.mysql.com/downloads/mysql/

# For XAMPP: Start MySQL from the XAMPP Control Panel
# For standalone MySQL: Ensure the MySQL service is running
```

### 4. Start the Application

```powershell
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: NFC Reader (optional)
cd nfc-reader
npm start
```

### 5. Create Your First Tenant

Open PowerShell and run:

```powershell
$body = @{
    tenantId = "SCHOOL_01"
    name = "Demo School"
    type = "SCHOOL"
    contactEmail = "admin@demo.edu"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/tenants" `
  -Method Post `
  -Body $body `
  -ContentType "application/json"
```

### 6. Access the Dashboard

Open your browser and go to:
- **Dashboard**: http://localhost:3000
- **API**: http://localhost:5000

Select "Demo School (SCHOOL)" from the tenant dropdown.

## Register Your First Card

### Option A: Using the Dashboard
1. Click "Register New Card"
2. Enter Tag ID (e.g., `TEST001`)
3. Enter Business URL
4. Fill in metadata
5. Click "Register Card"

### Option B: Using the NFC Reader
1. Connect your ACR1311U-N2 reader
2. Edit `nfc-reader/.env` and set `TENANT_ID=SCHOOL_01`
3. Run `npm start` in the nfc-reader folder
4. Place an NFC tag near the reader

### Option C: Using API (PowerShell)
```powershell
$body = @{
    tagId = "TEST001"
    businessUrl = "https://example.com/profile"
    metadata = @{
        name = "John Doe"
        title = "Student"
        studentId = "2024001"
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/cards" `
  -Method Post `
  -Body $body `
  -ContentType "application/json" `
  -Headers @{"x-tenant-id"="SCHOOL_01"}
```

## Test the Redirect

Visit: http://localhost:5000/t/TEST001

This will redirect to the business URL and increment the tap count!

## Next Steps

1. **Create More Tenants**: Add hospitals, businesses, etc.
2. **Customize Metadata**: Edit the Card schema for your use case
3. **Add Authentication**: Implement JWT or OAuth for production
4. **Deploy**: Host on AWS, Heroku, or your preferred platform

## Common Issues

**MySQL not starting?**
```powershell
# Check if MySQL is installed
mysql --version

# For XAMPP: Use the XAMPP Control Panel
# For standalone: Check service status in services.msc
```

**Port already in use?**
```powershell
# Change ports in .env files:
# Backend: PORT=5001
# Frontend: Update vite.config.js
```

**NFC Reader installation failed?**
```powershell
# On Windows, the nfc-pcsc library requires Visual Studio Build Tools
# Install from: https://visualstudio.microsoft.com/downloads/
# Select: "Desktop development with C++" workload

# Or use winget:
winget install Microsoft.VisualStudio.2022.BuildTools

# After installation, retry:
cd nfc-reader
npm install
```

**NFC Reader not detected?**
```powershell
# Test the reader
cd nfc-reader
npm run test
```

---

🎉 **You're all set!** Start scanning NFC tags and building your platform.
