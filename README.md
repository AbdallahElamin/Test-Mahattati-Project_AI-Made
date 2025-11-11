# Mahattati - Fuel Station Advertising Platform

A comprehensive digital platform for advertising fuel stations in the Kingdom of Saudi Arabia. This system facilitates connections between fuel station owners and companies, providing a marketplace-like environment for fuel station advertising.

## Features

- **User Management**: Registration and authentication for Advertisers, Subscribers, and Managers
- **Advertisement Management**: Upload and manage fuel station ads with location, facilities, and fuel types
- **Interactive Map**: Google Maps integration showing fuel stations across Saudi Arabia
- **Payment Integration**: Stripe and Mada payment gateways for subscriptions and ad promotions
- **Messaging System**: Private messaging between users
- **Blog System**: Content management for blog posts
- **Admin Dashboard**: Comprehensive admin panel for system and marketing managers
- **Bilingual Support**: Arabic and English with RTL support
- **Notifications**: Email and in-app notifications

## Tech Stack

### Backend
- Node.js with Express
- MySQL Database
- JWT Authentication
- Stripe Payment Integration
- Email Service (Nodemailer)
- Firebase (for notifications)

### Frontend
- React 18
- React Router
- Axios for API calls
- Google Maps API
- Stripe.js
- i18next for internationalization
- React Toastify for notifications

## Project Structure

```
Mahattati/
├── server/                 # Backend Node.js application
│   ├── config/            # Database and configuration
│   ├── middleware/        # Authentication middleware
│   ├── routes/           # API routes
│   ├── utils/            # Utility functions
│   └── index.js          # Server entry point
├── client/                # Frontend React application
│   ├── public/           # Static files
│   └── src/
│       ├── components/   # React components
│       ├── context/      # React context providers
│       ├── pages/        # Page components
│       └── i18n.js       # Internationalization config
└── README.md
```

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

### Backend Setup

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the server directory (use `.env.example` as reference):
```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration:
   - Database credentials
   - JWT secret
   - Stripe keys
   - Email service credentials
   - Google Maps API key
   - Firebase credentials

5. Create the database:
```bash
mysql -u root -p < config/database.sql
```

6. Start the server:
```bash
npm run dev
```

The server will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the client directory:
```
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
REACT_APP_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

4. Start the development server:
```bash
npm start
```

The client will run on `http://localhost:3000`

### Running Both Together

From the root directory:
```bash
npm run dev
```

This will start both the backend and frontend concurrently.

## Database Schema

The database includes the following main tables:
- `users` - User accounts and authentication
- `ads` - Fuel station advertisements
- `subscriptions` - User subscriptions
- `payments` - Payment transactions
- `messages` - Private messages between users
- `comments` - Comments on ads
- `blog_posts` - Blog content
- `sponsored_ads` - Banner advertisements
- `news_ticker` - News ticker items
- `notifications` - User notifications
- `logs` - System logs

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/verify/:token` - Verify email
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/me` - Get current user

### Ads
- `GET /api/ads` - Get all ads (filtered by role)
- `GET /api/ads/:id` - Get single ad
- `POST /api/ads` - Create new ad
- `PUT /api/ads/:id` - Update ad
- `DELETE /api/ads/:id` - Delete ad

### Payments
- `POST /api/payments/create-intent` - Create Stripe payment intent
- `POST /api/payments/confirm` - Confirm payment
- `GET /api/payments/history` - Get payment history

### Messages
- `GET /api/messages` - Get conversations
- `GET /api/messages/:userId` - Get messages with user
- `POST /api/messages` - Send message

### Admin
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id` - Update user
- `GET /api/admin/reports` - Generate reports
- `GET /api/admin/logs` - Get system logs

See individual route files for complete API documentation.

## User Roles

1. **Advertiser**: Fuel station owners who can upload and manage ads
2. **Subscriber**: Companies paying monthly subscription for detailed station info
3. **System Manager**: Full admin access to manage users, system, and reports
4. **Marketing Manager**: Can manage blog posts and sponsored ads

## Features by Role

### Advertisers
- Upload fuel station ads
- Track ad views and performance
- Receive messages and comments
- Basic map view (only their own ads)

### Subscribers
- Search fuel stations by location/region
- View detailed station information on map
- Receive notifications for new relevant ads
- Access to full station details

### Managers
- User management
- System reports and analytics
- Blog post management
- Sponsored ads management
- System logs access

## Environment Variables

### Backend (.env)
```
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=mahattati
JWT_SECRET=your_secret_key
STRIPE_SECRET_KEY=your_stripe_secret
GOOGLE_MAPS_API_KEY=your_google_maps_key
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password
```

### Frontend (.env)
```
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
REACT_APP_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

## Security

- JWT-based authentication
- Password hashing with bcrypt
- SQL injection prevention with parameterized queries
- XSS protection with helmet
- Rate limiting on API endpoints
- HTTPS enforcement in production

## Compliance

The system is designed to comply with:
- Saudi E-Commerce Law
- Saudi Advertising Regulations
- Fuel Station Standards (MOMAH)
- Personal Data Protection Law (PDPL)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is proprietary software. All rights reserved.

## Support

For support, please contact the development team.

## Acknowledgments

- Built according to IEEE Std 830-1998 SRS standards
- Compliant with Saudi Arabia regulations
- Inspired by platforms like Haraj.com.sa and Aqar.sa


