# Service Communication Patterns

## Overview

This document defines the communication patterns, protocols, and best practices for inter-service communication in the Blessed Horizon microservices architecture.

## Communication Patterns

### 1. Synchronous Communication

#### REST over HTTP/HTTPS

**When to Use:**
- Request-response patterns
- Real-time data requirements
- Simple CRUD operations
- Client-facing APIs

**Implementation:**
```go
// HTTP Client with circuit breaker
type ServiceClient struct {
    httpClient *http.Client
    baseURL    string
    breaker    *gobreaker.CircuitBreaker
}

func (c *ServiceClient) GetCampaign(ctx context.Context, id string) (*Campaign, error) {
    endpoint := fmt.Sprintf("%s/api/v1/campaigns/%s", c.baseURL, id)
    
    result, err := c.breaker.Execute(func() (interface{}, error) {
        req, err := http.NewRequestWithContext(ctx, "GET", endpoint, nil)
        if err != nil {
            return nil, err
        }
        
        req.Header.Set("Accept", "application/json")
        req.Header.Set("X-Request-ID", GetRequestID(ctx))
        
        resp, err := c.httpClient.Do(req)
        if err != nil {
            return nil, err
        }
        defer resp.Body.Close()
        
        if resp.StatusCode != http.StatusOK {
            return nil, fmt.Errorf("unexpected status: %d", resp.StatusCode)
        }
        
        var campaign Campaign
        if err := json.NewDecoder(resp.Body).Decode(&campaign); err != nil {
            return nil, err
        }
        
        return &campaign, nil
    })
    
    if err != nil {
        return nil, err
    }
    
    return result.(*Campaign), nil
}
```

#### gRPC

**When to Use:**
- Internal service communication
- High-performance requirements
- Streaming data
- Strong typing needed

**Implementation:**
```protobuf
// campaign.proto
syntax = "proto3";

package campaign.v1;

service CampaignService {
    rpc GetCampaign(GetCampaignRequest) returns (Campaign);
    rpc ListCampaigns(ListCampaignsRequest) returns (stream Campaign);
    rpc CreateCampaign(CreateCampaignRequest) returns (Campaign);
}

message Campaign {
    string id = 1;
    string title = 2;
    string description = 3;
    double goal_amount = 4;
    string currency = 5;
    google.protobuf.Timestamp created_at = 6;
}
```

```go
// gRPC client implementation
func NewCampaignClient(conn *grpc.ClientConn) CampaignClient {
    return &campaignClient{
        client: pb.NewCampaignServiceClient(conn),
    }
}

func (c *campaignClient) GetCampaign(ctx context.Context, id string) (*Campaign, error) {
    req := &pb.GetCampaignRequest{Id: id}
    
    resp, err := c.client.GetCampaign(ctx, req)
    if err != nil {
        return nil, fmt.Errorf("failed to get campaign: %w", err)
    }
    
    return toDomainCampaign(resp), nil
}
```

### 2. Asynchronous Communication

#### Message Queue (RabbitMQ/Kafka)

**When to Use:**
- Event-driven architectures
- Decoupled processing
- Fire-and-forget operations
- Handling traffic spikes

**Event Publishing:**
```go
// Event publisher
type EventPublisher interface {
    Publish(ctx context.Context, event Event) error
}

type Event struct {
    ID        string                 `json:"id"`
    Type      string                 `json:"type"`
    Source    string                 `json:"source"`
    Timestamp time.Time              `json:"timestamp"`
    Data      map[string]interface{} `json:"data"`
}

// Kafka implementation
type KafkaPublisher struct {
    producer *kafka.Producer
    topic    string
}

func (p *KafkaPublisher) Publish(ctx context.Context, event Event) error {
    message := &kafka.Message{
        TopicPartition: kafka.TopicPartition{
            Topic:     &p.topic,
            Partition: kafka.PartitionAny,
        },
        Key:   []byte(event.ID),
        Value: []byte(mustMarshal(event)),
        Headers: []kafka.Header{
            {Key: "event-type", Value: []byte(event.Type)},
            {Key: "source", Value: []byte(event.Source)},
        },
    }
    
    return p.producer.Produce(message, nil)
}
```

