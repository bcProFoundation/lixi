# Frontend Fallback Strategy for GraphQL API

**Date**: October 12, 2025  
**Priority**: 🔴 **HIGH**  
**Target**: Frontend Development Team

---

## 📋 Current Configuration

### Environment-Specific GraphQL Endpoints

#### 🏠 Local Development
**File**: `packages/app-lixi/.env`
```bash
NEXT_PUBLIC_LIXI_API=https://lixi.test/
```
**GraphQL Endpoint**: `https://lixi.test/graphql`

#### 🔧 Development Environment  
**File**: `packages/app-lixi/.env.development`
```bash
NEXT_PUBLIC_LIXI_API=https://lixilotus.test/
```
**GraphQL Endpoint**: `https://lixilotus.test/graphql`

#### 🚀 Production Environment
**File**: `packages/app-lixi/.env.example` (production template)
```bash
NEXT_PUBLIC_LIXI_API=https://api.lixilotus.com/
```
**GraphQL Endpoint**: `https://api.lixilotus.com/graphql`

### Current GraphQL Client Configuration

**File**: `packages/redux-store/src/store/baseApi.ts`

```typescript
export const client = new GraphQLClient(
  process.env.NEXT_PUBLIC_APPLICATION_URL 
    ? `${process.env.NEXT_PUBLIC_LIXI_API}/graphql` 
    : '/graphql',
  {
    credentials: 'include',
    cache: 'no-cache',
    headers: () => ({
      lang: locale,
      Authorization: token
    })
  }
);
```

**Current Behavior**: 
- Single endpoint configuration
- ❌ No fallback mechanism
- ❌ No retry logic
- ❌ Service failure = Application failure

---

## 🎯 Proposed Fallback Strategy

### Strategy Overview

```
Primary API Fails
  ↓
Retry with Exponential Backoff (3 attempts)
  ↓
Switch to Secondary API
  ↓
Retry Secondary (3 attempts)
  ↓
Fallback to Cached Data
  ↓
Show Offline/Error State
```

---

## 🛠️ Implementation Plan

### Step 1: Environment Configuration

**File**: `packages/app-lixi/.env`

```bash
# Primary GraphQL API
NEXT_PUBLIC_LIXI_API=https://api.lixilotus.com/

# Secondary/Fallback GraphQL API
NEXT_PUBLIC_LIXI_API_FALLBACK=https://api-backup.lixilotus.com/

# Tertiary/Emergency GraphQL API (optional)
NEXT_PUBLIC_LIXI_API_EMERGENCY=https://api-emergency.lixilotus.com/

# Health check endpoint
NEXT_PUBLIC_API_HEALTH_CHECK=/api/health

# Retry configuration
NEXT_PUBLIC_API_RETRY_ATTEMPTS=3
NEXT_PUBLIC_API_RETRY_DELAY=1000
NEXT_PUBLIC_API_TIMEOUT=10000
```

---

### Step 2: Enhanced GraphQL Client with Fallback

**File**: `packages/redux-store/src/store/baseApi.ts`

