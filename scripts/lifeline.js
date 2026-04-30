#!/usr/bin/env node
require('dotenv').config();

const readline = require('node:readline/promises');
const { stdin: input, stdout: output } = require('node:process');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Donor = require('../services/matching/src/models/Donor');
const Inventory = require('../services/inventory/src/models/Inventory');
const { normalizeUrgency } = require('../shared/utils/validators');
const pkg = require('../package.json');

const DEFAULT_GATEWAY_URL = 'http://localhost:3000';
const DEMO_HOSPITAL_ID = '660000000000000000000101';
const DEMO_RECIPIENT = {
  patientId: 'demo-patient-001',
  bloodType: 'A+',
  organRequired: 'kidney',
  hospitalId: DEMO_HOSPITAL_ID,
  urgency: 'critical',
  lat: 19.076,
  lng: 72.8777
};

const colorEnabled = process.env.NO_COLOR !== '1' && process.env.NO_COLOR !== 'true';
const ansi = (code) => (value) => colorEnabled ? `\u001b[${code}m${value}\u001b[0m` : String(value);
const style = {
  dim: ansi('2'),
  bold: ansi('1'),
  red: ansi('31'),
  green: ansi('32'),
  yellow: ansi('33'),
  blue: ansi('34'),
  cyan: ansi('36'),
  gray: ansi('90')
};

function box(lines) {
  const width = Math.max(...lines.map((line) => stripAnsi(line).length), 56);
  const top = `+${'-'.repeat(width + 2)}+`;
  const body = lines.map((line) => {
    const padding = width - stripAnsi(line).length;
    return `| ${line}${' '.repeat(padding)} |`;
  });
  return [top, ...body, top].join('\n');
}

