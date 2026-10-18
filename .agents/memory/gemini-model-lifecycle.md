---
name: Gemini model lifecycle
description: Diagnose Gemini model availability separately from API-key configuration.
---

A configured Gemini API key can be valid even when a previously used model identifier returns 404 because that model is no longer available to new users. A replacement model can also return a temporary 503 during high demand.

**Why:** During this project's recovery, the existing model returned a retirement message, while the replacement first reported high demand and then returned a successful generated response. These were separate from key configuration.

**How to apply:** Check the provider's current model lifecycle documentation before rotating credentials. Treat capacity errors as transient, retry once, and keep the existing stateless request pattern when it remains supported and avoids introducing server-side interaction storage.