```typescript
import { graphqlRequestBaseQuery } from '@rtk-query/graphql-request-base-query';
import { GraphQLClient } from 'graphql-request';
import intl from 'react-intl-universal';
import { createApi } from '@reduxjs/toolkit/query/react';
import Cookies from 'universal-cookie';
import { retry } from '@utils/retry';

// API endpoints configuration
const API_ENDPOINTS = [
  process.env.NEXT_PUBLIC_LIXI_API,
  process.env.NEXT_PUBLIC_LIXI_API_FALLBACK,
  process.env.NEXT_PUBLIC_LIXI_API_EMERGENCY,
].filter(Boolean); // Remove undefined endpoints

let currentEndpointIndex = 0;
let failureCount = 0;
const MAX_FAILURES = 3;

// Get headers function
const getHeaders = () => {
  const cookies = new Cookies(null, { path: '/' });
  const locale = cookies.get('locale');
  const lang = locale ? locale.split('-')[0] : 'en';
  const token = sessionStorage.getItem('Authorization');

  return {
    lang: lang,
    Authorization: token
  };
};

// Create client with current endpoint
const createGraphQLClient = (endpointIndex: number = 0) => {
  const endpoint = API_ENDPOINTS[endpointIndex];
  const graphqlUrl = process.env.NEXT_PUBLIC_APPLICATION_URL 
    ? `${endpoint}/graphql` 
    : '/graphql';
  
  console.log(`[GraphQL Client] Using endpoint: ${graphqlUrl}`);
  
  return new GraphQLClient(graphqlUrl, {
    credentials: 'include',
    cache: 'no-cache',
    timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '10000'),
    headers: getHeaders
  });
};

// Initial client
export let client = createGraphQLClient(currentEndpointIndex);

// Switch to next available endpoint
const switchToFallbackEndpoint = () => {
  if (currentEndpointIndex < API_ENDPOINTS.length - 1) {
    currentEndpointIndex++;
    client = createGraphQLClient(currentEndpointIndex);
    failureCount = 0; // Reset failure count on endpoint switch
    console.warn(`[GraphQL Client] Switched to fallback endpoint #${currentEndpointIndex}`);
    return true;
  }
  return false;
};

// Reset to primary endpoint (call this periodically or after success)
export const resetToPrimaryEndpoint = () => {
  if (currentEndpointIndex !== 0) {
    currentEndpointIndex = 0;
    client = createGraphQLClient(currentEndpointIndex);
    failureCount = 0;
    console.log('[GraphQL Client] Reset to primary endpoint');
  }
};

// Enhanced base query with retry and fallback
const baseQueryWithRetry = graphqlRequestBaseQuery({
  client,
  customErrors: ({ name, stack, response }) => {
    let errorMessage = intl.get('page.unableCreatePageServer');
    if (response?.errors) {
      errorMessage = response?.errors[0]?.message ?? errorMessage;
    }
    return {
      name,
      message: errorMessage,
      stack
    };
  },
  prepareHeaders: (headers) => {
    const customHeaders = getHeaders();
    Object.entries(customHeaders).forEach(([key, value]) => {
      if (value) {
        headers.set(key, value);
      }
    });
    return headers;
  },
});

// Wrapper with retry and fallback logic
const baseQueryWithFallback = async (args: any, api: any, extraOptions: any) => {
  const retryAttempts = parseInt(process.env.NEXT_PUBLIC_API_RETRY_ATTEMPTS || '3');
  const retryDelay = parseInt(process.env.NEXT_PUBLIC_API_RETRY_DELAY || '1000');
  
  let lastError: any = null;
  
  // Try current endpoint with retries
  for (let attempt = 0; attempt < retryAttempts; attempt++) {
    try {
      const result = await baseQueryWithRetry(args, api, extraOptions);
      
      // Check if result has error
      if (result.error) {
        throw result.error;
      }
      
      // Success! Reset failure count and optionally reset to primary
      failureCount = 0;
      if (currentEndpointIndex !== 0) {
        // After 10 successful requests, try to reset to primary
        const successCount = parseInt(sessionStorage.getItem('graphql_success_count') || '0');
        if (successCount > 10) {
          setTimeout(() => resetToPrimaryEndpoint(), 5000);
          sessionStorage.setItem('graphql_success_count', '0');
        } else {
          sessionStorage.setItem('graphql_success_count', (successCount + 1).toString());
        }
      }
      
      return result;
    } catch (error) {
      lastError = error;
      console.error(`[GraphQL] Attempt ${attempt + 1}/${retryAttempts} failed:`, error);
      
      if (attempt < retryAttempts - 1) {
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
      }
    }
  }
  
  // All retries failed, try fallback endpoint
  failureCount++;
  console.error(`[GraphQL] All retries failed for endpoint #${currentEndpointIndex}. Failure count: ${failureCount}`);
  
  if (failureCount >= MAX_FAILURES) {
    const switched = switchToFallbackEndpoint();
    if (switched) {
      // Recursively try with new endpoint
      return baseQueryWithFallback(args, api, extraOptions);
    }
  }
  
  // No more fallbacks available, return error
  return {
    error: {
      status: 'FETCH_ERROR',
      error: lastError?.message || 'All GraphQL endpoints failed',
      data: lastError
    }
  };
};

