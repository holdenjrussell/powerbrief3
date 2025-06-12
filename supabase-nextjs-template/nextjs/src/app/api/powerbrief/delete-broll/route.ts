import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/types/supabase';

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface DeleteBRollRequest {
  conceptId: string;
  visualIndex?: number; // If provided, delete only this visual's videos
  videoIndex?: number;  // If provided along with visualIndex, delete only this specific video
}

interface GeneratedVideo {
  visual_description: string;
  gemini_prompt: string;
  video_urls: string[];
  storage_paths: string[];
}

export async function DELETE(req: NextRequest) {
  try {
    const { conceptId, visualIndex, videoIndex }: DeleteBRollRequest = await req.json();

    if (!conceptId) {
      return NextResponse.json({ message: 'Concept ID is required.' }, { status: 400 });
    }

    console.log(`[DELETE BROLL] Processing deletion for concept ${conceptId}, visual: ${visualIndex}, video: ${videoIndex}`);

    // Fetch the current concept to get the B-roll data
    const { data: concept, error: fetchError } = await supabaseAdmin
      .from('brief_concepts')
      .select('generated_broll')
      .eq('id', conceptId)
      .single();

    if (fetchError || !concept) {
      console.error('Error fetching concept:', fetchError);
      return NextResponse.json({ message: 'Failed to find concept.' }, { status: 404 });
    }

    const currentBRoll = (concept.generated_broll as unknown as GeneratedVideo[]) || [];
    
    if (currentBRoll.length === 0) {
      return NextResponse.json({ message: 'No B-roll videos found to delete.' }, { status: 404 });
    }

    let storagePaths: string[] = [];
    let updatedBRoll: GeneratedVideo[] = [];

    if (visualIndex !== undefined && videoIndex !== undefined) {
      // Delete a specific video from a specific visual
      if (visualIndex >= currentBRoll.length) {
        return NextResponse.json({ message: 'Visual index out of range.' }, { status: 400 });
      }

      const visual = currentBRoll[visualIndex];
      if (videoIndex >= visual.video_urls.length) {
        return NextResponse.json({ message: 'Video index out of range.' }, { status: 400 });
      }

      // Get the storage path for this specific video
      storagePaths = [visual.storage_paths[videoIndex]];

      // Remove this video from the visual
      const updatedVisual = {
        ...visual,
        video_urls: visual.video_urls.filter((_, index) => index !== videoIndex),
        storage_paths: visual.storage_paths.filter((_, index) => index !== videoIndex)
      };

      updatedBRoll = currentBRoll.map((item, index) => 
        index === visualIndex ? updatedVisual : item
      );

      console.log(`Deleting video ${videoIndex} from visual ${visualIndex}`);
    } else if (visualIndex !== undefined) {
      // Delete all videos from a specific visual
      if (visualIndex >= currentBRoll.length) {
        return NextResponse.json({ message: 'Visual index out of range.' }, { status: 400 });
      }

      storagePaths = currentBRoll[visualIndex].storage_paths;
      updatedBRoll = currentBRoll.filter((_, index) => index !== visualIndex);

      console.log(`Deleting all videos from visual ${visualIndex}`);
    } else {
      // Delete all B-roll videos
      storagePaths = currentBRoll.flatMap(item => item.storage_paths);
      updatedBRoll = [];

      console.log(`Deleting all B-roll videos for concept ${conceptId}`);
    }

    // Delete files from storage
    const deletePromises = storagePaths
      .filter(path => path && path.trim() !== '') // Filter out empty paths
      .map(async (storagePath) => {
        try {
          console.log(`Deleting file from storage: ${storagePath}`);
          const { error } = await supabaseAdmin.storage
            .from('powerbrief-media')
            .remove([storagePath]);
          
          if (error) {
            console.error(`Failed to delete file ${storagePath}:`, error);
            return { path: storagePath, success: false, error: error.message };
          }
          
          return { path: storagePath, success: true };
        } catch (err) {
          console.error(`Error deleting file ${storagePath}:`, err);
          return { path: storagePath, success: false, error: String(err) };
        }
      });

    const deleteResults = await Promise.all(deletePromises);
    const successfulDeletions = deleteResults.filter(result => result.success).length;
    const failedDeletions = deleteResults.filter(result => !result.success);

    console.log(`Storage deletion results: ${successfulDeletions} successful, ${failedDeletions.length} failed`);

    // Update the concept in the database
    const { error: updateError } = await supabaseAdmin
      .from('brief_concepts')
      .update({
        generated_broll: updatedBRoll as unknown as Database['public']['Tables']['brief_concepts']['Row']['generated_broll'],
        updated_at: new Date().toISOString()
      })
      .eq('id', conceptId);

    if (updateError) {
      console.error('Error updating concept:', updateError);
      return NextResponse.json({ 
        message: 'Failed to update concept in database.',
        storageResults: { successful: successfulDeletions, failed: failedDeletions.length }
      }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'B-roll videos deleted successfully',
      deletedFiles: successfulDeletions,
      failedDeletions: failedDeletions.length,
      remainingVideos: updatedBRoll.length,
      storageResults: deleteResults
    }, { status: 200 });

  } catch (error: unknown) {
    console.error('Error in delete-broll API:', error);
    return NextResponse.json({ 
      message: 'Internal server error.',
      error: String(error)
    }, { status: 500 });
  }
} 