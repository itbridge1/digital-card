# NFC Platform API Reference (MySQL + Auth)

## Base URL
```
http://localhost:5000/api
```

## Authentication

All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 🔓 Public Endpoints

### Register New User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "tenantId": "SCHOOL_01",
  "role": "viewer"  // Optional: admin, manager, viewer
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "tenantId": "SCHOOL_01",
    "role": "viewer",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "tenantId": "SCHOOL_01",
    "role": "viewer",
    "tenant": {
      "tenantId": "SCHOOL_01",
      "name": "Lincoln High School",
      "type": "SCHOOL"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Get Current User
```http
GET /api/auth/me
Authorization: Bearer YOUR_JWT_TOKEN
```

### List All Tenants
```http
GET /api/tenants
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": 1,
      "tenantId": "SCHOOL_01",
      "name": "Lincoln High School",
      "type": "SCHOOL",
      "contactEmail": "admin@lincoln.edu"
    }
  ]
}
```

---

## 🔒 Protected Endpoints (Require Auth)

### List All Cards
```http
GET /api/cards
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": 1,
      "tenantId": "SCHOOL_01",
      "tagId": "STUDENT001",
      "businessUrl": "https://lincoln.edu/student/john-doe",
      "tapCount": 5,
      "lastTapped": "2026-03-17T10:30:00.000Z",
      "metadata": {
        "name": "John Doe",
        "title": "Student",
        "email": "john@lincoln.edu",
        "phone": "+1234567890",
        "studentId": "2024001",
        "grade": "12"
      },
      "isActive": true,
      "createdAt": "2026-03-01T00:00:00.000Z",
      "updatedAt": "2026-03-17T10:30:00.000Z"
    }
  ]
}
```

### Get Single Card
```http
GET /api/cards/:tagId
Authorization: Bearer YOUR_JWT_TOKEN
```

### Create New Card
```http
POST /api/cards
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "tagId": "STUDENT002",
  "businessUrl": "https://lincoln.edu/student/jane-smith",
  "metadata": {
    "name": "Jane Smith",
    "title": "Student",
    "email": "jane@lincoln.edu",
    "phone": "+1234567891",
    "studentId": "2024002",
    "grade": "11",
    "section": "B"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Card registered successfully",
  "data": {
    "id": 2,
    "tenantId": "SCHOOL_01",
    "tagId": "STUDENT002",
    "businessUrl": "https://lincoln.edu/student/jane-smith",
    "tapCount": 0,
    "metadata": {...},
    "isActive": true
  },
  "redirectUrl": "http://localhost:5000/t/STUDENT002"
}
```

### Update Card
```http
PUT /api/cards/:tagId
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "businessUrl": "https://lincoln.edu/alumni/jane-smith",
  "metadata": {
    "title": "Alumni",
    "grade": "Graduated"
  }
}
```

### Delete Card (Soft Delete)
```http
DELETE /api/cards/:tagId
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "message": "Card deactivated successfully"
}
```

### Get Card Analytics
```http
GET /api/cards/:tagId/analytics
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tagId": "STUDENT001",
    "tapCount": 45,
    "lastTapped": "2026-03-17T10:30:00.000Z",
    "createdAt": "2026-03-01T00:00:00.000Z"
  }
}
```

---

## 🌐 Redirect Endpoint (Public)

### NFC Tag Redirect
```http
GET /t/:tagId
```

This endpoint:
1. Finds the card by tagId
2. Increments tapCount
3. Records lastTapped timestamp
4. Redirects to businessUrl

**Example:**
```
http://localhost:5000/t/STUDENT001
→ Redirects to: https://lincoln.edu/student/john-doe
```

---

## 🔐 Admin-Only Endpoints

### Create New Tenant
```http
POST /api/tenants
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "tenantId": "SCHOOL_02",
  "name": "Washington High School",
  "type": "SCHOOL",
  "contactEmail": "admin@washington.edu"
}
```

---

## 📝 PowerShell Examples

### Register
```powershell
$body = @{
    name = "John Doe"
    email = "john@example.com"
    password = "password123"
    tenantId = "SCHOOL_01"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" `
  -Method Post `
  -Body $body `
  -ContentType "application/json"

$token = $response.data.token
Write-Host "Token: $token"
```

### Login
```powershell
$body = @{
    email = "admin@lincoln.edu"
    password = "password123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
  -Method Post `
  -Body $body `
  -ContentType "application/json"

$token = $response.data.token
```

### List Cards (Authenticated)
```powershell
$headers = @{
    "Authorization" = "Bearer $token"
}

$cards = Invoke-RestMethod -Uri "http://localhost:5000/api/cards" `
  -Method Get `
  -Headers $headers
```

### Create Card
```powershell
$body = @{
    tagId = "NEWCARD001"
    businessUrl = "https://example.com/profile"
    metadata = @{
        name = "Test User"
        email = "test@example.com"
    }
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$result = Invoke-RestMethod -Uri "http://localhost:5000/api/cards" `
  -Method Post `
  -Body $body `
  -Headers $headers
```

---

## ⚠️ Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "tagId and businessUrl are required"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Not authorized, no token"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "User role 'viewer' is not authorized to access this route"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Card not found"
}
```

### 409 Conflict
```json
{
  "success": false,
  "error": "This tag ID is already registered"
}
```

---

## 🎯 Quick Reference

| Action | Method | Endpoint | Auth | Role |
|--------|--------|----------|------|------|
| Register | POST | /api/auth/register | ❌ | - |
| Login | POST | /api/auth/login | ❌ | - |
| Get Profile | GET | /api/auth/me | ✅ | Any |
| List Tenants | GET | /api/tenants | ❌ | - |
| Create Tenant | POST | /api/tenants | ✅ | Admin |
| List Cards | GET | /api/cards | ✅ | Any |
| Get Card | GET | /api/cards/:id | ✅ | Any |
| Create Card | POST | /api/cards | ✅ | Any |
| Update Card | PUT | /api/cards/:id | ✅ | Any |
| Delete Card | DELETE | /api/cards/:id | ✅ | Any |
| Get Analytics | GET | /api/cards/:id/analytics | ✅ | Any |
| Redirect | GET | /t/:tagId | ❌ | - |

---

**Need help?** Check [MYSQL-MIGRATION-GUIDE.md](MYSQL-MIGRATION-GUIDE.md) for setup instructions!