export const api = createApi({
  baseQuery: baseQueryWithFallback,
  endpoints: () => ({})
});
```

---

### Step 3: Health Check Service

**File**: `packages/app-lixi/src/services/apiHealthCheck.ts`

```typescript
import axios from 'axios';

interface HealthCheckResult {
  endpoint: string;
  healthy: boolean;
  latency: number;
  error?: string;
}

const API_ENDPOINTS = [
  process.env.NEXT_PUBLIC_LIXI_API,
  process.env.NEXT_PUBLIC_LIXI_API_FALLBACK,
  process.env.NEXT_PUBLIC_LIXI_API_EMERGENCY,
].filter(Boolean);

/**
 * Check health of a single endpoint
 */
export const checkEndpointHealth = async (endpoint: string): Promise<HealthCheckResult> => {
  const startTime = Date.now();
  const healthUrl = `${endpoint}${process.env.NEXT_PUBLIC_API_HEALTH_CHECK || '/api/health'}`;
  
  try {
    const response = await axios.get(healthUrl, {
      timeout: 5000,
      validateStatus: (status) => status === 200
    });
    
    const latency = Date.now() - startTime;
    
    return {
      endpoint,
      healthy: response.status === 200,
      latency,
    };
  } catch (error: any) {
    return {
      endpoint,
      healthy: false,
      latency: Date.now() - startTime,
      error: error.message
    };
  }
};

/**
 * Check health of all configured endpoints
 */
export const checkAllEndpointsHealth = async (): Promise<HealthCheckResult[]> => {
  const checks = API_ENDPOINTS.map(endpoint => checkEndpointHealth(endpoint));
  return Promise.all(checks);
};

/**
 * Get the fastest healthy endpoint
 */
export const getFastestHealthyEndpoint = async (): Promise<string | null> => {
  const results = await checkAllEndpointsHealth();
  
  const healthyEndpoints = results
    .filter(result => result.healthy)
    .sort((a, b) => a.latency - b.latency);
  
  return healthyEndpoints.length > 0 ? healthyEndpoints[0].endpoint : null;
};

/**
 * Run periodic health checks (call this on app init)
 */
export const startPeriodicHealthCheck = (intervalMs: number = 60000) => {
  const checkHealth = async () => {
    const results = await checkAllEndpointsHealth();
    console.log('[Health Check]', results);
    
    // Store results in localStorage for dashboard
    localStorage.setItem('api_health_status', JSON.stringify(results));
  };
  
  // Initial check
  checkHealth();
  
  // Periodic checks
  return setInterval(checkHealth, intervalMs);
};
```

---

### Step 4: Fiat Rate Query with Fallback

**File**: `packages/redux-store/src/store/escrow/fiat-currency/fiat-currency.enhanced.ts`

```typescript
import { api } from '@store/baseApi';
import axios from 'axios';
import { GetAllFiatRateQuery } from './fiat-currency.generated';

// Fallback: Call external API directly if GraphQL fails
const fetchFiatRatesDirectly = async (): Promise<GetAllFiatRateQuery['getAllFiatRate']> => {
  try {
    const response = await axios.get('https://aws-dev.abcpay.cash/bws/api/v3/fiatrates/', {
      timeout: 10000
    });
    
    const data = response.data;
    
    // Transform to expected format
    const fiatRates = Object.keys(data).map(currency => ({
      currency: currency.toUpperCase(),
      fiatRates: data[currency].map((item: any) => ({
        coin: item.code,
        ts: item.ts,
        rate: 0
      }))
    }));
    
    console.log('[Fiat Rates] Fetched directly from external API');
    return fiatRates;
  } catch (error) {
    console.error('[Fiat Rates] Direct fetch failed:', error);
    throw error;
  }
};

