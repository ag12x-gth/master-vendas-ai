# Webhook Queue Service - Redis Requirements and Fallback

## Overview

The webhook queue service (`webhook-queue.service.ts`) is a hybrid implementation that supports both production-grade BullMQ (Redis-backed) queuing and development-friendly in-memory fallback.

## Production Requirements

### ⚠️ Redis is REQUIRED for Production

For production environments, Redis is mandatory to ensure:
- Persistent webhook delivery across restarts
- Distributed processing across multiple workers
- Reliable retry mechanisms with exponential backoff
- Dead letter queue support
- Performance monitoring and metrics

### Setup for Production

1. **Install Redis** (if self-hosting):
   ```bash
   # Ubuntu/Debian
   sudo apt-get install redis-server
   
   # Or use Docker
   docker run -d -p 6379:6379 redis:latest
   ```

2. **Configure environment variables**:
   ```env
   ENABLE_BULLMQ_QUEUE=true
   REDIS_URL=redis://user:password@redis-host:6379
   # Or individual settings:
   REDIS_HOST=redis-host
   REDIS_PORT=6379
   REDIS_PASSWORD=your-password
   ```

3. **Verify Redis connection**:
   Check logs for: `✅ [WebhookQueue] BullMQ service initialized with Redis-backed queue`

## Development Mode (In-Memory Fallback)

### How it Works

When Redis is not available or `ENABLE_BULLMQ_QUEUE` is not set to `true`, the system automatically falls back to an in-memory queue that:

- Processes webhooks without requiring Redis
- Maintains metrics for debugging
- Provides retry logic with exponential backoff
- Handles concurrent processing (up to 10 jobs)

### Limitations of In-Memory Mode

⚠️ **Important limitations**:
- **No persistence**: Jobs are lost on application restart
- **Single instance only**: Cannot distribute work across multiple servers
- **Memory constraints**: Limited by available RAM
- **No dead letter queue**: Failed jobs cannot be inspected after max retries

### When to Use In-Memory Mode

✅ **Appropriate for**:
- Local development
- Testing and debugging
- Demo environments
- Small-scale deployments with single instance

❌ **Not suitable for**:
- Production environments
- Multi-instance deployments
- High-volume webhook processing
- Critical webhook delivery requirements

## Implementation Details

### Queue Selection Logic

```typescript
// The service automatically selects the appropriate queue:
if (process.env.ENABLE_BULLMQ_QUEUE === 'true' && Redis available) {
  // Use BullMQ with Redis
} else {
  // Use in-memory fallback
}
```

### Configuration Options

| Environment Variable | Description | Default |
|---------------------|-------------|---------|
| `ENABLE_BULLMQ_QUEUE` | Enable Redis-backed BullMQ | `false` |
| `REDIS_URL` | Full Redis connection URL | - |
| `REDIS_HOST` | Redis server hostname | `localhost` |
| `REDIS_PORT` | Redis server port | `6379` |
| `REDIS_PASSWORD` | Redis password (if required) | - |

### Monitoring and Metrics

Both queue implementations provide metrics:

```
📊 [WebhookQueue] Metrics Report:
  - Waiting: Number of jobs waiting to be processed
  - Active: Currently processing jobs
  - Completed: Successfully delivered webhooks
  - Failed: Permanently failed webhooks
  - Delayed: Jobs scheduled for retry
  - Total in Queue: Sum of waiting + active + delayed
```

## Migration Path

### Moving from Development to Production

1. **Install and configure Redis**
2. **Set environment variables**:
   ```env
   ENABLE_BULLMQ_QUEUE=true
   REDIS_URL=redis://your-redis-instance:6379
   ```
3. **Deploy and verify**:
   - Check logs for successful Redis connection
   - Monitor metrics to ensure proper processing

### Graceful Degradation

If Redis becomes unavailable in production:
1. The system logs a warning (once)
2. Falls back to in-memory queue automatically
3. Continues processing webhooks (with limitations)
4. Resumes Redis usage when connection is restored (requires restart)

## Troubleshooting

### Common Issues

1. **Redis connection errors flooding logs**:
   - Solution: Fixed in current implementation - errors logged once only

2. **Webhooks not being delivered**:
   - Check if Redis is running: `redis-cli ping`
   - Verify environment variables are set correctly
   - Review webhook metrics in logs

3. **Memory usage increasing in development**:
   - Normal for in-memory mode
   - Restart application periodically during heavy testing
   - Consider enabling Redis for intensive development

### Debug Commands

```bash
# Check Redis connectivity
redis-cli ping

# Monitor Redis in real-time
redis-cli monitor

# Check BullMQ jobs (when using Redis)
redis-cli
> KEYS bull:webhook-queue:*
```

## Best Practices

1. **Always use Redis in production** for reliability
2. **Monitor webhook metrics** regularly
3. **Set up alerts** for failed webhook deliveries
4. **Implement webhook signature verification** on receiving endpoints
5. **Use exponential backoff** (already implemented) to avoid overwhelming endpoints

## Security Considerations

- Redis should be password-protected in production
- Use TLS/SSL for Redis connections when possible
- Webhook secrets should be strong and unique per subscription
- Monitor for suspicious webhook activity

## Support

For issues or questions:
1. Check logs for error messages
2. Verify Redis connectivity
3. Review webhook queue metrics
4. Ensure environment variables are correctly set