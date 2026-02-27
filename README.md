# Multi-Tenant NFC Business Card Platform

A complete NFC business card platform built with Node.js, Express, MongoDB, and React. Supports multiple tenants (Schools, Hospitals, Businesses) with a polymorphic data structure and hardware integration for the ACR1311U-N2 NFC reader.

## 🏗️ Architecture

### Key Features

1. **Global Redirector** - Short, permanent URLs for NFC chips (`/t/A1B2`)
2. **Multi-Tenant Isolation** - Middleware ensures data separation between tenants
3. **Polymorphic Schema** - Flexible metadata structure for different tenant types
4. **Hardware Integration** - Automatic tag registration with ACR1311U-N2 reader
5. **Analytics** - Track tap counts and usage statistics

### Tech Stack

- **Backend**: Node.js, Express, MongoDB (Mongoose)
- **Frontend**: React, Vite
- **Hardware**: ACR1311U-N2 NFC Reader, nfc-pcsc library

## 📁 Project Structure

```
NFC/
├── backend/           # Express API server
│   ├── config/        # Database configuration
│   ├── models/        # Mongoose schemas
│   ├── routes/        # API routes
│   ├── middleware/    # Tenant isolation middleware
│   └── server.js      # Main server file
│
├── frontend/          # React dashboard
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── services/    # API client
│   │   └── App.jsx      # Main app
│   └── vite.config.js
│
└── nfc-reader/        # Hardware integration
    ├── reader.js      # Main reader script
    └── test-reader.js # Test connectivity
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (running locally or remote)
- ACR1311U-N2 NFC Reader (optional, for hardware integration)
- **Windows Only**: Visual Studio Build Tools (for NFC reader native modules)

### 1. Database Setup

Install and start MongoDB:

```bash
# Windows (using Chocolatey)
choco install mongodb

# Or download from: https://www.mongodb.com/try/download/community

# Start MongoDB service
net start MongoDB
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
copy .env.example .env

# Edit .env with your settings
notepad .env

# Start the server
npm run dev
```

The backend will run on http://localhost:5000

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will run on http://localhost:3000

### 4. NFC Reader Setup (Optional)

```bash
cd nfc-reader

# Install dependencies
npm install

# Create .env file
copy .env.example .env

# Edit .env with your tenant ID
notepad .env

# Test reader connectivity
npm run test

# Start the reader
npm start
```

## 📊 Database Schema

### Tenant Model

```javascript
{
  tenantId: String (unique, e.g., "SCHOOL_01"),
  name: String,
  type: Enum ["SCHOOL", "HOSPITAL", "BUSINESS"],
  contactEmail: String,
  isActive: Boolean
}
```

### Card Model (Polymorphic)

```javascript
{
  tenantId: String (indexed),
  tagId: String (unique, NFC UID),
  businessUrl: String,
  tapCount: Number,
  lastTapped: Date,
  metadata: {
    // Common fields
    name, title, email, phone,
    
    // School-specific
    studentId, grade, section, guardianName, guardianPhone,
    
    // Hospital-specific
    employeeId, department, specialization, licenseNumber,
    
    // Business-specific
    company, position, linkedIn, website,
    
    // Custom fields
    custom: Mixed
  },
  isActive: Boolean
}
```

## 🔐 API Endpoints

### Redirect Endpoint (No Auth)

```
GET /t/:tagId
```

Redirects to the card's business URL and increments tap count.

### Cards API (Requires Tenant ID)

```
GET    /api/cards              # List all cards for tenant
GET    /api/cards/:tagId       # Get specific card
POST   /api/cards              # Register new card
PUT    /api/cards/:tagId       # Update card
DELETE /api/cards/:tagId       # Deactivate card
GET    /api/cards/:tagId/analytics  # Get tap statistics
```

### Tenants API

```
GET    /api/tenants            # List all tenants
POST   /api/tenants            # Create new tenant
```

### Authentication

Pass tenant ID via:
- Header: `x-tenant-id: SCHOOL_01`
- Query: `?tenantId=SCHOOL_01`
- Body: `{ "tenantId": "SCHOOL_01" }`

## 💡 Usage Examples

### 1. Create a Tenant

```bash
curl -X POST http://localhost:5000/api/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "SCHOOL_01",
    "name": "Lincoln High School",
    "type": "SCHOOL",
    "contactEmail": "admin@lincoln.edu"
  }'
