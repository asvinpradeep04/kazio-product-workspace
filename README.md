# Kazio Product Workspace

Kazio is a proof-based talent opportunity network. It is designed to help candidates earn access to relevant roles through demonstrated work and verified evidence, rather than relying mainly on resumes, credentials, referrals, or personal branding.

This repository is for the Kazio **product workspace prototype**. It is a single-page, browser-only experience built with HTML, CSS, and vanilla JavaScript. It represents the product experience and client-side interaction logic only. It does not include a production backend, authentication system, database, AI evaluation service, payment flow, or live verification infrastructure.

## Run locally

Open [index.html](index.html) in a modern desktop browser. No installation, build step, environment variables, or server are required.

## Technology

- HTML5
- CSS3
- Vanilla JavaScript
- In-memory sample data

The interactive parts of the prototype run entirely in the browser: opportunity search, skill filters, remote-only filtering, company selection, detail views, and left-side workspace navigation. Refreshing the page returns the prototype to its supplied sample state.

## Product idea

Candidates choose up to three target paths, such as a company and role combination. They complete realistic work, defend their decisions, and build a record of verified proof. Kazio then shows what evidence they have, what is missing, and which action could unlock a relevant opportunity.

The wider product model has four connected areas:

- **Proof:** challenges, submissions, defenses, integrity signals, verified skills, and proof history.
- **Progression:** target paths, role-track gates, eligibility, and next-best actions.
- **Opportunity:** proof-led candidate discovery, blind shortlists, and mutual candidate-company connection.
- **Continuity:** ongoing craft development and future opportunity access after hiring.

The central loop is:

`Target an opportunity → perform real work → defend the work → create verified proof → see what is missing → earn better access`

## What this frontend covers

The frontend is intended to demonstrate the candidate-facing product flow, including:

- Onboarding and role-interest selection
- Target-path selection and progress views
- Company role-track gates and locked/unlocked states
- Challenge and submission experience
- Proof archive, verified skills, and capability-signal presentation
- Eligibility messaging, near-miss feedback, and next-best-action prompts
- Candidate discovery and blind-shortlist concepts

Any scores, gate progress, challenge results, eligibility, and verification states shown by the prototype are sample or locally managed presentation data unless explicitly connected to a service in a future implementation.

## What is deliberately not included

This is not a complete hiring platform. The following require backend services and operational processes that are outside this repository:

- User accounts, authentication, authorization, and secure session management
- Persistent candidate, company, challenge, and proof data
- Actual challenge execution, submission storage, and plagiarism or integrity review
- AI text defense, adaptive live defense, and human-review routing
- Verified Skill Index (VSI) calculation and confidence scoring
- Real company integrations, applicant tracking systems, payments, scheduling, or notifications
- Blind-shortlist identity controls and mutual-unlock workflow
- Production monitoring, privacy controls, compliance, and audit logs

## Product principles

- Proof should matter more than pedigree or activity volume.
- Access to relevant opportunities is the core reward.
- Every locked opportunity should explain the path forward.
- AI should gather evidence and support review, not make irreversible judgments about employability.
- Human verification should be used selectively, where it adds meaningful confidence.
- Permanent achievements and current discoverability are different things.

## Development status

The repository currently contains a product-facing frontend prototype. Build the interface in small, testable flows before connecting real services. Until backend work exists, keep all sensitive-looking data fictional and treat every verification outcome as illustrative. The current companies, challenges, scores, deadlines, receipts, examiner names, and verification outcomes are demo content, not live hiring data.

## Future backend boundary

When the product moves beyond a prototype, the backend should own identity, data persistence, challenge artifacts, verification evidence, integrity events, capability calculations, role-track gates, opportunity routing, and auditability. The frontend should remain responsible for presenting those states clearly and explaining the candidate's next action.

## Source material

This README reflects the supplied Kazio product architecture and the competitor/GTM materials. Their market claims, pricing, test outcomes, and performance targets are planning assumptions or evidence-tagged hypotheses unless independently validated.

## License

No license has been selected yet. Add one before sharing the code publicly if you want to define how others may use it.
