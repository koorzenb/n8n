# Product Requirements Document: Local AI News Digest & Dynamic Preference Agent

## 1. Overview
A self-hosted automation system in n8n that:
• Gathers daily AI news from 5 RSS feeds
• Filters and summarizes top stories using Google AI Studio (Gemini Flash API)
• Uses a local `preferences.json` file for user preferences
• Delivers a formatted 5-item digest to Telegram (4 interest-matched + 1 wildcard)
• Listens for natural language Telegram replies to dynamically update preferences

## 2. Technical Stack
| Layer                | Technology                                                                 |
|----------------------|----------------------------------------------------------------------------|
| Workflow Orchestration | Self-hosted n8n (Docker, mounted local directory)                          |
| LLM Engine               | Google AI Studio API (`gemini-2.5-flash` or `gemini-3.6-flash`, Free Tier) |
| Storage                  | Local filesystem: `/data/preferences.json`                                 |
| Interface              | Telegram Bot API (Trigger + Send nodes)                                    |

## 3. File Schema: `/data/preferences.json`
{
  "core_interests": [
    "Open-source LLMs & fine-tuning",
    "Agentic workflows & orchestration",
    "Coding assistant benchmarks",
    "Local model optimization & quantization"
  ],
  "excluded_keywords": [
    "Crypto",
    "Venture capital rounds",
    "NFTs",
    "Speculative regulation"
  ],
  "contextual_notes": "Prefer concise, developer-focused technical breakthroughs over corporate marketing press releases."
}

## 4. Workflow 1: Daily Digest Generator ("4 + 1 Wildcard")
Trigger: Schedule Trigger (cron `0 7 * * *` - daily at 07:00 AM)
RSS Sources (last 24 hours):
- `https://openai.com/news/rss.xml`
- `https://deepmind.google/blog/feed/basic/`
- `https://huggingface.co/blog/feed.xml`
- `https://techcrunch.com/category/artificial-intelligence/feed/`
- `http://export.arxiv.org/rss/cs.AI`
Processing Pipeline:
1. Read `preferences.json` from disk
2. Fetch all 5 RSS feeds (parallel)
3. Merge RSS items into single array
4. Call Gemini API with RSS items + preferences
5. Parse response ? 5 bullet points with source links
6. Send via Telegram to configured Chat ID
Output Format:
```
• [Item 1 – core interest match]
• [Item 2 – core interest match]
• [Item 3 – core interest match]
• [Item 4 – core interest match]
• ?? **Wildcard:** [Item 5 – emerging topic outside core interests]
```

## 5. Workflow 2: Telegram Dynamic Feedback Listener
Trigger: Telegram Trigger (`message` event type)
Processing Pipeline:
1. Read current `preferences.json` from disk
2. Call Gemini API with incoming message + current preferences
3. Parse response ? updated preferences (partial JSON, only changed fields)
4. Overwrite `/data/preferences.json`
5. Send confirmation message to Telegram
Example:
> User: "Focus more on vision models and stop showing paper pre-prints."
> System: Updates `core_interests` (adds "vision models"), `excluded_keywords` (adds "paper pre-prints")
> Bot Reply: "Updated preferences! Added **'vision models'** to core interests and **'paper pre-prints'** to exclusions."

## 6. System Prompts
See `prompts/digest_summarizer.md` and `prompts/feedback_parser.md` in the repository

## 7. Non-Functional Requirements
| Requirement | Detail |
|-----------|--------|
| Reliability | Handle RSS fetch failures gracefully; retry Gemini calls |
| Security | API keys stored in n8n credentials, not in workflow JSON |
| Maintainability | Prompts externalized; workflows version-controlled |
| Extensibility | Easy to add/remove RSS sources or preference fields |
| Observability | Log each run; include error trigger for failures |

## 8. Assumptions
- `/data/` is mounted and writable by n8n container
- Gemini Free Tier quota sufficient for daily + feedback calls
- Telegram Bot token and Chat ID configured in n8n credentials
- n8n runs with access to `generativelanguage.googleapis.com`

## 9. Acceptance Criteria
- [ ] Workflow 1 runs daily at 07:00 and delivers exactly 5 items to Telegram
- [ ] Items 1–4 match `core_interests`, avoid `excluded_keywords`
- [ ] Item 5 is a valid wildcard from outside core interests
- [ ] Workflow 2 correctly parses natural language and updates `preferences.json`
- [ ] Updated preferences persist and affect next day's digest
- [ ] Confirmation message sent after each preference update