// Enhanced hook with direct fallback
export const useGetAllFiatRateWithFallback = () => {
  const queryResult = api.useGetAllFiatRateQuery();
  
  // If GraphQL fails, try direct fetch
  React.useEffect(() => {
    if (queryResult.isError && !queryResult.isFetching) {
      console.warn('[Fiat Rates] GraphQL failed, attempting direct fetch...');
      
      fetchFiatRatesDirectly()
        .then(data => {
          // Store in local state or cache
          sessionStorage.setItem('fiatRates_fallback', JSON.stringify(data));
        })
        .catch(err => {
          console.error('[Fiat Rates] All fetch methods failed', err);
        });
    }
  }, [queryResult.isError, queryResult.isFetching]);
  
  // Return cached data if available and query failed
  if (queryResult.isError) {
    const cached = sessionStorage.getItem('fiatRates_fallback');
    if (cached) {
      return {
        ...queryResult,
        data: { getAllFiatRate: JSON.parse(cached) },
        isError: false,
        isSuccess: true,
        status: 'success'
      };
    }
  }
  
  return queryResult;
};
```

---

### Step 5: Error Boundary with Retry UI

**File**: `packages/app-lixi/src/components/Common/ApiErrorBoundary.tsx`

```tsx
import React, { Component, ReactNode } from 'react';
import { Alert, Button, Space } from 'antd';
import { ReloadOutlined, WarningOutlined } from '@ant-design/icons';
import { resetToPrimaryEndpoint } from '@redux-store/baseApi';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ApiErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[API Error Boundary]', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    // Reset to primary endpoint
    resetToPrimaryEndpoint();
    
    // Clear error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    
    // Reload the page
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
          <Alert
            message="Service Temporarily Unavailable"
            description={
              <Space direction="vertical" style={{ width: '100%' }}>
                <p>
                  We're experiencing connectivity issues with our API service. 
                  This may be temporary. Please try again in a moment.
                </p>
                {this.state.error && (
                  <pre style={{ 
                    fontSize: '12px', 
                    background: '#f5f5f5', 
                    padding: '8px',
                    borderRadius: '4px',
                    overflow: 'auto'
                  }}>
                    {this.state.error.message}
                  </pre>
                )}
                <Button 
                  type="primary" 
                  icon={<ReloadOutlined />} 
                  onClick={this.handleRetry}
                >
                  Retry Connection
                </Button>
              </Space>
            }
            type="error"
            icon={<WarningOutlined />}
            showIcon
          />
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

### Step 6: Usage in Application

**File**: `packages/app-lixi/src/pages/_app.tsx`

```typescript
import { ApiErrorBoundary } from '@components/Common/ApiErrorBoundary';
import { startPeriodicHealthCheck } from '@services/apiHealthCheck';

function MyApp({ Component, pageProps }: AppProps) {
  // Start health checks on mount
  useEffect(() => {
    const healthCheckInterval = startPeriodicHealthCheck(60000); // Every 60 seconds
    
    return () => {
      clearInterval(healthCheckInterval);
    };
  }, []);
  
  return (
    <Provider store={store}>
      <ApiErrorBoundary>
        <Component {...pageProps} />
      </ApiErrorBoundary>
    </Provider>
  );
}
```

---

## 📊 Monitoring & Observability

### Dashboard Component

**File**: `packages/app-lixi/src/components/Admin/ApiHealthDashboard.tsx`

