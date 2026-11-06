# ECM

Enterprise content management with document versioning, folder permissions and full-text search, in a desktop-style web interface.

## Features

- **Versioned documents**: every upload or edit is a new version you can preview, compare line by line, download or restore.
- **Folders and sharing**: owners grant read or write access to people or roles, and access is inherited by subfolders.
- **Full-text search**: Elasticsearch indexes the text inside PDF, Office and text files, with typo tolerance, French analysis and highlighted results.
- **Desktop UI**: draggable windows, a dock, context menus, drag-and-drop upload, a Spotlight-style search (Ctrl/⌘ K), and light and dark themes.
- **Secure by default**: short-lived JWT access tokens, rotating HttpOnly refresh tokens, admin approval for new accounts, and soft delete with a trash.

## Tech stack

| Layer    | Technology                                                                              |
|----------|-----------------------------------------------------------------------------------------|
| Backend  | Java 17, Spring Boot 3.3, Spring Security (OAuth2 resource server), JPA, Flyway, Apache Tika |
| Frontend | Angular 22 (standalone, signals, zoneless), Tailwind CSS 4                               |
| Data     | PostgreSQL 16, Elasticsearch 8.13, local blob storage                                    |

## Quick start

Requires Docker with Compose.

```bash
cp .env.example .env
```

Set `POSTGRES_PASSWORD` and `ADMIN_PASSWORD` in `.env`, and set `JWT_SECRET` to the output of `openssl rand -base64 48`. Then:

```bash
docker compose up -d --build
```

Open <http://localhost:8080> and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## Development

Start the databases, then run the backend and the frontend from source in separate terminals:

```bash
docker compose up -d postgres elasticsearch
```

```bash
cd backend
DATASOURCE_PASSWORD=<POSTGRES_PASSWORD> JWT_SECRET=<secret> ADMIN_PASSWORD=<password> ./mvnw spring-boot:run
```

```bash
cd frontend
npm install
npm start
```

The frontend runs at <http://localhost:4200> and proxies `/api` to the backend on port 8090.

To run the backend without Docker, `./mvnw spring-boot:test-run` starts it with an embedded PostgreSQL and the account `admin@ecm.local` / `admin-dev-password`.

## Configuration

| Variable              | Description                                                            | Default                 |
|-----------------------|------------------------------------------------------------------------|-------------------------|
| `JWT_SECRET`          | Base64 signing key, at least 32 bytes                                  | required                |
| `POSTGRES_PASSWORD`   | Database password                                                      | required                |
| `ADMIN_EMAIL`         | Bootstrap administrator account                                        | `admin@ecm.local`       |
| `ADMIN_PASSWORD`      | Bootstrap administrator password; no admin is created when empty       |                         |
| `APP_URL`             | Public URL, used in emails and as the allowed CORS origin              | `http://localhost:8080` |
| `ECM_PORT`            | Port the web interface listens on                                      | `8080`                  |
| `JWT_COOKIE_SECURE`   | Set to `false` only when serving over plain HTTP on a non-localhost host | `true`                |
| `ECM_MAX_FILE_SIZE`   | Maximum upload size                                                    | `100MB`                 |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD` | SMTP server for activation and approval emails |                 |

## Tests

```bash
cd backend && ./mvnw test
cd frontend && npm test -- --watch=false
```

Backend tests run against an embedded PostgreSQL. To also run the search tests, set `ECM_TEST_ELASTICSEARCH_URIS=http://localhost:9200`.

## Project structure

```
backend/    Spring Boot API, Flyway migrations, Elasticsearch indexing
frontend/   Angular application served by nginx
docker-compose.yml
```

## License

[MIT](LICENSE)