function stripAnsi(value) {
  return String(value).replace(/\u001b\[[0-9;]*m/g, '');
}

function command(name, description) {
  return `  ${style.cyan(name.padEnd(44))} ${description}`;
}

function option(name, description) {
  return `  ${style.yellow(name.padEnd(24))} ${description}`;
}

function section(title, lines) {
  return `${style.bold(title)}\n${lines.join('\n')}`;
}

function header() {
  return box([
    `${style.bold(style.green(`LifeLine CLI v${pkg.version}`))}`,
    'Emergency blood inventory, donor matching, and hospital workflow tools',
    style.dim('Run lifeline help, then lifeline <command> --help when you need details')
  ]);
}

const commandHelp = {
  emergency: () => `
${header()}

${section('Emergency Requests', [
    command('lifeline emergency create', 'Create a patient emergency request and send it to matching')
  ])}

${section('Required Fields', [
    option('--patient <id>', 'Patient identifier, chart id, or emergency case id'),
    option('--blood <type>', 'A+, A-, B+, B-, AB+, AB-, O+, or O-'),
    option('--organ <organ>', 'kidney, liver, heart, lung, cornea, or pancreas'),
    option('--hospital <id>', 'Hospital MongoDB ObjectId'),
    option('--lat <number>', 'Patient latitude'),
    option('--lng <number>', 'Patient longitude')
  ])}

${section('Optional Fields', [
    option('--urgency <level>', 'critical, urgent, or standard. Default: standard'),
    option('--json', 'Print raw JSON for scripts')
  ])}

${section('Examples', [
    '  lifeline emergency create --patient alice --blood A+ --organ kidney --hospital 660000000000000000000101 --lat 19.076 --lng 72.8777 --urgency critical',
    '  lifeline emergency create'
  ])}

When you run this command in an interactive terminal, LifeLine asks for any missing fields.
`,

  donors: () => `
${header()}

${section('Donor Matching', [
    command('lifeline donors nearby', 'Find compatible available donors around a location'),
    command('lifeline match run <requestId>', 'Run the matching algorithm for an emergency request'),
    command('lifeline match status <requestId>', 'Read current matching status')
  ])}

${section('Nearby Donor Options', [
    option('--lat <number>', 'Search center latitude'),
    option('--lng <number>', 'Search center longitude'),
    option('--radius <meters>', 'Search radius. Example: 25000 for 25 km'),
    option('--blood <type>', 'Recipient blood type'),
    option('--organ <organ>', 'Required organ type'),
    option('--limit <count>', 'Maximum donors to show. Default: 10')
  ])}

${section('Examples', [
    '  lifeline donors nearby --lat 19.076 --lng 72.8777 --radius 25000 --blood A+ --organ kidney --limit 5',
    '  lifeline match run 607f1f77bcf86cd799439011',
    '  lifeline match status 607f1f77bcf86cd799439011'
  ])}
`,

  inventory: () => `
${header()}

${section('Inventory', [
    command('lifeline inventory stock <hospitalId>', 'Show hospital stock by blood type'),
    command('lifeline inventory reserve <hospitalId>', 'Reserve units for a request'),
    command('lifeline inventory update <hospitalId>', 'Add or subtract stock'),
    command('lifeline inventory alerts', 'Show hospitals below a stock threshold')
  ])}

${section('Reserve Options', [
    option('--blood <type>', 'Blood type to reserve'),
    option('--units <number>', 'Units to reserve')
  ])}

${section('Update Options', [
    option('--blood <type>', 'Blood type to update'),
    option('--units <number>', 'Positive or negative unit change. Example: +5 or -1'),
    option('--lat <number>', 'Hospital latitude'),
    option('--lng <number>', 'Hospital longitude')
  ])}

${section('Alert Options', [
    option('--threshold <number>', 'Low-stock threshold. Default: 5')
  ])}

${section('Examples', [
    '  lifeline inventory stock 660000000000000000000101',
    '  lifeline inventory reserve 660000000000000000000101 --blood A+ --units 1',
    '  lifeline inventory update 660000000000000000000101 --blood A+ --units +5 --lat 19.076 --lng 72.8777',
    '  lifeline inventory alerts --threshold 3'
  ])}
`,

  notify: () => `
${header()}

${section('Notifications', [
    command('lifeline notify sms', 'Send an SMS notification'),
    command('lifeline notify email', 'Send an email notification'),
    command('lifeline notify push', 'Send a push notification'),
    command('lifeline notify broadcast', 'Send a broadcast notification')
  ])}

${section('Options', [
    option('--to <target>', 'Phone, email, or device target. Not needed for broadcast'),
    option('--subject <text>', 'Email subject'),
    option('--message <text>', 'Message body'),
    option('--recipient <id>', 'Optional recipient or request id for audit history')
  ])}

${section('Examples', [
    '  lifeline notify sms --to +911111111111 --message "Compatible donor found"',
    '  lifeline notify email --to admin@hospital.com --subject "Emergency" --message "Review the request"',
    '  lifeline notify broadcast --message "Maintenance starts at 8 PM"'
  ])}
`,

  analytics: () => `
${header()}

${section('Analytics', [
    command('lifeline analytics metrics', 'View operational metrics'),
    command('lifeline analytics event', 'Record an audit or business event')
  ])}

${section('Event Options', [
    option('--event <name>', 'Event name. Example: demo.completed'),
    option('--request <id>', 'Optional emergency request id')
  ])}

${section('Examples', [
    '  lifeline analytics metrics',
    '  lifeline analytics event --event emergency.created --request 607f1f77bcf86cd799439011'
  ])}
`,

  saga: () => `
${header()}

${section('Workflow Orchestration', [
    command('lifeline saga history <requestId>', 'Show workflow history for an emergency request'),
    command('lifeline saga event', 'Record a workflow event')
  ])}

${section('Event Options', [
    option('--event <name>', 'Workflow event name'),
    option('--request <id>', 'Emergency request id')
  ])}

${section('Examples', [
    '  lifeline saga history 607f1f77bcf86cd799439011',
    '  lifeline saga event --event emergency.created --request 607f1f77bcf86cd799439011'
  ])}
`,

  demo: () => `
${header()}

${section('Demo', [
    command('lifeline demo seed', 'Seed demo donors and inventory directly into MongoDB'),
    command('lifeline demo run', 'Run a complete emergency, match, reserve, notify, and metrics flow')
  ])}

${section('Examples', [
    '  lifeline demo seed',
    '  lifeline demo run',
    '  lifeline demo run --json'
  ])}
`,

  compatibility: () => `
${header()}

${section('Blood Compatibility', [
    command('lifeline compatibility <bloodType>', 'Show compatible donor blood types')
  ])}

${section('Examples', [
    '  lifeline compatibility A+',
    '  lifeline compatibility O- --json'
  ])}
`
};

function usage(commandName = null) {
  if (commandName && commandHelp[commandName]) return commandHelp[commandName]();
  if (commandName === 'match') return commandHelp.donors();

  return `
${header()}

${section('Start Here', [
    command('lifeline', 'Open this professional command overview'),
    command('lifeline help', 'Show all commands and workflows'),
    command('lifeline health', 'Check the API gateway and connected services'),
    command('lifeline demo seed', 'Create sample donors and inventory'),
    command('lifeline demo run', 'Run the complete demo workflow')
  ])}

${section('Core Commands', [
    command('lifeline health', 'Service health check'),
    command('lifeline token', 'Generate a short-lived JWT for API debugging'),
    command('lifeline compatibility <bloodType>', 'Check compatible donor blood types'),
    command('lifeline version', 'Print CLI version')
  ])}

${section('Emergency And Matching', [
    command('lifeline emergency create', 'Create an emergency request. Prompts for missing fields in TTY mode'),
    command('lifeline donors nearby', 'Find compatible donors near a location'),
    command('lifeline match run <requestId>', 'Run matching for a request'),
    command('lifeline match status <requestId>', 'Check match status')
  ])}

${section('Inventory', [
    command('lifeline inventory stock <hospitalId>', 'View hospital stock'),
    command('lifeline inventory reserve <hospitalId>', 'Reserve blood units'),
    command('lifeline inventory update <hospitalId>', 'Adjust stock levels'),
    command('lifeline inventory alerts', 'Find low-stock hospitals')
  ])}

${section('Communication And Observability', [
    command('lifeline notify sms|email|push|broadcast', 'Send operational notifications'),
    command('lifeline analytics metrics', 'View platform metrics'),
    command('lifeline analytics event', 'Record an analytics event'),
    command('lifeline saga history <requestId>', 'Inspect workflow history'),
    command('lifeline saga event', 'Record a workflow event')
  ])}

${section('Global Options', [
    option('--url <gateway>', `Gateway URL. Default: ${DEFAULT_GATEWAY_URL}`),
    option('--json', 'Print raw JSON and suppress decorative output'),
    option('--help, -h', 'Show help for a command'),
    option('--version, -v', 'Show version')
  ])}

${section('Professional Workflow', [
    '  1. lifeline health',
    '  2. lifeline demo seed',
    '  3. lifeline emergency create',
    '  4. lifeline donors nearby --lat 19.076 --lng 72.8777 --radius 25000 --blood A+ --organ kidney',
    '  5. lifeline match run <requestId>',
    '  6. lifeline inventory reserve <hospitalId> --blood A+ --units 1',
    '  7. lifeline analytics metrics'
  ])}

${section('Global Installation', [
    '  npm install',
    '  npm link',
    '  lifeline help',
    '',
    '  Alternative without linking:',
    '  npm run lifeline -- help'
  ])}

${style.dim('Use lifeline <command> --help for detailed command documentation.')}
`;
}

function parseArgs(argv) {
  const positional = [];
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }

    const [rawKey, inlineValue] = arg.slice(2).split(/=(.*)/s, 2);
    if (inlineValue !== undefined) {
      options[rawKey] = inlineValue;
      continue;
    }

    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      options[rawKey] = true;
      continue;
    }
    options[rawKey] = next;
    index += 1;
  }

  return { positional, options };
}

