# Flight Booking Microservices System

A production-grade, scalable microservices architecture for flight booking built with NestJS, RabbitMQ, PostgreSQL, Redis, and AWS S3.

## 🏗️ Architecture

```
┌─────────────────┐
│   API Gateway   │ ← HTTP/REST Entry Point
└────────┬────────┘
         │
    ┌────┴────┐
    │ RabbitMQ│ ← Message Broker
    └────┬────┘
         │
    ┌────┴─────────────────────────┐
    │                              │
┌───▼────┐  ┌────────┐  ┌─────────▼┐  ┌──────────────┐
│  Auth  │  │ Flight │  │  Booking │  │Notification  │
│Service │  │Service │  │  Service │  │   Service    │
└───┬────┘  └───┬────┘  └────┬─────┘  └──────────────┘
    │           │             │
    └───────┬───┴─────────────┘
            │
    ┌───────▼────────┐
    │   PostgreSQL   │
    └────────────────┘
            │
    ┌───────▼────────┐
    │     Redis      │ ← Caching Layer
    └────────────────┘
            │
    ┌───────▼────────┐
    │   S3/LocalStack│ ← File Storage
    └────────────────┘
```

## 🚀 Features

### Core Features
- ✅ **Microservices Architecture** with RabbitMQ for async communication
- ✅ **API Gateway** with centralized routing and authentication
- ✅ **JWT Authentication** with access and refresh tokens
- ✅ **Role-Based Access Control** (RBAC)
- ✅ **PostgreSQL** with TypeORM for data persistence
- ✅ **Redis** for caching and session management
- ✅ **S3-compatible storage** (AWS S3/LocalStack) with abstraction
- ✅ **Event-driven notifications** system
- ✅ **Request rate limiting** and throttling
- ✅ **Input validation** and sanitization
- ✅ **Error handling** and logging
- ✅ **Swagger API documentation**
- ✅ **Docker & Docker Compose** setup
- ✅ **Dependency Inversion** for easy provider switching

### Services

#### 1. API Gateway (Port 3000)
- HTTP REST API entry point
- JWT authentication and authorization
- Request routing to microservices
- Rate limiting and throttling
- Swagger documentation at `/api/docs`

#### 2. Auth Service (Port 3001)
- User registration and authentication
- JWT token generation and validation
- Password hashing with bcrypt
- Refresh token mechanism
- User profile management

#### 3. Flight Service (Port 3002)
- Flight CRUD operations
- Flight search with filters
- Seat availability management
- Flight image upload to S3
- Price management by class

#### 4. Booking Service (Port 3003)
- Booking creation and management
- Payment integration (simulated)
- Booking cancellation
- User booking history
- Event emission for notifications

#### 5. Notification Service (Port 3004)
- Email notifications
- SMS notifications (simulated)
- Event-driven architecture
- Booking confirmation emails
- Cancellation notifications

## 📋 Prerequisites

- Node.js >= 18.x
- Docker & Docker Compose
- npm or yarn

## 🛠️ Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd flight-booking
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment setup
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 4. Start infrastructure services
```bash
docker-compose up -d postgres redis rabbitmq localstack
```

### 5. Create S3 bucket in LocalStack
```bash
npm run setup:localstack
```

### 6. Start all microservices
```bash
# Option 1: Start all services concurrently
npm run start:all

# Option 2: Start services individually
npm run start:api-gateway
npm run start:auth
npm run start:flight
npm run start:booking
npm run start:notification
```

## 🐳 Docker Deployment

### Start all services with Docker Compose
```bash
docker-compose up --build
```

### Stop all services
```bash
docker-compose down
```

### View logs
```bash
docker-compose logs -f [service-name]
```

## 📚 API Documentation

Once the API Gateway is running, access Swagger documentation at:
```
http://localhost:3000/api/docs
```

### Authentication Endpoints
```
POST /api/v1/auth/register    - Register new user
POST /api/v1/auth/login       - Login user
POST /api/v1/auth/refresh     - Refresh access token
GET  /api/v1/auth/me          - Get current user profile
```

### Flight Endpoints
```
GET    /api/v1/flights              - List all flights
GET    /api/v1/flights/search       - Search flights
GET    /api/v1/flights/:id          - Get flight by ID
POST   /api/v1/flights              - Create flight (Admin)
PUT    /api/v1/flights/:id          - Update flight (Admin)
DELETE /api/v1/flights/:id          - Delete flight (Admin)
POST   /api/v1/flights/:id/image    - Upload flight image (Admin)
```

### Booking Endpoints
```
GET  /api/v1/bookings              - List all bookings (Admin)
GET  /api/v1/bookings/my-bookings  - Get user bookings
GET  /api/v1/bookings/:id          - Get booking by ID
POST /api/v1/bookings              - Create booking
PUT  /api/v1/bookings/:id/cancel   - Cancel booking
```

## 🔐 Security Features

1. **JWT Authentication**
   - Access tokens (15 minutes)
   - Refresh tokens (7 days)
   - Token blacklisting with Redis

