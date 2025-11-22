# Rate Limiting Configuration Guide

## Overview

This application implements a sophisticated multi-layer rate limiting system to protect API endpoints from abuse, ensure fair usage, and prevent DoS attacks. The system uses Redis-based sliding window algorithms with atomic Lua scripts for accuracy and includes a fallback in-memory limiter for resilience.

## Architecture

### Core Components

1. **Rate Limiter Library** (`src/lib/rate-limiter.ts`)
   - Implements atomic sliding window algorithm using Lua scripts
   - Ensures race-condition-free rate limiting
   - Provides different limit types (company, user, IP, auth)

2. **Rate Limit Middleware** (`src/middleware/rate-limit.middleware.ts`)
   - Extracts authentication context from JWT tokens
   - Applies appropriate rate limits based on route type
   - Adds RFC 6585 compliant rate limit headers
   - Includes fallback in-memory limiter

3. **Global Middleware** (`src/middleware.ts`)
   - Integrates rate limiting into the request pipeline
   - Applies to all API routes automatically
   - Handles both authenticated and public routes

## Rate Limit Tiers

### 1. Company Level (60 requests/minute)
- **Purpose**: Prevent any single company from overwhelming the system
- **Scope**: All authenticated requests from a company
- **Key**: `rate_limit:company:{companyId}`
- **Window**: 60 seconds sliding window

### 2. User Level (20 requests/minute)
- **Purpose**: Ensure fair usage among users within a company
- **Scope**: All authenticated requests from a specific user
- **Key**: `rate_limit:user:{userId}`
- **Window**: 60 seconds sliding window

### 3. IP Level (10 requests/minute)
- **Purpose**: Protect against unauthenticated abuse
- **Scope**: All public/unauthenticated requests from an IP
- **Key**: `rate_limit:ip:{ipAddress}`
- **Window**: 60 seconds sliding window

### 4. Authentication Level (5 attempts/15 minutes)
- **Purpose**: Prevent brute-force attacks on authentication endpoints
- **Scope**: Login, register, and password reset attempts
- **Key**: `rate_limit:auth:{ipAddress}`
- **Window**: 900 seconds (15 minutes) sliding window

## Implementation Details

### Sliding Window Algorithm

The rate limiter uses a TRUE sliding window implementation with atomic Lua scripts:

```lua
-- Atomic operations in single script
1. Remove expired entries (older than window)
2. Count current entries in window
3. Check against limit
4. Add new entry if allowed
5. Set TTL for automatic cleanup
```

This ensures:
- No race conditions
- Accurate counting
- Efficient memory usage
- Automatic cleanup of old data

### Request Processing Flow

```
Request → Extract Context → Check Redis Available → Apply Rate Limits → Response
            ↓                      ↓                     ↓
         (IP, User,           (Yes/No)            (Redis/Memory)
          Company)                              
```

### Rate Limit Headers

All responses include RFC 6585 compliant headers:

```http
X-RateLimit-Limit: 20        # Maximum requests allowed
X-RateLimit-Remaining: 15    # Requests remaining in window
X-RateLimit-Reset: <ISO8601>  # When the window resets
Retry-After: 60               # Seconds to wait (on 429)
X-RateLimit-Fallback: true    # Indicates fallback mode (if applicable)
```

## Usage Examples

### 1. Applying Rate Limiting to Individual Routes

For routes that need custom handling:

```typescript
import { withRateLimit } from '@/middleware/rate-limit.middleware';

async function handler(request: NextRequest) {
  // Your route logic
  return NextResponse.json({ data: 'success' });
}

// Apply rate limiting
export const GET = withRateLimit(handler);
export const POST = withRateLimit(handler);
```

### 2. Per-Route Application (Recommended Approach)

Due to Edge Runtime limitations, rate limiting must be applied at the individual route level:

#### Manual Application
Apply to specific routes by wrapping handlers with `withRateLimit`:

```typescript
// In any API route file
import { withRateLimit } from '@/middleware/rate-limit.middleware';

async function handler(request: NextRequest) {
  // Your route logic
}

export const GET = withRateLimit(handler);
export const POST = withRateLimit(handler);
```

