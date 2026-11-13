# Normal local commerce setup

From the root, with Java21, Node/npm and Docker Desktop running:

```powershell
docker compose -f infra/compose.yaml up -d --wait
# Backend terminal:
cd backend
$env:JAVA_HOME = 'C:/Program Files/Java/jdk-21.0.11' # adapt locally
./mvnw.cmd spring-boot:run '-Dspring-boot.run.profiles=local'
# Separate frontend terminal, from repository root:
cd frontend
npm.cmd ci
npm.cmd start
```

Open http://localhost:4200. Normal PostgreSQL/API/frontend ports are5433/8080/4200. Provision your own administrator once from the repository root with `./scripts/admin.ps1 -Username owner` (secure password prompt), then sign in. No default administrator is created; existing accounts are never replaced. See [authentication and recovery](authentication.md).

The local profile and infra/compose.yaml contain documented development-only database defaults. Override DB_URL, DB_USERNAME and DB_PASSWORD consistently with Compose POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD and POSTGRES_PORT if changing them. Keep local environment files private; these defaults are unsuitable for remote deployment. Non-local profiles require explicit database configuration. The Angular proxy forwards /api to8080; backend CORS uses explicit origins.

Check `/api/v1/health` for application responsiveness and `/actuator/health` for database health. Flyway owns V1–V7; Hibernate validates rather than creating the schema. Normal startup creates no catalog or demonstration transactions. Add products/history manually or use the separately configured read-only [Shopify connector](shopify-connection.md). For the anonymous synthetic walkthrough, use the isolated [portfolio guide](demo/README.md).

[Catalog](catalog.md), [history](history.md), [merchant workflow](merchant-workflow.md), [onboarding](onboarding.md) and [development troubleshooting](development.md) cover normal editing. Final verification reused a disposable authenticated installation for browser writes/session checks; the real normal database was inspected read-only, not re-provisioned or populated.
