# Kubernetes Deployment Strategy

## Executive Summary

This document outlines the Kubernetes deployment strategy for Blessed Horizon's microservices architecture. The strategy focuses on scalability, reliability, security, and cost-effectiveness while ensuring seamless migration from the current monolithic architecture.

## 1. Cluster Architecture

### 1.1 Multi-Environment Setup

```yaml
environments:
  development:
    cluster: blessed-horizon-dev
    region: us-east-1
    nodes: 2-4
    instance_type: t3.medium
    
  staging:
    cluster: blessed-horizon-staging
    region: us-east-1
    nodes: 3-6
    instance_type: t3.large
    
  production:
    cluster: blessed-horizon-prod
    region: us-east-1
    primary_nodes: 5-10
    instance_type: t3.xlarge
    multi_az: true
    auto_scaling: true
```

### 1.2 Node Configuration

```yaml
node_pools:
  system:
    name: system-pool
    taints:
      - key: CriticalAddonsOnly
        value: "true"
        effect: NoSchedule
    labels:
      node-type: system
    resources:
      cpu: 4
      memory: 16Gi
      
  application:
    name: app-pool
    labels:
      node-type: application
    resources:
      cpu: 8
      memory: 32Gi
      
  data:
    name: data-pool
    labels:
      node-type: data
    taints:
      - key: data-only
        value: "true"
        effect: NoSchedule
    resources:
      cpu: 8
      memory: 64Gi
      storage: 500Gi
```

## 2. Service Deployment Patterns

### 2.1 Deployment Configuration

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: campaign-service
  namespace: blessed-horizon
  labels:
    app: campaign-service
    version: v1
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: campaign-service
  template:
    metadata:
      labels:
        app: campaign-service
        version: v1
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - campaign-service
              topologyKey: kubernetes.io/hostname
      containers:
      - name: campaign-service
        image: blessedhorizon/campaign-service:1.0.0
        ports:
        - containerPort: 8080
        env:
        - name: NODE_ENV
          value: production
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

### 2.2 Service Configuration

```yaml
apiVersion: v1
kind: Service
metadata:
  name: campaign-service
  namespace: blessed-horizon
spec:
  selector:
    app: campaign-service
  ports:
  - port: 80
    targetPort: 8080
    protocol: TCP
  type: ClusterIP
```

## 3. Ingress and Load Balancing

### 3.1 NGINX Ingress Controller

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: blessed-horizon-ingress
  namespace: blessed-horizon
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - api.blessedhorizon.org
    secretName: blessed-horizon-tls
  rules:
  - host: api.blessedhorizon.org
    http:
      paths:
      - path: /api/v1/campaigns
        pathType: Prefix
        backend:
          service:
            name: campaign-service
            port:
              number: 80
      - path: /api/v1/payments
        pathType: Prefix
        backend:
          service:
            name: payment-service
            port:
              number: 80
      - path: /api/v1/notifications
        pathType: Prefix
        backend:
          service:
            name: notification-service
            port:
              number: 80
```

## 4. Auto-Scaling Strategy

### 4.1 Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: campaign-service-hpa
  namespace: blessed-horizon
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: campaign-service
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
```

### 4.2 Cluster Autoscaler

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  template:
    spec:
      containers:
      - image: k8s.gcr.io/autoscaling/cluster-autoscaler:v1.21.0
        name: cluster-autoscaler
        command:
        - ./cluster-autoscaler
        - --v=4
        - --stderrthreshold=info
        - --cloud-provider=aws
        - --skip-nodes-with-local-storage=false
        - --expander=least-waste
        - --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/blessed-horizon-prod
        - --balance-similar-node-groups
        - --skip-nodes-with-system-pods=false
```

## 5. Security Configuration

### 5.1 Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: campaign-service-netpol
  namespace: blessed-horizon
spec:
  podSelector:
    matchLabels:
      app: campaign-service
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: blessed-horizon
    - podSelector:
        matchLabels:
          app: api-gateway
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: blessed-horizon
    ports:
    - protocol: TCP
      port: 5432  # PostgreSQL
  - to:
    - namespaceSelector:
        matchLabels:
          name: blessed-horizon
      podSelector:
        matchLabels:
          app: notification-service
    ports:
    - protocol: TCP
      port: 8080
```

### 5.2 Pod Security Policies

```yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: blessed-horizon-psp
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  hostNetwork: false
  hostIPC: false
  hostPID: false
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  supplementalGroups:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
  readOnlyRootFilesystem: true
```

## 6. Storage Strategy

### 6.1 Persistent Volume Claims

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: campaign-media-pvc
  namespace: blessed-horizon
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: aws-efs
  resources:
    requests:
      storage: 100Gi
```

### 6.2 StatefulSet for Data Services

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-cache
  namespace: blessed-horizon
spec:
  serviceName: redis-cache
  replicas: 3
  selector:
    matchLabels:
      app: redis-cache
  template:
    metadata:
      labels:
        app: redis-cache
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        volumeMounts:
        - name: redis-data
          mountPath: /data
  volumeClaimTemplates:
  - metadata:
      name: redis-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: gp3
      resources:
        requests:
          storage: 10Gi
```

## 7. Monitoring and Observability

### 7.1 Prometheus Configuration

```yaml
apiVersion: v1
kind: ServiceMonitor
metadata:
  name: campaign-service-monitor
  namespace: blessed-horizon
spec:
  selector:
    matchLabels:
      app: campaign-service
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
```

### 7.2 Grafana Dashboards

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: campaign-service-dashboard
  namespace: monitoring
data:
  dashboard.json: |
    {
      "dashboard": {
        "title": "Campaign Service Metrics",
        "panels": [
          {
            "title": "Request Rate",
            "targets": [
              {
                "expr": "rate(http_requests_total{service=\"campaign-service\"}[5m])"
              }
            ]
          },
          {
            "title": "Error Rate",
            "targets": [
              {
                "expr": "rate(http_requests_total{service=\"campaign-service\",status=~\"5..\"}[5m])"
              }
            ]
          }
        ]
      }
    }
```

## 8. Disaster Recovery

### 8.1 Backup Strategy

```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: daily-backup
  namespace: velero
spec:
  schedule: "0 2 * * *"
  template:
    ttl: 720h0m0s
    includedNamespaces:
    - blessed-horizon
    storageLocation: aws-backup
    volumeSnapshotLocations:
    - aws-snapshots
```

### 8.2 Multi-Region Failover

```yaml
regions:
  primary:
    name: us-east-1
    clusters:
      - blessed-horizon-prod
    
  secondary:
    name: us-west-2
    clusters:
      - blessed-horizon-dr
    failover_priority: 1
    
failover_strategy:
  type: active-passive
  health_check_interval: 30s
  failover_threshold: 3
  dns_ttl: 60
```

## 9. Cost Optimization

### 9.1 Resource Optimization

- **Spot Instances**: Use for non-critical workloads
- **Reserved Instances**: For predictable baseline capacity
- **Pod Disruption Budgets**: Ensure availability during spot terminations
- **Vertical Pod Autoscaler**: Right-size resource requests

### 9.2 Namespace Resource Quotas

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: blessed-horizon-quota
  namespace: blessed-horizon
spec:
  hard:
    requests.cpu: "100"
    requests.memory: 200Gi
    limits.cpu: "200"
    limits.memory: 400Gi
    persistentvolumeclaims: "10"
    services.loadbalancers: "2"
```

## 10. Migration Timeline

### Phase 1: Infrastructure Setup (Week 1-2)
- Provision Kubernetes clusters
- Configure networking and security
- Set up monitoring and logging

### Phase 2: Service Migration (Week 3-6)
- Deploy microservices
- Configure service mesh
- Implement gradual traffic shifting

### Phase 3: Data Migration (Week 7-8)
- Migrate databases
- Set up data replication
- Verify data integrity

### Phase 4: Production Cutover (Week 9-10)
- Final testing
- DNS cutover
- Monitor and optimize

## 11. Success Metrics

- **Availability**: 99.9% uptime
- **Latency**: < 100ms p95
- **Deployment Frequency**: Multiple times per day
- **Recovery Time**: < 5 minutes
- **Resource Utilization**: 70-80% optimal

## 12. Tools and Technologies

- **Kubernetes**: v1.24+
- **Istio**: Service mesh
- **Prometheus/Grafana**: Monitoring
- **Velero**: Backup and restore
- **Cert-Manager**: TLS certificates
- **External-DNS**: DNS management
- **ArgoCD**: GitOps deployment