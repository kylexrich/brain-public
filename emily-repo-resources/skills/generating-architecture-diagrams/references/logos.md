# Logo Resolution Protocol

Logo resolution is the highest-failure step. Follow this protocol to get it right the first time.

## Core principle

**A URL is valid only when it returns HTTP 200 AND the response `content-type` is an image.** An HTTP 200 with `text/html` is a disguised 404 — some CDNs serve a stub page. Never trust a 200 alone.

Verify every URL before embedding. Never ship an un-checked logo.

## CDN catalog (use in this preference order)

### 1. Iconify (primary — unified aggregator)

- URL pattern: `https://api.iconify.design/<prefix>/<name>.svg`
- Collections to try, in order: `logos`, `simple-icons`, `devicon`, `skill-icons`, `vscode-icons`, `mdi`.
- Why first: Iconify's `logos:` collection mirrors gilbarbara/logos (including AWS services and brands that simple-icons has removed for trademark reasons). `simple-icons:` mirrors simple-icons (broad coverage of dev tools/consumer brands). One HTTP origin, one verification code path.
- Recolor (monochrome sets only, e.g., `simple-icons:`, `mdi:`): append `?color=%23<hex>` (no `#`).
- Index / search: https://icon-sets.iconify.design/

### 2. simple-icons direct (secondary)

- URL pattern: `https://cdn.simpleicons.org/<slug>` or `https://cdn.simpleicons.org/<slug>/<hex-no-hash>`
- Best for: consumer/dev brands (GitHub, Docker, React, Stripe, TypeScript, PostgreSQL, Redis).
- Slug rules: lowercase, strip spaces/punctuation. Dots become `dot` (e.g., `Node.js` → `nodedotjs`, `Next.js` → `nextdotjs`, `Cal.com` → `caldotcom`). Ampersand becomes `and`.
- Authoritative slug list: https://raw.githubusercontent.com/simple-icons/simple-icons/develop/_data/simple-icons.json
- **Known gaps (trademark removals — will always 404):** Slack, Discord, OpenAI/ChatGPT, LinkedIn, Microsoft, Oracle, McDonald's, HBO, NBC, Pepsi, BMW, Porsche, Pokémon, and **all individual AWS services** (only the umbrella `amazonwebservices` remains, and even that has been unstable). Source: repo's DISCLAIMER.md and closed PRs.

### 3. gilbarbara/logos direct (tertiary)

- URL pattern: `https://cdn.jsdelivr.net/gh/gilbarbara/logos/logos/<slug>.svg`
- Best for: AWS services, dev tools, popular SaaS. Also has `-icon` compact variants.
- Slug rules: lowercase, hyphen-separated words. AWS services prefix with `aws-`.
- Common `-icon` variants (square glyph, good for nodes): `aws-lambda-icon`, `react-icon`, `slack-icon`, `anthropic-icon`.
- Index: https://github.com/gilbarbara/logos/tree/main/logos

### 4. devicon (quaternary)

- URL pattern: `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/<name>/<name>-original.svg`
- Best for: languages and core frameworks (Python, Go, Rust, Java, C, C++, Swift, Kotlin, Django, Rails, Spring, TensorFlow).
- Variants include `-plain`, `-original`, `-plain-wordmark`. Pick `-original` for colored, `-plain` for monochrome.

### 5. Last resort — text badge

If nothing resolves, render a text badge. Do not ship a broken `<img>`.

## Do not use

- **Clearbit Logo API** — shut down December 2023.
- **vectorlogo.zone** — unreliable CDN, inconsistent slugs, prone to 404.
- **worldvectorlogo / logos-download** — block hotlinking, no stable CDN pattern.
- **icons8 hotlinking** — requires attribution/API key.
- **Guessed logos that 404** — never. Always verify.

## Fallback ladder (deterministic)

For each name `N`, try URLs in this exact order until one verifies:

```
1. https://api.iconify.design/logos/<gb-slug>-icon.svg
2. https://api.iconify.design/logos/<gb-slug>.svg
3. https://api.iconify.design/simple-icons/<si-slug>.svg
4. https://cdn.simpleicons.org/<si-slug>                           # direct, recolorable
5. https://cdn.jsdelivr.net/gh/gilbarbara/logos/logos/<gb-slug>-icon.svg
6. https://cdn.jsdelivr.net/gh/gilbarbara/logos/logos/<gb-slug>.svg
7. https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/<dev-slug>/<dev-slug>-original.svg
8. Text badge (see template below)
```

