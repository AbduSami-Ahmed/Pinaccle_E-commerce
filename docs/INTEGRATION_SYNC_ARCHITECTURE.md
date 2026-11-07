# External Integration & Synchronization Architecture

## 1. Executive Summary & Design Principles

Pinnacle Auto Spares & Commercial Tyres operates a centralized inventory and order management system for Australian and New Zealand automotive parts trade. To prevent data corruption, race conditions, and infinite synchronization loops across external sales channels (e.g., Trade Me, eBay Motors, Shopify) and vehicle data systems (CarJam, PartsTrader, CAP Ezi), all external interactions adhere to a **provider-neutral integration boundary**.

### Core Tenets:
1. **Adapter Boundary Isolation**: External provider-specific schemas (e.g. Trade Me listing format, eBay item specifics) are never exposed to core Domain Models, Product Entities, or Order workflows. All external data is transformed into internal command DTOs at the adapter edge.
2. **Deterministic Anti-Loop Mechanism**: Synchronizations use cryptographic payload hashes (`syncHash`) and external entity cross-referencing to eliminate echo loops (e.g., Pinnacle updates stock $\rightarrow$ marketplace echoes webhook $\rightarrow$ Pinnacle triggers another update).
3. **Encrypted Secret Isolation**: API keys, webhook signing secrets, and OAuth tokens are encrypted at rest using AES-256-GCM and never included in API responses or operational logs.
4. **Replay & Idempotency Protection**: Inbound webhooks enforce timestamp freshness ($\le 300\,\text{seconds}$) and duplicate event deduplication.
5. **No False Connections**: Foundation providers (Trade Me, eBay, Shopify, CarJam, PartsTrader, CAP Ezi) are defined but explicitly remain disconnected until verified live credentials and transport layers are approved.

---

## 2. Anti-Loop & Deduplication Architecture

```
[ External Marketplace / Channel ]
            │
      Inbound Webhook
            ▼
[ Signature & Replay Verification ] ──(Invalid / Expired >300s)──> [ HTTP 400 Reject ]
            │
    (Valid & Fresh)
            ▼
[ Idempotency Filter (Event ID) ]  ──(Duplicate Key)────────────> [ HTTP 200 Ignore ]
            │
       (New Event)
            ▼
[ Adapter Schema Transformation ]
    (Transforms raw vendor JSON to InternalIntegrationCommand)
            │
            ▼
[ Hash & Origin Verification ]
    - Compute SHA-256(payload) -> syncHash
    - Check ExternalIdMapping.syncHash
            │
       ┌────┴───────────────────────────┐
       ▼                                ▼
 (Hashes Match)                  (New Value / Changed)
 Echo Detected ──> Suppress Sync  Apply State Mutation
                                        │
                                        ▼
                                 Update ExternalIdMapping
                                 (syncHash, lastSyncedAt)
```

### Loop Prevention Mechanics

#### A. Inbound Loop Suppression
When an external platform sends an inventory or order update webhook:
1. The adapter transforms the payload into a canonical internal DTO and computes a SHA-256 checksum of the normalized content (`syncHash`).
2. The `ExternalIdMapping` table is queried for `(provider, entityType, externalId)`.
3. If an existing mapping exists with the exact same `syncHash`, the system recognizes that this event originated from our own prior outbound push or represents unchanged state. The event is safely marked `PROCESSED` without re-triggering outbound inventory broadcasts.

#### B. Outbound Loop Suppression
When an inventory change occurs locally in Pinnacle's warehouse (e.g. stock received at Prestons NSW counter):
1. The outbound sync job computes the payload's `syncHash`.
2. If `mapping.syncHash === currentHash`, the outbound dispatch is skipped.
3. Upon successful outbound dispatch, the `ExternalIdMapping` is updated with the new `syncHash`. Any subsequent webhook bounce-back will be suppressed.

---

## 3. Webhook Framework Security & Replay Prevention

All inbound webhooks pass through three defensive gates before execution:
1. **Cryptographic HMAC Signature**: Verification of header signatures (e.g., `x-mock-signature`) using the account's decrypted signing secret.
2. **Replay Attack Window**: Payloads with timestamps older than 300 seconds are rejected with `REPLAY_REJECTED`.
3. **Idempotency Guarantee**: Events are stored with an `idempotencyKey`. Repeated deliveries return `DUPLICATE_IGNORED` with HTTP 200, preventing duplicate database mutations.

---

## 4. Credential & Secrets Management

- **Storage**: Credentials (API tokens, private keys, client secrets) are encrypted before database insertion using AES-256-GCM with a 96-bit random IV and 128-bit authentication tag.
- **Frontend Masking**: Frontend responses return `hasConfiguredSecrets: boolean` and masked strings (`••••••••`). Plaintext credentials never cross the network boundary to the browser.
- **Log Sanitization**: The `IntegrationLogger` scrubs sensitive patterns (`/secret/i`, `/token/i`, `/password/i`, `/auth/i`, `/api_key/i`) from application logs.

---

## 5. Sync Jobs, Retries & Dead-Letter Queue

- **Transient Failures** (HTTP 429 Rate Limits, 503 Gateway Timeouts): Automatically retried with exponential backoff ($2^N \times 30\,\text{seconds}$).
- **Dead-Letter State**: Jobs that fail continuously up to `maxAttempts` (default 5) or encounter unrecoverable business rejections (HTTP 400 Bad Schema) transition to `DEAD_LETTER`.
- **Manual Staff Recovery**: Staff can inspect error logs and trigger `POST /api/v1/integrations/jobs/:id/retry` via the Admin Integrations dashboard.

