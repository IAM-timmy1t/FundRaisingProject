# Enhanced Authentication Setup Guide
## Task #5: Enhanced Authentication System

### Overview
This guide covers setting up Google/Apple social authentication, Multi-Factor Authentication (MFA), and role-based access control for the Blessed-Horizon platform.

## 1. Database Migration

**✅ Status: Migration file created**

Run the migration to add user roles and authentication fields:

```sql
-- File: supabase/migrations/004_user_roles.sql
-- This migration adds:
-- - User role enum (donor, recipient, admin, superadmin)
-- - MFA fields (mfa_enabled, mfa_secret)
-- - Social provider tracking
-- - Login tracking fields
-- - Admin users table
-- - Role-checking functions
```

**Action Required:**
1. Go to Supabase Dashboard: https://app.supabase.com/project/yjskofrahipwryyhsxrc
2. Navigate to SQL Editor
3. Copy contents of `supabase/migrations/004_user_roles.sql`
4. Run the migration

## 2. Google Authentication Setup

### Prerequisites
1. Google Cloud Console account
2. OAuth 2.0 credentials

### Setup Steps

1. **Create Google OAuth Credentials:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URI: `https://yjskofrahipwryyhsxrc.supabase.co/auth/v1/callback`

2. **Configure in Supabase:**
   - Go to Supabase Dashboard > Authentication > Providers
   - Enable Google provider
   - Add your Google Client ID and Client Secret
   - Save configuration

3. **Test Configuration:**
   - The `EnhancedAuthModal` component already includes Google sign-in button
   - Test the flow in development

## 3. Apple Authentication Setup

### Prerequisites
1. Apple Developer account ($99/year)
2. App ID with Sign in with Apple capability

### Setup Steps

1. **Create Apple Service ID:**
   - Go to [Apple Developer Portal](https://developer.apple.com/)
   - Create an App ID
   - Create a Service ID
   - Configure redirect URL: `https://yjskofrahipwryyhsxrc.supabase.co/auth/v1/callback`

2. **Generate Private Key:**
   - Create a Sign in with Apple private key
   - Download the .p8 file

3. **Configure in Supabase:**
   - Go to Supabase Dashboard > Authentication > Providers
   - Enable Apple provider
   - Add Service ID, Team ID, and Private Key
   - Save configuration

4. **Update Environment Variable:**
   ```env
   VITE_ENABLE_APPLE_AUTH=true
   ```

## 4. Multi-Factor Authentication (MFA)

### Features Implemented
- TOTP (Time-based One-Time Password) support
- QR code generation for authenticator apps
- Manual secret key entry option
- MFA enrollment and verification flows

### Components
- `MFASetup.jsx` - Setup wizard for enabling MFA
- `MFAVerification.jsx` - Verification during login
- Enhanced auth context with MFA methods

### User Flow
1. User enables MFA from account settings
2. System generates QR code and secret
3. User scans with authenticator app
4. User verifies with 6-digit code
5. MFA is enabled for the account

### Supported Authenticator Apps
- Google Authenticator
- Microsoft Authenticator
- Authy
- 1Password
- Any TOTP-compatible app

## 5. Role-Based Access Control (RBAC)

### User Roles
1. **Donor** (default)
   - View campaigns
   - Make donations
   - View donation history
   - Message recipients

2. **Recipient**
   - All donor permissions
   - Create campaigns
   - Post updates
   - View campaign analytics

3. **Admin**
   - All recipient permissions
   - Moderate campaigns
   - View all users
   - Send platform notifications
   - Access analytics dashboard

4. **Superadmin**
   - All permissions
   - Manage other admins
   - System configuration
   - Database management

### Using Role Guards

```jsx
// Protect routes by role
import RoleGuard from '@/components/auth/RoleGuard';

// Admin only route
<RoleGuard roles="admin">
  <AdminDashboard />
</RoleGuard>

// Multiple roles
<RoleGuard roles={["admin", "superadmin"]}>
  <UserManagement />
</RoleGuard>

// Permission-based
<RoleGuard permission="moderate_campaigns">
  <ModerationQueue />
</RoleGuard>
```

### Using Role Hook

```jsx
import useRole from '@/hooks/useRole';

function MyComponent() {
  const { isAdmin, checkPermission, role } = useRole();
  
  if (isAdmin) {
    // Show admin features
  }
  
  if (checkPermission('create_campaign')) {
    // Show campaign creation button
  }
}
```

## 6. Implementation Checklist

### Database
- [ ] Run migration 004_user_roles.sql
- [ ] Verify tables and functions created
- [ ] Test role functions

### Authentication
- [ ] Configure Google OAuth in Supabase
- [ ] Configure Apple OAuth in Supabase (optional)
- [ ] Test social login flows
- [ ] Verify user profiles created with roles

### MFA
- [ ] Install QRCode package: `npm install qrcode`
- [ ] Test MFA enrollment flow
- [ ] Test MFA verification on login
- [ ] Verify MFA factors stored correctly

### Components
- [ ] Replace AuthModal with EnhancedAuthModal
- [ ] Replace SupabaseAuthContext with EnhancedAuthContext
- [ ] Add MFA setup to user settings
- [ ] Implement role-based UI elements

### Testing
- [ ] Test donor registration and permissions
- [ ] Test recipient registration and permissions
- [ ] Create admin user via database
- [ ] Test admin access to protected routes
- [ ] Verify MFA flow end-to-end

## 7. Required NPM Packages

```bash
npm install qrcode react-icons
```

## 8. Security Considerations

1. **Role Assignment**
   - Only admins can change user roles
   - Default role is 'donor' for safety
   - Superadmin role requires database access

2. **MFA Best Practices**
   - Encourage but don't require MFA initially
   - Require MFA for admin accounts
   - Provide backup codes (future enhancement)

3. **Social Login**
   - Always verify email from providers
   - Map social profiles to existing accounts by email
   - Log social provider used for auditing

## 9. Troubleshooting

### Google Login Not Working
- Verify redirect URI matches exactly
- Check OAuth consent screen configuration
- Ensure Google+ API is enabled

### MFA QR Code Not Showing
- Check qrcode package installed
- Verify TOTP URI format
- Check browser console for errors

### Role Permissions Not Working
- Verify migration ran successfully
- Check user_profiles table has role column
- Test role functions in SQL editor

## 10. Next Steps

1. Complete all setup steps above
2. Test authentication flows thoroughly
3. Implement MFA requirement for admins
4. Add user management UI for admins
5. Create audit log for role changes
6. Implement session management
7. Add password reset with MFA

## Support

For Supabase-specific issues:
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase MFA Guide](https://supabase.com/docs/guides/auth/auth-mfa)

For implementation questions, refer to the component files in:
- `/src/components/auth/`
- `/src/contexts/EnhancedAuthContext.jsx`
- `/src/lib/auth.config.js`
