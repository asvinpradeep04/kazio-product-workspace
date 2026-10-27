# Kazio Product Workspace

Kazio Product Workspace is an Electron desktop prototype for proof-based product-management assessments. Candidates complete a timed product challenge in a controlled workspace, save drafts locally, submit their work, and receive a structured handoff experience.

The project demonstrates the assessment side of Kazio's proof-based hiring model: work should create evidence that can later support a candidate's progression toward relevant opportunities.

## What is included

- Candidate sign-in and onboarding flows for role, experience, and career-target selection
- Challenge marketplace, company challenge cards, saved challenges, and team-choice flows
- A timed product-management workspace with project brief, research panel, and submission controls
- Local draft saving and local JSON submission records
- Violation logging and fullscreen Electron assessment mode
- Windows-focused controls for focus retention, taskbar suppression, clipboard clearing, multi-monitor notifications, and restricted in-app web navigation

## Technology

- Electron
- HTML, CSS, and vanilla JavaScript
- Node.js filesystem APIs for local drafts, submissions, and violation logs

## Run locally

Prerequisites: Node.js 18 or newer.

```bash
npm install
npm start
```

On Windows, `run.bat` can also launch the Electron application after dependencies are installed.

## Important prototype boundary

This is not a production hiring platform and does not include a live backend. The Supabase helper is currently disabled, authentication flows fall back to local session data, and submission data is written only to the local `submissions/` folder. It does not provide production authentication, server-side authorization, remote proctoring, AI evaluation, persistent cloud data, payment processing, or real company integrations.

The lockdown behavior is a prototype UI and desktop-control layer. It must be independently security-reviewed before use in a real assessment setting.

## Project structure

```text
main.js             Electron main process and local assessment controls
preload.js          Safe renderer-to-main IPC bridge
src/index.html      Application views and structure
src/renderer.js     Candidate flows and assessment interactions
src/styles.css      Application styling
src/assets/         Local visual assets
submissions/        Local runtime data, excluded from Git
```

## Product context

Kazio aims to make demonstrated work a meaningful signal in talent discovery. This prototype focuses on the candidate assessment environment where a product manager can work through a realistic challenge, generate an artifact, and produce a locally recorded submission.

## License

MIT
