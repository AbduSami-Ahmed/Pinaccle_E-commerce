# ADR 0003: Technology Stack and Framework Selection

## Status

Accepted

## Context

Automotive parts e-commerce requires high-performance, SEO-friendly catalogue browsing, responsive client-side vehicle filtering, and an auditable, type-safe backend API with fine-grained access control. We need a unified technology stack that minimizes context switching while providing enterprise-grade developer ergonomics.

## Decision

We select the following core technology stack:

1. **Language: TypeScript (Strict Mode)**
   - Used end-to-end across frontend and backend.
   - `strict: true`, `noImplicitAny: true`, and `strictNullChecks: true` enforced via `tsconfig.json`.
   - Shared data contracts and DTOs prevent contract drift between frontend and backend.

2. **Frontend: Next.js (App Router) + React**
   - React Server Components (RSC) for public catalogue and vehicle fitment landing pages to ensure optimal SEO, fast Time-To-First-Byte (TTFB), and small client bundle sizes.
   - Client Components for interactive user flows (e.g., vehicle selector modal, cart drawer, checkout forms, admin data tables).

3. **UI & Design System: Tailwind CSS + shadcn/ui + Lucide React**
   - Utility-first Tailwind CSS for responsive, lightweight styling without bloated component libraries.
   - `shadcn/ui` (Radix UI primitives) provides accessible, unstyled headless component foundations that can be styled cleanly for a restrained, professional automotive aesthetic.
   - `lucide-react` for crisp, consistent iconography.

4. **State Management & Data Tables**
   - `@tanstack/react-query` for all client-side server state management, caching, and optimistic mutations.
   - `@tanstack/react-table` for feature-rich admin tables (column sorting, filtering, row selection, pagination).
   - `react-hook-form` + `zod` for declarative, type-safe client-side form validation.

5. **Backend: NestJS REST API**
   - Production-proven enterprise framework providing modular dependency injection, standard decorators, and architecture discipline out of the box.
   - Automated OpenAPI/Swagger documentation generation via `@nestjs/swagger`.
   - Global validation pipes using `class-validator` / `zod`.

6. **Database & ORM: PostgreSQL + Prisma**
   - PostgreSQL provides robust relational integrity, ACID transactions, and JSONB support for semi-structured vehicle metadata.
   - Prisma provides compile-time type-safety, declarative schema definition, and predictable forward migrations (`prisma migrate`).

## Consequences

- Single programming language (TypeScript) across the entire stack.
- Zero impedance mismatch between API contracts and UI forms.
- High developer productivity with strong compile-time safety and automatic API documentation.
