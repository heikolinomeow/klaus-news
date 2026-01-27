# BRIEF: Microsoft Teams Article Sharing

**Version:** 1.0 (Draft)
**Date:** 2026-01-26
**Status:** Ready for Review

---

## Problem Statement

Users want to share articles from Klaus News to their Microsoft Teams channels. Currently there is no way to distribute curated content to team members who don't have direct access to the Klaus News app.

---

## Goal

Enable users to **send individual articles to Microsoft Teams channels** via Incoming Webhooks, with:
1. **Channel selection** at send time (user chooses from pre-configured list)
2. **Confirmation modal** before sending
3. **Admin-configured channels** via environment variables

---

## User Flow

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: User views article                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ OpenAI Announces GPT-5 with Revolutionary           │   │
│  │ Reasoning Capabilities                              │   │
│  │                                                     │   │
│  │ The latest model demonstrates unprecedented...      │   │
│  │                                                     │   │
│  │ [📖 Read Article]  [📤 Send to Teams]              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                         │                                   │
│                         ▼ clicks                            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  STEP 2: Select channel (confirmation modal)                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────┐                 │
│  │  Send to Microsoft Teams              │                 │
│  │  ─────────────────────────────────    │                 │
│  │                                       │                 │
│  │  Select channel:                      │                 │
│  │  ┌─────────────────────────────────┐  │                 │
│  │  │ ○ #general-news                 │  │                 │
│  │  │ ● #tech-updates                 │  │                 │
│  │  │ ○ #finance-team                 │  │                 │
│  │  └─────────────────────────────────┘  │                 │
│  │                                       │                 │
│  │  Article: "OpenAI Announces GPT-5..." │                 │
│  │                                       │                 │
│  │        [Cancel]  [Send to Teams]      │                 │
│  └───────────────────────────────────────┘                 │
│                                                             │
│                         │                                   │
│                         ▼ confirms                          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  STEP 3: Success/Error feedback                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Success:                                                   │
│  ┌───────────────────────────────────────┐                 │
│  │  ✓ Article sent to #tech-updates      │                 │
│  └───────────────────────────────────────┘                 │
│                                                             │
│  Error:                                                     │
│  ┌───────────────────────────────────────┐                 │
│  │  ✗ Failed to send. Please try again.  │                 │
│  └───────────────────────────────────────┘                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## UI/UX Design

### Article Card - Send Button

```
┌─────────────────────────────────────────────────────────────┐
│  TECHNOLOGY  •  5 min read                                  │
│                                                             │
│  OpenAI Announces GPT-5 with Revolutionary                  │
│  Reasoning Capabilities                                     │
│                                                             │
│  The latest model demonstrates unprecedented ability to     │
│  solve complex multi-step problems...                       │
│                                                             │
│  Source: TechCrunch  •  Jan 26, 2026                       │
│                                                             │
│  ┌──────────────┐  ┌──────────────────────┐                │
│  │  📖 Read     │  │  📤 Send to Teams    │                │
│  └──────────────┘  └──────────────────────┘                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Button behavior:**
- If no channels configured → Button disabled with tooltip "No Teams channels configured"
- If channels configured → Opens confirmation modal

### Confirmation Modal

```
┌─────────────────────────────────────────────────────────────┐
│  Send to Microsoft Teams                              [X]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Select a channel:                                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ○  #general-news                                   │   │
│  │  ●  #tech-updates                                   │   │
│  │  ○  #finance-team                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─ Article Preview ───────────────────────────────────┐   │
│  │                                                     │   │
│  │  OpenAI Announces GPT-5 with Revolutionary          │   │
│  │  Reasoning Capabilities                             │   │
│  │                                                     │   │
│  │  The latest model demonstrates unprecedented        │   │
│  │  ability to solve complex multi-step problems...    │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                      [Cancel]    [Send to Teams]            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Settings Page - Teams Integration Section

