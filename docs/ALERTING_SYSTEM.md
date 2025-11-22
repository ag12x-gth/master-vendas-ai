# Alerting System Documentation

## Overview

The alerting system is a comprehensive monitoring and notification solution that detects critical issues in the application and notifies administrators through multiple channels. It features alert deduplication, aggregation, customizable thresholds, and integration with existing metrics infrastructure.

## Architecture

### Components

1. **Alert Service** (`src/services/alert.service.ts`)
   - Core logic for creating, managing, and delivering alerts
   - Monitors system metrics and triggers alerts based on thresholds
   - Implements deduplication and rate limiting

2. **Database Tables**
   - `alerts` - Stores alert instances
   - `alert_rules` - Custom alert rules and thresholds
   - `alert_notifications` - Notification delivery logs
   - `alert_settings` - Per-company alert configuration

3. **API Endpoints** (`src/app/api/v1/alerts/`)
   - RESTful API for alert management
   - Real-time alert status updates
   - Configuration management

## Alert Severity Levels

### CRITICAL 🔴
- **Definition**: Immediate action required, system functionality severely impaired
- **Examples**: Database connection lost, authentication system down
- **SLA**: Immediate notification, respond within 5 minutes

### HIGH 🟠
- **Definition**: Significant issue requiring prompt attention
- **Examples**: High memory usage, response time degradation
- **SLA**: Notify within 1 minute, respond within 15 minutes

### MEDIUM 🟡
- **Definition**: Issue that may impact performance if not addressed
- **Examples**: Low cache hit rate, moderate queue backlog
- **SLA**: Notify within 5 minutes, respond within 1 hour

### LOW 🟢
- **Definition**: Informational alert for tracking and analysis
- **Examples**: Scheduled maintenance reminders, usage statistics
- **SLA**: Batch notifications, review daily

## Alert Types

### System Alerts

| Alert Type | Description | Default Threshold | Severity |
|------------|-------------|-------------------|----------|
| `high_memory_usage` | Heap memory usage exceeds threshold | >90% | HIGH |
| `cache_failure` | Cache hit rate drops below threshold | <50% | MEDIUM |
| `database_pool_exhausted` | DB connection pool near limit | >90% | CRITICAL |
| `rate_limit_breach` | Excessive 429 responses | >100/min | HIGH |
| `queue_failure` | Queue processing failures | >5/min | HIGH |
| `auth_failures_spike` | Authentication failure rate spike | >10/5min | CRITICAL |
| `response_time_degradation` | P95 response time exceeds limit | >1000ms | HIGH |
| `custom` | User-defined custom alerts | Variable | Variable |

## Notification Channels

### 1. Console Logging
- **Purpose**: Immediate visibility for developers
- **Format**: Structured log with emoji indicators
- **When to use**: Development and debugging

### 2. Database Storage
- **Purpose**: Persistent audit trail and analysis
- **Features**: Full alert history with context
- **When to use**: Always enabled for compliance

### 3. Webhook Notifications
- **Purpose**: Integration with external systems
- **Format**: JSON payload with alert details
- **When to use**: Production monitoring integration

### 4. In-App Notifications
- **Purpose**: Admin dashboard alerts
- **Features**: Real-time updates, badge counts
- **When to use**: User-facing alert management

### 5. Email Notifications (Future)
- **Purpose**: Out-of-band notifications
- **Features**: Digest mode, priority filtering
- **When to use**: Critical alerts, summary reports

## Configuration

### Environment Variables

```env
# Enable alert monitoring (default: true in production)
ENABLE_ALERT_MONITORING=true

# Alert check interval in milliseconds (default: 30000)
ALERT_CHECK_INTERVAL=30000

# Maximum alerts per minute (rate limiting)
MAX_ALERTS_PER_MINUTE=10
```

### Alert Settings API

Update company-specific thresholds:

```typescript
PUT /api/v1/alerts/settings
{
  "memoryThreshold": 90,           // Percentage
  "responseTimeP95Threshold": 1000, // Milliseconds
  "rateLimit429Threshold": 100,     // Count per minute
  "authFailureThreshold": 10,       // Count per 5 minutes
  "queueFailureThreshold": 5,       // Count per minute
  "dbPoolThreshold": 90,            // Percentage
  "alertRetentionDays": 30,         // Days to keep alerts
  "enabledChannels": ["console", "database", "webhook", "in_app"],
  "defaultWebhookUrl": "https://your-monitoring-system.com/webhook",
  "emailRecipients": ["admin@company.com"]
}
```

## Custom Alert Rules

Create custom alerts based on specific metrics:

