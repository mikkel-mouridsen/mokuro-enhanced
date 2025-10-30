# Frontend User System Setup Guide

## Overview

The frontend now includes a complete user authentication system with login, registration, profile management, and protected routes.

## Quick Start

### 1. Install Dependencies (if not done)

```bash
cd packages/reader
npm install
```

### 2. Environment Configuration

Create a `.env` file in `packages/reader/`:

```env
VITE_API_BASE_URL=http://localhost:3000
```

### 3. Start the Backend Server

Make sure the backend is running first:

```bash
cd packages/server
npm run start:dev
```

The backend will run on `http://localhost:3000`

### 4. Start the Frontend

```bash
cd packages/reader
npm run dev
```

The frontend will run on `http://localhost:5173`

## Features

### 1. **Authentication**

- **Login Page**: Beautiful gradient login page at `/auth`
- **Registration**: Users can create accounts with username validation
- **Auto-redirect**: Non-authenticated users are redirected to login
- **Token Management**: JWT tokens stored in localStorage with automatic refresh

### 2. **Protected Routes**

All application routes are now protected:
- `/library` - Library view (requires auth)
- `/library/:mangaId` - Manga details (requires auth)
- `/reader/:mangaId/:volumeId` - Reader view (requires auth)
- `/auth` - Public login/register page

### 3. **User Profile**

- **Profile Dialog**: Access via avatar menu in top-right
- **Profile Picture Upload**: Support for jpg, png, gif, webp (max 5MB)
- **Password Change**: Update password securely
- **User Info Display**: Shows username and member since date

### 4. **UI Integration**

- **Avatar in TopBar**: Shows user avatar/initial in library view
- **Dropdown Menu**: Profile and Logout options
- **Error Handling**: Proper error messages for API failures
- **Loading States**: Loading indicators during API calls

## User Flow

### First Time User

1. **Visit Application** → Redirected to `/auth`
2. **Click "Register"** → Fill registration form
3. **Submit** → Account created, automatically logged in
4. **Redirected to Library** → Empty library, ready to upload

### Returning User

1. **Visit Application**
   - If token valid → Go to library
   - If token expired → Redirected to login
2. **Login** → Enter credentials
3. **Access Library** → See personal manga collection

### Profile Management

1. **Click Avatar** (top-right)
2. **Select "Profile"** from menu
3. **Upload Profile Picture** → Click camera icon
4. **Change Password** → Enter new password twice
5. **Click "Close"** when done

### Logout

1. **Click Avatar** (top-right)
2. **Select "Logout"**
3. **Redirected to Login Page**

## Component Structure

### Authentication Components

```
components/
├── connected/
│   ├── AuthPage.tsx          # Container for login/register
│   └── ProtectedRoute.tsx    # Route wrapper for auth
└── pure/
    ├── LoginPage.tsx          # Login UI
    ├── RegisterPage.tsx       # Registration UI
    └── ProfileDialog.tsx      # Profile management UI
```

### Updated Components

```
components/
├── connected/
│   └── Library.tsx           # Added profile & logout handlers
└── pure/
    ├── LibraryView.tsx       # Added user menu
    └── TopBar.tsx            # Added user avatar/menu
```

### Redux Store

```
store/
├── auth.slice.ts             # Auth state management
├── auth.thunks.ts            # Auth actions
└── store.ts                  # Added auth reducer
```

### API Layer

```
api/
├── auth.api.ts               # Auth API calls
├── api-client.ts             # Axios with auth interceptor
└── library.api.ts            # Updated to use api-client
```

## API Integration

### Authentication Flow

1. **User Registers/Logs In**
   ```typescript
   POST /auth/register or POST /auth/login
   → Returns: { access_token, user }
   ```

2. **Token Stored**
   ```typescript
   localStorage.setItem('authToken', token)
   ```

3. **API Calls Include Token**
   ```typescript
   // Automatic via interceptor
   headers: { Authorization: `Bearer ${token}` }
   ```

4. **Token Validation**
   - On app load, if token exists, fetch user profile
   - On 401 response, clear token and redirect to login

### API Client Configuration

The `api-client.ts` automatically:
- Adds `Authorization` header to all requests
- Handles 401 responses (clears token, triggers redirect)
- Sets base URL from environment variable

### Error Handling

Errors are displayed in the UI with retry options:

```typescript
// In LibraryView
{error ? (
  <Box>
    <Typography color="error">Failed to load library</Typography>
    <Typography>{error}</Typography>
    <Button onClick={onRetry}>Retry</Button>
  </Box>
) : ...}
```

## Testing the System

### 1. Test Registration

```bash
# Open browser to http://localhost:5173
# Should redirect to /auth
# Click "Register"
# Enter username: testuser
# Enter password: password123
# Click "Register"
# Should redirect to /library
```

### 2. Test Protected Routes

```bash
# Try to access: http://localhost:5173/library
# If not logged in → redirects to /auth
# If logged in → shows library
```

### 3. Test Profile Picture

