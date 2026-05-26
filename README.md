# Google Calendar → Alexa Reminder (via n8n)

Automatically creates an Alexa reminder whenever a Google Calendar event is created:

- **With a location:** Uses Google Maps to calculate driving time from home, sets a "time to leave" reminder (`event start − travel time − 5 min lead`).
- **Without a location:** Sets a reminder 5 minutes before the event starts.
- **All-day events:** Skipped entirely.

---

## Architecture

```
Google Calendar  →  n8n Workflow  →  alexa-reminder-svc  →  Alexa Echo Device
                         ↓
                  Google Maps API
                  (if event has location)
```

All services run in Docker Compose on a shared internal network. The `alexa-reminder-svc` is not exposed to the internet — only reachable from n8n.

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- A Google account (for Google Calendar + Google Cloud API key)
- An Amazon account with an Alexa-enabled device

---

## Step 1 — Get a Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Enable the **Distance Matrix API** under _APIs & Services → Library_
4. Go to _APIs & Services → Credentials_ → **Create Credentials → API key**
5. Edit the key:
   - Under **Application restrictions**, set to **None** (or restrict to your server's IP)
   - Under **API restrictions**, restrict to **Distance Matrix API** only
6. Copy the API key

---

## Step 2 — Configure Environment Variables

Copy the example env file and fill in your values:

```
copy .env.example .env
```

Edit `.env`:

```env
TZ=America/Halifax                        # Your timezone (IANA format)
HOME_ADDRESS=Your home address here       # Used as origin for Maps travel time
GOOGLE_MAPS_API_KEY=your_key_here         # From Step 1
ALEXA_DEVICE_NAME=Your Echo Device Name  # Filled in after Step 4
ALEXA_PROFILE_NAME=Your Full Name        # Alexa household profile name (e.g. "Jane Smith") — reminders sent to this user only
```

> ⚠️ Never commit `.env` — it is in `.gitignore`.

---

## Step 3 — Create the n8n Data Volume

If you don't already have an n8n data volume:

```
docker volume create n8n_data
```

---

## Step 4 — Start the Services

```
docker compose up -d --build
```

Verify both containers are running:

```
docker compose ps
```

---

## Step 5 — Authenticate with Alexa (One-Time Setup)

The `alexa-reminder-svc` uses the [`alexa-remote2`](https://github.com/Apollon77/alexa-remote) library to create reminders. It requires a one-time login via a local proxy.

1. Open your browser and navigate to:
   ```
   http://localhost:3001
   ```
2. Log in with your Amazon account credentials
3. The page will show: _"Amazon Alexa Cookie successfully retrieved. You can close the browser."_
4. Watch the container logs:
   ```
   docker compose logs -f alexa-reminder-svc
   ```
   You should see:
   ```
   Auth data saved to /data/alexa-auth.json
   >>> Login captured! Restart the container to complete setup:
   >>>   docker compose restart alexa-reminder-svc
   ```
5. Restart the service:
   ```
   docker compose restart alexa-reminder-svc
   ```
6. Confirm it's ready:
   ```
   docker compose logs alexa-reminder-svc
   ```
   Expected: `Alexa initialized successfully`

Auth tokens are saved in the `alexa_auth_data` Docker volume and persist across restarts.

---

## Step 6 — Find Your Alexa Device Name

```
docker compose exec alexa-reminder-svc wget -qO- http://localhost:3000/devices
```

This returns a JSON list of your Alexa devices. Copy the `name` of the device you want to receive reminders and set it in `.env`:

```env
ALEXA_DEVICE_NAME=Living Room end's Echo Dot
```

Then restart to apply:

```
docker compose up -d --build alexa-reminder-svc
```

After restart, confirm the profile was resolved in the logs:

```
docker compose logs alexa-reminder-svc
```

Expected: `Resolved profile "Your Full Name" to customerId: ...`

> If the profile is not found, check that `ALEXA_PROFILE_NAME` exactly matches the full name shown in your Amazon household (case-insensitive).

---

## Step 7 — Build the n8n Workflow

Open n8n at [http://localhost:5678](http://localhost:5678) and create a new workflow with the following nodes in order:

### Node 1 — Google Calendar Trigger

- **Type:** Google Calendar Trigger
- **Credential:** Connect your Google account via OAuth
- **Calendar:** Select your calendar
- **Trigger On:** Event Created
- **Poll Times:** Every Minute (for testing), Every Hour (for production)

### Node 2 — Skip All-Day Events (If node)

- **Condition:** `{{ $json.start.dateTime }}` → **is not empty**
- **True branch** continues; False branch dead-ends (all-day events skipped)

### Node 3 — Has Location? (If node)

- **Condition:** `{{ $json.location }}` → **is not empty**
- **True branch** → travel time path
- **False branch** → simple 5-min reminder path

### Node 4 — Get Travel Time (HTTP Request) — True branch only

- **Method:** GET
- **URL:** `https://maps.googleapis.com/maps/api/distancematrix/json`
- **Query Parameters:**

| Name           | Value                                      |
| -------------- | ------------------------------------------ |
| `origins`      | Your home address (fixed text)             |
| `destinations` | `{{ $json.location }}` (expression)        |
| `mode`         | `driving`                                  |
| `key`          | `{{ $env.GOOGLE_MAPS_API_KEY }}` (expression) |

> ℹ️ The `key` field must be set to **Expression** mode (click the `fx` toggle). The editor preview may show `[ERROR: access to env vars denied]` — this is a UI preview limitation and does not affect actual workflow execution.

### Node 5 — Calculate Reminder (Travel) (Code node) — after Get Travel Time

- **Language:** JavaScript

```javascript
const travelSeconds = $input.item.json.rows[0].elements[0].duration.value;
const travelMinutes = Math.ceil(travelSeconds / 60);

const event = $input.item.json;
const eventStart = new Date($('Has Location?').item.json.start.dateTime);
const title = $('Has Location?').item.json.summary || 'Event';

const reminderTime = new Date(eventStart.getTime() - (travelMinutes + 5) * 60 * 1000);

return [
  {
    json: {
      title: `Time to leave for ${title}`,
      scheduledTime: reminderTime.toISOString(),
      timeZone: 'America/Halifax',
    },
  },
];
```

### Node 6 — Create Alexa Reminder (HTTP Request) — after Calculate Reminder (Travel)

- **Method:** POST
- **URL:** `http://alexa-reminder-svc:3000/reminder`
- **Body Content Type:** JSON
- **Body Parameters:**

| Name            | Value                       |
| --------------- | --------------------------- |
| `title`         | `{{ $json.title }}`         |
| `scheduledTime` | `{{ $json.scheduledTime }}` |
| `timeZone`      | `{{ $json.timeZone }}`      |

### Node 7 — Calculate Reminder (No Travel) (Code node) — False branch of Has Location?

- **Language:** JavaScript

```javascript
const event = $input.item.json;
const eventStart = new Date(event.start.dateTime);
const title = event.summary || 'Event';

const reminderTime = new Date(eventStart.getTime() - 5 * 60 * 1000);

return [
  {
    json: {
      title: `${title} starts soon`,
      scheduledTime: reminderTime.toISOString(),
      timeZone: 'America/Halifax',
    },
  },
];
```

### Node 8 — Create Alexa Reminder (No Travel) (HTTP Request) — after Calculate Reminder (No Travel)

- Same configuration as Node 6

### Activate the Workflow

Click **Publish** in the top-right corner of the n8n canvas.

---

## Day-to-Day Usage

```
docker compose up -d
```

That's it. The workflow runs automatically whenever a new Google Calendar event is created.

View logs:

```
docker compose logs -f alexa-reminder-svc
```

---

## Re-Authentication

If Alexa auth expires, delete the saved auth and repeat Step 5:

```
docker compose exec alexa-reminder-svc rm /data/alexa-auth.json
docker compose restart alexa-reminder-svc
```

Then browse to `http://localhost:3001` and log in again.

---

## Project Structure

```
n8n/
├── docker-compose.yml          # Runs n8n + alexa-reminder-svc
├── .env                        # Secrets (not committed)
├── .env.example                # Template — safe to commit
├── .gitignore
└── alexa-reminder-svc/
    ├── Dockerfile
    ├── package.json
    ├── server.js               # Express API: /health, /devices, /reminder
    └── .dockerignore
```
