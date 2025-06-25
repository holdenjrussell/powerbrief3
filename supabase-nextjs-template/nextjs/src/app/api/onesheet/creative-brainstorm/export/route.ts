import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const onesheetId = searchParams.get('onesheetId');
    const format = searchParams.get('format') || 'json';

    if (!onesheetId) {
      return NextResponse.json({ error: 'OneSheet ID is required' }, { status: 400 });
    }

    // Fetch the complete OneSheet data
    const { data: onesheet, error } = await supabase
      .from('onesheet')
      .select('*')
      .eq('id', onesheetId)
      .eq('user_id', user.id)
      .single();

    if (error || !onesheet) {
      return NextResponse.json(
        { error: error?.message || 'OneSheet not found' },
        { status: 404 }
      );
    }

    const creativeBrainstorm = onesheet.creative_brainstorm;
    
    if (!creativeBrainstorm) {
      return NextResponse.json(
        { error: 'No creative brainstorm data found' },
        { status: 404 }
      );
    }

    // Format the export data
    const exportData = {
      product: onesheet.product,
      landingPage: onesheet.landing_page_url,
      concepts: creativeBrainstorm.concepts || [],
      hooks: creativeBrainstorm.hooks || [],
      visuals: creativeBrainstorm.visuals || [],
      exportedAt: new Date().toISOString(),
    };

    if (format === 'csv') {
      // Generate CSV content
      let csvContent = 'Type,Title/Text/Description,Angle,Priority,Target Persona,AI Generated,Additional Info\n';
      
      // Add concepts
      exportData.concepts.forEach(concept => {
        csvContent += `Concept,"${concept.title}","${concept.angle}",${concept.priority},"${concept.targetPersona || ''}",${concept.aiGenerated},"${concept.description.replace(/"/g, '""')}"\n`;
      });
      
      // Add hooks
      exportData.hooks.forEach(hook => {
        const variations = hook.variations?.join(' | ') || '';
        csvContent += `Hook,"${hook.text}","${hook.angle}",${hook.priority},"${hook.targetPersona || ''}",${hook.aiGenerated},"Variations: ${variations}"\n`;
      });
      
      // Add visuals
      exportData.visuals.forEach(visual => {
        csvContent += `Visual,"${visual.description}","${visual.angle}",${visual.priority},"${visual.type}",${visual.aiGenerated},"Style: ${visual.style || ''}"\n`;
      });

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="creative-brainstorm-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // Default to JSON
    return NextResponse.json({
      success: true,
      data: exportData,
    });

  } catch (error) {
    console.error('Error exporting creative brainstorm:', error);
    return NextResponse.json(
      { error: 'Failed to export creative brainstorm' },
      { status: 500 }
    );
  }
} 