```bash
# Login
# Click avatar (top-right)
# Click "Profile"
# Click camera icon on avatar
# Select image file
# Should upload and update immediately
```

### 4. Test Upload with Auth

```bash
# Login
# Click "Upload Volume"
# Select a .zip file
# Should upload successfully with auth token
```

### 5. Test Logout

```bash
# Click avatar
# Click "Logout"
# Should redirect to /auth
# Library data should be cleared
```

## Troubleshooting

### "Cannot POST /api/auth/register"
- **Issue**: API base URL includes `/api` prefix
- **Fix**: Update `VITE_API_BASE_URL` to `http://localhost:3000` (no `/api`)

### "Unauthorized" errors
- **Issue**: Token not being sent or expired
- **Check**:
  1. Token exists: `localStorage.getItem('authToken')`
  2. Token format: Should start with `eyJ...`
  3. Backend is running on correct port
  4. CORS is configured on backend

### Library not loading
- **Issue**: API call failing
- **Check**:
  1. Check browser console for errors
  2. Check Network tab for failed requests
  3. Verify token is being sent in headers
  4. Check backend logs for errors

### Profile picture upload fails
- **Issue**: File too large or wrong format
- **Solution**:
  - Max size: 5MB
  - Formats: jpg, jpeg, png, gif, webp

### Infinite redirect loop
- **Issue**: Auth state not syncing properly
- **Fix**:
  1. Clear localStorage: `localStorage.clear()`
  2. Refresh page
  3. Login again

## Environment Variables

```env
# Required
VITE_API_BASE_URL=http://localhost:3000

# Optional (defaults shown)
# None currently
```

## Security Notes

### Client-Side

- JWT tokens stored in localStorage
- Automatic token cleanup on 401
- Password fields use visibility toggle
- Form validation before submission

### Best Practices for Production

1. **Use HTTPS**: Always use HTTPS in production
2. **Secure Storage**: Consider httpOnly cookies instead of localStorage
3. **Token Expiration**: Implement token refresh mechanism
4. **Rate Limiting**: Add rate limiting to prevent brute force
5. **CORS**: Configure CORS properly for your domain

## Development Tips

### Debugging Authentication

```typescript
// Check current auth state
console.log('Token:', localStorage.getItem('authToken'));

// Check Redux state
import { store } from './store/store';
console.log('Auth state:', store.getState().auth);
```

### Clear Auth State

```typescript
// In browser console
localStorage.removeItem('authToken');
window.location.reload();
```

### Mock User for Testing

```typescript
// Don't do this in production!
localStorage.setItem('authToken', 'your-test-token');
```

## Next Steps

### Recommended Enhancements

1. **Remember Me**: Add persistent login option
2. **Email Verification**: Add email to registration
3. **Password Reset**: Add forgot password flow
4. **OAuth**: Add Google/GitHub login
5. **Profile Completion**: Add bio, favorite genres, etc.
6. **Avatar Cropper**: Add image cropping for avatars
7. **Session Management**: Show active sessions, allow logout from all devices

## Support

If you encounter issues:

1. Check browser console for errors
2. Check Network tab for failed requests
3. Check backend logs
4. Verify environment variables are set
5. Try clearing localStorage and starting fresh

## API Reference

### Auth Endpoints

```typescript
POST /auth/register
Body: { username: string, password: string }
Response: { access_token: string, user: User }

POST /auth/login
Body: { username: string, password: string }
Response: { access_token: string, user: User }

GET /users/me
Headers: { Authorization: Bearer <token> }
Response: User

PATCH /users/me
Headers: { Authorization: Bearer <token> }
Body: { password?: string }
Response: User

POST /users/me/profile-picture
Headers: { Authorization: Bearer <token> }
Body: FormData with 'file'
Response: User

DELETE /users/me
Headers: { Authorization: Bearer <token> }
Response: void
```

### User Type

```typescript
interface User {
  id: string;
  username: string;
  profilePicture: string | null;
  createdAt: string;
  updatedAt: string;
}
```

## File Checklist

New files created:
- ✅ `src/api/auth.api.ts`
- ✅ `src/store/auth.slice.ts`
- ✅ `src/store/auth.thunks.ts`
- ✅ `src/components/pure/LoginPage.tsx`
- ✅ `src/components/pure/RegisterPage.tsx`
- ✅ `src/components/pure/ProfileDialog.tsx`
- ✅ `src/components/connected/AuthPage.tsx`
- ✅ `src/components/connected/ProtectedRoute.tsx`

Modified files:
- ✅ `src/App.tsx` - Added auth route and protected routes
- ✅ `src/store/store.ts` - Added auth reducer
- ✅ `src/api/api-client.ts` - Fixed base URL
- ✅ `src/api/library.api.ts` - Use authenticated client
- ✅ `src/components/pure/LibraryView.tsx` - Added user menu
- ✅ `src/components/pure/TopBar.tsx` - Added user avatar
- ✅ `src/components/pure/UploadButton.tsx` - Added auth token
- ✅ `src/components/connected/Library.tsx` - Added profile handlers

Ready to use! 🎉

