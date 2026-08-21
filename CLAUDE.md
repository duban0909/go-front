# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm start` / `ng serve` — run the dev server at `http://localhost:4200/` (auto-reloads on source changes).
- `ng build` — production build, output to `dist/`.
- `ng watch` — development build in watch mode.
- `ng test` — run unit tests via the Vitest-based `@angular/build:unit-test` builder. To run a single spec, pass a path filter, e.g. `ng test -- src/app/app.spec.ts` (standard Vitest CLI filtering applies since the builder wraps Vitest).
- No e2e test runner is configured.

## Architecture

GoAgenda is an Angular 22 (standalone components, zoneless-style APIs, signals) admin front end for a WhatsApp-based appointment-booking backend. It has no `NgModule`s — every component is standalone with its own `imports` array.

**Auth flow**: Login is handled entirely through Supabase (`SupabaseAuthService`, `src/app/core/services/supabase-auth.service.ts`), which calls `supabase.auth.signInWithPassword` and, on success, hands the resulting access token to `SessionService`. The GoAgenda backend itself is never used for login — it only receives the Supabase-issued JWT as a Bearer token on subsequent API calls (`GoagendaApiService.createHeaders()`).

**Session state**: `SessionService` (`src/app/core/services/session.service.ts`) is the single source of truth for auth state, backed by Angular signals and mirrored into `localStorage` (`goagenda_access_token`, `goagenda_business_id`). `authGuard` (`src/app/core/guards/auth.guard.ts`) reads `sessionService.isAuthenticated()` to protect the `/admin/**` route tree, redirecting to `/auth/login` with a `returnUrl` query param otherwise.

**Backend API**: `GoagendaApiService` (`src/app/core/services/goagenda-api.service.ts`) is a thin typed wrapper around `HttpClient` for the GoAgenda REST API (base URL from `environment.goAgendaApiUrl`). Every call scopes by `business_id` and attaches the Supabase token via `Authorization: Bearer`. Request/response shapes live in `src/app/core/models/goagenda.models.ts` — extend that file first when wiring up a new endpoint, then add the corresponding method here.

**Routing structure** (`src/app/app.routes.ts`): `/auth/login` is public. `/admin` is guarded by `authGuard` and renders `AdminShellPageComponent` as a layout shell (router-outlet + nav + logout) with child routes `dashboard`, `services`, `appointments`, `settings`. Unmatched paths redirect to login.

**Feature organization**: `src/app/features/<area>/<page>/` — each page is a folder with `.page.ts` / `.page.html` / `.page.css`. `admin/*` pages are still scaffolds that mostly enumerate the backend endpoints they'll eventually call (see `services.page.ts`); expect to fill in real data-fetching via `GoagendaApiService` as functionality is built out.

**Shared UI**: `src/app/shared/components/lucide-icon/lucide-icon.component.ts` is a hand-rolled Lucide icon renderer — icon paths are inlined in a `LUCIDE_ICONS` map rather than pulling in the `lucide` package. Add new icons by extending that map and the `LucideIconName` union.

**Environments**: `src/environments/environment.ts` holds `goAgendaApiUrl`, `supabaseUrl`, and `supabaseAnonKey`. The Supabase values are placeholders in source control — real credentials must be set locally before auth will work.
