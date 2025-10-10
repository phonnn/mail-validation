# Environment Variables Configuration

This document lists all environment variables used by the Mail Validation Service.

## Setup Instructions

1. Copy the variables below to your `.env` file
2. Update the values according to your environment
3. Remove any variables you don't need (they have defaults)

## Complete Environment Variables List

```bash
# =============================================================================
# APPLICATION CONFIGURATION
# =============================================================================
APP_NAME=mail-validation
APP_ENV=dev
APP_URL=http://localhost:3000
APP_PORT=3000

# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================
DATABASE_TYPE=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=password
DATABASE_NAME=mail_validation
DATABASE_DRIVER=postgres

# =============================================================================
# AUTHENTICATION CONFIGURATION
# =============================================================================
AUTH_JWT_SECRET=super-secret-jwt-key-change-in-production
AUTH_JWT_EXPIRED=3600
AUTH_SALT_SIZE=10

# =============================================================================
# SMTP PROBE CONFIGURATION
# =============================================================================

# Session Configuration
SMTP_SESSION_TIMEOUT=30000
SMTP_MAX_RETRIES=3
SMTP_MAX_CONNECTIONS=10
SMTP_CONNECTION_TIMEOUT=10000
SMTP_COMMAND_TIMEOUT=5000

# Batch Processing Configuration
SMTP_BATCH_DEFAULT_SIZE=20
SMTP_BATCH_MIN_SIZE=10
SMTP_BATCH_MAX_SIZE=30
SMTP_ENABLE_PIPELINING=true
SMTP_MAX_CONCURRENT_BATCHES=5

# MX Resolution Configuration
SMTP_MX_CACHE_TTL=3600
SMTP_MAX_MX_RECORDS=10
SMTP_ENABLE_MX_FALLBACK=true

# Retry Configuration
SMTP_RETRY_MAX_RETRIES=3
SMTP_RETRY_BASE_DELAY=1000
SMTP_RETRY_MAX_DELAY=10000
SMTP_RETRYABLE_CODES=450,451,452,503,521

# TLS Configuration
SMTP_TLS_ENABLED=true
SMTP_TLS_REJECT_UNAUTHORIZED=true
SMTP_TLS_MIN_VERSION=TLSv1.2
SMTP_TLS_MAX_VERSION=TLSv1.3

# Logging Configuration
SMTP_LOG_LEVEL=info

# =============================================================================
# CACHE CONFIGURATION (Redis)
# =============================================================================
CACHE_HOST=localhost
CACHE_PORT=6379
CACHE_PASSWORD=
CACHE_DB=0
CACHE_TTL=3600

# =============================================================================
# LOGGING CONFIGURATION
# =============================================================================
LOG_LEVEL=info

# =============================================================================
# DEVELOPMENT/DEBUGGING
# =============================================================================
NODE_ENV=development
DEBUG=false
```

## Variable Descriptions

### Application Configuration
- `APP_NAME`: Application name (default: mail-validation)
- `APP_ENV`: Environment (dev, prod, test, qa, local)
- `APP_URL`: Application URL (default: http://localhost:3000)
- `APP_PORT`: Application port (default: 3000)

### Database Configuration
- `DATABASE_TYPE`: Database type (default: postgres)
- `DATABASE_HOST`: Database host (default: localhost)
- `DATABASE_PORT`: Database port (default: 5432)
- `DATABASE_USERNAME`: Database username (default: postgres)
- `DATABASE_PASSWORD`: Database password (required)
- `DATABASE_NAME`: Database name (default: mail_validation)
- `DATABASE_DRIVER`: Database driver (default: postgres)

### Authentication Configuration
- `AUTH_JWT_SECRET`: JWT secret key (required, change in production)
- `AUTH_JWT_EXPIRED`: JWT expiration time in seconds (default: 3600)
- `AUTH_SALT_SIZE`: Salt size for password hashing (default: 10)

### SMTP Probe Configuration

#### Session Configuration
- `SMTP_SESSION_TIMEOUT`: Session timeout in milliseconds (default: 30000)
- `SMTP_MAX_RETRIES`: Maximum retry attempts (default: 3)
- `SMTP_MAX_CONNECTIONS`: Maximum concurrent connections (default: 10)
- `SMTP_CONNECTION_TIMEOUT`: Connection timeout in milliseconds (default: 10000)
- `SMTP_COMMAND_TIMEOUT`: Command timeout in milliseconds (default: 5000)

#### Batch Processing Configuration
- `SMTP_BATCH_DEFAULT_SIZE`: Default batch size (default: 20)
- `SMTP_BATCH_MIN_SIZE`: Minimum batch size (default: 10)
- `SMTP_BATCH_MAX_SIZE`: Maximum batch size (default: 30)
- `SMTP_ENABLE_PIPELINING`: Enable SMTP pipelining (default: true)
- `SMTP_MAX_CONCURRENT_BATCHES`: Maximum concurrent batches (default: 5)

#### MX Resolution Configuration
- `SMTP_MX_CACHE_TTL`: MX record cache TTL in seconds (default: 3600)
- `SMTP_MAX_MX_RECORDS`: Maximum MX records to process (default: 10)
- `SMTP_ENABLE_MX_FALLBACK`: Enable MX fallback (default: true)

#### Retry Configuration
- `SMTP_RETRY_MAX_RETRIES`: Maximum retry attempts (default: 3)
- `SMTP_RETRY_BASE_DELAY`: Base delay between retries in milliseconds (default: 1000)
- `SMTP_RETRY_MAX_DELAY`: Maximum delay between retries in milliseconds (default: 10000)
- `SMTP_RETRYABLE_CODES`: Comma-separated list of retryable SMTP codes (default: 450,451,452,503,521)

#### TLS Configuration
- `SMTP_TLS_ENABLED`: Enable TLS (default: true)
- `SMTP_TLS_REJECT_UNAUTHORIZED`: Reject unauthorized certificates (default: true)
- `SMTP_TLS_MIN_VERSION`: Minimum TLS version (default: TLSv1.2)
- `SMTP_TLS_MAX_VERSION`: Maximum TLS version (default: TLSv1.3)

#### Logging Configuration
- `SMTP_LOG_LEVEL`: SMTP probe log level (debug, info, warn, error)

### Cache Configuration
- `CACHE_HOST`: Redis host (default: localhost)
- `CACHE_PORT`: Redis port (default: 6379)
- `CACHE_PASSWORD`: Redis password (optional)
- `CACHE_DB`: Redis database number (default: 0)
- `CACHE_TTL`: Default cache TTL in seconds (default: 3600)

### General Logging Configuration
- `LOG_LEVEL`: Application log level (debug, info, warn, error)

### Development/Debugging
- `NODE_ENV`: Node environment (development, production, test)
- `DEBUG`: Enable debug mode (default: false)

## Quick Setup for Development

For quick development setup, you only need these essential variables:

```bash
# Database (required)
DATABASE_PASSWORD=your_postgres_password

# Authentication (required)
AUTH_JWT_SECRET=your-super-secret-jwt-key

# Optional: SMTP Probe customization
SMTP_LOG_LEVEL=debug
SMTP_ENABLE_PIPELINING=true
```

## Production Considerations

For production deployment, make sure to:

1. **Change default passwords and secrets**
2. **Use environment-specific database credentials**
3. **Set appropriate timeouts and limits**
4. **Configure proper logging levels**
5. **Enable TLS and security features**
6. **Use a proper Redis instance for caching**

## Validation

The application validates environment variables using Joi schemas. Invalid values will cause the application to fail on startup with clear error messages.
