# MongoDB to MySQL Migration + Authentication Guide

## ✅ What's Changed

Your NFC platform has been successfully migrated from MongoDB/Mongoose to MySQL/Sequelize and now includes full JWT authentication.

### Major Changes

1. **Database**: MongoDB → MySQL (Sequelize ORM)
2. **Authentication**: Added JWT-based login/register system
3. **Authorization**: Role-based access (Admin, Manager, Viewer)
4. **Security**: Protected API routes require authentication
5. **User Management**: Multi-user support per tenant

---

## 🗄️ Database Changes

### Old (MongoDB)
- Mongoose models
- Document-based storage
- Connection via `mongodb://` or `mongodb+srv://`

### New (MySQL)
- Sequelize models
- Relational database
- Connection via TCP (localhost:3306)

### New Tables Created

1. **users** - User accounts with email/password
2. **tenants** - Organizations (School, Hospital, Business)
3. **cards** - NFC card records with polymorphic metadata (JSON)

---

## 🔐 Authentication System

### New Routes

#### **POST /api/auth/register**
Register a new user
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "tenantId": "SCHOOL_01"
}
```

#### **POST /api/auth/login**
Login and receive JWT token
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

#### **GET /api/auth/me**
Get current user profile (requires Bearer token)

### JWT Token Flow

1. User logs in → receives JWT token
2. Token stored in localStorage
3. All API requests include: `Authorization: Bearer TOKEN`
4. Backend validates token → extracts user + tenantId
5. Requests automatically scoped to user's tenant

---

## 📝 Setup Instructions

### 1. Install Dependencies

```powershell
cd C:\Users\Legion\NFC\backend
npm install
```

New packages installed:
- `sequelize` - ORM for MySQL
- `mysql2` - MySQL driver
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT tokens
- `express-validator` - Input validation

### 2. Install MySQL

**Option A: Install MySQL Server**
```powershell
# Download from: https://dev.mysql.com/downloads/mysql/
# Or use Chocolatey:
choco install mysql
```

**Option B: Use XAMPP** (Recommended for Windows)
```powershell
# Download from: https://www.apachefriends.org/
# Includes MySQL + phpMyAdmin
```

### 3. Configure Database

Edit `backend/.env`:
```env
PORT=5000
NODE_ENV=development
BASE_URL=http://localhost:5000

# MySQL Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=nfc_platform
DB_USER=root
DB_PASSWORD=yourpassword

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRE=30d
```

### 4. Create Database

```sql
CREATE DATABASE nfc_platform;
```

Or use phpMyAdmin if using XAMPP.

### 5. Seed the Database

```powershell
cd backend
npm run seed
```

This will:
- Create all tables
- Insert 3 sample tenants
- Create 3 sample user accounts
- Add 6 sample NFC cards

---

## 👥 Sample Accounts

After seeding, you can login with:

| Email | Password | Tenant | Role |
|-------|----------|--------|------|
| admin@lincoln.edu | password123 | SCHOOL_01 | admin |
| sarah@citymedical.com | password123 | HOSPITAL_01 | manager |
| mike@techcorp.com | password123 | BUSINESS_01 | viewer |

---

## 🔄 API Changes

### Protected Routes (Require Authentication)

All `/api/cards` routes now require Bearer token:

```javascript
// Before (MongoDB)
GET /api/cards
Headers: { 'x-tenant-id': 'SCHOOL_01' }

