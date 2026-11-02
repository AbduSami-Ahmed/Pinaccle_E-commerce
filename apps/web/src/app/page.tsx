import { ShieldCheck, Cpu, Database, Wrench } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="border-b border-slate-200 pb-8 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Pinnacle Automotive Parts
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Production-Minded E-Commerce Platform &middot; Phase 1 Foundation
            </p>
          </div>
        </div>
      </header>

      <section className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <Cpu className="h-5 w-5" />
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">Modular Monolith</h2>
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Backend REST API powered by NestJS in strict TypeScript mode with DTO validation and
            OpenAPI documentation.
          </p>
          <div className="mt-4">
            <a
              href="http://localhost:4000/health"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Check Backend Health (port 4000) &rarr;
            </a>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-5 w-5" />
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">Storefront & Admin</h2>
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Next.js App Router with React Server Components, Tailwind CSS, and shadcn/ui components.
          </p>
          <div className="mt-4">
            <a
              href="/api/health"
              className="inline-flex items-center text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
            >
              Check Web Health (/api/health) &rarr;
            </a>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Database className="h-5 w-5" />
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">Data & Persistence</h2>
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            PostgreSQL 16 managed via Prisma ORM. Zero direct browser database connections; all
            operations pass through backend DTOs.
          </p>
        </div>
      </section>

      <footer className="mt-16 border-t border-slate-200 pt-8 text-xs text-slate-400 dark:border-slate-800">
        Initial product categories: Tyres (bulk stock, sale unit multipliers) and Seat Belts
        (individually serialized, condition graded, fitment verified).
      </footer>
    </main>
  );
}