2. **Password Security**
   - Bcrypt hashing (10 rounds)
   - Password complexity requirements
   - Secure password storage

3. **Rate Limiting**
   - 10 requests per minute per IP
   - Configurable throttle settings

4. **Input Validation**
   - Class-validator for DTO validation
   - Whitelist and sanitization
   - Type transformation

5. **CORS & Helmet**
   - Cross-origin resource sharing
   - Security headers
   - XSS protection

## 🔄 Dependency Inversion Examples

### Switching Storage Provider

The storage module uses dependency inversion, making it easy to switch providers:

```typescript
// Using S3
StorageModule.forRoot({
  useClass: S3StorageProvider,
});

// Switching to Google Cloud Storage
StorageModule.forRoot({
  useClass: GCSStorageProvider,
});

// Using custom provider
StorageModule.forRoot({
  useFactory: () => new CustomStorageProvider(),
});
```

### Switching Message Broker

Similarly, you can switch from RabbitMQ to any other message broker:

```typescript
// Using RabbitMQ
MessageBrokerModule.forRoot({
  useClass: RabbitMQProvider,
});

// Switching to Apache Kafka
MessageBrokerModule.forRoot({
  useClass: KafkaProvider,
});
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📊 Database Migrations

The system uses a "database-per-service" architecture. Each service has its own PostgreSQL database and migration folder.

### 🔑 Auth Service (`auth_db`)
```bash
# Generate migration from schema changes
npm run migration:generate:auth -- apps/auth-service/src/migrations/MigrationName

# Create empty migration
npm run migration:create:auth -- apps/auth-service/src/migrations/MigrationName

# Run migrations
npm run migration:run:auth

# Revert migration
npm run migration:revert:auth
```

### ✈️ Flight Service (`flight_db`)

```bash
docker exec -it flight-booking-postgres psql -U postgres -d postgres -c "CREATE DATABASE booking_db;"
# Generate migration from schema changes
npm run migration:generate:flight -- apps/flight-service/src/migrations/MigrationName

# Create empty migration
npm run migration:create:flight -- apps/flight-service/src/migrations/MigrationName

# Run migrations
npm run migration:run:flight

# Revert migration
npm run migration:revert:flight
```

### 📅 Booking Service (`booking_db`)
```bash
# Generate migration from schema changes
npm run migration:generate:booking -- apps/booking-service/src/migrations/MigrationName

# Create empty migration
npm run migration:create:booking -- apps/booking-service/src/migrations/MigrationName

# Run migrations
npm run migration:run:booking

# Revert migration
npm run migration:revert:booking
```

> [!IMPORTANT]
> When running `generate` or `create` commands, ensure you provide the full path including the folder (e.g., `apps/service-name/src/migrations/Name`) so TypeORM places the file in the correct location.

> [!TIP]
> **Running migrations from your host machine:**
> The `.env` files point to `DB_HOST=postgres` for Docker networking. When running migrations from your terminal (host machine), you may need to override the host:
> ```bash
> DB_HOST=localhost npm run migration:run:flight
> ```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment | development |
| PORT | API Gateway port | 3000 |
| DB_HOST | PostgreSQL host | localhost |
| DB_PORT | PostgreSQL port | 5432 |
| REDIS_HOST | Redis host | localhost |
| REDIS_PORT | Redis port | 6379 |
| RABBITMQ_URL | RabbitMQ URL | amqp://admin:admin@localhost:5672 |
| JWT_ACCESS_SECRET | JWT access secret | (required) |
| JWT_REFRESH_SECRET | JWT refresh secret | (required) |
| AWS_REGION | AWS region | us-east-1 |
| AWS_S3_BUCKET | S3 bucket name | flight-booking-bucket |

## 🏗️ Project Structure

```
flight-booking/
├── apps/
│   ├── api-gateway/          # HTTP Gateway
│   ├── auth-service/         # Authentication
│   ├── flight-service/       # Flight management
│   ├── booking-service/      # Booking management
│   └── notification-service/ # Notifications
├── libs/
│   ├── common/              # Shared interfaces & DTOs
│   ├── database/            # Database configuration
│   ├── message-broker/      # RabbitMQ abstraction
│   └── storage/             # S3 abstraction
├── docker-compose.yml       # Docker orchestration
├── .env                     # Environment variables
└── package.json            # Dependencies
```

## 🚦 Service Health Checks

Each service exposes health check endpoints:

```
GET /health
```

## 📈 Monitoring & Logging

- Structured logging with Winston
- Request/Response logging
- Error tracking
- Performance monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 👥 Support

For support, email support@flightbooking.com or open an issue in the repository.

## 🎯 Roadmap

- [ ] Payment gateway integration (Stripe/PayPal)
- [ ] Real-time seat selection
- [ ] Flight tracking
- [ ] Multi-currency support
- [ ] Email templates with SendGrid
- [ ] SMS integration with Twilio
- [ ] Admin dashboard
- [ ] Analytics and reporting
- [ ] Kubernetes deployment
- [ ] CI/CD pipeline