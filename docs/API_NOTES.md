# API Notes & Measured External Behaviors

This document maps the measured behavior, latency, failure modes, and idempotency guarantees of third-party execution APIs used by Veridex.

---

## 1. CockroachDB Cloud (Distributed Vector & Relational Storage)

### Connection & Transport
- **Protocol**: PostgreSQL Wire Protocol (`node-postgres` / `pg.Pool`).
- **Endpoint**: `free-tier14.aws-us-east-1.cockroachlabs.cloud:26257` with `sslmode=verify-full`.
- **Connection Pooling**: Pool size 20, connection timeout 5000ms, idle timeout 30000ms.

### Vector Search Behavior
- **Algorithm**: CockroachDB C-SPANN (`abstract_embedding VECTOR(1024)` with `VECTOR INDEX (abstract_embedding)`).
- **Distance Operator**: Euclidean distance (`<->`).
- **Idempotency Guarantee**: `INSERT INTO papers` is idempotent via unique `doi` constraint; `INSERT INTO study_extractions` is idempotent per `(paper_id, research_query)`.

### Failure Modes & Handling
| Failure Mode | HTTP / DB Code | Recovery Strategy |
| :--- | :--- | :--- |
| Connection Timeout | `ETIMEDOUT` / `ECONNREFUSED` | Retry with exponential backoff on read queries; return `UNKNOWN` status on writes to trigger reconciliation. |
| Transaction Serialization Conflict | `40001` (Serialization Failure) | Automatic retry with jitter (up to 3 attempts). |
| Vector Dimension Mismatch | `22000` (Data Exception) | Pre-validated in client before query execution (assert length === 1024). |

---

## 2. Amazon Bedrock — Titan Text Embeddings V2 (`amazon.titan-embed-text-v2:0`)

### Endpoint & Call Pattern
- **SDK**: `@aws-sdk/client-bedrock-runtime` (`InvokeModelCommand`).
- **Payload**: `dimensions: 1024, normalize: true, inputText: <string>`.
- **Max Input Length**: 8,000 characters. Text beyond 8k characters is sliced safely pre-request.

### Failure Modes & Handling
| Failure Mode | Error Type | Recovery Strategy |
| :--- | :--- | :--- |
| Throttling / Rate Limit | `ThrottlingException` (429) | Exponential backoff retry with jitter (max 3 attempts). |
| Missing AWS Credentials | `UnrecognizedClientException` / `CredentialsError` | Seamlessly fall back to deterministic local L2-normalized pseudo-embedding for testing/dev environments. |
| Service Unavailable | `ServiceUnavailableException` (503) | Treat status as `UNKNOWN`; retry with backoff. |
