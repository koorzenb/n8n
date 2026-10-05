# How to Find Your Telegram Chat ID

@userinfobot sometimes returns outdated or incomplete info. Here are alternative methods:

---

## Method 1: @getmyid_bot (Recommended)

1. Open Telegram and search for **@getmyid_bot**
2. Start the bot by sending `/start`
3. It will immediately reply with your **User ID** and **Chat ID**

> Note: This returns your **private chat ID** (the one you'd use to send messages to yourself).

---

## Method 2: @RawDataBot

1. Search for **@RawDataBot** in Telegram
2. Send it any message (e.g., "hello")
3. It will echo back the **raw JSON update**, which includes:

   ```json
   {
     "message": {
       "chat": {
         "id": 123456789,
         "type": "private"
       }
     }
   }
   ```

4. Look for `"id"` under `"chat"` � that is your Chat ID

---

## Method 3: @JsonDumpBot

1. Search for **@JsonDumpBot**
2. Send any message
3. It returns the full JSON update. Find `"chat": {"id": ...}`

---

## Method 4: Use a Simple Echo Bot (if you have one)

If you already have a Telegram bot set up:

1. Send a message to your bot
2. Check the n8n execution logs or webhook payload
3. The `message.chat.id` field in the incoming webhook contains your Chat ID

---

## Method 5: Telegram API Direct Call

If you have a bot token, you can call the API directly:

```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
```

Look for `"chat": {"id": <number>}` in the response.

---

## Method 6: Group Chat ID (if sending to a group)

1. Add **@RawDataBot** to your group
2. Send a message in the group
3. The raw JSON will show the group chat ID (note: group IDs are negative numbers, e.g., `-1001234567890`)

---

## Common Issues

| Issue | Solution |
| ------- | ---------- |
| @userinfobot returns nothing | Bot may be down or rate-limited. Try another method. |
| Chat ID is a negative number | This is a group/channel ID. For private chats, it should be a positive number. |
| Bot doesn't see messages | Make sure the bot has been started (`/start`) and has privacy mode disabled if in a group. |
| Getting "forbidden" errors | The bot may not have access to the chat. Try a private chat with yourself first. |

---

## Where to Use the Chat ID

Once you have your Chat ID, add it to your `.env` file:

```env
TELEGRAM_CHAT_ID=123456789
```

Then in n8n, the Telegram Send node will use this to deliver messages.
