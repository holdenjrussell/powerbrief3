This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# PowerBrief Ad Upload Tool

## Features

### Ad Upload Tool
- Import and manage ad assets
- Bulk editing and renaming
- Meta campaign integration
- Asset preview and management

### Generate Copy from Assets (NEW)
A powerful AI-driven feature that automatically generates Meta ad copy from your visual assets:

**How it works:**
1. Select ad drafts containing assets in the Ad Upload Tool
2. Click the "Generate Copy" button
3. Enter optional custom instructions in the prompt modal
4. AI analyzes each asset using Google Gemini 2.5 Pro with vision capabilities
5. Generates optimized headlines, body copy, and descriptions for Meta ads
6. Automatically applies the generated copy to your ad drafts

**Key Features:**
- **Custom Prompt Support**: Add your own instructions to guide the AI copy generation
- **Smart Asset Selection**: When multiple sizes exist (4x5, 9x16, etc.), automatically selects the preferred aspect ratio
- **Brand-Aware Copy**: Uses your PowerBrief brand information (brand info, target audience, competition data) to ensure copy aligns with your brand voice and target audience
- **Meta-Optimized**: Copy is specifically crafted for Facebook and Instagram ad formats
- **Progress Tracking**: Real-time progress updates as each asset is processed
- **Results Modal**: Detailed results showing successful and failed generations with copy preview
- **One-by-One Processing**: Processes assets individually to avoid timeouts

**Custom Prompt Examples:**
- "Focus on eco-friendly benefits, use emotional language, emphasize family values"
- "Highlight luxury and premium quality, target high-income demographics"
- "Use urgency and scarcity, focus on limited-time offers"
- "Emphasize health benefits and scientific backing"

**System Instructions:**
The feature uses hard-coded professional copywriting instructions specifically designed for Meta ads, with automatic brand information population from PowerBrief:
- **Brand Integration**: Automatically populates brand name, brand information, target audience data, and competition analysis
- **Visual-copy cohesion**: Copy must feel like a natural extension of the uploaded asset
- **Emoji usage guidelines**: Strategic use following Meta best practices
- **Character limits**: Headlines (27-40 chars) and descriptions (25-30 chars)
- **Hook attention early**: Critical information within first 125 characters
- **Strong calls-to-action**: Clear, action-oriented language relevant to the asset
- **Mobile-first optimization**: Designed for mobile viewing experience

**Requirements:**
- Google Gemini API key configured (GOOGLE_API_KEY or GEMINI_API_KEY in environment)
- Assets uploaded to ad drafts
- Brand information configured in PowerBrief (brand info, target audience, competition data)

**Processing Details:**
- Processes assets one-by-one to avoid Vercel timeout limits
- Smart asset selection prefers 4x5 or 9x16 versions when multiple sizes exist
- 1-second delay between API calls to respect rate limits
- Comprehensive error handling with detailed feedback

## Setup
