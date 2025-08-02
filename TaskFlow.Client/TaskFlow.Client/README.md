# TaskFlow Client

A modern React application for task and project management with authentication and profile management features.

## Features

- **Authentication System**
  - User login and registration
  - JWT token-based authentication
  - Multi-factor authentication (MFA) support
  - Protected routes and authentication guards
  - Automatic token refresh

- **Profile Management**
  - User profile viewing and editing
  - Avatar upload functionality
  - Password change with validation
  - User preferences and settings

- **Modern UI/UX**
  - Responsive design with Tailwind CSS
  - Form validation with React Hook Form
  - Loading states and error handling
  - Clean and intuitive interface

## Tech Stack

- **Frontend Framework**: React 19+ with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS 4+
- **Routing**: React Router DOM
- **Form Handling**: React Hook Form
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Code Quality**: ESLint

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- TaskFlow API backend running

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create environment file:
   ```bash
   cp .env.example .env.local
   ```

3. Update the environment variables in `.env.local`:
   ```env
   VITE_API_BASE_URL=https://localhost:7170/api/v1
   ```

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Building

Build for production:
```bash
npm run build
```

### Linting

Run ESLint:
```bash
npm run lint
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── GuestRoute.tsx   # Route wrapper for unauthenticated users
│   └── ProtectedRoute.tsx # Route wrapper for authenticated users
├── contexts/            # React contexts
│   ├── auth.ts          # Auth context definition
│   └── AuthContext.tsx  # Auth provider component
├── hooks/               # Custom React hooks
│   └── useAuth.ts       # Authentication hook
├── pages/               # Page components
│   ├── authentication/ # Auth-related pages
│   │   ├── login.tsx    # Login page
│   │   └── register.tsx # Registration page
│   ├── ChangePassword.tsx # Password change page
│   ├── Dashboard.tsx    # Main dashboard
│   └── Profile.tsx      # User profile page
├── services/            # API service layers
│   ├── api.ts           # Axios configuration
│   ├── authService.ts   # Authentication API calls
│   └── profileService.ts # Profile management API calls
└── App.tsx              # Main app component
```

## API Integration

The client integrates with the TaskFlow API backend. Key endpoints:

- **Authentication**: `/auth/login`, `/auth/register`, `/auth/refresh`, `/auth/verify-mfa`
- **Profile**: `/profile` (GET/PUT), `/profile/avatar`, `/profile/password`, `/profile/preferences`

## Authentication Flow

1. User enters credentials on login page
2. API validates credentials and returns JWT token
3. If MFA is enabled, user enters verification code
4. Token is stored in localStorage and used for API requests
5. Protected routes check authentication status
6. Token is automatically refreshed when needed

## Features in Detail

### Login & Registration
- Email/password authentication
- Client-side form validation
- MFA verification support
- Automatic redirect after successful login

### Profile Management
- View and edit user profile information
- Upload and change profile pictures
- Change password with strength requirements
- Update notification preferences

### Security Features
- JWT token-based authentication
- Automatic token refresh
- Protected routes
- Secure password requirements
- File upload validation

## Environment Variables

- `VITE_API_BASE_URL`: Base URL for the API backend (required)

## License

This project is part of the TaskFlow application suite.