// After (MySQL + Auth)
GET /api/cards
Headers: { 'Authorization': 'Bearer YOUR_JWT_TOKEN' }
```

The tenantId is automatically extracted from the authenticated user!

### Public Routes (No Auth Required)

- `GET /t/:tagId` - Redirect endpoint
- `GET /api/tenants` - List tenants (for registration)
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login

---

## 🎨 Frontend Changes

### New Components

**Login.jsx** - Login/Register form
- Email + password authentication
- Tenant selection for new users
- Displays demo accounts

### Updated Components

**api.js** - Now includes:
- JWT token interceptor
- Auto-logout on 401 errors
- Auth API methods

**CardList.jsx** - Removed tenantId parameter
**CardForm.jsx** - Removed tenantId parameter
**App.jsx** - Added authentication state

### New User Flow

1. User opens app → sees login screen
2. User logs in → receives token
3. Token saved to localStorage
4. Dashboard loads with user's cards
5. All requests automatically authenticated

---

## 🚀 Running the Application

### Start MySQL
```powershell
# If using XAMPP: Start MySQL from control panel
# If using standalone MySQL:
net start MySQL80
```

### Start Backend
```powershell
cd backend
npm run dev
```

### Start Frontend
```powershell
cd frontend
npm run dev
```

### Access
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Health Check: http://localhost:5000/health

---

## 🔒 Security Features

1. **Password Hashing**: bcrypt with salt
2. **JWT Tokens**: Secure, stateless authentication
3. **Token Expiry**: Configurable (default 30 days)
4. **Protected Routes**: Middleware validation
5. **Tenant Isolation**: Automatic data filtering
6. **Role-Based Access**: Admin/Manager/Viewer levels

---

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  tenantId VARCHAR(50) NOT NULL,
  role ENUM('admin', 'manager', 'viewer') DEFAULT 'viewer',
  isActive BOOLEAN DEFAULT true,
  createdAt DATETIME,
  updatedAt DATETIME,
  FOREIGN KEY (tenantId) REFERENCES tenants(tenantId)
);
```

### Tenants Table
```sql
CREATE TABLE tenants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenantId VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  type ENUM('SCHOOL', 'HOSPITAL', 'BUSINESS') NOT NULL,
  contactEmail VARCHAR(255) NOT NULL,
  isActive BOOLEAN DEFAULT true,
  createdAt DATETIME,
  updatedAt DATETIME
);
```

### Cards Table
```sql
CREATE TABLE cards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenantId VARCHAR(50) NOT NULL,
  tagId VARCHAR(100) UNIQUE NOT NULL,
  businessUrl VARCHAR(500) NOT NULL,
  tapCount INT DEFAULT 0,
  lastTapped DATETIME,
  metadata JSON,  -- Polymorphic data storage
  isActive BOOLEAN DEFAULT true,
  createdAt DATETIME,
  updatedAt DATETIME,
  FOREIGN KEY (tenantId) REFERENCES tenants(tenantId)
);
```

---

## 🐛 Troubleshooting

### MySQL Connection Errors

**Error**: `ER_NOT_SUPPORTED_AUTH_MODE`
```powershell
# Run in MySQL:
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'yourpassword';
FLUSH PRIVILEGES;
```

**Error**: `ER_ACCESS_DENIED_ERROR`
- Check DB_USER and DB_PASSWORD in `.env`
- Verify user has permissions: `GRANT ALL ON nfc_platform.* TO 'user'@'localhost';`

**Error**: `ECONNREFUSED`
- Ensure MySQL is running
- Check DB_HOST and DB_PORT in `.env`

### Authentication Errors

**401 Unauthorized**
- Token expired → login again
- Invalid token → clear localStorage and login
- No token → ensure login was successful

**403 Forbidden**
- User role doesn't have permission
- Check role requirements in routes

---

## 📚 Additional Resources

- [Sequelize Documentation](https://sequelize.org/docs/v6/)
- [JSON Web Tokens](https://jwt.io/)
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [Express Validator](https://express-validator.github.io/)

---

## 🎯 Next Steps

1. **Install MySQL** (XAMPP recommended)
2. **Update .env** with database credentials
3. **Run seed script**: `npm run seed`
4. **Start backend**: `npm run dev`
5. **Start frontend**: `npm run dev`
6. **Login** with sample accounts
7. **Test NFC redirects**: http://localhost:5000/t/STUDENT001

---

## ✨ Benefits of This Migration

✅ **Relational Integrity**: Foreign keys ensure data consistency  
✅ **Better Performance**: Indexed queries, optimized joins  
✅ **User Management**: Multiple users per organization  
✅ **Secure Authentication**: Industry-standard JWT  
✅ **Role-Based Access**: Fine-grained permissions  
✅ **SQL Compatibility**: Easy integration with reporting tools  
✅ **JSON Support**: Polymorphic metadata still flexible  

---

**Migration completed successfully!** 🎉

All your existing features are preserved, plus you now have full authentication and user management.
