# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Database
- `npm run db:migrate` - Run Prisma migrations in development
- `npm run db:deploy` - Deploy migrations to production
- `npm run db:reset` - Reset database (force)
- `npm run db:studio` - Open Prisma Studio
- `npm run db:seed` - Seed database with test data

### Testing
- `npm test` - Run Jest unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:e2e` - Run Playwright end-to-end tests

### Cache Management
- `npm run cache:init` - Initialize cache system
- `npm run cache:warmup` - Warm up cache with common queries
- `npm run cache:clear` - Clear all caches
- `npm run cache:stats` - Display cache statistics

### Admin & Utilities
- `npm run create:admin` - Create admin user via script
- `npm run cleanup:guests` - Clean up guest user sessions
- `npm run security:audit` - Run security audit

## Architecture

### Database & ORM
- **Prisma** with PostgreSQL for data persistence
- Models: User, Role, Gene, Variant, Annotation, Source, AuditLog
- Optimized indices for genomic data queries (chromosome, position, clinical significance)
- BigInt support for genomic positions

### Service Layer Pattern
- **Base Service**: `lib/services/base-service.ts` - Error handling, logging, metrics
- **Repository Pattern**: `lib/repositories/` - Data access with caching
- **Dependency Injection**: `lib/container/container.ts` - Service registration and resolution

### Caching Strategy (Multi-tier)
- **L1 Cache**: NodeCache (in-memory) for frequently accessed data
- **L2 Cache**: Redis adapter for distributed caching
- **Cache Manager**: `lib/cache/cache-manager.ts` - Unified interface with stats
- Cache keys prefixed by service type (genes, variants, etc.)

### Authentication
- **NextAuth.js** with Prisma adapter
- Role-based permissions with JSON-stored permissions
- Session management with IP/user agent tracking
- Guest user support with cleanup scripts

### API Architecture
- **Next.js App Router** with route handlers in `app/api/`
- Request validation using Zod schemas
- Enhanced middleware for logging, rate limiting, caching
- Performance monitoring with query tracking

### Frontend Architecture
- **React 19** with TypeScript
- **TanStack Query** for server state management
- **Tailwind CSS** + **Radix UI** for components
- **PWA** support with service worker
- Mobile-responsive with dedicated navigation

### Error Handling & Monitoring
- Structured logging with Winston
- Custom error classes: `NotFoundError`, validation errors
- Request correlation IDs for tracing
- Performance metrics collection
- Health check endpoints

### Key Libraries
- **Recharts** for genomic data visualization
- **Lodash** for data manipulation utilities
- **React Hook Form** + **Zod** for form validation
- **Lucide React** for consistent iconography

## Development Notes

### Genomic Data Handling
- Use BigInt for genomic positions (chromosome coordinates)
- Variant IDs can be rs numbers or custom identifiers
- Search supports gene symbols, names, and aliases
- Chromosome validation: 1-22, X, Y, MT

### Performance Optimizations
- **Shared Utilities**: Centralized validation (`lib/shared/genomics-validation.ts`)
- **Search Parameter Mapping**: Unified parameter handling (`lib/shared/search-parameter-mapper.ts`)
- **Bulk Operations**: Standardized bulk processing with error handling (`lib/shared/bulk-operations.ts`)
- **Caching Decorators**: Method-level caching with automatic invalidation (`lib/decorators/cache-decorator.ts`)
- **Abstract Cached Repository**: Base class eliminating code duplication (`lib/repositories/abstract-cached-repository.ts`)
- **Optimized Repositories**: Performance-focused implementations with smart caching

### Code Organization
- **Shared Modules**: Common functionality extracted to `lib/shared/`
- **Decorators**: Aspect-oriented programming for cross-cutting concerns
- **Abstract Base Classes**: Eliminates duplication in repository/service layers
- **Standardized Interfaces**: Consistent patterns across similar operations
- **Bulk Operation Utilities**: Centralized batch processing with concurrency control

### Testing Strategy
- Jest for unit tests with jsdom environment
- Playwright for e2e testing
- Testing utilities in `__tests__/` directory
- Separate test commands for unit vs e2e

### Security Features
- Content Security Policy headers
- CSRF protection via NextAuth
- Rate limiting with Upstash
- Audit logging for sensitive operations
- Input sanitization with DOMPurify

### Migration Notes
- Legacy cached repositories can be gradually replaced with optimized versions
- Shared validation utilities are backward compatible
- Bulk operations now use standardized error handling and reporting
- Cache decorators can be applied incrementally to existing methods