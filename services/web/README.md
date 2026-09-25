# LifeLine Web

Next.js dashboard for LifeLine operators.

## Scripts

```bash
npm install
npm run dev
npm run lint
npm run build
```

## Local backend connection

The dashboard calls the LifeLine gateway through a Next.js API proxy. The proxy
adds the same kind of short-lived JWT used by the CLI, so `JWT_SECRET` must match
the gateway.

When the backend is running through the repository `docker-compose.yml`, start
the web app with:

```bash
GATEWAY_URL=http://localhost:3001 JWT_SECRET=change_me_dev_secret_at_least_32_chars npm run dev
```

`docker-compose.yml` maps the gateway to host port `3001`, while port `3000` is
the web app itself. If your root `.env` overrides `JWT_SECRET`, use that value
instead. After running `lifeline demo seed`, the demo hospital id
is `660000000000000000000101`.

The production Docker image uses Next.js standalone output and serves the app on port `3000`.