#### Automated Application
Use the provided script to apply rate limiting to multiple routes:

```bash
# Apply to all API routes automatically
tsx scripts/apply-rate-limiting.ts
```

This script will:
- Scan all route files in `/api/v1/*` and `/api/auth/*`
- Add the necessary imports
- Wrap exported handlers with rate limiting
- Skip files already protected

### 3. Custom Rate Limits

To add custom rate limits for specific use cases:

```typescript
// In src/lib/rate-limiter.ts
export async function checkCustomRateLimit(
  identifier: string,
  limit: number = 100,
  windowSeconds: number = 3600
): Promise<RateLimitResult> {
  const key = `rate_limit:custom:${identifier}`;
  const allowed = await checkSlidingWindowLimit(key, limit, windowSeconds);
  
  return {
    allowed,
    message: allowed ? undefined : `Custom limit exceeded (${limit}/${windowSeconds}s)`
  };
}
```

## Fallback Strategy

When Redis is unavailable, the system automatically falls back to an in-memory rate limiter:

### In-Memory Limiter Characteristics
- **Scope**: Process-local (not shared between instances)
- **Persistence**: Lost on restart
- **Accuracy**: Less precise but functional
- **Performance**: Faster but less scalable

### Detection and Switching
```typescript
// Automatic detection with 100ms timeout
const isRedisAvailable = await checkRedisAvailability();

if (!isRedisAvailable) {
  console.warn('[RateLimit] Using in-memory fallback');
  // Use in-memory limiter
}
```

## Configuration

### Environment Variables

No additional environment variables required. The system uses:
- `JWT_SECRET_KEY_CALL` - For JWT token validation (existing)
- Redis connection from existing `src/lib/redis.ts` configuration

### Adjusting Limits

To modify rate limits, edit the constants in `src/lib/rate-limiter.ts`:

```typescript
const COMPANY_LIMIT = 60;  // Requests per minute per company
const USER_LIMIT = 20;     // Requests per minute per user
const IP_LIMIT = 10;       // Requests per minute per IP
const AUTH_LIMIT = 5;      // Auth attempts per 15 minutes
```

Or in `src/middleware/rate-limit.middleware.ts` for the configuration object:

```typescript
const RATE_LIMITS = {
  authenticated: {
    company: { limit: 60, windowSeconds: 60 },
    user: { limit: 20, windowSeconds: 60 },
  },
  auth: {
    ip: { limit: 5, windowSeconds: 900 },
  },
  public: {
    ip: { limit: 10, windowSeconds: 60 },
  }
};
```

## Monitoring and Debugging

### Logging

The system logs important events:

```typescript
// Redis unavailable
console.warn('[RateLimit] Redis unavailable, using in-memory fallback');

// Rate limit hit (visible in response)
{
  "error": "Too Many Requests",
  "message": "User rate limit exceeded (20/min). Try again in 60 seconds."
}
```

### Checking Rate Limit Status

Use the `getRateLimitStatus` function to check current limits:

```typescript
import { getRateLimitStatus } from '@/middleware/rate-limit.middleware';

const status = await getRateLimitStatus(userId, companyId, ipAddress);
console.log(status);
// {
//   user: { limit: 20, remaining: 15, resetAt: Date },
//   company: { limit: 60, remaining: 45, resetAt: Date },
//   ip: { limit: 10, remaining: 8, resetAt: Date }
// }
```

### Redis Commands for Debugging

Check rate limit entries in Redis:

```bash
# List all rate limit keys
redis-cli --scan --pattern "rate_limit:*"

# Check specific user's entries
redis-cli ZRANGE rate_limit:user:USER_ID 0 -1 WITHSCORES

# Check company limit
redis-cli ZCARD rate_limit:company:COMPANY_ID

# TTL of a key
redis-cli TTL rate_limit:ip:127.0.0.1
```

## Testing

### Manual Testing