**Event Consumption:**
```go
// Event consumer
type EventConsumer struct {
    consumer *kafka.Consumer
    handlers map[string]EventHandler
}

func (c *EventConsumer) Start(ctx context.Context) error {
    for {
        select {
        case <-ctx.Done():
            return ctx.Err()
        default:
            msg, err := c.consumer.ReadMessage(100 * time.Millisecond)
            if err != nil {
                continue
            }
            
            var event Event
            if err := json.Unmarshal(msg.Value, &event); err != nil {
                log.Error("Failed to unmarshal event", "error", err)
                continue
            }
            
            if handler, ok := c.handlers[event.Type]; ok {
                if err := handler.Handle(ctx, event); err != nil {
                    log.Error("Failed to handle event", "error", err)
                    // Implement retry logic
                }
            }
            
            c.consumer.CommitMessage(msg)
        }
    }
}
```

### 3. Service Mesh Communication

**Istio Configuration:**
```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: campaign-service
spec:
  hosts:
  - campaign-service
  http:
  - match:
    - headers:
        x-version:
          exact: v2
    route:
    - destination:
        host: campaign-service
        subset: v2
  - route:
    - destination:
        host: campaign-service
        subset: v1
      weight: 90
    - destination:
        host: campaign-service
        subset: v2
      weight: 10
```

## Communication Protocols

### 1. Request Tracing

```go
// Trace context propagation
func PropagateTraceContext(ctx context.Context, req *http.Request) {
    span := trace.SpanFromContext(ctx)
    if span != nil {
        carrier := propagation.HeaderCarrier(req.Header)
        otel.GetTextMapPropagator().Inject(ctx, carrier)
    }
}

// Middleware for trace extraction
func TraceMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        carrier := propagation.HeaderCarrier(c.Request.Header)
        ctx := otel.GetTextMapPropagator().Extract(c.Request.Context(), carrier)
        
        tracer := otel.Tracer("campaign-service")
        ctx, span := tracer.Start(ctx, c.Request.URL.Path)
        defer span.End()
        
        c.Request = c.Request.WithContext(ctx)
        c.Next()
        
        span.SetAttributes(
            attribute.Int("http.status_code", c.Writer.Status()),
            attribute.String("http.method", c.Request.Method),
        )
    }
}
```

### 2. Service Discovery

#### Kubernetes Service Discovery
```yaml
apiVersion: v1
kind: Service
metadata:
  name: campaign-service
  labels:
    app: campaign
    version: v1
spec:
  ports:
  - port: 8080
    name: http
  - port: 9090
    name: grpc
  selector:
    app: campaign
    version: v1
```

#### Client-Side Load Balancing
```go
// Service resolver with client-side load balancing
type ServiceResolver struct {
    client kubernetes.Interface
    cache  map[string][]string
    mu     sync.RWMutex
}

func (r *ServiceResolver) Resolve(service string) ([]string, error) {
    r.mu.RLock()
    if endpoints, ok := r.cache[service]; ok {
        r.mu.RUnlock()
        return endpoints, nil
    }
    r.mu.RUnlock()
    
    // Fetch from Kubernetes
    endpoints, err := r.client.CoreV1().
        Endpoints("default").
        Get(context.Background(), service, metav1.GetOptions{})
    
    if err != nil {
        return nil, err
    }
    
    var addresses []string
    for _, subset := range endpoints.Subsets {
        for _, addr := range subset.Addresses {
            for _, port := range subset.Ports {
                addresses = append(addresses, fmt.Sprintf("%s:%d", addr.IP, port.Port))
            }
        }
    }
    
    r.mu.Lock()
    r.cache[service] = addresses
    r.mu.Unlock()
    
    return addresses, nil
}
```

## Resilience Patterns

### 1. Circuit Breaker

```go
// Circuit breaker configuration
func NewCircuitBreaker(name string) *gobreaker.CircuitBreaker {
    settings := gobreaker.Settings{
        Name:        name,
        MaxRequests: 3,
        Interval:    10 * time.Second,
        Timeout:     30 * time.Second,
        ReadyToTrip: func(counts gobreaker.Counts) bool {
            failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
            return counts.Requests >= 3 && failureRatio >= 0.6
        },
        OnStateChange: func(name string, from gobreaker.State, to gobreaker.State) {
            log.Info("Circuit breaker state change",
                "name", name,
                "from", from.String(),
                "to", to.String(),
            )
        },
    }
    
    return gobreaker.NewCircuitBreaker(settings)
}
```

