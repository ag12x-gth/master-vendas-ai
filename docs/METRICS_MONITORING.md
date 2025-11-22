# Metrics and Monitoring Guide

## Overview

This application implements comprehensive metrics collection using Prometheus for monitoring performance, availability, and business metrics. All metrics are exposed via the `/api/metrics` endpoint in Prometheus format.

## Quick Start

### Accessing Metrics

The metrics endpoint is available at:
```
GET /api/metrics
```

### Authentication

The metrics endpoint is protected and requires authentication:

1. **Bearer Token** (Recommended for Prometheus):
```bash
curl -H "Authorization: Bearer your-metrics-token" http://localhost:5000/api/metrics
```

2. **Query Parameter** (Alternative):
```bash
curl http://localhost:5000/api/metrics?token=your-metrics-token
```

3. **Local Development** (No auth required on localhost):
```bash
curl http://localhost:5000/api/metrics
```

Set the token via environment variable:
```env
METRICS_TOKEN=your-secure-metrics-token-here
```

## Available Metrics

### HTTP Metrics

| Metric Name | Type | Description | Labels |
|------------|------|-------------|---------|
| `mastercrm_http_request_duration_seconds` | Histogram | Duration of HTTP requests | method, route, status_code |
| `mastercrm_http_requests_total` | Counter | Total number of HTTP requests | method, route, status_code |
| `mastercrm_active_connections` | Gauge | Number of active HTTP connections | - |
| `mastercrm_websocket_connections` | Gauge | Number of active WebSocket connections | namespace |

### Cache Metrics

| Metric Name | Type | Description | Labels |
|------------|------|-------------|---------|
| `mastercrm_cache_hits_total` | Counter | Total cache hits | cache_type |
| `mastercrm_cache_misses_total` | Counter | Total cache misses | cache_type |
| `mastercrm_cache_operations_total` | Counter | Total cache operations | operation, cache_type |
| `mastercrm_cache_size` | Gauge | Current cache size (keys) | cache_type |
| `mastercrm_cache_memory_bytes` | Gauge | Cache memory usage | cache_type |

### Database Metrics

| Metric Name | Type | Description | Labels |
|------------|------|-------------|---------|
| `mastercrm_db_query_duration_seconds` | Histogram | Database query duration | operation, table, success |
| `mastercrm_db_connection_pool_size` | Gauge | Database connection pool metrics | state |
| `mastercrm_db_errors_total` | Counter | Total database errors | operation, error_type |

### Queue Metrics

| Metric Name | Type | Description | Labels |
|------------|------|-------------|---------|
| `mastercrm_queue_size` | Gauge | Current queue size | queue_name, status |
| `mastercrm_queue_jobs_processed_total` | Counter | Total queue jobs processed | queue_name, status |
| `mastercrm_queue_processing_duration_seconds` | Histogram | Queue job processing duration | queue_name, job_type |
| `mastercrm_webhooks_delivered_total` | Counter | Webhooks successfully delivered | subscription_type, event_type |
| `mastercrm_webhooks_failed_total` | Counter | Failed webhook deliveries | subscription_type, event_type, reason |
| `mastercrm_campaigns_messages_sent_total` | Counter | Campaign messages sent | campaign_type, channel |

### Rate Limiting Metrics

| Metric Name | Type | Description | Labels |
|------------|------|-------------|---------|
| `mastercrm_rate_limit_rejections_total` | Counter | Total rate limit rejections | limit_type, resource |
| `mastercrm_rate_limit_checks_total` | Counter | Total rate limit checks | limit_type, result |

### AI/LLM Metrics

| Metric Name | Type | Description | Labels |
|------------|------|-------------|---------|
| `mastercrm_ai_request_duration_seconds` | Histogram | AI/LLM request duration | provider, model, operation |
| `mastercrm_ai_tokens_used_total` | Counter | Total AI tokens used | provider, model, type |
| `mastercrm_ai_errors_total` | Counter | Total AI/LLM errors | provider, model, error_type |

### Business Metrics

| Metric Name | Type | Description | Labels |
|------------|------|-------------|---------|
| `mastercrm_active_users` | Gauge | Number of active users | company_id, user_type |
| `mastercrm_messages_processed_total` | Counter | Total messages processed | channel, direction, status |
| `mastercrm_conversations_created_total` | Counter | Conversations created | channel, initiated_by |
| `mastercrm_conversation_duration_seconds` | Histogram | Conversation duration | channel |

## Prometheus Configuration

### Basic Setup

