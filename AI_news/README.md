# AI News Digest & Dynamic Preference Agent

Self-hosted n8n automation system that generates daily AI news digests and dynamically updates user preferences via Telegram.

## Project Structure

```md
AI_news/
+-- docs/
�   +-- PRD.md              # Product Requirements Document
�   +-- PLAN.md             # Implementation Plan
+-- prompts/
�   +-- digest_summarizer.md  # Gemini system prompt for Workflow 1
�   +-- feedback_parser.md     # Gemini system prompt for Workflow 2
+-- data/
�   +-- preferences.json    # User preferences (read/write by n8n)
+-- workflows/              # n8n workflow JSON exports (to be created)
+-- README.md               # This file
```

## Setup

1. Clone this repository
2. Place `preferences.json` in the `/data` directory
3. Configure n8n Docker with `/data` and `/workflows` mounted volumes
4. Set up Telegram Bot credentials in n8n
5. Set up Google AI Studio API key in n8n credentials
6. Import workflow JSON files into n8n

## Workflows

### Workflow 1: Daily Digest Generator

- **Trigger**: Schedule (daily 07:00)
- **Pipeline**: RSS fetch ? Read preferences ? Gemini API ? Telegram delivery
- **Output**: 5 bullet points (4 interest-matched + 1 wildcard)

### Workflow 2: Telegram Feedback Listener

- **Trigger**: Telegram message
- **Pipeline**: Read preferences ? Gemini API (parse feedback) ? Write preferences ? Telegram confirmation
- **Output**: Updated preferences.json + confirmation message

## System Prompts

See `prompts/` directory for the exact system prompts used in Gemini API calls.
