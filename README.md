<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/a67332bb-e67a-4bed-863a-0295fe1eec6e

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## MongoDB Setup

Set `MONGODB_URI` in your runtime env file (in this repo that is typically `backend/.env` when running `npm run dev` from the `backend` folder). See `backend/.env.example`.

Default for local development:
`mongodb://127.0.0.1:27017/zemen_express`