function requireOption(options, name) {
  if (options[name] === undefined || options[name] === true || options[name] === '') {
    throw new Error(`Missing required option --${name}`);
  }
  return options[name];
}

async function optionValue(options, name, question, { required = true, defaultValue } = {}) {
  if (options[name] !== undefined && options[name] !== true && options[name] !== '') {
    return options[name];
  }

  if (!process.stdin.isTTY || options.json) {
    if (required) return requireOption(options, name);
    return defaultValue;
  }

  const rl = readline.createInterface({ input, output });
  try {
    const suffix = defaultValue === undefined ? '' : ` (${defaultValue})`;
    const answer = await rl.question(`${style.cyan('?')} ${question}${style.dim(suffix)}: `);
    if (!answer.trim() && defaultValue !== undefined) return defaultValue;
    if (!answer.trim() && required) throw new Error(`Missing required option --${name}`);
    return answer.trim();
  } finally {
    rl.close();
  }
}

function bearerToken() {
  const secret = process.env.JWT_SECRET || 'change_me_dev_secret';
  return jwt.sign(
    { sub: 'lifeline-cli', role: 'admin', scope: ['demo', 'gateway'] },
    secret,
    { expiresIn: '2h' }
  );
}

function createClient(baseURL) {
  return axios.create({
    baseURL,
    timeout: 10000,
    headers: {
      Authorization: `Bearer ${bearerToken()}`,
      'Content-Type': 'application/json'
    },
    validateStatus: () => true
  });
}