```typescript
POST /api/v1/alerts/rules
{
  "name": "High API Error Rate",
  "description": "Alert when API error rate exceeds 5%",
  "alertType": "custom",
  "severity": "HIGH",
  "metric": "api.error.rate",
  "condition": "gt",        // gt, lt, gte, lte, eq
  "threshold": 5,           // 5%
  "windowSeconds": 300,     // 5 minute window
  "aggregation": "avg",     // avg, max, min, sum, count
  "channels": ["webhook", "in_app"],
  "webhookUrls": ["https://custom-webhook.com"],
  "cooldownSeconds": 3600   // Don't re-alert for 1 hour
}
```

## API Endpoints

### List Active Alerts
```http
GET /api/v1/alerts?status=active&severity=HIGH&limit=50

Response:
{
  "alerts": [...],
  "pagination": {...},
  "statistics": {
    "critical": 2,
    "high": 5,
    "medium": 10,
    "low": 3
  }
}
```

### Acknowledge Alert
```http
POST /api/v1/alerts/{alertId}/acknowledge

Response:
{
  "alert": {...},
  "message": "Alert acknowledged successfully"
}
```

### Resolve Alert
```http
POST /api/v1/alerts/{alertId}/resolve

Response:
{
  "alert": {...},
  "message": "Alert resolved successfully"
}
```

### Get Alert History
```http
GET /api/v1/alerts/history?startDate=2024-01-01&endDate=2024-01-31

Response:
{
  "alerts": [...],
  "statistics": {
    "totalAlerts": 150,
    "avgResolutionTimeMinutes": 45,
    "topAlertTypes": [...]
  }
}
```

## Integration Guide

### Webhook Integration

Webhook payload format:

```json
{
  "id": "alert-uuid",
  "type": "high_memory_usage",
  "severity": "HIGH",
  "title": "High Memory Usage Detected",
  "message": "Application memory usage has exceeded 90% of heap size",
  "metric": "process.memoryUsage.heapUsed",
  "threshold": 90,
  "currentValue": 95.5,
  "context": {
    "timestamp": "2024-01-15T10:30:00Z",
    "source": "node-1",
    "additional": {...}
  }
}
```

### Slack Integration Example

```javascript
// Webhook handler for Slack
app.post('/webhook/slack', async (req, res) => {
  const alert = req.body;
  
  const slackMessage = {
    text: `Alert: ${alert.title}`,
    attachments: [{
      color: alert.severity === 'CRITICAL' ? 'danger' : 'warning',
      fields: [
        { title: 'Severity', value: alert.severity, short: true },
        { title: 'Type', value: alert.type, short: true },
        { title: 'Current Value', value: alert.currentValue, short: true },
        { title: 'Threshold', value: alert.threshold, short: true },
      ],
      footer: 'Alert System',
      ts: Date.now() / 1000
    }]
  };
  
  await sendToSlack(slackMessage);
  res.json({ success: true });
});
```

## Alert Response Playbooks

### High Memory Usage Alert

1. **Immediate Actions**
   - Check current memory metrics: `process.memoryUsage()`
   - Review recent deployments for memory leaks
   - Monitor garbage collection frequency

2. **Investigation**
   - Analyze heap snapshots
   - Check for large object allocations
   - Review database query efficiency

3. **Remediation**
   - Restart affected services if critical
   - Implement memory limits
   - Scale horizontally if needed

### Database Pool Exhaustion

1. **Immediate Actions**
   - Check active connections: `SELECT * FROM pg_stat_activity`
   - Identify long-running queries
   - Review connection pool settings

2. **Investigation**
   - Analyze query patterns
   - Check for connection leaks
   - Review transaction handling

3. **Remediation**
   - Kill blocking queries if necessary
   - Increase pool size temporarily
   - Optimize query performance

### Rate Limit Breach

1. **Immediate Actions**
   - Identify source of excessive requests
   - Check for DDoS patterns
   - Review rate limit configuration

2. **Investigation**
   - Analyze request patterns
   - Check for bot activity
   - Review API key usage

3. **Remediation**
   - Block abusive IPs/users
   - Implement stricter rate limits
   - Add CAPTCHA verification

### Authentication Failures Spike

1. **Immediate Actions**
   - Check for brute force attempts
   - Review authentication logs
   - Verify auth service health

2. **Investigation**
   - Analyze failure patterns
   - Check for credential stuffing
   - Review password policies

3. **Remediation**
   - Implement account lockout
   - Force password resets if compromised
   - Enable two-factor authentication

## Alert Deduplication

The system prevents alert spam through:

1. **Fingerprinting**: Alerts with same type, severity, and metric are grouped
2. **Time Windows**: 5-minute deduplication window
3. **Occurrence Counting**: Track frequency without spam
4. **Smart Aggregation**: Batch similar alerts

Example deduplication:
```
Alert 1: Memory 91% at 10:00 → Create new alert
Alert 2: Memory 92% at 10:02 → Increment counter
Alert 3: Memory 93% at 10:04 → Increment counter
Result: Single alert with occurrenceCount: 3
```

## Rate Limiting

