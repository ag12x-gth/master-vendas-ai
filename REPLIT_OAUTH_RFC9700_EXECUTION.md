# OAuth 2.1 Implementation - RFC 9700 Compliant

**Documentação de Referência Técnica para Implementação OAuth 2.1 com PKCE**

---

## CONFIGURAÇÃO

### 1. Arquivo de Configuração (`oauth_config.json`)

```json
{
  "oauth": {
    "client_id": "replit_oauth_client",
    "redirect_uri": "https://entraai.replit.app/oauth/callback",
    "authorization_endpoint": "https://entraai.replit.app/oauth/authorize",
    "token_endpoint": "https://entraai.replit.app/oauth/token",
    "scopes": ["profile", "email", "openid"],
    "response_type": "code",
    "pkce_method": "S256"
  },
  "jwt": {
    "algorithm": "RS256",
    "issuer": "https://entraai.replit.app",
    "audience": "replit_oauth_client",
    "token_expiry": 3600,
    "refresh_token_expiry": 604800
  },
  "security": {
    "state_token_length": 32,
    "code_verifier_length": 128,
    "csrf_cookie_name": "oauth_state",
    "csrf_cookie_secure": true,
    "csrf_cookie_httponly": true,
    "csrf_cookie_samesite": "Lax"
  }
}
```

### 2. Variáveis de Ambiente (`.env`)

```bash
# OAuth Configuration
OAUTH_CLIENT_ID=replit_oauth_client
OAUTH_CLIENT_SECRET=your-secret-key-here
JWT_PRIVATE_KEY_PATH=./keys/private_key.pem
JWT_PUBLIC_KEY_PATH=./keys/public_key.pem

# Security
FLASK_SECRET_KEY=your-flask-secret-key
SESSION_COOKIE_SECURE=True
SESSION_COOKIE_HTTPONLY=True
SESSION_COOKIE_SAMESITE=Lax

# Application
BASE_URL=https://entraai.replit.app
LOG_LEVEL=INFO
```

### 3. Setup Script (`setup_oauth.sh`)

```bash
#!/bin/bash

echo "🔧 OAuth 2.1 PKCE Setup - RFC 9700"

# Create directories
mkdir -p keys logs

# Install Python dependencies
pip install Flask PyJWT cryptography python-dotenv requests

# Generate RSA key pair for JWT signing
openssl genrsa -out keys/private_key.pem 2048
openssl rsa -in keys/private_key.pem -pubout -out keys/public_key.pem

echo "✅ RSA keys generated: keys/private_key.pem, keys/public_key.pem"

# Set proper permissions
chmod 600 keys/private_key.pem
chmod 644 keys/public_key.pem

echo "✅ Setup complete! Run: python oauth_server.py"
```

---

## IMPLEMENTAÇÃO

### 1. Servidor OAuth (`oauth_server.py`)

