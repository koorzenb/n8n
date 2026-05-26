const express = require('express');
const AlexaRemote = require('alexa-remote2');
const fs = require('fs');

const app = express();
app.use(express.json());

const DEVICE_NAME = process.env.ALEXA_DEVICE_NAME;
const PROFILE_NAME = process.env.ALEXA_PROFILE_NAME || null;
const AUTH_FILE = '/data/alexa-auth.json';
const PROXY_PORT = 3001;

const alexa = new AlexaRemote();
let ready = false;
let profileCustomerId = null;

function saveAuth(data) {
  fs.mkdirSync('/data', { recursive: true });
  fs.writeFileSync(AUTH_FILE, JSON.stringify(data, null, 2));
  console.log('Auth data saved to', AUTH_FILE);
}

function loadAuth() {
  if (fs.existsSync(AUTH_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
    } catch (e) {
      console.warn('Could not parse saved auth file:', e.message);
    }
  }
  return null;
}

function initAlexa(options, label) {
  console.log(`Initializing Alexa (${label})...`);
  alexa.init(options, (err) => {
    if (alexa.cookieData) {
      saveAuth(alexa.cookieData);
    }
    if (err) {
      console.error('Alexa init failed:', err.message);
      if (alexa.cookieData) {
        console.log('Auth data was captured despite error — please restart the container');
      }
      return;
    }
    ready = true;
    console.log('Alexa initialized successfully');
    if (PROFILE_NAME) resolveProfileCustomerId();
  });
}

const savedAuth = loadAuth();

if (savedAuth) {
  console.log('Found saved auth data — using captured cookie + macDms');
  initAlexa(
    {
      cookie: savedAuth.loginCookie,
      macDms: savedAuth.macDms,
      acceptLanguage: 'en-CA',
      amazonPage: 'amazon.com',
      alexaServiceHost: 'alexa.amazon.com',
    },
    'saved auth',
  );
} else {
  console.log('No saved auth found — starting proxy on port', PROXY_PORT);
  console.log('>>> SETUP REQUIRED: Open http://localhost:' + PROXY_PORT + '/ in your browser and log in to Amazon.');
  alexa.init(
    {
      proxyOnly: true,
      proxyPort: PROXY_PORT,
      proxyOwnIp: 'localhost',
      acceptLanguage: 'en-CA',
      amazonPage: 'amazon.com',
      alexaServiceHost: 'alexa.amazon.com',
    },
    () => {},
  );

  // Poll for login completion — cookieData is set asynchronously after browser login
  const poll = setInterval(() => {
    if (alexa.cookieData) {
      clearInterval(poll);
      saveAuth(alexa.cookieData);
      console.log('>>> Login captured! Restart the container to complete setup:');
      console.log('>>>   docker compose restart alexa-reminder-svc');
    }
  }, 2000);
}

function resolveProfileCustomerId() {
  alexa.getHousehold((err, result) => {
    if (err || !result) {
      console.warn('Could not resolve household profiles:', err ? err.message : 'no result');
      return;
    }
    const members = result.accounts || result.members || result.householdMembers || [];
    const match = members.find(
      (m) => (m.fullName || m.firstName || m.name || '').toLowerCase() === PROFILE_NAME.toLowerCase()
    );
    if (match) {
      profileCustomerId = match.id || match.customerId || match.directedId;
      console.log(`Resolved profile "${PROFILE_NAME}" to customerId: ${profileCustomerId}`);
    } else {
      console.warn(`Profile "${PROFILE_NAME}" not found in household. Available: ${members.map((m) => m.name || m.firstName).join(', ')}`);
    }
  });
}

// Health check
app.get('/health', (req, res) => {
  const hasAuth = !!loadAuth();
  res.json({
    status: ready ? 'ready' : 'not_ready',
    setup_required: !hasAuth,
    setup_instructions: !hasAuth ? `Configure browser proxy to localhost:${PROXY_PORT}, browse to https://alexa.amazon.com and log in` : undefined,
  });
});

// List devices
app.get('/devices', (req, res) => {
  if (!ready) return res.status(503).json({ error: 'Alexa not ready yet' });
  alexa.getDevices((err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    const devices = (result.devices || []).map((d) => ({
      name: d.accountName,
      type: d.deviceFamily,
      online: d.online,
    }));
    res.json(devices);
  });
});

// Create a reminder
// Body: { title: string, scheduledTime: string (ISO 8601), timeZone?: string }
app.post('/reminder', (req, res) => {
  if (!ready) return res.status(503).json({ error: 'Alexa not ready — setup required' });

  const { title, scheduledTime, timeZone } = req.body;
  if (!title || !scheduledTime) {
    return res.status(400).json({ error: '"title" and "scheduledTime" are required' });
  }

  const reminderTime = new Date(scheduledTime);
  if (isNaN(reminderTime.getTime())) {
    return res.status(400).json({ error: `Invalid scheduledTime: "${scheduledTime}"` });
  }

  const notification = alexa.createNotificationObject(DEVICE_NAME, 'Reminder', title, reminderTime.getTime(), 'ON', null);
  if (timeZone) notification.timeZoneId = timeZone;
  if (profileCustomerId) notification.personId = profileCustomerId;

  alexa.createNotification(notification, (err, result) => {
    if (err) {
      console.error(`Failed to create reminder "${title}":`, err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log(`Reminder created: "${title}" at ${scheduledTime}`);
    res.json({ success: true, result });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`alexa-reminder-svc listening on port ${PORT}`));
