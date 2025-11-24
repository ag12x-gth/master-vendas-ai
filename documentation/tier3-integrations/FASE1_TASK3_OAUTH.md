# 🔐 FASE 1 - TASK 3: OAUTH SETUP PROCEDURES

**Data**: 24 de Novembro de 2025  
**Status**: ✅ COMPLETE OAUTH PROCEDURES (Google + Facebook + GitHub)

---

## 1️⃣ GOOGLE OAUTH - DETAILED SETUP

### Step-by-Step Complete Guide

#### 1. Create Google Cloud Project

```
URL: https://console.cloud.google.com
1. Click "Select a Project" (top-left)
2. Click "New Project"
3. Project name: "Master IA Oficial"
4. Organization: (leave empty for personal)
5. Click "Create"
6. Wait 1-2 minutes for project creation
7. Select the new project
```

#### 2. Enable Google+ API

```
1. Left sidebar: APIs & Services
2. Click: Library
3. Search: "Google+ API" or "Identity and Access Management"
4. Click: Enable
```

#### 3. Create OAuth Consent Screen

```
1. Left sidebar: APIs & Services → OAuth consent screen
2. Select: External (recommended)
3. Click: Create

Form:
  App name: Master IA Oficial
  User support email: your-email@gmail.com
  Developer contact:
    - Email: your-email@gmail.com

4. Click: Save and Continue → Add or Remove Scopes

Scopes (Select these):
  ✅ email
  ✅ profile
  ✅ openid
  ✅ https://www.googleapis.com/auth/userinfo.profile
  ✅ https://www.googleapis.com/auth/userinfo.email

5. Click: Save and Continue
6. Review and click: Back to Dashboard
```

#### 4. Create OAuth 2.0 Credentials

```
1. Left sidebar: APIs & Services → Credentials
2. Click: Create Credentials → OAuth 2.0 Client ID
3. Application type: Web application
4. Name: Master IA Oficial Web

Authorized JavaScript origins:
  http://localhost:3000 (development)
  http://localhost:8080 (production local)
  https://your-app.replit.dev (production)

Authorized redirect URIs:
  http://localhost:3000/api/auth/callback/google
  http://localhost:8080/api/auth/callback/google
  https://your-app.replit.dev/api/auth/callback/google

5. Click: Create
6. SAVE the following:
   - CLIENT_ID: abc123def456...
   - CLIENT_SECRET: xyz789uvw012...
```

#### 5. Add to Replit

```typescript
// 1. Request secrets
request_env_var({
  request: {
    type: "secret",
    keys: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]
  },
  user_message: "Paste your Google OAuth credentials from Google Cloud Console"
})

// 2. Verify
view_env_vars({ type: "secret" })

// Should show:
// GOOGLE_CLIENT_ID: exists
// GOOGLE_CLIENT_SECRET: exists
```

#### 6. Configure NextAuth

```typescript
// src/lib/auth.config.ts
import GoogleProvider from 'next-auth/providers/google';

export const authConfig: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: 'consent',        // Always ask user
          access_type: 'offline',   // Get refresh token
          response_type: 'code',
        },
      },
    }),
  ],
};
```

#### 7. Test

```
1. Start app: npm run dev
2. Go to: http://localhost:3000/login
3. Click: "Sign in with Google"
4. Choose Google account
5. Click: Continue
6. ✅ Should be logged in!

If error 400: Check redirect URI matches in Google Console
If error 403: Check scopes are enabled
```

---

## 2️⃣ FACEBOOK OAUTH - DETAILED SETUP

#### 1. Create Facebook Developer Account

```
URL: https://developers.facebook.com
1. Click: My Apps
2. Click: Create App
3. App Name: Master IA Oficial
4. App Purpose: Personal Use
5. Click: Create App
6. Confirm your identity (email verification)
```

#### 2. Add Facebook Login

```
1. In your app dashboard
2. Click: Add Product
3. Search: "Facebook Login"
4. Click: Set Up
5. Platform: Web
6. Website URL: https://your-app.replit.dev
7. Next → Next → Done
```

#### 3. Configure App

```
1. Left sidebar: Settings → Basic
2. SAVE:
   - App ID: 123456789...
   - App Secret: abcdef123456...

3. Left sidebar: Facebook Login → Settings
4. Valid OAuth Redirect URIs:
   http://localhost:3000/api/auth/callback/facebook
   http://localhost:8080/api/auth/callback/facebook
   https://your-app.replit.dev/api/auth/callback/facebook

5. Click: Save Changes
```

#### 4. Add to Replit

```typescript
request_env_var({
  request: {
    type: "secret",
    keys: ["FACEBOOK_CLIENT_ID", "FACEBOOK_CLIENT_SECRET"]
  }
})

// Use App ID as CLIENT_ID
// Use App Secret as CLIENT_SECRET
```

#### 5. Configure NextAuth

```typescript
import FacebookProvider from 'next-auth/providers/facebook';

export const authConfig: NextAuthOptions = {
  providers: [
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID || '',
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
    }),
  ],
};
```

#### 6. Test

```
1. http://localhost:3000/login
2. Click: "Sign in with Facebook"
3. Enter Facebook credentials
4. Click: Continue as [Name]
5. ✅ Should be logged in!
```

---

## 3️⃣ GITHUB OAUTH - DETAILED SETUP

#### 1. Create GitHub OAuth App