```python
#!/usr/bin/env python3
"""
OAuth 2.1 Authorization Server - RFC 9700 Compliant
Implements PKCE (RFC 7636), State CSRF protection, and JWT tokens
"""

import os
import json
import hashlib
import secrets
import base64
import logging
from datetime import datetime, timedelta
from functools import wraps
from typing import Dict, Optional, Tuple

from flask import Flask, request, jsonify, redirect, make_response, session
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
import jwt
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[
        logging.FileHandler('logs/oauth_server.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY', secrets.token_hex(32))
app.config['SESSION_COOKIE_SECURE'] = True
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

# Load OAuth configuration
with open('oauth_config.json', 'r') as f:
    config = json.load(f)

# In-memory storage (replace with Redis/DB in production)
authorization_codes = {}
access_tokens = {}
refresh_tokens = {}
pkce_challenges = {}


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def load_private_key():
    """Load RSA private key for JWT signing"""
    key_path = os.getenv('JWT_PRIVATE_KEY_PATH', './keys/private_key.pem')
    with open(key_path, 'rb') as f:
        return serialization.load_pem_private_key(
            f.read(),
            password=None,
            backend=default_backend()
        )


def load_public_key():
    """Load RSA public key for JWT verification"""
    key_path = os.getenv('JWT_PUBLIC_KEY_PATH', './keys/public_key.pem')
    with open(key_path, 'rb') as f:
        return serialization.load_pem_public_key(
            f.read(),
            backend=default_backend()
        )


def generate_state_token() -> str:
    """Generate cryptographically secure state token for CSRF protection"""
    length = config['security']['state_token_length']
    token = secrets.token_urlsafe(length)
    logger.info(f"Generated state token: {token[:8]}...")
    return token


def generate_authorization_code() -> str:
    """Generate authorization code"""
    code = secrets.token_urlsafe(32)
    logger.info(f"Generated authorization code: {code[:8]}...")
    return code


def verify_pkce_challenge(code_verifier: str, code_challenge: str) -> bool:
    """
    Verify PKCE code challenge using S256 method
    RFC 7636: code_challenge = BASE64URL(SHA256(code_verifier))
    """
    logger.info(f"Verifying PKCE challenge")
    
    # Compute SHA256 hash of code_verifier
    hash_digest = hashlib.sha256(code_verifier.encode('utf-8')).digest()
    
    # Base64 URL-safe encode without padding
    computed_challenge = base64.urlsafe_b64encode(hash_digest).decode('utf-8').rstrip('=')
    
    is_valid = computed_challenge == code_challenge
    logger.info(f"PKCE verification: {'✅ VALID' if is_valid else '❌ INVALID'}")
    
    return is_valid


def generate_jwt_token(user_id: str, scope: str, token_type: str = 'access') -> Tuple[str, int]:
    """
    Generate JWT access or refresh token with proper claims
    
    Claims (RFC 9068):
    - sub: Subject (user ID)
    - scope: OAuth scopes
    - exp: Expiration time
    - iat: Issued at time
    - iss: Issuer
    - aud: Audience
    - jti: JWT ID (unique token identifier)
    """
    now = datetime.utcnow()
    
    if token_type == 'access':
        expiry = config['jwt']['token_expiry']
    else:
        expiry = config['jwt']['refresh_token_expiry']
    
    exp_time = now + timedelta(seconds=expiry)
    
    payload = {
        'sub': user_id,
        'scope': scope,
        'exp': int(exp_time.timestamp()),
        'iat': int(now.timestamp()),
        'iss': config['jwt']['issuer'],
        'aud': config['jwt']['audience'],
        'jti': secrets.token_urlsafe(16),
        'token_type': token_type
    }
    
    private_key = load_private_key()
    token = jwt.encode(payload, private_key, algorithm=config['jwt']['algorithm'])
    
    logger.info(f"Generated {token_type} token for user={user_id}, exp={exp_time.isoformat()}")
    
    return token, expiry


def verify_jwt_token(token: str) -> Optional[Dict]:
    """Verify and decode JWT token"""
    try:
        public_key = load_public_key()
        payload = jwt.decode(
            token,
            public_key,
            algorithms=[config['jwt']['algorithm']],
            audience=config['jwt']['audience'],
            issuer=config['jwt']['issuer']
        )
        logger.info(f"Token verified: sub={payload.get('sub')}, jti={payload.get('jti')}")
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("Token verification failed: Expired signature")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"Token verification failed: {str(e)}")
        return None


# ============================================================================
# SECURITY MIDDLEWARE
# ============================================================================

def require_auth(f):
    """Middleware to protect routes with JWT authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            logger.warning("Missing or invalid Authorization header")
            return jsonify({
                'error': 'unauthorized',
                'error_description': 'Missing or invalid Authorization header'
            }), 401
        
        token = auth_header.split(' ')[1]
        payload = verify_jwt_token(token)
        
        if not payload:
            return jsonify({
                'error': 'invalid_token',
                'error_description': 'Token is invalid or expired'
            }), 401
        
        # Attach payload to request context
        request.oauth_payload = payload
        
        return f(*args, **kwargs)
    
    return decorated_function


def apply_security_headers(response):
    """Apply security headers to all responses"""
    response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    return response


app.after_request(apply_security_headers)


# ============================================================================
# OAUTH 2.1 ENDPOINTS
# ============================================================================

@app.route('/oauth/authorize', methods=['GET'])
def authorize():
    """
    Authorization endpoint (RFC 6749 Section 3.1)
    Supports PKCE (RFC 7636) with S256 challenge method
    
    Required parameters:
    - response_type: Must be 'code'
    - client_id: OAuth client identifier
    - redirect_uri: Callback URL (must match registered URI)
    - scope: Requested scopes (space-separated)
    - state: CSRF protection token
    - code_challenge: PKCE challenge (S256 hashed code_verifier)
    - code_challenge_method: Must be 'S256'
    """
    logger.info("=== AUTHORIZATION REQUEST ===")
    
    # Extract parameters
    response_type = request.args.get('response_type')
    client_id = request.args.get('client_id')
    redirect_uri = request.args.get('redirect_uri')
    scope = request.args.get('scope')
    state = request.args.get('state')
    code_challenge = request.args.get('code_challenge')
    code_challenge_method = request.args.get('code_challenge_method')
    
    logger.info(f"client_id={client_id}, redirect_uri={redirect_uri}, scope={scope}")
    logger.info(f"code_challenge={code_challenge[:16]}..., method={code_challenge_method}")
    
    # Validate required parameters
    if not all([response_type, client_id, redirect_uri, scope, state, code_challenge, code_challenge_method]):
        logger.error("Missing required parameters")
        return jsonify({
            'error': 'invalid_request',
            'error_description': 'Missing required parameters'
        }), 400
    
    # Validate response_type
    if response_type != 'code':
        logger.error(f"Invalid response_type: {response_type}")
        return jsonify({
            'error': 'unsupported_response_type',
            'error_description': 'Only authorization code flow is supported'
        }), 400
    
    # Validate PKCE method
    if code_challenge_method != 'S256':
        logger.error(f"Invalid code_challenge_method: {code_challenge_method}")
        return jsonify({
            'error': 'invalid_request',
            'error_description': 'Only S256 challenge method is supported (RFC 7636)'
        }), 400
    
    # Validate client_id
    if client_id != config['oauth']['client_id']:
        logger.error(f"Invalid client_id: {client_id}")
        return jsonify({
            'error': 'unauthorized_client',
            'error_description': 'Invalid client_id'
        }), 401
    
    # Validate redirect_uri (exact match required per RFC 9700)
    if redirect_uri != config['oauth']['redirect_uri']:
        logger.error(f"Invalid redirect_uri: {redirect_uri}")
        return jsonify({
            'error': 'invalid_request',
            'error_description': 'redirect_uri does not match registered URI'
        }), 400
    
    # Generate authorization code
    auth_code = generate_authorization_code()
    
    # Store authorization code with PKCE challenge
    authorization_codes[auth_code] = {
        'client_id': client_id,
        'redirect_uri': redirect_uri,
        'scope': scope,
        'code_challenge': code_challenge,
        'code_challenge_method': code_challenge_method,
        'created_at': datetime.utcnow(),
        'used': False
    }
    
    logger.info(f"✅ Authorization code generated: {auth_code[:8]}...")
    
    # Build redirect URL with authorization code and state
    redirect_url = f"{redirect_uri}?code={auth_code}&state={state}"
    
    logger.info(f"Redirecting to: {redirect_url[:50]}...")
    
    return redirect(redirect_url)


@app.route('/oauth/token', methods=['POST'])
def token():
    """
    Token endpoint (RFC 6749 Section 3.2)
    Exchanges authorization code for access token
    Validates PKCE code_verifier
    
    Required parameters:
    - grant_type: Must be 'authorization_code'
    - code: Authorization code from /authorize
    - redirect_uri: Must match the redirect_uri from /authorize
    - code_verifier: PKCE verifier to validate against code_challenge
    - client_id: OAuth client identifier
    """
    logger.info("=== TOKEN REQUEST ===")
    
    # Extract parameters
    grant_type = request.form.get('grant_type')
    code = request.form.get('code')
    redirect_uri = request.form.get('redirect_uri')
    code_verifier = request.form.get('code_verifier')
    client_id = request.form.get('client_id')
    
    logger.info(f"grant_type={grant_type}, code={code[:8] if code else None}...")
    logger.info(f"code_verifier={code_verifier[:16] if code_verifier else None}...")
    
    # Validate required parameters
    if not all([grant_type, code, redirect_uri, code_verifier, client_id]):
        logger.error("Missing required parameters")
        return jsonify({
            'error': 'invalid_request',
            'error_description': 'Missing required parameters'
        }), 400
    
    # Validate grant_type
    if grant_type != 'authorization_code':
        logger.error(f"Invalid grant_type: {grant_type}")
        return jsonify({
            'error': 'unsupported_grant_type',
            'error_description': 'Only authorization_code grant type is supported'
        }), 400
    
    # Validate authorization code
    if code not in authorization_codes:
        logger.error(f"Invalid authorization code: {code[:8]}...")
        return jsonify({
            'error': 'invalid_grant',
            'error_description': 'Authorization code is invalid or expired'
        }), 400
    
    auth_data = authorization_codes[code]
    
    # Check if code was already used (prevent replay attacks)
    if auth_data['used']:
        logger.error(f"Authorization code already used: {code[:8]}...")
        return jsonify({
            'error': 'invalid_grant',
            'error_description': 'Authorization code has already been used'
        }), 400
    
    # Validate client_id matches
    if client_id != auth_data['client_id']:
        logger.error(f"client_id mismatch")
        return jsonify({
            'error': 'invalid_grant',
            'error_description': 'client_id does not match'
        }), 400
    
    # Validate redirect_uri matches
    if redirect_uri != auth_data['redirect_uri']:
        logger.error(f"redirect_uri mismatch")
        return jsonify({
            'error': 'invalid_grant',
            'error_description': 'redirect_uri does not match'
        }), 400
    
    # Verify PKCE code_verifier
    if not verify_pkce_challenge(code_verifier, auth_data['code_challenge']):
        logger.error("PKCE verification failed")
        return jsonify({
            'error': 'invalid_grant',
            'error_description': 'PKCE verification failed'
        }), 400
    
    # Mark code as used
    authorization_codes[code]['used'] = True
    
    # Generate tokens
    user_id = f"user_{secrets.token_hex(8)}"  # In production, get from database
    scope = auth_data['scope']
    
    access_token, access_expiry = generate_jwt_token(user_id, scope, 'access')
    refresh_token, refresh_expiry = generate_jwt_token(user_id, scope, 'refresh')
    
    # Store tokens
    access_tokens[access_token] = {
        'user_id': user_id,
        'scope': scope,
        'expires_at': datetime.utcnow() + timedelta(seconds=access_expiry)
    }
    
    refresh_tokens[refresh_token] = {
        'user_id': user_id,
        'scope': scope,
        'expires_at': datetime.utcnow() + timedelta(seconds=refresh_expiry)
    }
    
    logger.info(f"✅ Tokens generated for user={user_id}")
    
    # Return token response (RFC 6749 Section 5.1)
    return jsonify({
        'access_token': access_token,
        'token_type': 'Bearer',
        'expires_in': access_expiry,
        'refresh_token': refresh_token,
        'scope': scope
    })


@app.route('/oauth/userinfo', methods=['GET'])
@require_auth
def userinfo():
    """
    UserInfo endpoint (OpenID Connect)
    Returns user profile information
    Requires valid access token
    """
    logger.info("=== USERINFO REQUEST ===")
    
    payload = request.oauth_payload
    user_id = payload.get('sub')
    
    logger.info(f"Fetching userinfo for user={user_id}")
    
    # In production, fetch from database
    user_info = {
        'sub': user_id,
        'email': f'{user_id}@example.com',
        'email_verified': True,
        'name': f'User {user_id}',
        'updated_at': int(datetime.utcnow().timestamp())
    }
    
    logger.info(f"✅ Returned userinfo for {user_id}")
    
    return jsonify(user_info)


@app.route('/api/protected', methods=['GET'])
@require_auth
def protected_resource():
    """Example protected API endpoint"""
    logger.info("=== PROTECTED RESOURCE ACCESS ===")
    
    payload = request.oauth_payload
    
    return jsonify({
        'message': 'This is a protected resource',
        'user': payload.get('sub'),
        'scope': payload.get('scope'),
        'authenticated_at': datetime.utcnow().isoformat()
    })


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'version': '1.0.0'
    })


# ============================================================================
# MAIN
# ============================================================================

if __name__ == '__main__':
    logger.info("🚀 OAuth 2.1 Server Starting (RFC 9700 Compliant)")
    logger.info(f"Issuer: {config['jwt']['issuer']}")
    logger.info(f"PKCE Method: {config['oauth']['pkce_method']}")
    
    app.run(
        host='0.0.0.0',
        port=int(os.getenv('PORT', 8080)),
        debug=False
    )
```