### 2. Retry Logic

```go
// Exponential backoff retry
func RetryWithBackoff(ctx context.Context, operation func() error) error {
    backoff := []time.Duration{
        100 * time.Millisecond,
        500 * time.Millisecond,
        1 * time.Second,
        2 * time.Second,
        5 * time.Second,
    }
    
    var lastErr error
    for i, delay := range backoff {
        if err := operation(); err != nil {
            lastErr = err
            
            if i == len(backoff)-1 {
                break
            }
            
            select {
            case <-ctx.Done():
                return ctx.Err()
            case <-time.After(delay):
                continue
            }
        }
        
        return nil
    }
    
    return fmt.Errorf("operation failed after %d retries: %w", len(backoff), lastErr)
}
```

### 3. Timeout Management

```go
// Timeout wrapper
func WithTimeout(timeout time.Duration, operation func(context.Context) error) error {
    ctx, cancel := context.WithTimeout(context.Background(), timeout)
    defer cancel()
    
    done := make(chan error, 1)
    go func() {
        done <- operation(ctx)
    }()
    
    select {
    case err := <-done:
        return err
    case <-ctx.Done():
        return fmt.Errorf("operation timed out after %v", timeout)
    }
}
```

### 4. Bulkhead Pattern

```go
// Semaphore-based bulkhead
type Bulkhead struct {
    semaphore chan struct{}
}

func NewBulkhead(size int) *Bulkhead {
    return &Bulkhead{
        semaphore: make(chan struct{}, size),
    }
}

func (b *Bulkhead) Execute(ctx context.Context, fn func() error) error {
    select {
    case b.semaphore <- struct{}{}:
        defer func() { <-b.semaphore }()
        return fn()
    case <-ctx.Done():
        return ctx.Err()
    }
}
```

## Data Consistency Patterns

### 1. Saga Pattern

```go
// Saga orchestrator
type Saga struct {
    steps []SagaStep
}

type SagaStep struct {
    Name        string
    Action      func(context.Context) error
    Compensate  func(context.Context) error
}

func (s *Saga) Execute(ctx context.Context) error {
    completedSteps := make([]SagaStep, 0)
    
    for _, step := range s.steps {
        if err := step.Action(ctx); err != nil {
            // Compensate in reverse order
            for i := len(completedSteps) - 1; i >= 0; i-- {
                if compErr := completedSteps[i].Compensate(ctx); compErr != nil {
                    log.Error("Compensation failed", 
                        "step", completedSteps[i].Name,
                        "error", compErr,
                    )
                }
            }
            return fmt.Errorf("saga failed at step %s: %w", step.Name, err)
        }
        completedSteps = append(completedSteps, step)
    }
    
    return nil
}

// Example usage
donationSaga := &Saga{
    steps: []SagaStep{
        {
            Name: "reserve-funds",
            Action: func(ctx context.Context) error {
                return paymentService.ReserveFunds(ctx, amount)
            },
            Compensate: func(ctx context.Context) error {
                return paymentService.ReleaseFunds(ctx, reservationID)
            },
        },
        {
            Name: "create-donation",
            Action: func(ctx context.Context) error {
                return campaignService.CreateDonation(ctx, donation)
            },
            Compensate: func(ctx context.Context) error {
                return campaignService.CancelDonation(ctx, donationID)
            },
        },
        {
            Name: "capture-payment",
            Action: func(ctx context.Context) error {
                return paymentService.CapturePayment(ctx, reservationID)
            },
            Compensate: func(ctx context.Context) error {
                return paymentService.RefundPayment(ctx, paymentID)
            },
        },
    },
}
```

### 2. Event Sourcing

```go
// Event store
type EventStore interface {
    Append(ctx context.Context, streamID string, events []Event) error
    Load(ctx context.Context, streamID string, fromVersion int) ([]Event, error)
}

// Aggregate
type CampaignAggregate struct {
    ID      string
    Version int
    Events  []Event
    
    // Current state
    Title       string
    GoalAmount  float64
    CurrentAmount float64
    Status      string
}

func (a *CampaignAggregate) Apply(event Event) {
    switch e := event.(type) {
    case *CampaignCreatedEvent:
        a.Title = e.Title
        a.GoalAmount = e.GoalAmount
        a.Status = "active"
    case *DonationReceivedEvent:
        a.CurrentAmount += e.Amount
        if a.CurrentAmount >= a.GoalAmount {
            a.Status = "completed"
        }
    }
    
    a.Version++
    a.Events = append(a.Events, event)
}
```

