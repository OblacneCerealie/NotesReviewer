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

## Deploy

### GitHub Pages (frontend only)

The repo includes a workflow that builds and deploys the frontend to GitHub Pages on push to `main`.

1. In the repo: **Settings → Pages → Build and deployment**
   - Source: **GitHub Actions**.
2. Push to `main`; the workflow builds and deploys.
3. Your site will be at `https://<username>.github.io/<repo-name>/`.

**Important:** GitHub Pages serves only static files. The app needs the backend for parsing and explanations. For a fully working public site you have two options:

- **Option A — Backend elsewhere:** Deploy the Node server (e.g. [Railway](https://railway.app), [Render](https://render.com), or a VPS). Build the frontend with your API URL:

  ```bash
  VITE_API_URL=https://your-api.example.com npm run build
  ```

  Then deploy the `dist` folder (or point the GitHub Actions artifact to that build with `VITE_API_URL` set in the workflow).

- **Option B — All-in-one:** Deploy the whole project (e.g. [Vercel](https://vercel.com) with a custom server or serverless routes) so both frontend and API run in one place. You’d need to adapt the Express API to your host’s serverless/Node API format.

### Env for production backend

- `GEMINI_KEY` — Your Gemini API key (required for the server).

## Tech

- **Frontend:** Vite, React, TypeScript, React Router (HashRouter for GH Pages)
- **Backend:** Node, Express, `@google/genai`, Multer (file upload)
- **Storage:** Browser `localStorage` (progress, history, streak)

## License

MIT
