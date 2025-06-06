import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }
    
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    const supabase = await createSSRClient();
    
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      brandId, 
      creatorName, 
      scenario, 
      customPrompt, 
      templateType = 'onboarding'
    } = await request.json();

    if (!brandId || !scenario) {
      return NextResponse.json({ 
        error: 'Brand ID and scenario are required' 
      }, { status: 400 });
    }

    // Get brand info
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('name, email_identifier')
      .eq('id', brandId)
      .single();

    if (brandError || !brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-05-20' });

    const prompt = `
You are an expert email marketing copywriter for UGC (User Generated Content) creator communications.

BRAND: ${brand.name}
CREATOR: ${creatorName || 'Creator'}
SCENARIO: ${scenario}
TEMPLATE TYPE: ${templateType}

${customPrompt ? `CUSTOM INSTRUCTIONS: ${customPrompt}` : ''}

Generate a professional email template with the following requirements:

1. **Subject Line**: Engaging and relevant to the scenario
2. **HTML Content**: Well-formatted HTML email with:
   - Professional styling
   - Clear call-to-action
   - Brand voice appropriate for UGC outreach
   - Variable placeholders like {{creator_name}}, {{brand_name}}, etc.
3. **Text Content**: Plain text version of the email
4. **Variables**: List of variable placeholders used
5. **Tone**: Professional but friendly, suitable for creator relationships

Common scenarios include:
- Welcome/Onboarding emails
- Script assignment notifications
- Follow-up messages
- Payment confirmations
- Shipping updates
- Call scheduling
- Rate negotiations

Format your response as JSON:
{
  "subject": "Email subject line",
  "htmlContent": "HTML email content",
  "textContent": "Plain text content", 
  "variables": ["variable1", "variable2"],
  "reasoning": "Brief explanation of the template approach"
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    try {
      // Try to parse as JSON
      const templateData = JSON.parse(text);
      
      return NextResponse.json({
        success: true,
        template: templateData
      });
    } catch {
      // If JSON parsing fails, return the raw text
      return NextResponse.json({
        success: true,
        template: {
          subject: `${scenario} - ${brand.name}`,
          htmlContent: text,
          textContent: text.replace(/<[^>]*>/g, ''),
          variables: ['creator_name', 'brand_name'],
          reasoning: 'Template generated successfully'
        }
      });
    }

  } catch (error) {
    console.error('Template generation error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate template' 
    }, { status: 500 });
  }
} 