---

## VALIDAÇÃO

### 1. Cliente de Teste (`test_oauth_client.py`)

```python
#!/usr/bin/env python3
"""
OAuth 2.1 Client Test - PKCE Flow
Tests the complete authorization code flow with PKCE
"""

import requests
import hashlib
import base64
import secrets
import json
from urllib.parse import urlencode, parse_qs, urlparse

# Load configuration
with open('oauth_config.json', 'r') as f:
    config = json.load(f)

BASE_URL = "https://entraai.replit.app"


def generate_code_verifier() -> str:
    """Generate PKCE code verifier (43-128 characters)"""
    return base64.urlsafe_b64encode(secrets.token_bytes(96)).decode('utf-8').rstrip('=')


def generate_code_challenge(verifier: str) -> str:
    """Generate PKCE code challenge using S256 method"""
    digest = hashlib.sha256(verifier.encode('utf-8')).digest()
    return base64.urlsafe_b64encode(digest).decode('utf-8').rstrip('=')


def test_authorization_flow():
    """Test complete OAuth 2.1 authorization code flow with PKCE"""
    
    print("🔐 OAuth 2.1 PKCE Flow Test\n")
    
    # Step 1: Generate PKCE parameters
    print("Step 1: Generate PKCE parameters")
    code_verifier = generate_code_verifier()
    code_challenge = generate_code_challenge(code_verifier)
    state = secrets.token_urlsafe(32)
    
    print(f"  code_verifier: {code_verifier[:32]}...")
    print(f"  code_challenge: {code_challenge[:32]}...")
    print(f"  state: {state[:32]}...\n")
    
    # Step 2: Build authorization URL
    print("Step 2: Build authorization URL")
    auth_params = {
        'response_type': 'code',
        'client_id': config['oauth']['client_id'],
        'redirect_uri': config['oauth']['redirect_uri'],
        'scope': ' '.join(config['oauth']['scopes']),
        'state': state,
        'code_challenge': code_challenge,
        'code_challenge_method': 'S256'
    }
    
    auth_url = f"{BASE_URL}/oauth/authorize?{urlencode(auth_params)}"
    print(f"  URL: {auth_url[:100]}...\n")
    
    # Step 3: Simulate user authorization (auto-redirect in test)
    print("Step 3: Request authorization code")
    response = requests.get(auth_url, allow_redirects=False)
    
    if response.status_code == 302:
        redirect_location = response.headers['Location']
        parsed = urlparse(redirect_location)
        query_params = parse_qs(parsed.query)
        
        authorization_code = query_params.get('code', [None])[0]
        returned_state = query_params.get('state', [None])[0]
        
        print(f"  ✅ Authorization code: {authorization_code[:16]}...")
        print(f"  ✅ State validated: {returned_state == state}\n")
    else:
        print(f"  ❌ Failed: {response.status_code}\n")
        return
    
    # Step 4: Exchange code for tokens
    print("Step 4: Exchange code for access token")
    token_params = {
        'grant_type': 'authorization_code',
        'code': authorization_code,
        'redirect_uri': config['oauth']['redirect_uri'],
        'client_id': config['oauth']['client_id'],
        'code_verifier': code_verifier
    }
    
    token_response = requests.post(
        f"{BASE_URL}/oauth/token",
        data=token_params
    )
    
    if token_response.status_code == 200:
        tokens = token_response.json()
        access_token = tokens['access_token']
        print(f"  ✅ Access token: {access_token[:32]}...")
        print(f"  ✅ Expires in: {tokens['expires_in']}s")
        print(f"  ✅ Scope: {tokens['scope']}\n")
    else:
        print(f"  ❌ Failed: {token_response.json()}\n")
        return
    
    # Step 5: Access protected resource
    print("Step 5: Access protected resource")
    headers = {'Authorization': f'Bearer {access_token}'}
    protected_response = requests.get(
        f"{BASE_URL}/api/protected",
        headers=headers
    )
    
    if protected_response.status_code == 200:
        data = protected_response.json()
        print(f"  ✅ Protected resource accessed")
        print(f"  ✅ User: {data['user']}")
        print(f"  ✅ Message: {data['message']}\n")
    else:
        print(f"  ❌ Failed: {protected_response.status_code}\n")
    
    print("✅ OAuth 2.1 PKCE Flow Test Complete!")


if __name__ == '__main__':
    test_authorization_flow()
```

