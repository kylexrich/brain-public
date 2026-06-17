---
name: kyle-imsg
description: Read Kyle's iMessage chats and send messages FROM Kyle to others using the imsg CLI. Use when Kyle asks to read his messages, check a conversation, or send an iMessage/SMS as himself. 
user-invocable: true
allowed-tools:
  - Bash
---

# kyle-imsg

Use `imsg` to read and send iMessage/SMS via macOS Messages.app as Kyle.

## When to Use

✅ **USE this skill when:**

- Kyle asks to send an iMessage or SMS to someone
- Reading Kyle's iMessage conversation history
- Checking Kyle's recent Messages.app chats
- Sending to phone numbers or Apple IDs on Kyle's behalf

## When NOT to Use

❌ **DON'T use this skill when:**

- Sending a notification FROM the bot (Marvin) TO Kyle → use `/marvin-imsg`
- Telegram, Signal, WhatsApp, Discord, or Slack messages → use the appropriate channel
- Replying in the current BlueBubbles session → reply normally (routed automatically)
- Bulk/mass messaging → always confirm with user first

## Common Commands

### List Chats

```bash
imsg chats --limit 10 --json
```

### View History

```bash
# By chat ID
imsg history --chat-id 1 --limit 20 --json

# With attachments info
imsg history --chat-id 1 --limit 20 --attachments --json
```

### Send Messages

```bash
# Text only
imsg send --to "+14155551212" --text "Hello!"

# With attachment
imsg send --to "+14155551212" --text "Check this out" --file /path/to/image.jpg

# Force iMessage or SMS
imsg send --to "+14155551212" --text "Hi" --service imessage
imsg send --to "+14155551212" --text "Hi" --service sms
```

## Safety Rules

1. **Always confirm recipient and message content** before sending
2. **Never send to unknown numbers** without explicit user approval
3. **Confirm file path exists** before attaching
4. **Do not spam** — rate limit yourself

## Example Workflow

Kyle: "Text Alex that I'll be 10 minutes late"

```bash
# 1. Find Alex's chat
imsg chats --limit 20 --json | jq '.[] | select(.displayName | test("Alex"; "i"))'

# 2. Confirm with Kyle
# "Found Alex at +1604XXXXXXX. Send 'I'll be 10 minutes late' via iMessage?"

# 3. Send after confirmation
imsg send --to "+1604XXXXXXX" --text "I'll be 10 minutes late"
```