1. **Test User Rate Limit** (20 req/min):
```bash
# Authenticate first, then make rapid requests
for i in {1..25}; do
  curl -H "Cookie: __session=YOUR_TOKEN" \
       http://localhost:5000/api/v1/contacts
  echo "Request $i"
  sleep 2
done
```

2. **Test Auth Rate Limit** (5 attempts/15 min):
```bash
# Make failed login attempts
for i in {1..10}; do
  curl -X POST http://localhost:5000/api/auth/login \
       -H "Content-Type: application/json" \
       -d '{"email":"test@test.com","password":"wrong"}'
  echo "Attempt $i"
done
```

3. **Test IP Rate Limit** (10 req/min):
```bash
# Public endpoint rapid requests
for i in {1..15}; do
  curl http://localhost:5000/api/health
  echo "Request $i"
done
```

### Automated Testing

Create test files in your test suite:

```typescript
// __tests__/rate-limit.test.ts
import { checkRateLimits, checkIpRateLimit } from '@/lib/rate-limiter';

describe('Rate Limiting', () => {
  it('should enforce user limits', async () => {
    const companyId = 'test-company';
    const userId = 'test-user';
    
    // Make 20 requests (should all pass)
    for (let i = 0; i < 20; i++) {
      const result = await checkRateLimits(companyId, userId);
      expect(result.allowed).toBe(true);
    }
    
    // 21st request should fail
    const result = await checkRateLimits(companyId, userId);
    expect(result.allowed).toBe(false);
    expect(result.message).toContain('excedido');
  });
});
```

## Security Considerations

1. **IP Extraction**: The system properly handles proxied requests:
   - Checks `X-Forwarded-For` header
   - Falls back to `X-Real-IP`
   - Uses direct IP as last resort

2. **Token Validation**: Rate limits are applied after JWT validation to ensure authentic user/company IDs

3. **Fallback Security**: In-memory limiter is process-local, so:
   - Less effective in multi-instance deployments
   - Should trigger alerts for ops team
   - Consider reducing limits in fallback mode

4. **DoS Protection**: Authentication endpoints have stricter limits to prevent brute-force attacks

## Best Practices

1. **Monitor Redis Health**: Set up alerts for Redis unavailability
2. **Log Analysis**: Regularly review rate limit violations for patterns
3. **Gradual Limits**: Start with generous limits and adjust based on usage
4. **Client Retry Logic**: Implement exponential backoff in clients
5. **User Communication**: Display rate limit info in UI when approaching limits

## Troubleshooting

### Common Issues

1. **"429 Too Many Requests" for legitimate users**
   - Check if limits are too restrictive
   - Verify user/company ID extraction is working
   - Check for shared IP addresses (corporate networks)

2. **Redis connection failures**
   - Check Redis server status
   - Verify connection string in environment
   - Check network connectivity
   - Monitor fallback mode activation

3. **Headers not appearing**
   - Ensure middleware is properly applied
   - Check response interceptors
   - Verify header names are correct

4. **Inconsistent limiting**
   - Check for clock skew between servers
   - Verify Redis persistence settings
   - Ensure atomic operations are used

## Future Enhancements

1. **Distributed Rate Limiting**: Implement cluster-aware rate limiting for multi-region deployments

2. **Dynamic Limits**: Adjust limits based on:
   - User tier/subscription
   - Time of day
   - System load

3. **Rate Limit Bypass**: Add mechanism for:
   - Whitelisted IPs
   - Premium customers
   - Internal services

4. **Advanced Algorithms**: Consider implementing:
   - Token bucket for burst allowance
   - Leaky bucket for smooth rate limiting
   - Adaptive limits based on behavior

5. **Metrics and Monitoring**:
   - Prometheus metrics for rate limit hits
   - Grafana dashboards for visualization
   - Alerting for anomalies

## Related Documentation

- [Redis Documentation](https://redis.io/docs/)
- [RFC 6585 - Additional HTTP Status Codes](https://tools.ietf.org/html/rfc6585)
- [OWASP Rate Limiting](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html#rate-limiting)

## Support

For issues or questions about rate limiting:
1. Check this documentation
2. Review logs for error messages
3. Test with curl commands above
4. Contact the development team with specific examples