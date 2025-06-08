import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { elements, style, duration, dimensions, bannerType } = await req.json();

    // Validate required fields
    if (!elements || !Array.isArray(elements) || elements.length === 0) {
      return NextResponse.json(
        { error: 'Elements array is required' },
        { status: 400 }
      );
    }

    if (!style) {
      return NextResponse.json(
        { error: 'Animation style is required' },
        { status: 400 }
      );
    }

    const targetDuration = duration || 5;

    // Generate animation sequences based on style and elements
    const generateSequence = (name: string, style: string, elements: string[]) => {
      interface StyleConfig {
        transitions: string[];
        easings: string[];
        description: string;
        bestFor: string[];
      }

      const styleConfigs: Record<string, StyleConfig> = {
        'smooth': {
          transitions: ['Fade in', 'Slide from left', 'Slide from right', 'Scale up'],
          easings: ['ease-in', 'ease-out', 'ease-in-out'],
          description: 'Elements appear sequentially with smooth transitions',
          bestFor: ['Product launches', 'Brand awareness', 'Professional services']
        },
        'energetic': {
          transitions: ['Zoom in', 'Bounce in', 'Explode in', 'Flash', 'Pulse'],
          easings: ['ease-out', 'ease-in-out', 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'],
          description: 'High-energy sequence with dynamic effects and quick transitions',
          bestFor: ['Sales promotions', 'Limited time offers', 'Youth brands']
        },
        'elegant': {
          transitions: ['Fade in', 'Slide up', 'Scale from center', 'Reveal'],
          easings: ['ease-in-out', 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'],
          description: 'Refined animations with sophisticated timing and elegant transitions',
          bestFor: ['Luxury brands', 'Premium products', 'High-end services']
        },
        'playful': {
          transitions: ['Bounce in', 'Wiggle', 'Rotate in', 'Pop in', 'Rubber band'],
          easings: ['ease-out', 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', 'ease-in-out'],
          description: 'Fun and engaging animations with bouncy, playful effects',
          bestFor: ['Kids products', 'Entertainment', 'Casual brands']
        },
        'professional': {
          transitions: ['Fade in', 'Slide from top', 'Scale up', 'Wipe in'],
          easings: ['ease-in-out', 'linear', 'ease-out'],
          description: 'Clean, minimal animations focused on clarity and professionalism',
          bestFor: ['B2B services', 'Corporate communications', 'Financial services']
        }
      };

      const config = styleConfigs[style] || styleConfigs['smooth'];
      const frameDuration = targetDuration / Math.max(elements.length, 3);

      const frames = elements.slice(0, 4).map((element, index) => {
        const transition = config.transitions[index % config.transitions.length];
        const easing = config.easings[index % config.easings.length];
        
        return {
          id: `frame-${Date.now()}-${index}`,
          frameNumber: index + 1,
          duration: frameDuration,
          description: `${element} ${transition.toLowerCase()}`,
          elements: [element],
          transition,
          easing
        };
      });

      return {
        id: `sequence-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name,
        totalDuration: targetDuration,
        style,
        description: config.description,
        bestFor: config.bestFor,
        frames
      };
    };

    // Generate multiple sequence variations
    const sequences = [
      generateSequence(`${style.charAt(0).toUpperCase() + style.slice(1)} Sequence`, style, elements),
      generateSequence(`${style.charAt(0).toUpperCase() + style.slice(1)} Alternative`, style, [...elements].reverse())
    ];

    // Add a third variation for longer durations
    if (targetDuration > 6) {
      const extendedElements = [...elements, 'Background Effects', 'Finishing Touch'];
      sequences.push(generateSequence(`Extended ${style.charAt(0).toUpperCase() + style.slice(1)}`, style, extendedElements));
    }

    return NextResponse.json({
      sequences,
      success: true
    });

  } catch (error) {
    console.error('Error generating animation sequence:', error);
    return NextResponse.json(
      { error: 'Failed to generate animation sequence' },
      { status: 500 }
    );
  }
}