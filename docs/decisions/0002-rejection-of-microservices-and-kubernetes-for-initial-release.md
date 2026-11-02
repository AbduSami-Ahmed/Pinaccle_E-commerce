# ADR 0002: Rejection of Microservices and Kubernetes for Initial Release

## Status

Accepted

## Context

When designing a greenfield e-commerce platform, there is frequent temptation to adopt distributed microservices, event-driven message brokers (Kafka/RabbitMQ), and container orchestration platforms (Kubernetes) prematurely under the assumption of future scalability.

However, the operational reality of building a production-minded automotive parts platform requires:

1. Fast iteration speed and low cognitive overhead for a focused engineering team.
2. ACID transactional guarantees across inventory reservations, order placements, and payment state transitions.
3. Simple local development and predictable CI/CD pipelines without needing multi-cluster setups or complex service meshes.
4. Elimination of distributed failure modes (network latency, distributed deadlocks, eventual consistency bugs in inventory, saga orchestration overhead).

## Decision

We explicitly reject a microservices architecture and Kubernetes container orchestration for the initial release:

1. **No Microservices**: The backend is implemented as a single NestJS application organized into strictly modular domain packages (Modular Monolith). All domain modules reside in the same runtime, communicate in-process with zero network overhead, and leverage PostgreSQL's native ACID transactions.
2. **No Kubernetes**: The initial deployment topology targets straightforward, managed cloud compute (e.g., AWS App Runner, ECS Fargate, or elastic container instances) with Amazon RDS for PostgreSQL and Amazon S3. Managing Kubernetes control planes, ingress controllers, service meshes (Istio/Linkerd), and Helm charts is excessive operational overhead that adds zero business value to the core retail objective.
3. **No Distributed Service Bus for Core Flows**: Core workflows (ordering, stock adjustment, checkout) run within transactional database operations. BullMQ + Redis will only be introduced for asynchronous non-blocking background tasks (e.g., image resizing, bulk export feeds, transactional email dispatch) when explicitly needed.

## Consequences

- **Positive**:
  - Development velocity is maximized.
  - Local setup requires only Node.js, npm, and a local PostgreSQL instance (or Docker Compose).
  - Cross-entity operations (e.g., deducting tyre stock while creating an order) happen atomically in PostgreSQL via `prisma.$transaction`, eliminating distributed inventory synchronization errors.
  - Operational maintenance and hosting costs remain minimal and predictable.
- **Negative / Trade-offs**:
  - Independent autoscaling of a single module (e.g., scaling only search while keeping inventory static) is not supported at the process level. However, vertical scaling and horizontal replica scaling of the modular monolith easily accommodate tens of thousands of daily requests.
- **Future Path**:
  - Because domain boundaries and interfaces are strictly maintained via NestJS modules and DTOs, any module that experiences extreme load in the future can be decoupled and extracted into an independent microservice without refactoring its internal domain logic.