---

## TESTES

### 1. Teste Manual via DevTools

**Console do Navegador:**

```javascript
// PKCE Flow Test in Browser DevTools

// Step 1: Generate PKCE parameters
function generateRandomString(length) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode.apply(null, array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

const codeVerifier = generateRandomString(96);
console.log('code_verifier:', codeVerifier);

sha256(codeVerifier).then(challenge => {
  console.log('code_challenge:', challenge);
  
  const state = generateRandomString(32);
  console.log('state:', state);
  
  // Step 2: Build authorization URL
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: 'replit_oauth_client',
    redirect_uri: 'https://entraai.replit.app/oauth/callback',
    scope: 'profile email openid',
    state: state,
    code_challenge: challenge,
    code_challenge_method: 'S256'
  });
  
  const authUrl = `https://entraai.replit.app/oauth/authorize?${params}`;
  console.log('Authorization URL:', authUrl);
  
  // Step 3: Store verifier for later use
  sessionStorage.setItem('oauth_code_verifier', codeVerifier);
  sessionStorage.setItem('oauth_state', state);
  
  console.log('✅ PKCE parameters generated. Open URL to authorize.');
});
```

**Após receber o código de autorização na callback:**

```javascript
// Step 4: Exchange code for token
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');
const state = urlParams.get('state');