## Security Patterns

### 1. Service-to-Service Authentication

```go
// mTLS configuration
func NewTLSConfig(certFile, keyFile, caFile string) (*tls.Config, error) {
    cert, err := tls.LoadX509KeyPair(certFile, keyFile)
    if err != nil {
        return nil, err
    }
    
    caCert, err := ioutil.ReadFile(caFile)
    if err != nil {
        return nil, err
    }
    
    caCertPool := x509.NewCertPool()
    caCertPool.AppendCertsFromPEM(caCert)
    
    return &tls.Config{
        Certificates: []tls.Certificate{cert},
        RootCAs:      caCertPool,
        ClientCAs:    caCertPool,
        ClientAuth:   tls.RequireAndVerifyClientCert,
    }, nil
}
```

### 2. API Key Management

```go
// Service API key validation
type APIKeyValidator struct {
    keys map[string]ServiceInfo
    mu   sync.RWMutex
}

type ServiceInfo struct {
    Name        string
    Permissions []string
}

func (v *APIKeyValidator) Validate(key string) (*ServiceInfo, error) {
    v.mu.RLock()
    defer v.mu.RUnlock()
    
    info, ok := v.keys[key]
    if !ok {
        return nil, ErrInvalidAPIKey
    }
    
    return &info, nil
}
```

## Monitoring & Observability

### 1. Distributed Tracing

```go
// OpenTelemetry setup
func InitTracing(serviceName string) func() {
    exporter, err := jaeger.New(
        jaeger.WithCollectorEndpoint(
            jaeger.WithEndpoint("http://jaeger:14268/api/traces"),
        ),
    )
    if err != nil {
        log.Fatal("Failed to create Jaeger exporter", err)
    }
    
    tp := trace.NewTracerProvider(
        trace.WithBatcher(exporter),
        trace.WithResource(resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceNameKey.String(serviceName),
        )),
    )
    
    otel.SetTracerProvider(tp)
    otel.SetTextMapPropagator(
        propagation.NewCompositeTextMapPropagator(
            propagation.TraceContext{},
            propagation.Baggage{},
        ),
    )
    
    return func() {
        ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
        defer cancel()
        tp.Shutdown(ctx)
    }
}
```

### 2. Metrics Collection

```go
// Service communication metrics
var (
    serviceCallDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "service_call_duration_seconds",
            Help: "Duration of service calls",
        },
        []string{"service", "method", "status"},
    )
    
    serviceCallTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "service_call_total",
            Help: "Total number of service calls",
        },
        []string{"service", "method", "status"},
    )
)

// Metrics middleware
func MetricsMiddleware(service string) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            start := time.Now()
            
            wrapped := &responseWriter{ResponseWriter: w, statusCode: 200}
            next.ServeHTTP(wrapped, r)
            
            duration := time.Since(start).Seconds()
            status := strconv.Itoa(wrapped.statusCode)
            
            serviceCallDuration.WithLabelValues(service, r.Method, status).Observe(duration)
            serviceCallTotal.WithLabelValues(service, r.Method, status).Inc()
        })
    }
}
```

## Best Practices

### 1. Idempotency

```go
// Idempotency key handling
type IdempotencyStore interface {
    Get(ctx context.Context, key string) (*Response, error)
    Set(ctx context.Context, key string, response *Response, ttl time.Duration) error
}

func IdempotentHandler(store IdempotencyStore) gin.HandlerFunc {
    return func(c *gin.Context) {
        idempotencyKey := c.GetHeader("Idempotency-Key")
        if idempotencyKey == "" {
            c.Next()
            return
        }
        
        // Check if we have a cached response
        if response, err := store.Get(c.Request.Context(), idempotencyKey); err == nil {
            c.JSON(response.StatusCode, response.Body)
            return
        }
        
        // Capture response
        blw := &bodyLogWriter{body: bytes.NewBufferString(""), ResponseWriter: c.Writer}
        c.Writer = blw
        
        c.Next()
        
        // Store response
        response := &Response{
            StatusCode: blw.Status(),
            Body:       blw.body.Bytes(),
        }
        
        store.Set(c.Request.Context(), idempotencyKey, response, 24*time.Hour)
    }
}
```

