# Infrastructure Blueprint: Target State

## 1. Core Principles
- **Simplicity:** The simplest solution is the best. Avoid unnecessary complexity.
- **Explicitness:** No magic. All configuration must be defined in version-controlled files or environment variables.
- **Isolation:** Staging and Production are isolated at the application (container) level but can share underlying services (DB, Nginx).
- **Portability:** The entire system should be definable with Docker Compose for local simulation.