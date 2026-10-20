<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1VTYaQ_o5YoiCiTjnyP_HYTQw1Xn2_3bL

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy [.env.example](.env.example) to `.env.local` and fill in the `VITE_FIREBASE_*` values
   (leave them empty to run in local-only mode backed by localStorage)
3. Run the app:
   `npm run dev`

## Deploy (Cloud Run + Firestore)

- Data is stored in Firestore `households/{householdId}` and protected by [firestore.rules](firestore.rules) (Google sign-in, member UIDs only)
- [cloudbuild.yaml](cloudbuild.yaml) builds the nginx image with `VITE_FIREBASE_*` baked in and deploys it to Cloud Run
- Setup, Supabase data migration and rollback: [docs/firestore-migration.md](docs/firestore-migration.md)
