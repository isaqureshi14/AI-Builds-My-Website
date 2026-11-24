# AI Builds My Website

> **A business owner shares what they have. The app turns it into a ready-to-publish website.**  
> Built with **Laravel 11**, **Inertia.js (React + TypeScript)**, **Tailwind CSS**, and **Google Gemini AI**. Styled in a **High-Contrast Stark Minimalist Swiss Typography** aesthetic inspired by modern SaaS builders.

---

## 🌟 Overview

Small business owners often possess fragmented information about their business: a Google Maps listing, an Instagram link, a PDF menu or price sheet, a logo, or just a business name and city.

**AI Builds My Website** ingests this raw, disparate data, extracts verified business facts, prompts the business owner whenever sources disagree or facts are ambiguous, and generates a clean, responsive, section-by-section website that can be edited live, regenerated on demand, published to a public URL, or exported as a standalone static ZIP.

---

## 🧭 The Golden Rule

> **Never invent facts. If unsure, ask the user.**

The application strictly enforces data provenance:
- Every extracted fact records its source type (uploaded file, Google Business, social link, user input), source name, and confidence level.
- When sources disagree (e.g., disparate phone numbers between Google Business and an uploaded PDF), or when multiple businesses match the same name, generation is **halted**.
- The business owner is presented with an **Interactive Disambiguation Panel** to confirm the true information with one click before their website is created.

---

## 🛡️ Edge Cases & Security Hardening

The application is built defensively from the ground up:

| Challenge | How AI Builds My Website Handles It |
|---|---|
| **Multiple businesses with same name** | Detects ambiguous entity matches and prompts user in the Clarification step to select their exact location/identity. |
| **Conflicting data across sources** | Side-by-side conflict resolution UI displaying variants with source citations. |
| **Social platforms that block scraping** | Gracefully detects Instagram/Facebook/TikTok login walls (returns `login_wall` status) and invites the user to paste their bio/tagline without crashing. |
| **Prompt injection in uploaded files** | Untrusted document text is scanned for injection heuristics (`Ignore previous instructions`, `reveal api key`, etc.), dangerous tags are stripped, flags are logged, and payloads are safely isolated inside XML delimiters (`<<<UNTRUSTED_CONTENT>>>`). |
| **Server-Side Request Forgery (SSRF)** | `SsrfProtectionService` validates all input URLs and redirect targets, blocking loopback (`127.0.0.1`, `::1`), private networks (RFC 1918), cloud metadata endpoints (`169.254.169.254`), and non-HTTP protocols. |
| **XSS and script injection** | Strict DOMPurify client-side sanitization, Blade HTML escaping, and sanitized static export rendering. |
| **AI downtime / rate limits** | Dual-layer AI engine with an offline **Deterministic Template Engine** fallback that builds a complete 8-section website from verified facts even if Gemini is down or offline. |
| **Secret & credential leakage** | `.env` is strictly gitignored, `.env.example` contains zero real secrets, and git history contains no API keys or database passwords. |

---

## 🎨 Design System: Stark Minimalist Swiss Aesthetic

Inspired by clean, high-precision SaaS builders:
- **Monochromatic B&W Palette:** Pure black (`#000000`), crisp white (`#ffffff`), and subtle neutral grays (`neutral-100` to `neutral-900`) — zero neon clutter.
- **Architectural Grid Background:** Subtle 1px grid pattern lines creating depth and structure.
- **Razor-Sharp Geometry:** Rectangular borders and crisp lines (`rounded-none` or subtle `rounded-sm`) avoiding sloppy curved "vibe-coded" aesthetics.
- **Theme Toggle:** Global Light/Dark mode toggle with `localStorage` persistence and smooth transitions.

---

## 🚀 Key Features

1. **Multi-Input Intake Wizard**:
   - Business name & city.
   - Social media profiles (Instagram, Facebook, LinkedIn, TikTok, Twitter).
   - Google Business listing link or query.
   - Drag-and-drop file upload for PDFs, price sheets (CSV/TXT), and photos with progress tracking.
   - 1-Click Demo presets: *Artisan Bakery*, *Apex Law Firm*, *Zenith Fitness*, and *Conflict Disambiguation Demo*.

2. **Interactive Disambiguation & Clarification Panel**:
   - Surfaces detected conflicts (e.g. phone numbers, addresses).
   - Displays security alerts if uploaded files contained neutralized prompt injections.
   - Allows inline manual overrides and 1-click confirmation.