function createSpinner(text, enabled = true) {
  const frames = ['-', '\\', '|', '/'];
  let index = 0;
  let timer = null;
  const active = enabled && process.stderr.isTTY;

  return {
    start() {
      if (!active) {
        if (enabled) process.stderr.write(`${text}...\n`);
        return;
      }
      timer = setInterval(() => {
        process.stderr.write(`\r${style.cyan(frames[index])} ${text}`);
        index = (index + 1) % frames.length;
      }, 80);
    },
    stop(message = text, ok = true) {
      if (timer) clearInterval(timer);
      if (!active) return;
      const icon = ok ? style.green('✓') : style.red('x');
      process.stderr.write(`\r${icon} ${message}${' '.repeat(20)}\n`);
    }
  };
}

async function withSpinner(label, task, rawJson = false) {
  const spinner = createSpinner(label, !rawJson);
  spinner.start();
  try {
    const result = await task();
    spinner.stop(label, true);
    return result;
  } catch (error) {
    spinner.stop(label, false);
    throw error;
  }
}

function print(value, rawJson = false) {
  if (rawJson) {
    console.log(JSON.stringify(value, null, 2));
    return;
  }

  if (Array.isArray(value)) {
    if (!value.length) {
      console.log(style.dim('No items found.'));
      return;
    }
    console.table(value.map(compact));
    return;
  }

  if (value && typeof value === 'object') {
    console.log(JSON.stringify(value, null, 2));
    return;
  }

  console.log(value);
}

function compact(item) {
  const outputValue = {};
  for (const [key, value] of Object.entries(item)) {
    if (value === null || value === undefined) outputValue[key] = value;
    else if (value instanceof Date) outputValue[key] = value.toISOString();
    else if (Array.isArray(value)) outputValue[key] = value.join(', ');
    else if (typeof value === 'object') outputValue[key] = value._id || value.id || JSON.stringify(value);
    else outputValue[key] = value;
  }
  return outputValue;
}

async function request(client, method, path, { data, params, rawJson, label } = {}) {
  const response = await withSpinner(
    label || `${method.toUpperCase()} ${path}`,
    () => client.request({ method, url: path, data, params }),
    rawJson
  );
  const body = response.data;
  if (response.status >= 400) {
    const message = body?.error?.message || body?.message || response.statusText;
    throw new Error(`${response.status} ${message}`);
  }

  print(body?.data ?? body, rawJson);
  return body?.data ?? body;
}

function mongoUriFor(service) {
  const password = process.env.MONGO_PASSWORD || 'change_me_mongo';
  if (service === 'matching') {
    return process.env.MATCHING_MONGODB_URI || `mongodb://admin:${password}@localhost:27017/lifeline_matching?authSource=admin`;
  }
  return process.env.INVENTORY_MONGODB_URI || `mongodb://admin:${password}@localhost:27017/lifeline_inventory?authSource=admin`;
}