```tsx
import React, { useState, useEffect } from 'react';
import { Card, Badge, Statistic, Row, Col } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

export const ApiHealthDashboard: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<any[]>([]);
  
  useEffect(() => {
    const updateStatus = () => {
      const cached = localStorage.getItem('api_health_status');
      if (cached) {
        setHealthStatus(JSON.parse(cached));
      }
    };
    
    updateStatus();
    const interval = setInterval(updateStatus, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <Card title="API Health Status">
      <Row gutter={16}>
        {healthStatus.map((endpoint, index) => (
          <Col span={8} key={index}>
            <Card>
              <Statistic
                title={`Endpoint ${index + 1}`}
                value={`${endpoint.latency}ms`}
                prefix={
                  endpoint.healthy ? (
                    <CheckCircleOutlined style={{ color: 'green' }} />
                  ) : (
                    <CloseCircleOutlined style={{ color: 'red' }} />
                  )
                }
              />
              <Badge 
                status={endpoint.healthy ? 'success' : 'error'} 
                text={endpoint.healthy ? 'Healthy' : 'Down'} 
              />
              {endpoint.error && (
                <div style={{ fontSize: '12px', color: '#ff4d4f', marginTop: '8px' }}>
                  {endpoint.error}
                </div>
              )}
            </Card>
          </Col>
        ))}
      </Row>
    </Card>
  );
};
```

---

## 🔧 Configuration Examples

### Local Development
```bash
NEXT_PUBLIC_LIXI_API=http://localhost:4800/
NEXT_PUBLIC_LIXI_API_FALLBACK=https://lixi.test/
```

### Staging/Development
```bash
NEXT_PUBLIC_LIXI_API=https://api-dev.lixilotus.com/
NEXT_PUBLIC_LIXI_API_FALLBACK=https://api-dev2.lixilotus.com/
```

### Production
```bash
NEXT_PUBLIC_LIXI_API=https://api.lixilotus.com/
NEXT_PUBLIC_LIXI_API_FALLBACK=https://api-backup.lixilotus.com/
NEXT_PUBLIC_LIXI_API_EMERGENCY=https://api-emergency.lixilotus.com/
```

---

## 🎯 Benefits

### ✅ High Availability
- Multiple endpoint fallbacks
- Automatic failover
- Zero manual intervention

### ✅ Better UX
- Transparent to users
- Faster recovery
- Cached data fallback

### ✅ Observability
- Health check monitoring
- Failure tracking
- Performance metrics

### ✅ Resilience
- Exponential backoff
- Circuit breaker pattern
- Graceful degradation

---

## 📈 Testing Strategy

### Manual Testing
```bash
# Test primary endpoint
curl https://api.lixilotus.com/graphql

# Test fallback endpoint  
curl https://api-backup.lixilotus.com/graphql

# Test health check
curl https://api.lixilotus.com/api/health
```

### Automated Testing
```typescript
describe('GraphQL Fallback', () => {
  it('should switch to fallback on primary failure', async () => {
    // Mock primary endpoint failure
    mockGraphQLClient.mockRejectedValueOnce(new Error('Network error'));
    
    // Execute query
    const result = await fetchData();
    
    // Should have switched to fallback
    expect(currentEndpoint).toBe(FALLBACK_ENDPOINT);
    expect(result).toBeDefined();
  });
});
```

---

## 🚨 Monitoring Alerts

Set up alerts for:
- Primary endpoint down for > 5 minutes
- All endpoints failing
- High latency (> 5 seconds)
- Frequent endpoint switches

---

## 📚 Related Documentation

- [Architecture: Fiat Rate Flow](./ARCHITECTURE_FIAT_RATE_FLOW.md)
- [Backend: Fiat Rate Configuration](./BACKEND_FIAT_RATE_CONFIGURATION.md)
- [Backend: Change Request - Goods & Services Filter](./BACKEND_CHANGE_REQUEST_GOODS_SERVICES_FILTER.md)

---

## 🎓 Summary

This fallback strategy provides:

1. **Multi-tier failover**: Primary → Fallback → Emergency endpoints
2. **Retry logic**: Exponential backoff with configurable attempts
3. **Health monitoring**: Periodic endpoint health checks
4. **Direct API fallback**: Call external API if all GraphQL endpoints fail
5. **Cached data**: Use previously fetched data as last resort
6. **User feedback**: Clear error messages with retry options
7. **Observability**: Dashboard and logging for monitoring

**Next Steps**:
1. Add secondary API endpoints to infrastructure
2. Implement the enhanced baseApi.ts
3. Add health check endpoint to backend
4. Deploy and test in staging
5. Monitor and adjust retry/timeout parameters