// Validate state
const storedState = sessionStorage.getItem('oauth_state');
if (state !== storedState) {
  console.error('❌ State mismatch! Possible CSRF attack.');
} else {
  console.log('✅ State validated');
  
  const codeVerifier = sessionStorage.getItem('oauth_code_verifier');
  
  // Exchange code for token
  const tokenParams = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: 'https://entraai.replit.app/oauth/callback',
    client_id: 'replit_oauth_client',
    code_verifier: codeVerifier
  });
  
  fetch('https://entraai.replit.app/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: tokenParams
  })
  .then(res => res.json())
  .then(data => {
    console.log('✅ Access Token:', data.access_token);
    console.log('✅ Expires in:', data.expires_in);
    
    // Store token
    sessionStorage.setItem('access_token', data.access_token);
    
    // Test protected endpoint
    return fetch('https://entraai.replit.app/api/protected', {
      headers: {
        'Authorization': `Bearer ${data.access_token}`
      }
    });
  })
  .then(res => res.json())
  .then(data => {
    console.log('✅ Protected Resource:', data);
  })
  .catch(err => console.error('❌ Error:', err));
}
```

### 2. Testes Unitários (`test_oauth_unit.py`)

```python
import unittest
import hashlib
import base64
from oauth_server import verify_pkce_challenge, generate_state_token