async function seedDemoData() {
  await mongoose.connect(mongoUriFor('matching'));
  await Donor.deleteMany({ name: /^Demo / });
  await Donor.create([
    {
      name: 'Demo A+ Kidney Donor',
      bloodType: 'A+',
      organTypes: ['kidney'],
      location: { type: 'Point', coordinates: [72.878, 19.077] },
      contact: { phone: '+911111111111', email: 'a-positive@example.com' },
      availability: true,
      healthStatus: 'healthy',
      responseRate: 0.98
    },
    {
      name: 'Demo O- Universal Donor',
      bloodType: 'O-',
      organTypes: ['kidney', 'liver'],
      location: { type: 'Point', coordinates: [72.886, 19.09] },
      contact: { phone: '+912222222222', email: 'o-negative@example.com' },
      availability: true,
      healthStatus: 'healthy',
      responseRate: 0.9
    },
    {
      name: 'Demo B+ Incompatible Donor',
      bloodType: 'B+',
      organTypes: ['kidney'],
      location: { type: 'Point', coordinates: [72.879, 19.078] },
      contact: { phone: '+913333333333', email: 'b-positive@example.com' },
      availability: true,
      healthStatus: 'healthy',
      responseRate: 0.95
    }
  ]);
  await mongoose.disconnect();

  await mongoose.connect(mongoUriFor('inventory'));
  await Inventory.findOneAndUpdate(
    { hospitalId: DEMO_HOSPITAL_ID, bloodType: 'A+' },
    {
      $set: {
        hospitalId: DEMO_HOSPITAL_ID,
        bloodType: 'A+',
        unitsAvailable: 10,
        unitsReserved: 0,
        location: { type: 'Point', coordinates: [72.8777, 19.076] },
        lastUpdated: new Date()
      }
    },
    { upsert: true, new: true, runValidators: true }
  );
  await Inventory.findOneAndUpdate(
    { hospitalId: DEMO_HOSPITAL_ID, bloodType: 'O-' },
    {
      $set: {
        hospitalId: DEMO_HOSPITAL_ID,
        bloodType: 'O-',
        unitsAvailable: 6,
        unitsReserved: 0,
        location: { type: 'Point', coordinates: [72.8777, 19.076] },
        lastUpdated: new Date()
      }
    },
    { upsert: true, new: true, runValidators: true }
  );
  await mongoose.disconnect();

  return {
    hospitalId: DEMO_HOSPITAL_ID,
    recipient: DEMO_RECIPIENT,
    donors: 3,
    inventoryItems: 2
  };
}

async function runDemo(client, rawJson) {
  print(await withSpinner('Seed demo donors and inventory', seedDemoData, rawJson), rawJson);

  await request(client, 'get', `/api/matching/compatibility/${DEMO_RECIPIENT.bloodType}`, {
    rawJson,
    label: 'Check blood compatibility'
  });

  const emergency = await request(client, 'post', '/api/matching/emergency', {
    data: DEMO_RECIPIENT,
    rawJson,
    label: 'Create emergency request'
  });
  const requestId = emergency._id || emergency.id;

  await request(client, 'get', '/api/matching/donors/nearby', {
    params: {
      lat: DEMO_RECIPIENT.lat,
      lng: DEMO_RECIPIENT.lng,
      radius: 25000,
      bloodType: DEMO_RECIPIENT.bloodType,
      organRequired: DEMO_RECIPIENT.organRequired,
      limit: 5
    },
    rawJson,
    label: 'Find nearby donors'
  });

  await request(client, 'post', `/api/matching/match/${requestId}`, { rawJson, label: 'Run matching algorithm' });

  await request(client, 'post', `/api/inventory/hospitals/${DEMO_HOSPITAL_ID}/reserve`, {
    data: { bloodType: 'A+', units: 1 },
    rawJson,
    label: 'Reserve inventory'
  });

  await request(client, 'post', '/api/notifications/sms', {
    data: {
      to: '+911111111111',
      recipientId: requestId,
      message: `LifeLine match found for emergency request ${requestId}`
    },
    rawJson,
    label: 'Send notification'
  });

  await request(client, 'post', '/api/saga/events', {
    data: { event: 'emergency.created', payload: { requestId } },
    rawJson,
    label: 'Record workflow event'
  });

  await request(client, 'post', '/api/analytics/events', {
    data: { event: 'demo.completed', requestId },
    rawJson,
    label: 'Record analytics event'
  });

  await request(client, 'get', '/api/analytics/metrics', { rawJson, label: 'Fetch analytics metrics' });
}