```
┌─────────────────────────────────────────────────────────────┐
│  Settings > Integrations > Microsoft Teams              ▼   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Microsoft Teams Integration                                │
│                                                             │
│  ┌─ Configured Channels ───────────────────────────────┐   │
│  │                                                     │   │
│  │  Channel              Status                        │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  #general-news        ✓ Connected                   │   │
│  │  #tech-updates        ✓ Connected                   │   │
│  │  #finance-team        ✓ Connected                   │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Test All Connections]                                     │
│                                                             │
│  ℹ️  Channels are configured via environment variables.     │
│     Contact your administrator to add or remove channels.  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**No channels configured state:**

```
┌─────────────────────────────────────────────────────────────┐
│  Settings > Integrations > Microsoft Teams              ▼   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Microsoft Teams Integration                                │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  ⚠️  No channels configured                         │   │
│  │                                                     │   │
│  │  To enable Teams integration, add webhook URLs      │   │
│  │  to your environment configuration.                 │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Teams Card Format

What users see in Microsoft Teams when an article is sent:

```
┌─────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🤖 Klaus News                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  TECHNOLOGY                                                 │
│                                                             │
│  OpenAI Announces GPT-5 with Revolutionary                  │
│  Reasoning Capabilities                                     │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  The latest model demonstrates unprecedented ability to     │
│  solve complex multi-step problems, marking a significant   │
│  leap in artificial intelligence development.               │
│                                                             │
│  ┌──────────────────┐                                      │
│  │  📖 Read Article │                                      │
│  └──────────────────┘                                      │
│                                                             │
│  Source: TechCrunch  •  Jan 26, 2026                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Model

### Environment Configuration

```bash
# .env file

TEAMS_CHANNELS='[
  {"name": "general-news", "webhookUrl": "https://outlook.office.com/webhook/..."},
  {"name": "tech-updates", "webhookUrl": "https://outlook.office.com/webhook/..."},
  {"name": "finance-team", "webhookUrl": "https://outlook.office.com/webhook/..."}
]'
```

**Format:** JSON array of channel objects
- `name`: Display name shown in UI (required, string)
- `webhookUrl`: Microsoft Teams Incoming Webhook URL (required, string)

### Article Data Used

Fields from existing article model that will be sent to Teams:

| Field | Usage in Teams Card |
|-------|---------------------|
| `title` | Card title (bold) |
| `summary` | Card body text |
| `category` | Badge/label above title |
| `source` | Footer attribution |
| `published_at` | Footer date |
| `url` | "Read Article" button target |

---

## API Structure

### Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/teams/channels` | GET | List configured channels (names only, no webhook URLs) |
| `/api/teams/send` | POST | Send article to specified channel |

### GET /api/teams/channels

**Response:**
```json
{
  "channels": [
    {"name": "general-news"},
    {"name": "tech-updates"},
    {"name": "finance-team"}
  ]
}
```

**Notes:**
- Returns only channel names (webhook URLs are never exposed to frontend)
- Returns empty array if no channels configured

### POST /api/teams/send

**Request:**
```json
{
  "articleId": "uuid-of-article",
  "channelName": "tech-updates"
}
```

**Response (success):**
```json
{
  "success": true,
  "message": "Article sent to #tech-updates"
}
```

**Response (error):**
```json
{
  "success": false,
  "error": "Channel not found" | "Failed to send to Teams" | "Article not found"
}
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   FRONTEND                           BACKEND                │
│                                                             │
│   ┌───────────────┐                 ┌───────────────┐      │
│   │ Article Card  │                 │ GET /api/     │      │
│   │ [Send Button] │─────────────────│ teams/channels│      │
│   └───────────────┘                 └───────────────┘      │
│          │                                 │               │
│          │                                 │               │
│          ▼                                 ▼               │
│   ┌───────────────┐                 ┌───────────────┐      │
│   │ Channel Modal │◄── channel list─│ Read from     │      │
│   │               │                 │ TEAMS_CHANNELS│      │
│   └───────┬───────┘                 │ env var       │      │
│           │                         └───────────────┘      │
│           │                                                │
│           │ POST {articleId,        ┌───────────────┐      │
│           │       channelName}      │ POST /api/    │      │
│           └────────────────────────►│ teams/send    │      │
│                                     └───────┬───────┘      │
│                                             │               │
│                                             │ Build         │
│                                             │ Adaptive Card │
│                                             ▼               │
│                                     ┌───────────────┐      │
│                                     │ HTTP POST to  │      │
│                                     │ Teams Webhook │      │
│                                     └───────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Backend Implementation

### New Module: `backend/app/services/teams_service.py`

```python
def get_channels() -> list[dict]:
    """
    Get configured Teams channels from environment.
    Returns list of {name: str} (no webhook URLs exposed).
    """

