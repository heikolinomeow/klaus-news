# BRIEF: Microsoft Teams Article Sharing

**Version:** 1.0 (Draft)
**Date:** 2026-01-26
**Status:** Ready for Review

---

## 1. Problem Statement

Users want to share articles from Klaus News to their Microsoft Teams channels. Currently there is no way to distribute curated content to team members who don't have direct access to the Klaus News app.

---

## 2. Goal

Enable users to send individual articles to Microsoft Teams channels via Incoming Webhooks, with:
1. Channel selection at send time (user chooses from pre-configured list)
2. Confirmation modal before sending
3. Admin-configured channels via environment variables

---

## 3. User Flow

### 3.1 Overview

| Step | Action |
|------|--------|
| 1 | User views article and clicks "Send to Teams" button |
| 2 | User selects target channel from confirmation modal |
| 3 | User receives success/error feedback |

### 3.2 Step 1: Article View

User sees article card with "Read Article" and "Send to Teams" buttons.

### 3.3 Step 2: Channel Selection Modal

- Modal title: "Send to Microsoft Teams"
- Channel list displayed as radio buttons
- Article preview shows title and summary excerpt
- Actions: Cancel and "Send to Teams" buttons

### 3.4 Step 3: Feedback

**Success:** `✓ Article sent to #channel-name`

**Error:** `✗ Failed to send. Please try again.`

---

## 4. UI/UX Design

### 4.1 Article Card - Send Button

**Requirement:**
Article cards display category, read time, title, summary, source, and date. Two action buttons appear at bottom: "Read" and "Send to Teams".

**Button Behavior:**
- If no channels configured → Button disabled with tooltip "No Teams channels configured"
- If channels configured → Opens confirmation modal

### 4.2 Confirmation Modal

**Requirement:**
Modal presents channel selection and article preview before user confirms send action.

**Components:**
- Header: "Send to Microsoft Teams" with close button
- Channel selection: Radio button list of configured channels
- Article preview: Title and summary excerpt
- Actions: Cancel and "Send to Teams" buttons

### 4.3 Settings Page - Teams Integration Section

**Requirement:**
Settings page displays Teams integration status under path: Settings > Integrations > Microsoft Teams.

**Configured State:**
- Table showing channel names with status (✓ Connected)
- "Test All Connections" button
- Info text: "Channels are configured via environment variables. Contact your administrator to add or remove channels."

**No Channels Configured State:**
- Warning: "No channels configured"
- Message: "To enable Teams integration, add webhook URLs to your environment configuration."

---

## 5. Teams Card Format

**Requirement:**
When an article is sent, Teams displays a rich Adaptive Card.

**Card Structure:**
| Element | Content |
|---------|---------|
| Header | Klaus News branding |
| Category | Label (e.g., TECHNOLOGY) |
| Title | Article title (bold) |
| Body | Summary text |
| Action | "Read Article" button linking to article URL |
| Footer | Source attribution and date |

---

## 6. Data Model

### 6.1 Environment Configuration

**Requirement:**
Channels are configured via `TEAMS_CHANNELS` environment variable in `.env` file.

**Format:** JSON array of channel objects.

```bash
TEAMS_CHANNELS='[
  {"name": "general-news", "webhookUrl": "https://outlook.office.com/webhook/..."},
  {"name": "tech-updates", "webhookUrl": "https://outlook.office.com/webhook/..."},
  {"name": "finance-team", "webhookUrl": "https://outlook.office.com/webhook/..."}
]'
```

**Field Requirements:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Display name shown in UI |
| `webhookUrl` | string | Yes | Microsoft Teams Incoming Webhook URL |

### 6.2 Article Data Used

**Requirement:**
The following fields from the existing article model are sent to Teams:

| Field | Usage in Teams Card |
|-------|---------------------|
| `title` | Card title (bold) |
| `summary` | Card body text |
| `category` | Badge/label above title |
| `source` | Footer attribution |
| `published_at` | Footer date |
| `url` | "Read Article" button target |

---

