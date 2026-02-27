# NFC Platform - API Testing Collection

## Create Tenant

```bash
POST http://localhost:5000/api/tenants
Content-Type: application/json

{
  "tenantId": "SCHOOL_01",
  "name": "Lincoln High School",
  "type": "SCHOOL",
  "contactEmail": "admin@lincoln.edu"
}
```

## List Tenants

```bash
GET http://localhost:5000/api/tenants
```

## Register Card (School)

```bash
POST http://localhost:5000/api/cards
Content-Type: application/json
x-tenant-id: SCHOOL_01

{
  "tagId": "A1B2C3D4",
  "businessUrl": "https://lincoln.edu/student/john-doe",
  "metadata": {
    "name": "John Doe",
    "title": "Student",
    "email": "john@lincoln.edu",
    "phone": "+1234567890",
    "studentId": "2024001",
    "grade": "12",
    "section": "A",
    "guardianName": "Jane Doe",
    "guardianPhone": "+1234567891"
  }
}
```

## Register Card (Hospital)

```bash
POST http://localhost:5000/api/cards
Content-Type: application/json
x-tenant-id: HOSPITAL_01

{
  "tagId": "E5F6G7H8",
  "businessUrl": "https://citymedical.com/staff/dr-smith",
  "metadata": {
    "name": "Dr. Sarah Smith",
    "title": "Cardiologist",
    "email": "sarah.smith@citymedical.com",
    "phone": "+1234567892",
    "employeeId": "DOC2024",
    "department": "Cardiology",
    "specialization": "Interventional Cardiology",
    "licenseNumber": "MD123456",
    "emergencyContact": "+1234567893"
  }
}
```

## Register Card (Business)

```bash
POST http://localhost:5000/api/cards
Content-Type: application/json
x-tenant-id: BUSINESS_01

{
  "tagId": "I9J0K1L2",
  "businessUrl": "https://linkedin.com/in/mike-johnson",
  "metadata": {
    "name": "Mike Johnson",
    "title": "Software Engineer",
    "email": "mike@techcorp.com",
    "phone": "+1234567894",
    "company": "TechCorp Inc.",
    "position": "Senior Developer",
    "linkedIn": "https://linkedin.com/in/mike-johnson",
    "website": "https://mikejohnson.dev"
  }
}
```

## List All Cards

```bash
GET http://localhost:5000/api/cards
x-tenant-id: SCHOOL_01
```

## Get Single Card

```bash
GET http://localhost:5000/api/cards/A1B2C3D4
x-tenant-id: SCHOOL_01
```

## Update Card

```bash
PUT http://localhost:5000/api/cards/A1B2C3D4
Content-Type: application/json
x-tenant-id: SCHOOL_01

{
  "businessUrl": "https://lincoln.edu/student/john-doe-updated",
  "metadata": {
    "name": "John Doe Jr.",
    "grade": "11"
  }
}
```

## Get Analytics

```bash
GET http://localhost:5000/api/cards/A1B2C3D4/analytics
x-tenant-id: SCHOOL_01
```

## Delete Card

```bash
DELETE http://localhost:5000/api/cards/A1B2C3D4
x-tenant-id: SCHOOL_01
```

## Test Redirect

```bash
GET http://localhost:5000/t/A1B2C3D4
```

This will redirect to the business URL and increment tap count.

## PowerShell Examples

### Create Tenant
```powershell
$body = @{
    tenantId = "SCHOOL_01"
    name = "Lincoln High School"
    type = "SCHOOL"
    contactEmail = "admin@lincoln.edu"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/tenants" `
  -Method Post `
  -Body $body `
  -ContentType "application/json"
```

### Register Card
```powershell
$body = @{
    tagId = "A1B2C3D4"
    businessUrl = "https://lincoln.edu/student/john-doe"
    metadata = @{
        name = "John Doe"
        title = "Student"
        studentId = "2024001"
        grade = "12"
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/cards" `
  -Method Post `
  -Body $body `
  -ContentType "application/json" `
  -Headers @{"x-tenant-id"="SCHOOL_01"}
```

### List Cards
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/cards" `
  -Method Get `
  -Headers @{"x-tenant-id"="SCHOOL_01"}
```

### Test Redirect
```powershell
# This will open in browser
Start-Process "http://localhost:5000/t/A1B2C3D4"
```
