import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    const { text, brandId } = await request.json();

    if (!text?.trim()) {
      return NextResponse.json(
        { error: 'Text content is required' },
        { status: 400 }
      );
    }

    // Get Gemini API key
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('Missing Gemini API key');
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-thinking-exp' });

    const prompt = `Please convert the following text into well-structured markdown format. Follow these guidelines:

1. Create appropriate headings (# ## ###) to organize content hierarchically
2. Use bullet points and numbered lists where appropriate
3. Apply **bold** and *italic* formatting for emphasis
4. Create tables if the content contains structured data
5. Add proper spacing between sections
6. Keep the original meaning and content intact
7. Remove any HTML tags if present
8. Format quotes using > blockquote syntax
9. Use code blocks (\`\`\`) for any code or technical content
10. Ensure the markdown is clean and readable

Text to convert:
${text}

Return only the converted markdown content, no explanations or additional text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const markdown = response.text();

    return NextResponse.json({
      markdown: markdown.trim(),
      success: true
    });

  } catch (error) {
    console.error('Markdown conversion error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to convert text to markdown',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 