## 7. API Structure

### 7.1 Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/teams/channels` | GET | List configured channels (names only, no webhook URLs) |
| `/api/teams/send` | POST | Send article to specified channel |

### 7.2 GET /api/teams/channels

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

**Constraints:**
- Returns only channel names (webhook URLs are never exposed to frontend)
- Returns empty array if no channels configured

### 7.3 POST /api/teams/send

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

## 8. Architecture

**Requirement:**
System follows this flow:

1. Frontend Article Card [Send Button] → GET /api/teams/channels
2. Channel Modal receives channel list (read from TEAMS_CHANNELS env var)
3. Modal POST {articleId, channelName} → POST /api/teams/send
4. Backend builds Adaptive Card and HTTP POST to Teams Webhook

---

## 9. Backend Implementation

### 9.1 New Module: `backend/app/services/teams_service.py`

**Functions:**

| Function | Purpose |
|----------|---------|
| `get_channels() -> list[dict]` | Get configured Teams channels from environment. Returns list of `{name: str}` (no webhook URLs exposed). |
| `send_to_teams(article_id: str, channel_name: str) -> dict` | Send article to specified Teams channel. Returns `{success: bool, message: str}` or `{success: bool, error: str}`. |
| `build_adaptive_card(article: Article) -> dict` | Build Microsoft Adaptive Card JSON from article data. |

### 9.2 New Router: `backend/app/api/teams.py`

| Route | Handler |
|-------|---------|
| `GET /api/teams/channels` | calls `get_channels()` |
| `POST /api/teams/send` | calls `send_to_teams()` |

### 9.3 Adaptive Card Payload

**Requirement:**
Adaptive Card follows Microsoft schema:

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

## 10. Frontend Implementation

### 10.1 New Components

| Component | Purpose |
|-----------|---------|
| `TeamsChannelModal` | Confirmation modal with channel selection |
| `TeamsSettingsSection` | Settings page integration status display |

### 10.2 Modified Components

| Component | Change |
|-----------|--------|
| Article card/detail | Add "Send to Teams" button |
| Settings page | Add Teams Integration section |

### 10.3 State Management

**Requirements:**
- Fetch channels on app load (or lazily when modal opens)
- Store in context/state for reuse
- No caching needed (list is small and rarely changes)

---

## 11. Error Handling

| Scenario | User Feedback |
|----------|---------------|
| No channels configured | Button disabled, tooltip explains |
| Network error on send | Toast: "Failed to send. Please try again." |
| Webhook returns error | Toast: "Teams rejected the message. Contact admin." |
| Article not found | Toast: "Article not found." (edge case) |
| Channel not found | Toast: "Channel not found." (edge case) |

---

## 12. Security Considerations

| Concern | Mitigation |
|---------|------------|
| Webhook URLs are sensitive | Never expose to frontend; keep in env vars only |
| Rate limiting | Microsoft Teams has rate limits (~4 msgs/sec); add delay if bulk sending in future |
| Input validation | Validate articleId and channelName on backend |

---

## 13. Validation Rules

| Field | Rule |
|-------|------|
| `TEAMS_CHANNELS` env var | Valid JSON array, each item has `name` and `webhookUrl` |
| `channelName` (request) | Must match a configured channel name |
| `articleId` (request) | Must be valid UUID, article must exist |

---

## 14. Out of Scope (Future Enhancements)

The following are explicitly excluded from this feature:
- Images in Teams cards (requires public URL hosting)
- Bulk send (multiple articles at once)
- Scheduled/automated sends
- User-configured channels (self-service webhook setup)
- Send history/audit log
- Channel-specific card customization
- Digest format (multiple articles in one card)

---

## 15. Summary

This feature enables users to share individual articles to Microsoft Teams channels:

1. Admin configures webhook URLs in environment variables
2. User clicks "Send to Teams" button on article
3. User selects target channel from modal
4. User confirms and article is sent as Adaptive Card
5. Team members see rich card in Teams with "Read Article" button

Simple, secure, and extensible for future enhancements.