Prevent alert storms with intelligent rate limiting:

- **Global Limit**: 10 alerts per minute across all types
- **Per-Company Limit**: 5 alerts per minute per company
- **Per-Type Limit**: 2 alerts per minute per alert type
- **Cooldown Period**: 1 hour minimum between identical alerts

## Performance Considerations

### Minimal Overhead Design

1. **Async Processing**: Alert checks run in background
2. **Efficient Queries**: Indexed lookups, aggregated metrics
3. **Caching**: Recent alerts cached in memory
4. **Batching**: Notifications sent in batches

### Monitoring Impact

- **CPU Usage**: <1% for alert monitoring
- **Memory Usage**: ~10MB for alert cache
- **Database Load**: <5 queries per check cycle
- **Network I/O**: Minimal, only for webhooks

## Best Practices

### Alert Configuration

1. **Start Conservative**: Begin with higher thresholds, tune down
2. **Test in Staging**: Validate alert rules before production
3. **Document Responses**: Maintain playbooks for each alert type
4. **Regular Review**: Audit alert effectiveness monthly

### Alert Fatigue Prevention

1. **Prioritize Correctly**: Reserve CRITICAL for true emergencies
2. **Group Related Alerts**: Use aggregation for similar issues
3. **Set Appropriate Cooldowns**: Prevent repeated notifications
4. **Provide Context**: Include debugging information

### Integration Tips

1. **Use Webhooks**: Integrate with existing monitoring tools
2. **Centralize Notifications**: Route to single notification service
3. **Implement Escalation**: Auto-escalate unacknowledged alerts
4. **Track Metrics**: Monitor alert response times

## Troubleshooting

### Common Issues

**Alert not triggering:**
- Check if monitoring is enabled
- Verify threshold configuration
- Review metric calculation logic
- Check rate limiting status

**Too many alerts:**
- Increase thresholds
- Extend cooldown periods
- Enable deduplication
- Review aggregation settings

**Webhook failures:**
- Verify webhook URL accessibility
- Check payload format
- Review authentication requirements
- Monitor webhook response times

## Migration Guide

### Migrating from Error Monitoring

1. **Identify Alert Types**: Map existing errors to alert types
2. **Set Thresholds**: Configure based on historical data
3. **Test Channels**: Verify notification delivery
4. **Gradual Rollout**: Enable per environment

### Database Migration

Run migration to create alert tables:
```bash
npm run db:migrate
```

Verify tables created:
```sql
SELECT * FROM information_schema.tables 
WHERE table_name LIKE 'alert%';
```

## Security Considerations

### Access Control

- **Read Access**: All authenticated users can view alerts
- **Acknowledge**: Requires admin or operator role
- **Resolve**: Requires admin role
- **Configure**: Requires admin role

### Sensitive Data

- **Sanitization**: Remove secrets from alert context
- **Encryption**: Webhook URLs encrypted at rest
- **Audit Trail**: All actions logged with user ID

## Monitoring the Monitor

The alert system monitors itself for:

1. **Alert Service Health**: Heartbeat checks every minute
2. **Notification Delivery**: Track success/failure rates
3. **Database Performance**: Monitor query times
4. **Rate Limit Effectiveness**: Track suppressed alerts

## Future Enhancements

### Planned Features

1. **Machine Learning**: Anomaly detection, predictive alerts
2. **Mobile App**: Push notifications to mobile devices
3. **Alert Correlation**: Identify related issues automatically
4. **Automated Remediation**: Self-healing for common issues
5. **Advanced Analytics**: Alert trend analysis, forecasting

### Integration Roadmap

1. **PagerDuty**: Direct integration for on-call management
2. **Datadog**: Bi-directional metric sync
3. **Grafana**: Alert rule import/export
4. **Microsoft Teams**: Native notification channel

## Support

For issues or questions about the alerting system:

1. Check this documentation
2. Review alert logs in database
3. Contact system administrators
4. Submit feature requests via GitHub

## Appendix

### Alert Severity Matrix

| Severity | Response Time | Notification | Escalation |
|----------|--------------|--------------|------------|
| CRITICAL | < 5 min | All channels | Immediate |
| HIGH | < 15 min | Webhook, In-app | After 30 min |
| MEDIUM | < 1 hour | Database, In-app | After 2 hours |
| LOW | < 24 hours | Database only | No escalation |

### Metric Reference

| Metric | Unit | Source | Update Frequency |
|--------|------|--------|------------------|
| memory.heap.used | % | process.memoryUsage() | 30s |
| cache.hit.rate | % | Redis metrics | 60s |
| db.pool.usage | % | Connection pool | 30s |
| http.429.count | count/min | Rate limiter | Real-time |
| queue.failures | count/min | BullMQ metrics | Real-time |
| auth.failures | count/5min | Auth service | Real-time |
| http.p95.response | ms | Prometheus | 30s |