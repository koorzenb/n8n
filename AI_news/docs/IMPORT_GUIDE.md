# Step-by-Step Import Guide for n8n Workflows

## Prerequisites
1. **n8n Installation**
   - Running n8n via Docker (recommended) or via npm (`npm install -g n8n`)
   - Confirm access at `http://localhost:5678` (or your configured port)

2. **Mounted Volumes**
   - `/data` ? Persists `preferences.json`
   - `/workflows` ? Stores `.json` workflow files

3. **Credentials to Set Up**
   - **Google AI Studio API Key** (under *Credentials ? Google AI*)
   - **Telegram Bot Token** (under *Credentials ? Telegram*)
   - **Telegram Chat ID** (store as environment variable `TELEGRAM_CHAT_ID`)

---

## Importing Workflows

### Workflow 1: Daily Digest Generator
1. Navigate to **Workflows ? Import** in the n8n UI
2. Upload `workflows/01_digest.json`
3. Click **Import** ? Workflow will appear as **`Daily Digest Generator`**

### Workflow 2: Telegram Feedback Listener
1. Navigate to **Workflows ? Import**
2. Upload `workflows/02_feedback.json`
3. Click **Import** ? Workflow will appear as **`Telegram Feedback Listener`**

---

## Post-Import Configuration

| Step | Action |
|------|--------|
| 1?? | In **Workflow 1**, click the **??** (Credentials) icon next to **`Schedule Trigger`** ? Set timezone if needed |
| 2?? | In **Workflow 2**, do the same for the **Telegram Trigger** node |
| 3?? | Open **`01_digest.json`** in the editor ? Verify these fields:
   - Replace `{{ $json.apiKey }}` with your Google AI Studio key
   - Replace `{{ $json.chatId }}` with your Telegram Chat ID
   *(Use the "Credentials" dropdown to insert secure values)* |
| 4?? | Save both workflows **after** adding credentials |
| 5?? | Test Workflow 1 manually:
   - Click **Execute Workflow** ? Confirm 5-item digest appears in Telegram |

---

## Validation Checklist

? **Workflow 1**
- [ ] Fetches 5 RSS feeds at 07:00 AM daily
- [ ] Generates exactly 5 bullet points (4 interest-matched + 1 wildcard)
- [ ] Wildcard item prefixes with `?? **Wildcard:**`

? **Workflow 2**
- [ ] Receives Telegram messages ? Parses preferences.json
- [ ] Updates preferences.json on disk
- [ ] Sends confirmation message with changed fields

? **Preferences File**
- [ ] Persists in `/data/preferences.json`
- [ ] Auto-updated by Workflow 2

---

## Common Gotchas

?? **"Node not found" errors**
? Ensure you imported both files (01_digest.json & 02_feedback.json)

?? **Telegram messages not triggering**
? In the [n8n Telegram Trigger](https://docs.n8n.io/nodes/n8n-nodes-base.telegrambotmessage/), verify the **Chat ID** matches your bot's conversation

?? **Gemini API returns 401**
? Double-check your Google AI Studio API key has `generateContent` permissions

?? **Read/Write file errors**
? Confirm `/data` directory is mounted to the container (`docker inspect ai_news_n8n` ? check Mounts)

---

## Next Steps After Import

1. **Enable Auto-Execution**
   - For Workflow 1: Toggle **Active** switch in the workflow list

2. **Watch Logs**
   - Watch n8n console logs for `Execution completed` messages

3. **Simulate Feedback**
   - Send a test Telegram message like *"Add 'multimodal models' to core interests"*
   - Verify `preferences.json` updates and confirmation message arrives

Need help debugging? Paste any **error messages** you see and I'll guide you through fixes!
