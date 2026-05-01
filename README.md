# Grubpac API

Backend API for the Grubpac project.

## 🚀 Getting Started

### Installation
To install dependencies:
```bash
bun install
```

### Running the App
To run the server:
```bash
bun run index.ts
```

### Environment Variables
Copy `.env.example` to `.env` and fill in the required values.

---

## 📝 Changelog

### Version `0.0.2` (compared to `stage/0.0.1`)

This release focuses on production readiness, logging standardization, and data management refinements:

- **Production Readiness**:
  - Disabled `debug` and `req_inputs` injection in JSON responses when `NODE_ENV=production`.
  - Disabled `MAIL_MIRROR` shadowing mechanism in production environment.
  - Hardened `/common/health` response to conceal detailed DB connection metadata in production.
  - Restricted sensitive utility endpoints (`/common/auth/utility/*`) in production, enforcing a 404 "Not Found" response.
- **Grubpac & Box Management**:
  - Normalized `box` and `box_assigned` database schemas for better relational integrity.
  - Refactored core box handlers including `reassign`, `action`, and `emergency-unlock` logic.
  - Resolved "No box found" errors by refining deletion and reassignment validation flows.
- **Centralized Logging Architecture**:
  - Implemented a unified `log.config.ts` for granular feature-based logging control.
  - Standardized logging retrieval across all modules (Restaurant, Employee, etc.) with consistent POST-based filtering.
  - Added new dropdown providers for easier log searching and filtering.
- **Soft Delete Mechanism**:
  - Introduced a robust soft-delete workflow for suspended restaurants, utilizing archive tables (`restaurant_deleted`).
  - Added reassignment guardrails to prevent asset transfers to inactive or suspended entities.
- **Notifications & UI Alignment**:
  - Synchronized notification API structures with updated Figma requirements.
  - Added global unread count and dropdown filter support for the notification system.
- **Database & Services**:
  - Performed significant Prisma schema cleanup and normalization.
  - Enhanced the mail service with environment-aware transporters.
  - Optimized ownership transfer and profile update OTP flows.

### Version `0.0.1` (compared to `sachin/dev`)

This release introduces various logic fixes and feature improvements across the application:


- **Error Codes**: Corrected bad request error codes from `401` to `400` in auth and password validation handlers.
- **Admin Legacy Support**: Rolled back "client" terminology (routes and response objects) back to "customer" in admin modules to preserve legacy integrations.
- **Group-by Pagination**: Overhauled grouped lists representation for Box, Grubpac, and Employee endpoints to use structured objects containing `array`, `count`, and calculated `pagination` metadata instead of flat arrays.
- **Restaurant Filters**: Resolved boolean conflicts between `manager`, `driver`, and `box` filters on restaurants by enforcing mutual exclusion when passed together.
- **Clean Queries & Unassigns**: Introduced the `nullifyEmptyFKs` utility to proactively filter and empty incoming foreign keys during database updates, resolving unassignment bugs.
- **Prisma Integration**: Addressed edge case errors where structured Prisma responses were unexpectedly breaking output parsers.
- **Search & Params**: Fixed general algorithmic search anomalies and explicitly repaired missing filter parameters on the account grubpacs endpoints.
- **Address Context**: Included the necessary `full_address` mapping for restaurants across all major listing APIs where it was previously omitted.
- **List Counting**: Refined the global counter logic to align with the newest updates on data pagination schemas.
- **Feature Additions**: 
  - Included a robust new set of Transfer Ownership endpoints.
  - Added new backend operations exclusively mapped for Superadmin utilities.
- **Miscellaneous Optimizations**: 
  - Implemented safer parameter validation checks.
  - Enforced constant timestamp visualization flags.
  - Rewords and clarifications in the local MongoDB/Prisma database schema documentations.

---
*This project was initialized using bun v1.2.20. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.*
