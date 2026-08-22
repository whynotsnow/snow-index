# Disclosure Policy

## Public

Tracked documentation may contain sanitized reusable project knowledge, workflows, architecture constraints, and fictional examples.

## Local and raw

Keep machine-specific paths, identities, raw command output, private infrastructure, and unreviewed observations in ignored local storage.

## Secrets

Never persist tokens, passwords, cookies, private keys, or credential-bearing URLs in project documentation.

For this repository, also keep private Cloudflare identifiers, service tokens, Access JWTs, raw logs, local absolute paths, personal identity data, and Turnstile secrets out of tracked files. `snow-index` may store only public frontend configuration such as a Turnstile sitekey when implementation requires it.

## Promotion

Before promoting local observations, confirm reuse value, remove private values, reduce raw logs to stable signatures, and place the result in the single document that owns it.