```

### 2. Register an NFC Card

```bash
curl -X POST http://localhost:5000/api/cards \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: SCHOOL_01" \
  -d '{
    "tagId": "A1B2C3D4",
    "businessUrl": "https://lincoln.edu/student/john-doe",
    "metadata": {
      "name": "John Doe",
      "title": "Student",
      "studentId": "2024001",
      "grade": "12",
      "section": "A"
    }
  }'
```

### 3. Test the Redirect

Visit: http://localhost:5000/t/A1B2C3D4

This will redirect to the business URL and increment the tap count.

## 🔧 NFC Reader Integration

The ACR1311U-N2 reader works in two modes:

1. **USB PC/SC Mode** (Recommended)
   - Connect via USB
   - Uses PC/SC Smart Card service (built into Windows)
   - Most reliable for continuous operation

2. **Bluetooth Mode**
   - Pair via Bluetooth settings
   - Less stable for continuous scanning

### Setting Up the Reader

1. **Connect the Reader**
   ```bash
   # Plug in ACR1311U-N2 via USB
   ```

2. **Test Connectivity**
   ```bash
   cd nfc-reader
   npm run test
   ```

3. **Configure Auto-Registration**
   ```bash
   # Edit .env
   API_URL=http://localhost:5000/api
   TENANT_ID=SCHOOL_01
   AUTO_REGISTER=true
   DEFAULT_BUSINESS_URL=https://example.com/profile
   ```

4. **Start Scanning**
   ```bash
   npm start
   # Place NFC tags near the reader to register them
   ```

## 🎯 Use Cases

### Schools
- Student ID cards with emergency contact info
- Teacher profiles with department and subject
- Quick attendance tracking via tap counts

### Hospitals
- Medical staff ID with specialization
- Emergency contact information
- Department and license verification

### Businesses
- Digital business cards
- Networking event check-ins
- LinkedIn and portfolio links

## 🔒 Security Best Practices

1. **Environment Variables**: Never commit `.env` files
2. **Input Validation**: All inputs are validated
3. **Tenant Isolation**: Middleware prevents cross-tenant data access
4. **Soft Deletes**: Cards are deactivated, not deleted
5. **HTTPS**: Use SSL in production for the redirect endpoint

## 🚀 Deployment

### Backend

```bash
# Build for production
npm install --production

# Set environment variables
PORT=5000
MONGODB_URI=mongodb://your-mongo-uri
NODE_ENV=production
BASE_URL=https://your-domain.com
```

### Frontend

```bash
# Build for production
npm run build

# Serve the dist/ folder with nginx or similar
```

### Domain Setup

1. Get a short domain (e.g., `tap.io`)
2. Point it to your backend server
3. Encode NFC chips with: `https://tap.io/t/CARD_ID`

## 📝 Sample Data

### Create Sample Tenant

```bash
curl -X POST http://localhost:5000/api/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "HOSPITAL_01",
    "name": "City Medical Center",
    "type": "HOSPITAL",
    "contactEmail": "admin@citymedical.com"
  }'
```

## 🐛 Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running: `net start MongoDB`
- Check connection string in `.env`
- Verify MongoDB port (default: 27017)

### NFC Reader Not Detected
- Check USB connection
- Verify Smart Card service is running (Windows Services)
- Try unplugging and replugging the reader
- Run `npm run test` in nfc-reader folder

### NFC Reader Installation Failed (Windows)
The `nfc-pcsc` library requires native C++ compilation. You need Visual Studio Build Tools:

```powershell
# Download Visual Studio Build Tools 2022
# https://visualstudio.microsoft.com/downloads/
# Select: "Desktop development with C++" workload

# Or install via winget:
winget install Microsoft.VisualStudio.2022.BuildTools

# After installation:
cd nfc-reader
npm install
```

**Note**: The NFC reader component is optional. Backend and frontend work without it.

### CORS Issues
- Backend has CORS enabled for all origins in development
- In production, configure CORS for your frontend domain

### Frontend Not Connecting to API
- Check proxy settings in `vite.config.js`
- Verify backend is running on port 5000
- Check browser console for errors

## 📚 Additional Resources

- [Express Documentation](https://expressjs.com/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [React Documentation](https://react.dev/)
- [nfc-pcsc Library](https://github.com/pokusew/nfc-pcsc)
- [ACR1311U-N2 Datasheet](https://www.acs.com.hk/en/products/566/acr1311u-n2-usbtooth-nfc-reader/)

## 📄 License

ISC

## 🤝 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the API documentation
3. Test with the provided sample data

---

**Built with ❤️ for seamless NFC integration**
