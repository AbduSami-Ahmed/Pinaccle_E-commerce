# Phase 16A — Vehicle Data Provider Integration Architecture & Compliance

**Status**: Phase 16A Complete (Mock Active, CarJam Adapter Ready, Live Calls Blocked Pending Commercial Credentials)  
**Provider**: CarJam Vehicle Data NZ (NZTA Motochek Gateway)  
**Provider Key**: `CARJAM`  
**Mock Harness**: `MOCK_VEHICLE_DATA` (`[TEST HARNESS - DO NOT USE IN PRODUCTION]`)  
**Last Updated**: November 2026

---

## 1. Pre-Coding Verification & Blocker Report

Before writing any integration code or making outbound calls, a strict audit of client permissions, credentials, and documentation was conducted per trade and regulatory standards:

| Verification Item | Requirement | Audit Finding | Status |
|---|---|---|---|
| **Commercial Account** | Active enterprise / B2B account with CarJam NZ | No active commercial contract or account configured in system environment. | **BLOCKER** |
| **API Credentials** | Valid `CARJAM_API_KEY` in environment or encrypted DB storage | Key is empty / undefined. | **BLOCKER** |
| **Official Documentation** | Validated official CarJam REST API documentation | CarJam REST API documentation reviewed (`/api/car/?f=json&key={KEY}&plate={PLATE}`). Endpoints and payload schemas validated. | **PASSED** |
| **Data Scope & Privacy** | Technical vehicle data only; zero PII or MR13B-restricted registered person data | System requests technical specs only (`make`, `model`, `submodel`, `year`, `engine`, `chassis`, `fuel`, `transmission`). Zero PII requested or stored. | **PASSED** |
| **No-Scraping Policy** | Strict adherence to anti-scraping and terms of service | Absolutely no web scraping, HTML parsing, or undocumented reverse-engineered endpoints are used. | **PASSED** |

### Official Blocker Statement
> **BLOCKER IDENTIFIED (`BLOCKED_MISSING_CREDENTIALS`)**:  
> In accordance with instructions and NZTA Motochek data regulations, **NO LIVE OUTBOUND NETWORK REQUESTS ARE EXECUTED** until valid CarJam commercial credentials (`CARJAM_API_KEY`) are provisioned and stored in the secure credentials vault.  
> The system automatically falls back to the unmistakably labeled `MOCK_VEHICLE_DATA` test harness for local development, CI testing, and end-to-end demonstrations.

---

## 2. Statutory Fitment Disclaimer & Policy

### The "Lookup != Guaranteed Fitment" Rule
Vehicle registration data is sourced from transport authority records (NZTA / Motochek / CarJam). While it provides reliable vehicle year, model, chassis, and engine data, **registration records do not account for**:
- Mid-year manufacturing facelifts and part revisions
- Market-specific trim variations (e.g., Japanese import vs. NZ-new)
- Optional factory packages (e.g., sport suspension, heavy-duty towing package)
- Post-registration modifications by previous owners (e.g., aftermarket brake kits, engine swaps, lifted suspension)

### Enforced Disclaimer Text
The following statutory disclaimer is codified in `@pinnacle/contracts` (`VEHICLE_FITMENT_DISCLAIMER`), returned in every API response (`VehicleLookupResultDto.fitmentDisclaimer`), and displayed visibly on the storefront vehicle finder widget:

```text
Vehicle lookup data is retrieved from official transport authority registration records and identifies vehicle specifications only. Vehicle lookup does not guarantee exact part fitment due to potential model year splits, trim options, or prior vehicle modifications. Always check OEM part numbers, donor VIN, and component specifications before ordering.
```

### Attribution
Data attribution is rendered on all vehicle lookup results:
```text
Data Source: CarJam NZ Transport Agency Motochek Register
```

---

## 3. Provider Architecture

### Normalized Vehicle Model
Both the CarJam adapter and the Mock adapter map external provider payloads into the unified internal `NormalizedVehicleData` schema:

