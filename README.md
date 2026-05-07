# LifeLine

LifeLine is a Node.js microservices platform for emergency blood inventory, organ donor matching, hospital notifications, analytics, and workflow orchestration. It includes a global `lifeline` command-line interface designed for day-to-day operator use.

## Services

- API Gateway: JWT authentication, rate limiting, and service proxying
- Matching Service: geospatial donor matching and compatibility scoring
- Inventory Service: hospital stock updates, reservations, and low-stock alerts
- Notification Service: SMS, email, push, and broadcast notification logging
- Analytics Service: event audit logs and platform metrics
- Saga Orchestrator: emergency workflow event history

## Quick Start

```bash
npm install
npm link
docker compose up --build
lifeline health
```

The gateway runs at `http://localhost:3000`. Use `LIFELINE_URL` or `--url` to point the CLI at another gateway.

## Global CLI

After `npm link`, run `lifeline` from any directory:

```bash
lifeline
lifeline help
lifeline version
lifeline health
```

The CLI provides:

- Styled terminal output with color, sections, and readable command groups
- Spinner feedback for API and database operations
- Interactive prompts for missing required fields in terminal sessions
- Raw JSON mode for scripts with `--json`
- Command-specific help with `lifeline <command> --help`

If you do not want to link globally, use:

```bash
npm run lifeline -- help
```

## First Workflow

```bash
lifeline health
lifeline demo seed
lifeline emergency create
lifeline donors nearby --lat 19.076 --lng 72.8777 --radius 25000 --blood A+ --organ kidney
lifeline inventory stock 660000000000000000000101
lifeline analytics metrics
```

Running `lifeline emergency create` without flags opens prompts for patient id, blood type, organ, hospital id, location, and urgency.

## Commands

### System

```bash
lifeline health
lifeline token
lifeline version
lifeline compatibility A+
```

Use `lifeline token` when debugging protected gateway routes manually. Tokens use `JWT_SECRET` from `.env`.

### Emergency Requests

```bash
lifeline emergency create \
  --patient alice \
  --blood A+ \
  --organ kidney \
  --hospital 660000000000000000000101 \
  --lat 19.076 \
  --lng 72.8777 \
  --urgency critical
```

Required fields: `--patient`, `--blood`, `--organ`, `--hospital`, `--lat`, `--lng`.

Urgency values: `critical`, `urgent`, `standard`.

### Donor Matching

```bash
lifeline donors nearby \
  --lat 19.076 \
  --lng 72.8777 \
  --radius 25000 \
  --blood A+ \
  --organ kidney \
  --limit 5

lifeline match run <requestId>
lifeline match status <requestId>
```

Radius is in meters. Use `25000` for 25 km.

### Inventory

```bash
lifeline inventory stock 660000000000000000000101
lifeline inventory reserve 660000000000000000000101 --blood A+ --units 1
lifeline inventory update 660000000000000000000101 --blood A+ --units +5 --lat 19.076 --lng 72.8777
lifeline inventory alerts --threshold 5
```

Use positive `--units` values to add stock and negative values to remove stock.

### Notifications

```bash
lifeline notify sms --to +911111111111 --message "Compatible donor found"
lifeline notify email --to admin@hospital.com --subject "Emergency" --message "Review the request"
lifeline notify push --to device-123 --message "Please respond"
lifeline notify broadcast --message "Maintenance starts at 8 PM"
```

### Analytics

```bash
lifeline analytics metrics
lifeline analytics event --event emergency.created --request <requestId>
```

### Workflow History

```bash
lifeline saga history <requestId>
lifeline saga event --event emergency.created --request <requestId>
```

### Demo

```bash
lifeline demo seed
lifeline demo run
```

`demo seed` writes sample donors and inventory to MongoDB. `demo run` seeds data, creates an emergency, finds donors, runs matching, reserves inventory, sends a notification, records workflow events, and prints metrics.

## Help System

The built-in help is the main documentation for CLI usage:

```bash
lifeline help
lifeline emergency --help
lifeline donors --help
lifeline inventory --help
lifeline notify --help
lifeline analytics --help
lifeline saga --help
lifeline demo --help
lifeline compatibility --help
```

Use this pattern when teaching users:

```bash
lifeline <area> --help
```

Each help page includes usage, required options, optional flags, and examples.

## Global Options

- `--url <gateway>`: override gateway URL
- `--json`: print raw JSON and suppress spinner/decorative output
- `--help` or `-h`: show help
- `--version` or `-v`: show version

Example:

```bash
lifeline health --url http://localhost:3000
lifeline inventory alerts --json
```

## Environment

Create `.env` when running locally:

```env
LIFELINE_URL=http://localhost:3000
JWT_SECRET=change_me_dev_secret_at_least_32_chars
MONGO_PASSWORD=change_me_mongo
INTERNAL_SERVICE_TOKEN=change_me_internal_token_16_chars
MONGODB_URI=mongodb://admin:change_me_mongo@localhost:27017/lifeline?authSource=admin
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://admin:change_me_rabbit@localhost:5672
STRICT_SECRET_VALIDATION=false
```

Production startup validates service ports, dependency URLs, and required gateway secrets before a service listens. Set `STRICT_SECRET_VALIDATION=true` to enforce `JWT_SECRET` length of at least 32 characters and `INTERNAL_SERVICE_TOKEN` length of at least 16 characters.

## Operations

Every service returns `X-Correlation-ID` on responses. If the request includes `X-Correlation-ID` or `X-Request-ID`, that value is preserved; otherwise the service generates one and includes it in request logs.

Health endpoints are consistent across services:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/ready
```

`/health` reports liveness. `/ready` reports dependency readiness and returns `503` when a configured dependency such as MongoDB, Redis, or RabbitMQ is unavailable. Services also handle `SIGTERM` and `SIGINT` by closing HTTP, MongoDB, Redis, and RabbitMQ resources before exit.

## Development

```bash
npm test
npm run lifeline -- help
npm run lifeline -- version
```

Service scripts:

```bash
npm run start:gateway
npm run start:matching
npm run start:inventory
npm run start:notification
npm run start:analytics
npm run start:saga
```

## Troubleshooting

Command not found:

```bash
npm link
which lifeline
```

Services unavailable:

```bash
docker compose up --build
docker compose logs -f gateway
lifeline health
```

Need machine-readable output:

```bash
lifeline donors nearby --lat 19.076 --lng 72.8777 --radius 25000 --blood A+ --organ kidney --json
```

Need command details:

```bash
lifeline inventory --help
```
