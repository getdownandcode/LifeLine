const DEFAULT_PORT = 3000;

function readPort(name, fallback = DEFAULT_PORT) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;

  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Config Error: ${name} must be a valid number between 1-65535. Got: "${raw}". Example: ${name}=3000`);
  }

  return port;
}

function validateUrl(name, value, allowedProtocols) {
  if (!value) return undefined;

  let parsed;
  try {
    parsed = new URL(value);
  } catch (_error) {
    throw new Error(`Config Error: ${name} must be a valid URL. Got: "${value}"`);
  }

  if (!allowedProtocols.includes(parsed.protocol)) {
    throw new Error(`Config Error: ${name} must use one of these protocols: ${allowedProtocols.join(', ')}`);
  }

  return value;
}

function validateSecret(name, minLength, required, enforceMinLength) {
  const value = process.env[name];
  if (!required && !value) return undefined;
  if (process.env.NODE_ENV !== 'production' && !value) return undefined;

  if (!value) {
    throw new Error(`Config Error: ${name} is required in production.`);
  }

  if (enforceMinLength && value.length < minLength) {
    throw new Error(`Config Error: ${name} must be at least ${minLength} characters when STRICT_SECRET_VALIDATION=true.`);
  }

  return value;
}

function validateConfig(options = {}) {
  const {
    portEnv = 'PORT',
    defaultPort = DEFAULT_PORT,
    requireAuthSecrets = false,
    enforceSecretLength = process.env.STRICT_SECRET_VALIDATION === 'true'
  } = options;

  return {
    port: readPort(portEnv, defaultPort),
    mongoUri: validateUrl('MONGODB_URI', process.env.MONGODB_URI, ['mongodb:', 'mongodb+srv:']),
    redisUrl: validateUrl('REDIS_URL', process.env.REDIS_URL, ['redis:', 'rediss:']),
    rabbitmqUrl: validateUrl('RABBITMQ_URL', process.env.RABBITMQ_URL, ['amqp:', 'amqps:']),
    jwtSecret: requireAuthSecrets ? validateSecret('JWT_SECRET', 32, true, enforceSecretLength) : process.env.JWT_SECRET,
    internalServiceToken: requireAuthSecrets
      ? validateSecret('INTERNAL_SERVICE_TOKEN', 16, true, enforceSecretLength)
      : process.env.INTERNAL_SERVICE_TOKEN
  };
}

module.exports = { validateConfig };