### 2. Graceful Degradation

```go
// Fallback mechanism
type ServiceWithFallback struct {
    primary   ServiceClient
    fallback  ServiceClient
    useCache  bool
    cache     Cache
}

func (s *ServiceWithFallback) GetCampaign(ctx context.Context, id string) (*Campaign, error) {
    // Try primary service
    campaign, err := s.primary.GetCampaign(ctx, id)
    if err == nil {
        // Cache successful response
        if s.useCache {
            s.cache.Set(ctx, id, campaign, 5*time.Minute)
        }
        return campaign, nil
    }
    
    // Try cache
    if s.useCache {
        if cached, err := s.cache.Get(ctx, id); err == nil {
            return cached.(*Campaign), nil
        }
    }
    
    // Try fallback service
    if s.fallback != nil {
        return s.fallback.GetCampaign(ctx, id)
    }
    
    return nil, err
}
```

### 3. Rate Limiting

```go
// Client-side rate limiting
type RateLimitedClient struct {
    client  ServiceClient
    limiter *rate.Limiter
}

func NewRateLimitedClient(client ServiceClient, rps int) *RateLimitedClient {
    return &RateLimitedClient{
        client:  client,
        limiter: rate.NewLimiter(rate.Limit(rps), rps),
    }
}

func (c *RateLimitedClient) Call(ctx context.Context, fn func() error) error {
    if err := c.limiter.Wait(ctx); err != nil {
        return fmt.Errorf("rate limit exceeded: %w", err)
    }
    
    return fn()
}
```

## Testing Inter-Service Communication

### 1. Contract Testing

```go
// Pact consumer test
func TestCampaignServiceConsumer(t *testing.T) {
    pact := &dsl.Pact{
        Consumer: "payment-service",
        Provider: "campaign-service",
    }
    
    test := func() error {
        client := NewCampaignClient(fmt.Sprintf("http://localhost:%d", pact.Server.Port))
        
        campaign, err := client.GetCampaign(context.Background(), "123")
        if err != nil {
            return err
        }
        
        assert.Equal(t, "123", campaign.ID)
        return nil
    }
    
    pact.AddInteraction().
        Given("Campaign 123 exists").
        UponReceiving("A request for campaign 123").
        WithRequest(dsl.Request{
            Method: "GET",
            Path:   dsl.String("/api/v1/campaigns/123"),
        }).
        WillRespondWith(dsl.Response{
            Status: 200,
            Body: dsl.Like(map[string]interface{}{
                "id": "123",
                "title": "Test Campaign",
            }),
        })
    
    err := pact.Verify(test)
    assert.NoError(t, err)
}
```

### 2. Service Virtualization

```go
// Mock service for testing
type MockCampaignService struct {
    campaigns map[string]*Campaign
    mu        sync.RWMutex
}

func (m *MockCampaignService) Start(port int) {
    router := gin.New()
    
    router.GET("/api/v1/campaigns/:id", func(c *gin.Context) {
        m.mu.RLock()
        campaign, ok := m.campaigns[c.Param("id")]
        m.mu.RUnlock()
        
        if !ok {
            c.JSON(404, gin.H{"error": "Campaign not found"})
            return
        }
        
        c.JSON(200, campaign)
    })
    
    router.Run(fmt.Sprintf(":%d", port))
}
```

## Conclusion

These communication patterns provide a robust foundation for building reliable, scalable microservices. Key takeaways:

1. **Choose the right pattern**: Synchronous for real-time needs, asynchronous for decoupling
2. **Build for failure**: Implement circuit breakers, retries, and timeouts
3. **Maintain consistency**: Use sagas or event sourcing for distributed transactions
4. **Monitor everything**: Distributed tracing and metrics are essential
5. **Test thoroughly**: Contract testing ensures compatibility

Regular review and updates of these patterns ensure they continue to meet the evolving needs of the Blessed Horizon platform.