def send_to_teams(article_id: str, channel_name: str) -> dict:
    """
    Send article to specified Teams channel.
    Returns {success: bool, message: str} or {success: bool, error: str}
    """

def build_adaptive_card(article: Article) -> dict:
    """
    Build Microsoft Adaptive Card JSON from article data.
    """
```

### New Router: `backend/app/api/teams.py`

- `GET /api/teams/channels` → calls `get_channels()`
- `POST /api/teams/send` → calls `send_to_teams()`

### Adaptive Card Payload

```json
{
  "type": "message",
  "attachments": [
    {
      "contentType": "application/vnd.microsoft.card.adaptive",
      "content": {
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        "type": "AdaptiveCard",
        "version": "1.4",
        "body": [
          {
            "type": "TextBlock",
            "text": "TECHNOLOGY",
            "size": "small",
            "color": "accent",
            "weight": "bolder"
          },
          {
            "type": "TextBlock",
            "text": "OpenAI Announces GPT-5...",
            "size": "large",
            "weight": "bolder",
            "wrap": true
          },
          {
            "type": "TextBlock",
            "text": "The latest model demonstrates...",
            "wrap": true
          },
          {
            "type": "TextBlock",
            "text": "Source: TechCrunch • Jan 26, 2026",
            "size": "small",
            "isSubtle": true
          }
        ],
        "actions": [
          {
            "type": "Action.OpenUrl",
            "title": "Read Article",
            "url": "https://techcrunch.com/..."
          }
        ]
      }
    }
  ]
}
```

---

## Frontend Implementation

### New Components

| Component | Purpose |
|-----------|---------|
| `TeamsChannelModal` | Confirmation modal with channel selection |
| `TeamsSettingsSection` | Settings page integration status display |

### Modified Components

| Component | Change |
|-----------|--------|
| Article card/detail | Add "Send to Teams" button |
| Settings page | Add Teams Integration section |

### State Management

- Fetch channels on app load (or lazily when modal opens)
- Store in context/state for reuse
- No caching needed (list is small and rarely changes)

---

## Error Handling

| Scenario | User Feedback |
|----------|---------------|
| No channels configured | Button disabled, tooltip explains |
| Network error on send | Toast: "Failed to send. Please try again." |
| Webhook returns error | Toast: "Teams rejected the message. Contact admin." |
| Article not found | Toast: "Article not found." (edge case) |
| Channel not found | Toast: "Channel not found." (edge case) |

---

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| Webhook URLs are sensitive | Never expose to frontend; keep in env vars only |
| Rate limiting | Microsoft Teams has rate limits (~4 msgs/sec); add delay if bulk sending in future |
| Input validation | Validate articleId and channelName on backend |

---

## Validation Rules

| Field | Rule |
|-------|------|
| `TEAMS_CHANNELS` env var | Valid JSON array, each item has `name` and `webhookUrl` |
| `channelName` (request) | Must match a configured channel name |
| `articleId` (request) | Must be valid UUID, article must exist |

---

## Out of Scope (Future Enhancements)

- Images in Teams cards (requires public URL hosting)
- Bulk send (multiple articles at once)
- Scheduled/automated sends
- User-configured channels (self-service webhook setup)
- Send history/audit log
- Channel-specific card customization
- Digest format (multiple articles in one card)

---

## Summary

This feature enables users to share individual articles to Microsoft Teams channels:

1. **Admin configures** webhook URLs in environment variables
2. **User clicks** "Send to Teams" button on article
3. **User selects** target channel from modal
4. **User confirms** and article is sent as Adaptive Card
5. **Team members** see rich card in Teams with "Read Article" button

Simple, secure, and extensible for future enhancements.
