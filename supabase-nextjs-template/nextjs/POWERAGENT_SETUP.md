# PowerAgent Quick Setup Guide

## Important: VoltAgent is already integrated!

PowerAgent uses VoltAgent framework which is already set up in this project. You don't need to create a separate VoltAgent app - it's integrated directly into PowerBrief.

## 1. Environment Variables

Add these to your `.env.local` file in the `supabase-nextjs-template/nextjs/` directory:

```env
# OpenAI API Key (required for GPT-4 agents)
OPENAI_API_KEY=your_openai_api_key_here

# Anthropic API Key (required for Claude agents)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Google AI API Key (required for Gemini agents)
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key_here
```

## 2. Getting API Keys

### OpenAI
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Add it to your `.env.local` as `OPENAI_API_KEY`

### Anthropic
1. Go to https://console.anthropic.com/
2. Create a new API key
3. Add it to your `.env.local` as `ANTHROPIC_API_KEY`

### Google AI
1. Go to https://aistudio.google.com/app/apikey
2. Create a new API key
3. Add it to your `.env.local` as `GOOGLE_GENERATIVE_AI_API_KEY`

## 3. Test the Setup

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Navigate to PowerAgent in the sidebar

3. The status should show "VoltAgent framework is connected and ready"

## 4. Troubleshooting

### "Unable to connect to VoltAgent framework"
- Check that you have API keys configured
- Restart the development server
- Check the browser console for errors

### Individual agents not working
- Verify the specific API key for that agent's model
- Check the VoltAgent logs in the terminal

### Chat not responding
- Ensure you have the OPENAI_API_KEY set (used by most agents)
- Check network connectivity
- Look for error messages in the browser developer tools

## 5. Available Agents

Once configured, you'll have access to:

1. **Brief Generator Agent** (GPT-4) - Creates marketing briefs
2. **UGC Coordinator Agent** (Claude 3.5) - Manages creator workflows  
3. **Creative Analyst Agent** (Gemini 2.0) - Analyzes marketing assets
4. **Performance Optimizer Agent** (GPT-4) - Campaign optimization
5. **PowerBrief Assistant Agent** (GPT-4 Mini) - General platform help

## 6. Using the Agents

- Click on any agent card to configure or activate it
- Use the floating chat widget on any PowerBrief page
- Access the VoltOps console at https://console.voltagent.dev for monitoring 