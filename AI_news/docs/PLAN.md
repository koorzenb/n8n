# Implementation Plan: AI News Digest Agent

## Phase 1: Foundation Setup
1. Create `/data/preferences.json` with initial preferences
2. Initialize n8n Docker container with mounted volumes
3. Configure Telegram Bot credentials in n8n

## Phase 2: Workflow 1 (Daily Digest)
1. Create Schedule Trigger node (daily 07:00)
2. Add 5 RSS Read nodes (parallel execution)
   - openai.com/news/rss.xml
   - deepmind.google/blog/feed/basic/
   - huggingface.co/blog/feed.xml
   - techcrunch.com/category/artificial-intelligence/feed/
   - export.arxiv.org/rss/cs.AI
3. Merge RSS items into unified array
4. Read `preferences.json` via Read File node
5. HTTP Request node to Gemini API
   - Endpoint: `/v1beta/models/gemini-2.5-flash:generateContent`
   - Payload: RSS items + preferences
6. Parse Gemini response into 5 bullet points
7. Send to Telegram via Send node

## Phase 3: Workflow 2 (Feedback Listener)
1. Create Telegram Trigger node (`message` event)
2. Read current `preferences.json`
3. HTTP Request node to Gemini API
   - Same endpoint, different prompt
4. Parse JSON update response
5. Write updated preferences to disk
6. Send confirmation via Telegram

## Phase 4: Testing & Validation
1. Run Workflow 1 manually (test digest)
2. Send test Telegram message ? verify preference update
3. Verify next day's digest reflects preferences

## Phase 5: Enhancement (Optional)
1. Add error handling node
2. Add logging node
3. Add retry logic for Gemini calls

---

## File Structure
```
AI_news/
+-- docs/
¦   +-- PRD.md              # Product Requirements Document
¦   +-- PLAN.md             # This implementation plan
+-- prompts/
¦   +-- digest_summarizer.md # System prompt for Workflow 1
¦   +-- feedback_parser.md   # System prompt for Workflow 2
+-- data/
¦   +-- preferences.json   # User preferences file
+-- workflows/
¦   +-- 01_digest.json     # n8n workflow JSON
¦   +-- 02_feedback.json   # n8n workflow JSON
+-- README.md              # Setup instructions
```
