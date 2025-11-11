# Mahattati Setup Guide

## Quick Start

### 1. Install Dependencies

From the root directory:
```bash
npm run install-all
```

Or individually:
```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 2. Database Setup

1. Make sure MySQL is running
2. Create the database:
```bash
mysql -u root -p < server/config/database.sql
```

Or manually:
```sql
mysql -u root -p
CREATE DATABASE mahattati;
USE mahattati;
SOURCE server/config/database.sql;
```

### 3. Configure Environment Variables

#### Backend (server/.env)
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=mahattati
DB_PORT=3306

JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=7d

STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

MADA_MERCHANT_ID=your_mada_merchant_id
MADA_API_KEY=your_mada_api_key

FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password

GOOGLE_MAPS_API_KEY=your_google_maps_api_key

UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880
```

#### Frontend (client/.env)
```env
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

### 4. Create Upload Directories

```bash
mkdir -p server/uploads/ads
mkdir -p server/uploads/blog
mkdir -p server/uploads/profiles
```

### 5. Start the Application

#### Option 1: Run Both Together (Recommended)
From root directory:
```bash
npm run dev
```

#### Option 2: Run Separately

Terminal 1 (Backend):
```bash
cd server
npm run dev
```

Terminal 2 (Frontend):
```bash
cd client
npm start
```

### 6. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- API Health Check: http://localhost:5000/api/health

## Creating Admin Users

To create admin users, you can either:

1. **Directly in Database:**
```sql
INSERT INTO users (name, email, password, role, email_verified) 
VALUES ('Admin', 'admin@mahattati.com', '$2a$10$hashed_password', 'system_manager', TRUE);
```

2. **Via Registration then Update Role:**
- Register normally through the UI
- Update role in database:
```sql
UPDATE users SET role = 'system_manager' WHERE email = 'admin@mahattati.com';
```

## Testing Payment Integration

### Stripe Test Mode
1. Get test API keys from Stripe Dashboard
2. Use test card: `4242 4242 4242 4242`
3. Use any future expiry date and any CVC

### Mada Integration
- Mada integration requires production credentials
- Contact Mada for merchant account setup

## Google Maps Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Maps JavaScript API"
4. Create API key
5. Add to both backend and frontend .env files

## Email Configuration

### Gmail Setup
1. Enable "Less secure app access" or use App Password
2. For App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Use this as EMAIL_PASS

### Other SMTP Providers
Update EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS accordingly

## Firebase Setup (Optional - for Push Notifications)

1. Create Firebase project
2. Go to Project Settings → Service Accounts
3. Generate new private key
4. Add credentials to backend .env

## Troubleshooting

### Database Connection Error
- Verify MySQL is running
- Check database credentials in .env
- Ensure database exists

### Port Already in Use
- Change PORT in server/.env
- Or kill process using port: `lsof -ti:5000 | xargs kill`

### CORS Errors
- Ensure CLIENT_URL in backend .env matches frontend URL
- Check that proxy is set in client/package.json

### Google Maps Not Loading
- Verify API key is correct
- Check API is enabled in Google Cloud Console
- Ensure billing is enabled (required for Maps API)

### File Upload Errors
- Ensure upload directories exist
- Check file permissions
- Verify MAX_FILE_SIZE in .env

## Production Deployment

### Backend
1. Set NODE_ENV=production
2. Use strong JWT_SECRET
3. Configure proper CORS origins
4. Use production database
5. Set up SSL/HTTPS
6. Configure proper file storage (S3, etc.)

### Frontend
1. Build: `npm run build`
2. Serve build folder with nginx/apache
3. Configure API proxy
4. Set up HTTPS
5. Configure environment variables

## Security Checklist

- [ ] Change default JWT_SECRET
- [ ] Use strong database passwords
- [ ] Enable HTTPS in production
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Enable SQL injection protection
- [ ] Configure file upload limits
- [ ] Set up proper error logging
- [ ] Enable email verification
- [ ] Configure password reset properly


