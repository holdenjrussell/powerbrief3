import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { keywords } = await req.json();

    // Validate required fields
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { error: 'Keywords array is required' },
        { status: 400 }
      );
    }

    // Generate mood boards based on keywords
    const generateMoodBoard = (theme: string, keywords: string[]) => {
      const colorPalettes: Record<string, string[]> = {
        'minimal': ['#FFFFFF', '#F8F9FA', '#E9ECEF', '#6C757D', '#212529'],
        'bold': ['#FF6B35', '#F7931E', '#FFD23F', '#06FFA5', '#4ECDC4'],
        'elegant': ['#2C3E50', '#34495E', '#95A5A6', '#BDC3C7', '#ECF0F1'],
        'luxurious': ['#1A1A1A', '#D4AF37', '#F5F5DC', '#8B4513', '#2F4F4F'],
        'playful': ['#FF69B4', '#00CED1', '#FFD700', '#32CD32', '#FF4500'],
        'professional': ['#003366', '#0066CC', '#6699FF', '#B3D9FF', '#E6F3FF']
      };

      const typographyStyles: Record<string, string[]> = {
        'minimal': ['Sans-serif', 'Light weight', 'Generous spacing'],
        'bold': ['Bold sans-serif', 'High contrast', 'Dynamic angles'],
        'elegant': ['Serif fonts', 'Medium weight', 'Classic proportions'],
        'luxurious': ['Serif display', 'Gold accents', 'Refined spacing'],
        'playful': ['Rounded fonts', 'Variable weights', 'Casual spacing'],
        'professional': ['Corporate sans-serif', 'Regular weight', 'Clean hierarchy']
      };

      const getThemeKey = (keywords: string[]) => {
        const keywordStr = keywords.join(' ').toLowerCase();
        if (keywordStr.includes('minimal') || keywordStr.includes('clean')) return 'minimal';
        if (keywordStr.includes('bold') || keywordStr.includes('energetic')) return 'bold';
        if (keywordStr.includes('elegant') || keywordStr.includes('sophisticated')) return 'elegant';
        if (keywordStr.includes('luxurious') || keywordStr.includes('sleek')) return 'luxurious';
        if (keywordStr.includes('playful') || keywordStr.includes('fun')) return 'playful';
        if (keywordStr.includes('professional') || keywordStr.includes('corporate')) return 'professional';
        return 'minimal';
      };

      const themeKey = getThemeKey(keywords);
      const colors = colorPalettes[themeKey] || colorPalettes['minimal'];
      const typography = typographyStyles[themeKey] || typographyStyles['minimal'];

      return {
        id: `mood-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        theme,
        overallMood: `${theme} aesthetic with ${keywords.join(', ').toLowerCase()} characteristics`,
        colorPalette: colors,
        typographyStyles: typography,
        items: [
          {
            id: 'item-1',
            type: 'color',
            color: colors[0],
            title: 'Primary Color',
            description: 'Main brand color for headers and key elements'
          },
          {
            id: 'item-2',
            type: 'color',
            color: colors[1],
            title: 'Secondary Color',
            description: 'Supporting color for backgrounds and accents'
          },
          {
            id: 'item-3',
            type: 'typography',
            title: typography[0],
            description: `${typography[1]} - ${typography[2]}`
          },
          {
            id: 'item-4',
            type: 'pattern',
            title: `${theme} Layout Pattern`,
            description: `Layout approach that embodies ${theme} design principles`
          }
        ]
      };
    };

    // Generate multiple mood board variations
    const moodBoards = [
      generateMoodBoard(keywords[0] || 'Modern', keywords),
      generateMoodBoard(`${keywords[0] || 'Clean'} & ${keywords[1] || 'Professional'}`, keywords)
    ];

    // Add a contrasting option if we have enough keywords
    if (keywords.length > 2) {
      moodBoards.push(generateMoodBoard(`${keywords[2]} Fusion`, keywords));
    }

    return NextResponse.json({
      moodBoards,
      success: true
    });

  } catch (error) {
    console.error('Error generating mood board:', error);
    return NextResponse.json(
      { error: 'Failed to generate mood board' },
      { status: 500 }
    );
  }
}