For **AWS services specifically**, start at step 1 with `gb-slug = aws-<service>` (no `-icon` variant needed; AWS service icons are already square), then fall back.

## Slug derivation rules

Apply these transformations to the display name in this order:

1. Lowercase everything.
2. Unicode normalize (NFKD) and strip diacritics.
3. Replace `&` with `and`.
4. Remove apostrophes entirely (`O'Reilly` → `oreilly`).
5. For **simple-icons / `simple-icons:` Iconify prefix**: remove hyphens and dots entirely, unless the dot separates a meaningful token, in which case replace it with `dot` (see authoritative JSON). Examples: `Node.js` → `nodedotjs`, `Next.js` → `nextdotjs`, `Cal.com` → `caldotcom`, `TypeScript` → `typescript`, `Visual Studio Code` → `visualstudiocode`.
6. For **gilbarbara / `logos:` Iconify prefix**: lowercase, keep hyphens between words, collapse runs. Examples: `AWS Lambda` → `aws-lambda`, `AWS CloudFront` → `aws-cloudfront` (not `aws-cloud-front`), `Cal.com` → `cal-com` or `caldotcom` (verify both).
7. For **devicon**: lowercase, one word, often without hyphens. Examples: `Node.js` → `nodejs`, `C++` → `cplusplus`, `Go` → `go`, `Python` → `python`.

When in doubt, consult the source index before generating a URL.

## AWS service reference slugs (gilbarbara)

Verified AWS service slugs:

```
aws-cloudfront           aws-route53               aws-ecs
aws-certificate-manager  aws-elb                   aws-fargate
aws-s3                   aws-sqs                   aws-sns
aws-kms                  aws-secrets-manager       aws-cloudwatch
aws-eventbridge          aws-rds                   aws-dynamodb
aws-lambda               aws-api-gateway           aws-step-functions
aws-cognito              aws-ec2                   aws-iam
```

**Trust-but-verify list (known to 404 on gilbarbara as of this writing):**

```
aws-alb          # use aws-elb instead (ALB is classified under ELB here)
aws-acm          # use aws-certificate-manager
aws-pinpoint     # no dedicated icon; omit the node or use generic aws.svg
aws-route-53     # wrong: it's aws-route53 (no extra hyphen)
```

If a specific AWS service you need isn't listed, run the verification script on both the `aws-<service>` and `aws-<service-name>` variants before committing.

## Verification (run this before writing HTML)

Use `scripts/verify-logos.sh` to batch-verify a newline-separated list of URLs. It returns zero exit code only if every URL is HTTP 200 **and** content-type starts with `image/`.

Minimum per-URL check (inline form, when needed):

```bash
curl -sI -m 5 -o /dev/null -w '%{http_code} %{content_type}\n' "$URL"
```

Accept the URL only if the output starts with `200` and the content-type contains `image/`.

## HTML usage patterns

**In Mermaid node labels** (runtime-topology.html):

```
nodeId["<img src='https://api.iconify.design/logos/aws-lambda.svg' height='22'/>Label line one<br/>Label line two"]:::class
```

Mandatory on every `<img>`:
- `height` attribute in pixels (not CSS). Mermaid measures nodes before CSS applies.
- Consistent height across the diagram (22 px is the skill default).
- Single-quoted URL inside double-quoted Mermaid label.

**In tech-stack tiles** (tech-stack.html):

```html
<div class="tile">
  <img alt="<Name>" src="<URL>" />
  <div class="name"><Name></div>
  <div class="sub"><optional one-liner></div>
</div>
```

Tile image size is controlled by CSS (`.tile img { height: 26px; ... }`). Inline sizing is not required here because there's no Mermaid mismeasurement risk.

## Text badge fallback (when every CDN fails)

Mermaid node:

```
nodeId["<span style='font-weight:700;font-size:13px;color:#e5e7eb'><Initial></span>Name<br/><sub>no public logo</sub>"]:::class
```

Tech-stack tile:

```html
<div class="tile">
  <div class="badge"><Initial></div>
  <div class="name"><Name></div>
  <div class="sub">no public logo</div>
</div>
```

Keep the same visual weight as logo tiles; do not let text-badge items look broken.
