# Laya support agent

Reborn's member support chat can use the [Laya](https://github.com/aayushch/laya) engine instead of relying only on keyword-matched FAQ answers. Reborn keeps the customer transcript and escalation state in PostgreSQL; Laya supplies the conversational reply and maintains one Laya conversation per Reborn support ticket.

## Configuration

Run a dedicated Laya engine, configure its model in the Laya app, then set these variables on the Reborn server:

```env
LAYA_BASE_URL=http://127.0.0.1:8420
LAYA_SUPPORT_ENABLED=true
LAYA_SPACE_ID=
LAYA_TIMEOUT_MS=20000
```

`LAYA_SPACE_ID` is optional. When it is set, Reborn creates and sends support conversations in that Laya space. `LAYA_SUPPORT_ENABLED` defaults to true when `LAYA_BASE_URL` is present.

Laya is local-first and its default engine only accepts `localhost` or `127.0.0.1` Host headers. Run it on the same machine as Reborn, or place a private same-host proxy beside it. Use a dedicated Laya instance without outbound connections or internal company data because this endpoint processes public customer messages.

## Failure behavior

If Laya is disabled, times out, or returns an error, the support route falls back to the existing approved FAQ keyword matcher. Messages that do not match an FAQ remain available for an admin to answer. The member can still escalate to human support through the existing flow.

## Laya knowledge and behavior

Each request includes the active FAQ catalogue and the RWG support scope as `card_context`. The prompt tells the agent to reply in the customer's language, avoid unverified claims, and route refunds, account access, payment disputes, and unknown questions to a human. Update FAQ entries through the existing Reborn admin workflow; the next support request automatically sends the new catalogue to Laya.
