---
name: sigma-embed
description: Generate a localhost-ready Sigma Computing embed portal with branded styling, layout options (header/sidebar), and custom buttons. Use when the user wants to create, scaffold, or set up a Sigma workbook embed site.
argument-hint: "[company name]"
tools: Read, Write, Edit, Bash, Glob, Grep
user-invocable: true
---

# /sigma-embed — Sigma Computing Embed Portal Generator

Generate a complete, runnable localhost embed portal for a Sigma Computing workbook, branded to a specific company.

## Gather Inputs

You MUST collect the following information from the user before generating. Ask conversationally — don't dump a form. If the user provided some info upfront, only ask for what's missing.

### Required Inputs

1. **Company Name** — parse from `$ARGUMENTS` if provided, otherwise ask
2. **Sigma Credentials** — ask if they have their `CLIENT_ID` and `EMBED_SECRET` from Sigma's Developer Access page. If not, explain:
   - Go to Administration > Developer Access > Create New
   - Select "Embedding" type
   - Copy the Client ID and Secret (secret is shown only once!)
3. **Embed URL** — the published workbook/page/element URL from Sigma. Explain how to get it:
   - Open the workbook in Sigma
   - Switch to the Published version
   - Navigate to the page or element to embed
   - Copy the URL from the browser address bar

### Optional Inputs (offer sensible defaults)

4. **Layout Style** — ask the user to pick one:
   - `header` — top navigation bar with company branding (default)
   - `sidebar` — left sidebar navigation with company branding
   - `minimal` — just the embed with a thin branded border, no nav
5. **Color Palette** — ask for:
   - Primary color (used for nav background, buttons) — default: `#1a1a2e`
   - Accent color (used for hover states, active items) — default: `#4a90d9`
   - Background color — default: `#f5f5f5`
   - Or ask if they have a brand hex code / website you can reference
6. **Navigation Buttons** — which buttons to include in the header/sidebar:
   - `refresh` — reload the embed (included by default)
   - `fullscreen` — toggle fullscreen mode (included by default)
   - `export` — trigger Sigma's export functionality
   - `print` — print the current view
   - `theme-toggle` — light/dark mode switch
   - `home` — link back to a URL of their choice
   - User can also specify custom buttons with label + URL
7. **Company Logo URL** — optional path or URL to a logo image
8. **Page Title** — defaults to "{Company Name} — Analytics Portal"
9. **Port** — defaults to `3000`
10. **Embed User Config** — defaults that can be overridden:
    - `email`: `embed-user@{company-domain}.com`
    - `account_type`: `View`
    - `teams`: `[]`

## Generate the Project

Once you have the inputs, generate a complete Node.js project in a new directory named `{company-name}-sigma-portal` (lowercase, hyphenated) inside the current working directory.

### File Structure

```
{company-name}-sigma-portal/
  package.json
  .env
  server.js
  public/
    index.html
    styles.css
    app.js
  README.md
```

### package.json

```json
{
  "name": "{company-name}-sigma-portal",
  "version": "1.0.0",
  "description": "Sigma Computing embed portal for {Company Name}",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "npx nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.0",
    "dotenv": "^16.3.1",
    "uuid": "^9.0.0"
  }
}
```

### .env

Generate with the user's values filled in where provided, placeholders where not:

```env
# Sigma Embed Credentials
CLIENT_ID={user's client_id or YOUR_CLIENT_ID}
EMBED_SECRET={user's secret or YOUR_EMBED_SECRET}

# Embed Configuration
EMBED_URL={user's workbook URL or https://app.sigmacomputing.com/YOUR_ORG/workbook/YOUR_WORKBOOK}
SESSION_LENGTH=3600
PORT={port}

# Embed User Defaults
EMBED_EMAIL={email}
EMBED_ACCOUNT_TYPE={account_type}
EMBED_TEAMS={teams as comma-separated}
```

### server.js

Build an Express server that:
1. Serves static files from `public/`
2. Has a `GET /api/embed-url` endpoint that:
   - Reads config from `.env`
   - Generates a JWT with claims: `sub` (email), `iss` (client_id), `jti` (uuid v4), `exp` (now + session_length), `account_type`, `teams`
   - Signs with HMAC SHA256 using the embed secret
   - Returns JSON: `{ "url": "{EMBED_URL}?:jwt={signed_jwt}" }`
3. Logs decoded JWT info on each request (for debugging)
4. Has basic error handling

### public/index.html

Build the HTML page with:
- The chosen layout (header, sidebar, or minimal)
- Company name in the title and nav
- Logo if provided
- Navigation buttons as configured
- An iframe that loads the signed embed URL from the API
- Responsive design
- Sigma's `embed-api.js` loaded via script tag: `<script src="https://cdn.sigmacomputing.com/embed-sdk/v0.4/embed-api.js"></script>`

### public/styles.css

Generate CSS that:
- Uses the company's color palette
- Styles the chosen layout
- Makes buttons match the brand
- Includes hover/active states with the accent color
- Is responsive (works on mobile)
- Includes smooth transitions
- If theme-toggle is enabled, includes a `.dark-mode` class with inverted colors

### public/app.js

Generate client-side JavaScript that:
- Fetches the signed URL from `/api/embed-url` on page load
- Sets the iframe `src` to the returned URL
- Implements button handlers (refresh, fullscreen, export, print, theme toggle, etc.)
- Uses Sigma's embed-api.js for any supported interactions
- Handles errors gracefully (shows a message if the embed fails to load)
- Auto-refreshes the JWT before it expires (based on SESSION_LENGTH)

### README.md

Generate a brief README with:
- Project name and description
- Setup steps (npm install, configure .env, npm start)
- How to get Sigma credentials (brief version)
- Available npm scripts
- Notes on customization

## After Generation

1. Run `npm install` in the generated directory
2. Tell the user the project is ready
3. Show them how to start it: `cd {directory} && npm start`
4. If they used placeholder credentials, remind them to update `.env` with real values
5. Mention they can run `npm run dev` for auto-reload during development

## Style Guidelines

- Keep generated code clean and well-commented
- Use modern ES6+ syntax
- No unnecessary dependencies
- CSS should be clean with CSS custom properties for easy theming
- HTML should be semantic
- Error messages should be user-friendly
