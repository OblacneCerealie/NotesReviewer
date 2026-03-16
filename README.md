# Notes Reviewer

A quiz app that turns your Q&A documents into one-question-at-a-time sessions. Upload a document (PDF, TXT, or MD), and Gemini AI extracts questions and options. Answer correctly to move on; get a wrong answer and you’ll see a short explanation and a tip to remember. Progress, history, and a learning streak are stored in your browser.

## Features

- **Document upload** — PDF, TXT, or MD, up to 50 MB
- **AI parsing** — Gemini extracts questions and options from your document
- **One question at a time** — Options shown as in the document
- **Wrong-answer feedback** — Brief explanation + memory tip from Gemini
- **Local progress** — Resume later; session and history in `localStorage`
- **Streak** — Consecutive days you open the app (shown on home)

## Local development

1. **Clone and install**

   ```bash
   git clone https://github.com/YOUR_USERNAME/NotesReviewer.git
   cd NotesReviewer
   npm install
   ```

2. **Environment**

   Copy `.env.example` to `.env` and set your [Gemini API key](https://aistudio.google.com/apikey):

   ```bash
   cp .env.example .env
   # Edit .env: GEMINI_KEY=your_key
   ```

3. **Run app and API**

   In one terminal:

   ```bash
   npm run server
   ```

   In another:

   ```bash
   npm run dev
   ```

   Or both together:

   ```bash
   npm run dev:all
   ```

   Open http://localhost:5173 (Vite proxies `/api` to the server).

## Publish to GitHub and enable Pages

1. **Create a new public repo** on GitHub (e.g. `NotesReviewer`). Do not add a README or .gitignore.

2. **Push this project:**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/NotesReviewer.git
   git branch -M main
   git push -u origin main
   ```

3. **Enable GitHub Pages:** Repo **Settings → Pages → Build and deployment** → Source: **GitHub Actions**.

4. After the next push (or a re-run of the workflow), the site will be at  
   `https://YOUR_USERNAME.github.io/NotesReviewer/`  
   (replace `NotesReviewer` with your repo name if different).

**Note:** The quiz needs the backend (Gemini API). On GitHub Pages only the frontend is deployed. For a working public site, host the backend somewhere (see Deploy below) and set `VITE_API_URL` when building, or run the server locally and use the app at `http://localhost:5173` with `npm run dev:all`.

## Deploy

### Vercel (recommended — full app + API with your key)

Deploy to Vercel so both the frontend and API run together. Your `GEMINI_KEY` from `.env` is set securely in Vercel.

1. **Deploy**

   ```bash
   npx vercel
   ```

   Follow the prompts (link to your GitHub repo or use the existing folder).

2. **Add your API key**

   In the [Vercel dashboard](https://vercel.com/dashboard) → your project → **Settings** → **Environment Variables**:
   - Name: `GEMINI_KEY`
   - Value: your Gemini API key (same as in `.env`)
   - Environment: Production (and Preview if you want)

3. **Redeploy** so the new env var is used (e.g. **Deployments** → **⋯** on latest → **Redeploy**).

The app will be available at `https://your-project.vercel.app` with full quiz, parsing, and explanations.

**Limits:** Vercel serverless has a 4.5 MB request limit. Files over 3 MB will show an error; use local dev (`npm run dev:all`) for files up to 50 MB.

---

### GitHub Pages (frontend only)

The repo includes a workflow that builds and deploys the frontend to GitHub Pages on push to `main`.

1. In the repo: **Settings → Pages → Build and deployment**
   - Source: **GitHub Actions**.
2. Push to `main`; the workflow builds and deploys.
3. Your site will be at `https://<username>.github.io/<repo-name>/`.

**Important:** GitHub Pages serves only static files. For a fully working public site, deploy to **Vercel** (above) instead, or host the backend elsewhere and set `VITE_API_URL` when building.

### Env for production backend

- `GEMINI_KEY` — Your Gemini API key (required for the server).

## Tech

- **Frontend:** Vite, React, TypeScript, React Router (HashRouter for GH Pages)
- **Backend:** Node, Express, `@google/genai`, Multer (file upload)
- **Storage:** Browser `localStorage` (progress, history, streak)

## License

MIT