```
URL: https://github.com/settings/developers
1. Click: OAuth Apps
2. Click: New OAuth App
3. Fill form:
   - Application name: Master IA Oficial
   - Homepage URL: https://your-app.replit.dev
   - Authorization callback URL:
     http://localhost:3000/api/auth/callback/github
     https://your-app.replit.dev/api/auth/callback/github

4. Click: Register application
5. SAVE:
   - Client ID: abc123def456...
   - Client secret: xyz789uvw012...
```

#### 2. Add to Replit

```typescript
request_env_var({
  request: {
    type: "secret",
    keys: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"]
  }
})
```

#### 3. Configure NextAuth

```typescript
import GithubProvider from 'next-auth/providers/github';

export const authConfig: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    }),
  ],
};
```

---

## 🔗 MULTI-PROVIDER LINKING

### Account Linking Implementation

```typescript
// Real code from codebase
async signIn({ user, account }) {
  if (!account) return false;

  const email = user.email?.toLowerCase();

  // Find existing user
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    // Link new provider to existing account
    const updates: any = {};
    
    if (account.provider === 'google') {
      updates.googleId = account.providerAccountId;
      updates.googleAccessToken = account.access_token;
    } else if (account.provider === 'facebook') {
      updates.facebookId = account.providerAccountId;
      updates.facebookAccessToken = account.access_token;
    } else if (account.provider === 'github') {
      updates.githubId = account.providerAccountId;
      updates.githubAccessToken = account.access_token;
    }

    await db
      .update(users)
      .set(updates)
      .where(eq(users.id, existing.id));

    user.id = existing.id;
  } else {
    // Create new user
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        name: user.name || 'User',
        avatarUrl: user.image,
        [`${account.provider}Id`]: account.providerAccountId,
      })
      .returning();

    user.id = newUser.id;
  }

  return true;
}
```

### Show Linked Providers

```typescript
export function LinkedProviders() {
  const { data: session } = useSession();
  const [linked, setLinked] = useState({
    google: false,
    facebook: false,
    github: false,
  });

  useEffect(() => {
    fetch('/api/auth/linked-providers')
      .then(r => r.json())
      .then(data => setLinked(data));
  }, []);

  return (
    <div>
      {linked.google && <p>✅ Google linked</p>}
      {!linked.google && <button onClick={() => signIn('google')}>Link Google</button>}
      
      {linked.facebook && <p>✅ Facebook linked</p>}
      {!linked.facebook && <button onClick={() => signIn('facebook')}>Link Facebook</button>}
      
      {linked.github && <p>✅ GitHub linked</p>}
      {!linked.github && <button onClick={() => signIn('github')}>Link GitHub</button>}
    </div>
  );
}
```

---

## 🛡️ SECURITY BEST PRACTICES

### Secrets Handling

```typescript
// ✅ GOOD
const secret = process.env.GOOGLE_CLIENT_SECRET;
// Automatically encrypted by Replit

// ❌ BAD
const secret = "abc123def456";  // Hardcoded!

// ❌ BAD - Exposed in error messages
console.log(error);  // Might log secret!
```

### CSRF Protection

```typescript
// NextAuth automatically handles CSRF
// But verify in custom callbacks:
async signIn({ account, credentials }) {
  // NextAuth validates CSRF token automatically
  // No additional action needed
  return true;
}
```

### Token Validation

```typescript
// ✅ GOOD - Verify callback
async jwt({ token, account }) {
  if (account) {
    // Store on initial sign-in
    token.accessToken = account.access_token;
    token.refreshToken = account.refresh_token;
  }
  return token;
}

async session({ session, token }) {
  // NEVER expose access_token in session!
  // Keep it server-side only
  return session;
}
```

---

## 🧪 TESTING OAUTH FLOWS

### Test Checklist

```typescript
// Test 1: Login works
1. Click provider button
2. Redirect to provider
3. Authorize app
4. Redirect back
5. User logged in ✅

// Test 2: Multiple login methods work
1. Login with Google ✅
2. Logout
3. Login with Facebook ✅
4. Should be same user ✅

// Test 3: Account linking
1. Login with Google
2. In settings → Link Facebook
3. Logout and login with Facebook
4. Should access same account ✅

// Test 4: Scope permissions
1. Check that requested scopes appear
2. User can deny permissions
3. App handles permission denial gracefully
```

---

## 📋 ENVIRONMENT VARIABLES CHECKLIST

```bash
# After setting up all OAuth providers, you should have:

NEXTAUTH_SECRET=...                  # Auto-generated by NextAuth
NEXTAUTH_URL=http://localhost:3000   # or https://your-domain.replit.dev

# Google
GOOGLE_CLIENT_ID=...                 # From Google Cloud Console
GOOGLE_CLIENT_SECRET=...             # From Google Cloud Console

# Facebook
FACEBOOK_CLIENT_ID=...               # From Facebook Developers
FACEBOOK_CLIENT_SECRET=...           # From Facebook Developers

# GitHub
GITHUB_CLIENT_ID=...                 # From GitHub Settings
GITHUB_CLIENT_SECRET=...             # From GitHub Settings
```

---

## ✅ VERIFY SETUP

```typescript
// After setup, run this to verify:
view_env_vars({ type: "secret", keys: [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "FACEBOOK_CLIENT_ID",
  "FACEBOOK_CLIENT_SECRET",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
]})

// Should show all as "exists" if configured
```

---

**Document Complete**: FASE1_TASK3_OAUTH.md
