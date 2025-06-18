import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Database } from '@/lib/types/supabase';

interface VideoAnalysisRequest {
  url: string;
  platform: 'tiktok' | 'youtube';
  brandId: string;
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Ignore if called from Server Component
            }
          },
        }
      }
    );
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: VideoAnalysisRequest = await request.json();
    const { url, platform, brandId } = body;

    if (!url || !platform || !brandId) {
      return NextResponse.json({ error: 'URL, platform, and brand ID are required' }, { status: 400 });
    }

    // Verify user has access to this brand (check owned and shared brands)
    const { data: brand } = await supabase
      .from('brands')
      .select('id, name')
      .eq('id', brandId)
      .single();

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found or access denied' }, { status: 404 });
    }

    // Use environment variable for Gemini API key (same as PowerBrief approach)
    const geminiApiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.error('ERROR: No API key found in environment variables. Check .env.local for GOOGLE_API_KEY or GEMINI_API_KEY');
      return NextResponse.json({ 
        error: 'Gemini API key not configured in environment variables (GOOGLE_API_KEY or GEMINI_API_KEY)' 
      }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-thinking-exp' });

    console.log(`[VideoAnalyzer] Analyzing ${platform} video: ${url}`);

    // Create a comprehensive prompt for video analysis
    const prompt = `Analyze this ${platform} video URL and provide comprehensive insights: ${url}

Please provide a detailed analysis including:

1. **Content Summary**: What is the main topic/theme of the video?

2. **Hook Analysis**: How does the video grab attention in the first 3-5 seconds?

3. **Messaging Strategy**: What key messages or value propositions are communicated?

4. **Target Audience**: Who appears to be the intended audience based on content, language, and style?

5. **Visual Style**: Describe the visual elements, editing style, and production quality.

6. **Call to Action**: What action does the video encourage viewers to take?

7. **Engagement Tactics**: What specific techniques are used to keep viewers engaged?

8. **Brand/Product Positioning**: How is the brand or product presented and positioned?

9. **Trending Elements**: What current trends, sounds, or formats does it leverage?

10. **Marketing Insights**: Key takeaways that could inform marketing strategy.

Format the response as clean markdown with clear sections. Focus on actionable insights that could inform content creation and marketing strategy.

If you cannot directly access the video, provide guidance on what to look for when manually analyzing ${platform} content.`;

    try {
      const result = await model.generateContent(prompt);
      const analysis = result.response.text();
      
      console.log(`[VideoAnalyzer] Successfully analyzed ${platform} video`);

      return NextResponse.json({
        success: true,
        platform,
        url,
        markdown: analysis,
        content: analysis, // For backward compatibility
        timestamp: new Date().toISOString()
      });

    } catch (geminiError) {
      console.error(`[VideoAnalyzer] Gemini analysis failed:`, geminiError);
      
      // Fallback: provide a template for manual analysis
      const fallbackAnalysis = `# ${platform.charAt(0).toUpperCase() + platform.slice(1)} Video Analysis

**Video URL**: ${url}

*Note: Automatic analysis was not available. Please manually analyze the video using the framework below:*

## Content Summary
- [ ] What is the main topic/theme?
- [ ] What problem does it address or solution does it provide?

## Hook Analysis  
- [ ] How does it grab attention in the first 3-5 seconds?
- [ ] What visual or audio element draws viewers in?

## Messaging Strategy
- [ ] What key messages are communicated?
- [ ] What value propositions are highlighted?

## Target Audience
- [ ] Who is the intended audience?
- [ ] What demographics and psychographics are targeted?

## Visual Style
- [ ] What is the production quality?
- [ ] What editing techniques are used?
- [ ] What visual elements stand out?

## Call to Action
- [ ] What action does the video encourage?
- [ ] How is the CTA presented?

## Engagement Tactics
- [ ] What keeps viewers watching?
- [ ] What emotional triggers are used?

## Marketing Insights
- [ ] Key takeaways for content strategy
- [ ] Elements to replicate or avoid
- [ ] Trends to leverage

---

**Next Steps**: Watch the video and fill in the analysis above, then save this updated content.`;

      return NextResponse.json({
        success: true,
        platform,
        url,
        markdown: fallbackAnalysis,
        content: fallbackAnalysis,
        fallback: true,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('[VideoAnalyzer] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to analyze video', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 