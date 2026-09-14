# AUTO SALE → Yandex Cloud migration

## Current phase

Cloudflare production stays unchanged. Yandex staging is prepared as a private Serverless Container with PostgreSQL persistence. GitHub validates the application and the Yandex Docker image before any Yandex deployment.

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

Keep PostgreSQL hosts private. Place the Serverless Container and PostgreSQL cluster in `auto-sale-net`.

Create a Lockbox secret named `auto-sale-db` with key `database_url`. Store the PostgreSQL connection string as the value. Do not commit it to GitHub.

## Deployment

Run GitHub Actions workflow `Deploy AUTO SALE to Yandex staging` manually after all repository variables are configured.

The first Yandex stage is intentionally read-only. After the PostgreSQL snapshot is verified against the current Cloudflare state, authenticated writes will be enabled and the full client → manager → quote → deposit → order → logistics workflow will be tested on Yandex before DNS cutover.

## Cutover order

1. Yandex infrastructure.
2. Private staging container.
3. Snapshot D1 state to PostgreSQL.
4. Record-by-record reconciliation.
5. Authenticated write API.
6. Full E2E workflow on Yandex.
7. Move frontend to Object Storage + CDN.
8. Issue certificate and configure custom domain.
9. Final delta migration.
10. Switch DNS.
11. Keep Cloudflare rollback path temporarily.
12. Remove Cloudflare Worker/D1 only after stable operation.