| External CarJam Field | Internal Normalized Vehicle Field | Type | Description |
|---|---|---|---|
| `plate` | `plate` | `string` | Normalized uppercase alphanumeric plate |
| `vin` | `vin` | `string` | 17-character vehicle identification number |
| `make` | `make` | `string` | Standardized manufacturer name (e.g., "Toyota") |
| `model` | `model` | `string` | Standardized model name (e.g., "RAV4") |
| `submodel` | `submodel` | `string` | Trim / variant name (e.g., "GX Hybrid AWD") |
| `year_of_manufacture` | `year` | `number` | Calendar year of manufacture |
| `body_style` | `bodyStyle` | `string` | Body type (e.g., "SUV", "Utility") |
| `chassis` | `chassis` | `string` | Chassis / generation code (e.g., "AXAH54") |
| `cc_rating` | `engineCc` | `number` | Engine displacement in cubic centimeters |
| `engine_code` | `engineCode` | `string` | Manufacturer engine code (e.g., "A25A-FXS") |
| `fuel_type` | `fuelType` | `string` | Primary fuel type (e.g., "Hybrid Petrol") |
| `transmission` | `transmission` | `string` | Transmission type (e.g., "eCVT") |
| `drive_type` | `driveType` | `string` | Drivetrain layout (e.g., "AWD", "4WD") |
| `power_kw` | `powerKw` | `number` | Engine output power in kilowatts |

### Adapter Boundary & Resilience Safeguards
1. **Rate Limiting**: Sliding window rate limiter enforcing a maximum of **60 requests per minute** to protect upstream quotas and prevent throttling.
2. **Request Timeout**: Strict **5,000ms timeout** enforced via Node.js native `AbortController`.
3. **Retry Policy**: Exponential backoff retry mechanism (1s, 2s) applied exclusively to transient **5xx server errors** and network connection resets. Fast failure with no retries on **400, 401, 403, and 404** responses.
4. **Audit Trail**: Every lookup creates an `IntegrationSyncJob` audit record capturing duration, provider, query type, and success status with correlation IDs. Secrets and PII are never logged.

---

## 4. Caching & Privacy Policy

1. **24-Hour Spec Cache**: Technical vehicle specifications are cached in memory for up to 24 hours (`CACHE_TTL_MS = 86_400_000`) keyed by plate or VIN. Subsequent lookups return instantly with `cached: true`.
2. **Zero PII**: No registered owner names, physical addresses, phone numbers, driver licence numbers, or financial encumbrances are retrieved, parsed, cached, or stored.
3. **Invalidation**: Cache entries expire automatically after 24 hours, ensuring fresh registration data is queried periodically in compliance with transport authority terms.

---

## 5. Mock Vehicle Test Harness (`MOCK_VEHICLE_DATA`)

To enable offline testing, CI/CD validation, and local development without incurring live API costs or depending on external network connectivity, an unmistakable test harness is provided:

### Pre-Configured Test Plates:
- **`HYP360`**: 2022 Toyota RAV4 GX Hybrid AWD (2.5L A25A-FXS Petrol Hybrid, AXAH54 chassis, SUV)
- **`NZT442`**: 2021 Ford Ranger XLT 4WD Double Cab (2.0L Bi-Turbo Diesel, PX3 chassis, Ute)
- **`WRX004`**: 2019 Subaru WRX STI Premium AWD (2.5L Turbo EJ257, VAB chassis, Sedan)

### Error Simulation Test Plates:
- **`RATELIMIT`**: Triggers simulated `429 Too Many Requests`
- **`TIMEOUT`**: Triggers simulated `408 Request Timeout`
- **`ERROR500`**: Triggers simulated `500 Upstream Internal Server Error`
- **Any unknown plate**: Triggers clean `404 Vehicle Not Found`

---

## 6. How to Connect Live CarJam Credentials

When commercial credentials become available:

1. Obtain CarJam B2B API Key from CarJam NZ.
2. Set the environment variable:
   ```bash
   CARJAM_API_KEY="your-commercial-carjam-api-key"
   CARJAM_USE_SANDBOX="false" # or "true" for CarJam staging environment
   ```
   Or register the credential in the admin credentials vault via `IntegrationAccount` entity with encrypted key storage.
3. The `CarJamAdapter.verifyAccess()` check will verify the key format and clear the blocker.
4. The storefront vehicle lookup widget and `/api/v1/fitment/lookup/plate` endpoint will seamlessly query the live CarJam gateway.