Add this job to your `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'mastercrm'
    scrape_interval: 30s
    scrape_timeout: 10s
    metrics_path: '/api/metrics'
    bearer_token: 'your-metrics-token-here'
    static_configs:
      - targets: ['your-app-domain.com:443']
        labels:
          environment: 'production'
          service: 'mastercrm'
```

### Docker Compose Setup

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--web.enable-lifecycle'
    ports:
      - "9090:9090"
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    volumes:
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    ports:
      - "3001:3000"
    restart: unless-stopped

volumes:
  prometheus_data:
  grafana_data:
```

## Example Prometheus Queries

### HTTP Performance

```promql
# Request rate (requests per second)
rate(mastercrm_http_requests_total[5m])

# Average request duration by route
avg(rate(mastercrm_http_request_duration_seconds_sum[5m])) by (route)
  / avg(rate(mastercrm_http_request_duration_seconds_count[5m])) by (route)

# 95th percentile response time
histogram_quantile(0.95, 
  rate(mastercrm_http_request_duration_seconds_bucket[5m])
)

# Error rate (4xx and 5xx responses)
sum(rate(mastercrm_http_requests_total{status_code=~"4..|5.."}[5m]))
  / sum(rate(mastercrm_http_requests_total[5m]))

# Active connections
mastercrm_active_connections
```

### Cache Performance

```promql
# Cache hit ratio
sum(rate(mastercrm_cache_hits_total[5m]))
  / (sum(rate(mastercrm_cache_hits_total[5m])) + sum(rate(mastercrm_cache_misses_total[5m])))

# Cache operations per second
rate(mastercrm_cache_operations_total[5m])

# Cache memory usage
mastercrm_cache_memory_bytes

# Cache size trends
mastercrm_cache_size
```

### Database Performance

```promql
# Slow queries (>1 second)
histogram_quantile(0.95, 
  rate(mastercrm_db_query_duration_seconds_bucket{success="true"}[5m])
) > 1

# Database error rate
rate(mastercrm_db_errors_total[5m])

# Query performance by operation
avg(rate(mastercrm_db_query_duration_seconds_sum[5m])) by (operation)
  / avg(rate(mastercrm_db_query_duration_seconds_count[5m])) by (operation)
```

### Rate Limiting

```promql
# Rate limit rejection rate
rate(mastercrm_rate_limit_rejections_total[5m])

# Rate limit effectiveness
sum(rate(mastercrm_rate_limit_checks_total{result="rejected"}[5m]))
  / sum(rate(mastercrm_rate_limit_checks_total[5m]))
```

### Queue Monitoring

```promql
# Queue backlog
mastercrm_queue_size{status="waiting"}

# Queue processing rate
rate(mastercrm_queue_jobs_processed_total[5m])

# Webhook delivery success rate
sum(rate(mastercrm_webhooks_delivered_total[5m]))
  / (sum(rate(mastercrm_webhooks_delivered_total[5m])) + sum(rate(mastercrm_webhooks_failed_total[5m])))