class TestOAuthPKCE(unittest.TestCase):
    
    def test_pkce_s256_verification(self):
        """Test PKCE S256 verification"""
        code_verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
        
        # Compute expected challenge
        hash_digest = hashlib.sha256(code_verifier.encode()).digest()
        code_challenge = base64.urlsafe_b64encode(hash_digest).decode().rstrip('=')
        
        # Verify
        self.assertTrue(verify_pkce_challenge(code_verifier, code_challenge))
    
    def test_state_token_generation(self):
        """Test state token is cryptographically secure"""
        token1 = generate_state_token()
        token2 = generate_state_token()
        
        # Tokens should be different
        self.assertNotEqual(token1, token2)
        
        # Token should have sufficient entropy
        self.assertGreater(len(token1), 32)

if __name__ == '__main__':
    unittest.main()
```

---

## MÉTRICAS

### 1. Monitoramento de Performance

```python
# Add to oauth_server.py

import time
from functools import wraps

# Metrics storage
metrics = {
    'requests_total': 0,
    'requests_success': 0,
    'requests_failed': 0,
    'response_times': []
}

def track_metrics(f):
    """Decorator to track endpoint metrics"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        metrics['requests_total'] += 1
        start_time = time.time()
        
        try:
            result = f(*args, **kwargs)
            metrics['requests_success'] += 1
            return result
        except Exception as e:
            metrics['requests_failed'] += 1
            raise e
        finally:
            elapsed = time.time() - start_time
            metrics['response_times'].append(elapsed)
            logger.info(f"Request duration: {elapsed:.3f}s")
    
    return decorated_function

@app.route('/metrics', methods=['GET'])
def get_metrics():
    """Endpoint to expose metrics"""
    avg_response_time = sum(metrics['response_times']) / len(metrics['response_times']) if metrics['response_times'] else 0
    
    return jsonify({
        'requests_total': metrics['requests_total'],
        'requests_success': metrics['requests_success'],
        'requests_failed': metrics['requests_failed'],
        'success_rate': (metrics['requests_success'] / metrics['requests_total'] * 100) if metrics['requests_total'] > 0 else 0,
        'avg_response_time_ms': avg_response_time * 1000,
        'timestamp': datetime.utcnow().isoformat()
    })
```

### 2. Security Audit Log

```python
# Security events logger

security_events = []

def log_security_event(event_type: str, details: dict):
    """Log security-relevant events"""
    event = {
        'timestamp': datetime.utcnow().isoformat(),
        'type': event_type,
        'details': details,
        'ip_address': request.remote_addr,
        'user_agent': request.headers.get('User-Agent')
    }
    
    security_events.append(event)
    logger.warning(f"SECURITY: {event_type} - {details}")

# Usage in endpoints:
# log_security_event('pkce_verification_failed', {'code': code[:8]})
# log_security_event('invalid_client_id', {'client_id': client_id})
```

---

## REFERÊNCIAS

- **RFC 6749:** OAuth 2.0 Authorization Framework
- **RFC 7636:** Proof Key for Code Exchange (PKCE)
- **RFC 9068:** JSON Web Token (JWT) Profile for OAuth 2.0 Access Tokens
- **RFC 9700:** OAuth 2.1 (consolidates best practices from multiple RFCs)
- **OpenID Connect Core 1.0:** UserInfo endpoint specification

---

## CHECKLIST DE SEGURANÇA

- [x] PKCE obrigatório com método S256
- [x] State token para proteção CSRF
- [x] Validação exata de redirect_uri (RFC 9700)
- [x] JWT com algoritmo assimétrico (RS256)
- [x] Tokens de uso único (authorization code)
- [x] Headers de segurança (CSP, X-Frame-Options)
- [x] Logs detalhados de eventos de segurança
- [x] HTTPS obrigatório em produção
- [x] Cookies com flags Secure, HttpOnly, SameSite
- [x] Validação de todos os parâmetros obrigatórios

---

**Documentação gerada em:** 2025-11-15  
**Versão:** 1.0.0  
**Compliance:** RFC 9700, RFC 7636, RFC 6749