3. **Live Split-Pane Website Editor**:
   - Desktop and Mobile viewport toggles.
   - Section hierarchy management: Reorder (Move Up/Down), Toggle Visibility, Delete, and Add Sections.
   - Section content modal for inline text, CTA, and card updates.
   - **Regenerate Section Button**: Single-section AI regeneration (`POST /api/sections/{id}/regenerate`) without mutating neighboring sections.
   - Revision snapshots stored in database for safe rollbacks.

4. **Publishing & Static Export**:
   - 1-Click toggle between **Draft** and **Published**.
   - Public view at `/sites/{slug}` with responsive layouts and section navigation.
   - **Download Static ZIP** (`/api/websites/{id}/export`): Generates a standalone static HTML website package with `index.html`, JSON data, and assets for offline hosting.

---

## 🏗️ Technology Stack

- **Backend:** Laravel 11 (PHP 8.3+)
- **Frontend:** Inertia.js + React 18 (TypeScript) + Tailwind CSS + Lucide Icons
- **Database:** MySQL / SQLite
- **AI Engine:** Google Gemini 1.5 Flash (via REST API) + Offline Deterministic Template Fallback
- **PDF Extraction:** Smalot PDF Parser
- **Testing:** PHPUnit (48 tests, 205 assertions, 100% pass rate)

---

## ⚙️ Getting Started

### Prerequisites

- **PHP 8.2+** with extensions: `curl`, `mbstring`, `openssl`, `pdo_mysql`, `sqlite3`, `gd`, `zip`
- **Composer** (v2.x)
- **Node.js** (v18+) & **npm**

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/isaqureshi14/AI-Builds-My-Website.git
cd AI-Builds-My-Website

# 2. Install PHP dependencies
composer install

# 3. Install frontend dependencies
npm install

# 4. Configure environment
cp .env.example .env
php artisan key:generate

# 5. Run database migrations
php artisan migrate

# 6. (Optional) Configure Gemini API Key in .env
# GEMINI_API_KEY=your_gemini_api_key_here
# If omitted, the application seamlessly uses the Deterministic Template Engine fallback or user UI key input.
```

### Running Locally

```bash
# Terminal 1: Start Laravel server
php artisan serve

# Terminal 2: Start Vite development server
npm run dev
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000) in your browser.

---

## 🧪 Running Tests

The test suite covers SSRF filtering, prompt injection detection, conflict resolution, deterministic website generation, section regeneration, and static ZIP export:

```bash
php artisan test
```

Expected output:
```text
PASS  Tests\Feature\WebsiteTest
✓ ssrf protection blocks loopback ip
✓ ssrf protection blocks metadata ip
✓ ssrf protection blocks private ip
✓ ssrf protection allows valid external url
✓ prompt injection heuristics detect ignore instructions
✓ prompt injection heuristics detect system prompt extraction
✓ prompt injection delimiters escape brackets
✓ conflict detector flags mismatched phone numbers
✓ conflict detector flags mismatched addresses
✓ deterministic template engine produces complete site
✓ deterministic template engine includes pricing from facts
✓ deterministic template engine includes services from facts
...
Tests:    48 passed (205 assertions)
Duration: ~3.7s
```

---

## 🔌 API Endpoints Summary

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/intake/url` | Scrape and extract facts from business URL or Google listing |
| `POST` | `/api/intake/upload` | Upload and sanitize PDF, CSV price lists, or images |
| `POST` | `/api/intake/facts` | Ingest raw manual facts |
| `GET` | `/api/websites/{id}/conflicts` | List detected fact conflicts and ambiguous entities |
| `POST` | `/api/websites/{id}/conflicts/resolve` | Resolve fact conflicts before website generation |
| `POST` | `/api/websites/generate` | Generate website sections via Gemini AI or Deterministic Fallback |
| `GET` | `/api/websites/{id}` | Fetch website details, active sections, and revision history |
| `PUT` | `/api/websites/{id}` | Update business metadata, theme settings, or title |
| `POST` | `/api/websites/{id}/publish` | Toggle Draft / Published status |
| `PUT` | `/api/sections/{id}` | Update section content or titles |
| `POST` | `/api/sections/{id}/regenerate` | Regenerate a single section with AI or template variation |
| `POST` | `/api/websites/{id}/sections/reorder` | Update visual section display order |
| `GET` | `/sites/{slug}` | Public view of the published website |
| `GET` | `/api/websites/{id}/export` | Download standalone static HTML website as a `.zip` archive |

---

## 📄 License

This project is open-source software licensed under the [MIT license](LICENSE).
