# LifeLine CLI Workflow

This guide walks through the LifeLine operator workflow one command at a time.

## 1. Start the platform

Install dependencies once:

```bash
npm install
```

Start the services with Docker if your setup uses the included compose file:

```bash
docker compose up -d
```

Or start each service locally in separate terminals:

```bash
npm run start:gateway
npm run start:matching
npm run start:inventory
npm run start:notification
npm run start:analytics
npm run start:saga
```

Check the gateway:

```bash
lifeline health
```

## 2. Seed demo data

Use the built-in demo seed before trying matching and inventory commands:

```bash
lifeline demo seed
```

The demo hospital id is:

```text
660000000000000000000101
```

Use this full 24-character MongoDB ObjectId in commands. Short ids such as `1001` or `10001` are not valid MongoDB ObjectIds and will be rejected.

## 3. Create an emergency request

Interactive mode:

```bash
lifeline emergency create
```

Non-interactive mode:

```bash
lifeline emergency create \
  --patient amar \
  --blood O+ \
  --organ kidney \
  --hospital 660000000000000000000101 \
  --lat 18.902 \
  --lng 67.8764 \
  --urgency critical
```

Supported urgency values are `critical`, `urgent`, and `standard`. The CLI also accepts `high` as an alias for `urgent`.

## 4. Find nearby donors

```bash
lifeline donors nearby \
  --lat 19.076 \
  --lng 72.8777 \
  --radius 25000 \
  --blood A+ \
  --organ kidney \
  --limit 10
```

The `--blood` value is the recipient blood type. The matching service returns compatible donors based on blood type, organ type, availability, health status, location, and score.

## 5. Run matching for a request

Copy the emergency request `_id` returned from step 3:

```bash
lifeline match run <requestId>
```

Check the status later:

```bash
lifeline match status <requestId>
```

## 6. Reserve inventory

```bash
lifeline inventory reserve 660000000000000000000101 \
  --blood A+ \
  --units 1
```

View hospital stock:

```bash
lifeline inventory stock 660000000000000000000101
```

Update stock:

```bash
lifeline inventory update 660000000000000000000101 \
  --blood A+ \
  --units +5 \
  --lat 19.076 \
  --lng 72.8777
```

## 7. Send notifications

Direct notification:

```bash
lifeline notify sms --to +911111111111 --message "Compatible donor found"
```

Broadcast notification:

```bash
lifeline notify broadcast --message "Maintenance starts at 8 PM"
```

Broadcasts do not require `--to`.

## 8. Record workflow and analytics events

```bash
lifeline saga event --event emergency.created --request <requestId>
lifeline saga history <requestId>
lifeline analytics event --event emergency.created --request <requestId>
lifeline analytics metrics
```

## Common errors

`400 Invalid hospitalId: 1001` means the command needs a real 24-character MongoDB ObjectId.

`400 Invalid bloodType` means the blood type must be one of `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, or `O-`.

`400 Invalid urgency` means the urgency must be `critical`, `urgent`, `standard`, or the CLI alias `high`.

`400 Missing required fields: to` should not happen for broadcast notifications. Broadcast commands require only `--message`.

## Validated CLI workflow test cases

These workflows are covered by automated tests in `tests/unit/lifelineWorkflow.test.js`.

Test case 1: critical kidney request, nearby donors, and broadcast.

```bash
lifeline emergency create --patient case-001 --blood O+ --organ kidney --hospital 660000000000000000000101 --lat 18.902 --lng 67.8764 --urgency critical
lifeline donors nearby --lat 18.902 --lng 67.8764 --radius 15000 --blood O+ --organ kidney --limit 5
lifeline notify broadcast --message "Maintenance starts at 8 PM"
```

Test case 2: high urgency heart request, match run/status, and SMS.

```bash
lifeline emergency create --patient case-002 --blood A+ --organ heart --hospital 660000000000000000000101 --lat 19.071 --lng 72.345 --urgency High
lifeline match run 66000000000000000000e001
lifeline match status 66000000000000000000e001
lifeline notify sms --to +911111111111 --message "Compatible donor found"
```

Test case 3: inventory update/reserve, low-stock alerts, saga event, and analytics.

```bash
lifeline inventory stock 660000000000000000000101
lifeline inventory update 660000000000000000000101 --blood A+ --units +5 --lat 19.076 --lng 72.8777
lifeline inventory reserve 660000000000000000000101 --blood A+ --units 1
lifeline inventory alerts --threshold 3
lifeline saga event --event emergency.created --request 66000000000000000000e001
lifeline analytics event --event emergency.created --request 66000000000000000000e001
lifeline analytics metrics
```