async function emergencyPayload(options) {
  return {
    patientId: await optionValue(options, 'patient', 'Patient id'),
    bloodType: await optionValue(options, 'blood', 'Blood type'),
    organRequired: await optionValue(options, 'organ', 'Organ required'),
    hospitalId: await optionValue(options, 'hospital', 'Hospital ObjectId'),
    urgency: normalizeUrgency(await optionValue(options, 'urgency', 'Urgency', { required: false, defaultValue: 'standard' })),
    lat: Number(await optionValue(options, 'lat', 'Patient latitude')),
    lng: Number(await optionValue(options, 'lng', 'Patient longitude'))
  };
}

async function nearbyParams(options) {
  return {
    lat: await optionValue(options, 'lat', 'Search latitude'),
    lng: await optionValue(options, 'lng', 'Search longitude'),
    radius: await optionValue(options, 'radius', 'Radius in meters', { defaultValue: '25000' }),
    bloodType: await optionValue(options, 'blood', 'Recipient blood type'),
    organRequired: await optionValue(options, 'organ', 'Organ required'),
    limit: await optionValue(options, 'limit', 'Result limit', { required: false, defaultValue: '10' })
  };
}

async function main(argv = process.argv.slice(2), clientFactory = createClient) {
  const { positional, options } = parseArgs(argv);
  const [domain, action, subject] = positional;
  const rawJson = Boolean(options.json);
  const client = clientFactory(options.url || process.env.LIFELINE_URL || DEFAULT_GATEWAY_URL);

  if (options.version || options.v || domain === 'version' || domain === '--version' || domain === '-v') {
    console.log(`LifeLine CLI v${pkg.version}`);
    return;
  }

  if (options.help || options.h || action === 'help') {
    console.log(usage(domain));
    return;
  }

  if (!domain || domain === 'help' || domain === '--help') {
    console.log(usage());
    return;
  }

  if (domain === 'token') {
    console.log(bearerToken());
    return;
  }

  if (domain === 'health') {
    await request(client, 'get', '/health', { rawJson, label: 'Check service health' });
    return;
  }

  if (domain === 'compatibility') {
    if (!action) throw new Error('Blood type required: lifeline compatibility <bloodType>');
    await request(client, 'get', `/api/matching/compatibility/${encodeURIComponent(action)}`, {
      rawJson,
      label: `Check ${action} compatibility`
    });
    return;
  }

  if (domain === 'emergency') {
    if (!action) {
      console.log(usage('emergency'));
      return;
    }
    if (action === 'create') {
      await request(client, 'post', '/api/matching/emergency', {
        data: await emergencyPayload(options),
        rawJson,
        label: 'Create emergency request'
      });
      return;
    }
    throw new Error(`Unknown action: emergency ${action}`);
  }

  if (domain === 'donors') {
    if (!action) {
      console.log(usage('donors'));
      return;
    }
    if (action === 'nearby') {
      await request(client, 'get', '/api/matching/donors/nearby', {
        params: await nearbyParams(options),
        rawJson,
        label: 'Find nearby donors'
      });
      return;
    }
    throw new Error(`Unknown action: donors ${action}`);
  }

  if (domain === 'match' && action === 'run') {
    if (!subject) throw new Error('Request ID required: lifeline match run <requestId>');
    await request(client, 'post', `/api/matching/match/${subject}`, { rawJson, label: 'Run matching algorithm' });
    return;
  }

  if (domain === 'match' && action === 'status') {
    if (!subject) throw new Error('Request ID required: lifeline match status <requestId>');
    await request(client, 'get', `/api/matching/match/status/${subject}`, { rawJson, label: 'Fetch match status' });
    return;
  }

  if (domain === 'inventory') {
    if (!action) {
      console.log(usage('inventory'));
      return;
    }
    if (action === 'stock') {
      if (!subject) throw new Error('Hospital ID required: lifeline inventory stock <hospitalId>');
      await request(client, 'get', `/api/inventory/hospitals/${subject}/stock`, {
        rawJson,
        label: 'Fetch inventory stock'
      });
      return;
    }
    if (action === 'update') {
      if (!subject) throw new Error('Hospital ID required: lifeline inventory update <hospitalId>');
      await request(client, 'put', `/api/inventory/hospitals/${subject}/update`, {
        data: {
          bloodType: await optionValue(options, 'blood', 'Blood type'),
          unitsChange: Number(await optionValue(options, 'units', 'Units change')),
          lat: Number(await optionValue(options, 'lat', 'Hospital latitude')),
          lng: Number(await optionValue(options, 'lng', 'Hospital longitude'))
        },
        rawJson,
        label: 'Update inventory'
      });
      return;
    }
    if (action === 'reserve') {
      if (!subject) throw new Error('Hospital ID required: lifeline inventory reserve <hospitalId>');
      await request(client, 'post', `/api/inventory/hospitals/${subject}/reserve`, {
        data: {
          bloodType: await optionValue(options, 'blood', 'Blood type'),
          units: Number(await optionValue(options, 'units', 'Units to reserve'))
        },
        rawJson,
        label: 'Reserve inventory'
      });
      return;
    }
    if (action === 'alerts') {
      await request(client, 'get', '/api/inventory/alerts/low-stock', {
        params: { threshold: options.threshold || 5 },
        rawJson,
        label: 'Fetch low-stock alerts'
      });
      return;
    }
    throw new Error(`Unknown action: inventory ${action}`);
  }

  if (domain === 'notify') {
    if (!action) {
      console.log(usage('notify'));
      return;
    }
    if (['sms', 'email', 'push', 'broadcast'].includes(action)) {
      await request(client, 'post', `/api/notifications/${action}`, {
        data: {
          to: action === 'broadcast' ? undefined : await optionValue(options, 'to', 'Recipient target'),
          subject: action === 'email' ? await optionValue(options, 'subject', 'Email subject') : options.subject,
          message: await optionValue(options, 'message', 'Message'),
          recipientId: options.recipient
        },
        rawJson,
        label: `Send ${action} notification`
      });
      return;
    }
    throw new Error(`Unknown notification type: ${action}. Use: sms, email, push, broadcast`);
  }

  if (domain === 'saga') {
    if (!action) {
      console.log(usage('saga'));
      return;
    }
    if (action === 'event') {
      await request(client, 'post', '/api/saga/events', {
        data: {
          event: await optionValue(options, 'event', 'Workflow event name'),
          payload: { requestId: await optionValue(options, 'request', 'Emergency request id') }
        },
        rawJson,
        label: 'Record workflow event'
      });
      return;
    }
    if (action === 'history') {
      if (!subject) throw new Error('Request ID required: lifeline saga history <requestId>');
      await request(client, 'get', `/api/saga/sagas/${subject}`, { rawJson, label: 'Fetch workflow history' });
      return;
    }
    throw new Error(`Unknown action: saga ${action}. Use: event, history`);
  }

  if (domain === 'analytics') {
    if (!action) {
      console.log(usage('analytics'));
      return;
    }
    if (action === 'event') {
      await request(client, 'post', '/api/analytics/events', {
        data: {
          event: await optionValue(options, 'event', 'Analytics event name'),
          requestId: options.request,
          timestamp: new Date().toISOString()
        },
        rawJson,
        label: 'Record analytics event'
      });
      return;
    }
    if (action === 'metrics') {
      await request(client, 'get', '/api/analytics/metrics', { rawJson, label: 'Fetch analytics metrics' });
      return;
    }
    throw new Error(`Unknown action: analytics ${action}. Use: event, metrics`);
  }

  if (domain === 'demo') {
    if (!action) {
      console.log(usage('demo'));
      return;
    }
    if (action === 'seed') {
      print(await withSpinner('Seed demo donors and inventory', seedDemoData, rawJson), rawJson);
      return;
    }
    if (action === 'run') {
      await runDemo(client, rawJson);
      return;
    }
    throw new Error(`Unknown action: demo ${action}. Use: seed, run`);
  }

  throw new Error(`Unknown command: ${domain}. Run 'lifeline help' for available commands.`);
}

if (require.main === module) {
  main().catch(async (error) => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    console.error(`\n${style.red('Error:')} ${error.message}`);
    console.error(style.dim('\nRun "lifeline help" or "lifeline <command> --help" for command documentation.\n'));
    process.exit(1);
  });
}

module.exports = { DEMO_HOSPITAL_ID, DEMO_RECIPIENT, bearerToken, emergencyPayload, main, nearbyParams, parseArgs, seedDemoData, usage };
