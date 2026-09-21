# AUTO SALE → Yandex Cloud migration

## Current phase

Cloudflare production stays unchanged. Yandex staging is deployed as a public Serverless Container with YDB Serverless persistence. The application UI is publicly reachable, while the CRM state API is protected by an ephemeral staging API credential generated at deploy time. GitHub OIDC authenticates deployments to Yandex Cloud without permanent cloud keys.

## Resource names

- Folder: `auto-sale`
- Network: `auto-sale-net`
- PostgreSQL cluster: `auto-sale-pg`
- Database: `autosale`
- Database user: `autosale_app`
- Container Registry: `auto-sale-registry`
- Serverless Container: `auto-sale-staging`
- GitHub deploy service account: `auto-sale-github`
- Runtime service account: `auto-sale-runtime`
- Lockbox secret: `auto-sale-db`
- Workload identity federation: `auto-sale-github`

## GitHub repository variables

Create these under Settings → Secrets and variables → Actions → Variables:

- `YC_FOLDER_ID`
- `YC_DEPLOY_SA_ID`
- `YC_RUNTIME_SA_ID`
- `YC_REGISTRY_ID`
- `YC_NETWORK_ID`
- `YC_DB_SECRET_ID`
- `YC_DB_SECRET_VERSION_ID`
- `YC_CONTAINER_NAME` = `auto-sale-staging`

No permanent Yandex access key is required in GitHub. Deployment uses GitHub OIDC → Yandex workload identity federation.

## Federation binding

Issuer: `https://token.actions.githubusercontent.com`

JWKS: `https://token.actions.githubusercontent.com/.well-known/jwks`

Audience: `https://github.com/mirozdanie6v`

Subject:

`repo:mirozdanie6v/uniq-smart-rent:ref:refs/heads/prototype/auto-sale-usa`

## Service account roles

### auto-sale-github

- `container-registry.images.pusher`
- `serverless-containers.editor`
- `iam.serviceAccounts.user`
- `vpc.user`

### auto-sale-runtime

- `container-registry.images.puller`
- `lockbox.payloadViewer`

## Database

AUTO SALE staging uses YDB Serverless through `YDB_CONNECTION_STRING`. The runtime service account authenticates to YDB through Yandex metadata credentials. No database password is committed to GitHub.

## Deployment

Run GitHub Actions workflow `Deploy AUTO SALE to Yandex staging` manually from branch `prototype/auto-sale-usa` after all repository variables are configured.

Each deploy:

1. Validates the application and Yandex image.
2. Exchanges GitHub OIDC for a Yandex IAM token.
3. Pushes the Docker image to Container Registry.
4. Imports the current Cloudflare AUTO SALE state into YDB.
5. Generates an ephemeral staging API credential.
6. Deploys a Serverless Container revision with authenticated state reads/writes.
7. Verifies that unauthenticated CRM state access returns `401`.
8. Runs a reversible Yandex E2E flow from lead creation through quote, deposit, order, logistics and handoff.
9. Restores the pre-test state and verifies record counts.

Validated staging URL: `https://bba01u6g86lg2q49p34d.containers.yandexcloud.net/`.

## Cutover order

1. Yandex infrastructure. ✅
2. YDB Serverless persistence. ✅
3. Snapshot current Cloudflare state to YDB and reconcile counts. ✅
4. Authenticated YDB state API. ✅
5. Reversible client → manager → quote → deposit → order → logistics → handoff E2E. ✅
6. Add durable staff authentication for browser UI and public client-intake API.
7. Run browser E2E against Yandex staging.
8. Move frontend to Object Storage + CDN if retained in the final topology.
9. Issue certificate and configure custom domain.
10. Final delta migration.
11. Switch DNS.
12. Keep Cloudflare rollback path temporarily.
13. Remove Cloudflare Worker/D1 only after stable operation.