```

## Alert Rules

Create an `alerts.yml` file for Prometheus:

```yaml
groups:
  - name: mastercrm_alerts
    interval: 30s
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: |
          sum(rate(mastercrm_http_requests_total{status_code=~"5.."}[5m]))
            / sum(rate(mastercrm_http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is above 5% (current: {{ $value }})"

      # Slow response time
      - alert: SlowResponseTime
        expr: |
          histogram_quantile(0.95, 
            rate(mastercrm_http_request_duration_seconds_bucket[5m])
          ) > 2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Slow response times"
          description: "95th percentile response time > 2s"

      # Low cache hit ratio
      - alert: LowCacheHitRatio
        expr: |
          sum(rate(mastercrm_cache_hits_total[5m]))
            / (sum(rate(mastercrm_cache_hits_total[5m])) + sum(rate(mastercrm_cache_misses_total[5m])))
          < 0.7
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Low cache hit ratio"
          description: "Cache hit ratio below 70% (current: {{ $value }})"

      # Database connection pool exhaustion
      - alert: DatabaseConnectionPoolExhaustion
        expr: |
          mastercrm_db_connection_pool_size{state="waiting"} > 10
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Database connection pool exhaustion"
          description: "{{ $value }} connections waiting for pool"

      # High rate limit rejections
      - alert: HighRateLimitRejections
        expr: |
          rate(mastercrm_rate_limit_rejections_total[5m]) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High rate of rate limit rejections"
          description: "{{ $value }} rejections per second"

      # Queue backlog
      - alert: QueueBacklog
        expr: |
          mastercrm_queue_size{status="waiting"} > 1000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Large queue backlog"
          description: "Queue {{ $labels.queue_name }} has {{ $value }} waiting jobs"
```

## Grafana Dashboard

Import this JSON to create a comprehensive dashboard:

```json
{
  "dashboard": {
    "title": "MasterCRM Metrics Dashboard",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "sum(rate(mastercrm_http_requests_total[5m]))",
            "legendFormat": "Requests/sec"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Response Time (95th percentile)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(mastercrm_http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "p95"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "sum(rate(mastercrm_http_requests_total{status_code=~\"4..\"}[5m]))",
            "legendFormat": "4xx"
          },
          {
            "expr": "sum(rate(mastercrm_http_requests_total{status_code=~\"5..\"}[5m]))",
            "legendFormat": "5xx"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Cache Hit Ratio",
        "targets": [
          {
            "expr": "sum(rate(mastercrm_cache_hits_total[5m])) / (sum(rate(mastercrm_cache_hits_total[5m])) + sum(rate(mastercrm_cache_misses_total[5m]))) * 100",
            "legendFormat": "Hit Ratio %"
          }
        ],
        "type": "gauge",
        "options": {
          "min": 0,
          "max": 100,
          "thresholds": [
            {"value": 50, "color": "red"},
            {"value": 70, "color": "yellow"},
            {"value": 90, "color": "green"}
          ]
        }
      },
      {
        "title": "Active Connections",
        "targets": [
          {
            "expr": "mastercrm_active_connections",
            "legendFormat": "HTTP"
          },
          {
            "expr": "sum(mastercrm_websocket_connections)",
            "legendFormat": "WebSocket"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Database Query Performance",
        "targets": [
          {
            "expr": "avg(rate(mastercrm_db_query_duration_seconds_sum[5m])) by (operation) / avg(rate(mastercrm_db_query_duration_seconds_count[5m])) by (operation)",
            "legendFormat": "{{ operation }}"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Queue Status",
        "targets": [
          {
            "expr": "mastercrm_queue_size",
            "legendFormat": "{{ queue_name }} - {{ status }}"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Rate Limit Rejections",
        "targets": [
          {
            "expr": "rate(mastercrm_rate_limit_rejections_total[5m])",
            "legendFormat": "{{ limit_type }}"
          }
        ],
        "type": "graph"
      }
    ],
    "refresh": "30s",
    "time": {
      "from": "now-1h",
      "to": "now"
    }
  }
}
```

## Best Practices

### 1. Label Cardinality
- Keep label cardinality low (< 100 unique values per label)
- Use normalization for routes (e.g., `/users/:id` instead of `/users/123`)
- Avoid high-cardinality labels like user IDs or session IDs

### 2. Metric Naming
- Follow Prometheus naming conventions
- Use suffixes: `_total` for counters, `_seconds` for durations
- Use consistent prefixes (e.g., `mastercrm_`)

### 3. Performance
- Metrics collection has minimal overhead (~1-2ms per request)
- Scrape interval: 30s for production, 15s for staging
- Retention: 15 days for raw metrics, 90 days for aggregated

### 4. Security
- Always use authentication for metrics endpoint
- Rotate metrics tokens regularly
- Use TLS for production deployments
- Restrict network access to metrics endpoint

### 5. Monitoring Strategy
- Set up alerts for critical metrics
- Create dashboards for different stakeholders
- Regular review of metric trends
- Capacity planning based on metrics

## Troubleshooting

### No Metrics Available
1. Check if the metrics endpoint is accessible
2. Verify authentication token
3. Check application logs for errors
4. Ensure prom-client is installed

### Missing Metrics
1. Verify instrumentation is in place
2. Check if the feature is being used
3. Look for initialization errors
4. Review metric registration

### High Memory Usage
1. Check metric cardinality
2. Review histogram buckets
3. Look for metric leaks
4. Adjust scrape interval

### Slow Scraping
1. Check network latency
2. Review metric count
3. Optimize metric generation
4. Use metric caching if needed

## Integration Examples

### Kubernetes

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mastercrm
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "5000"
    prometheus.io/path: "/api/metrics"
spec:
  ports:
    - port: 5000
      name: metrics
```

### Docker

```dockerfile
# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/metrics || exit 1
```

### CI/CD Pipeline

```yaml
# GitHub Actions example
- name: Check Metrics Endpoint
  run: |
    curl -f -H "Authorization: Bearer ${{ secrets.METRICS_TOKEN }}" \
      https://your-app.com/api/metrics || exit 1
```

## Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [prom-client Library](https://github.com/siimon/prom-client)
- [PromQL Tutorial](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Best Practices](https://prometheus.io/docs/practices/naming/)