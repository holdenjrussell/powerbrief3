'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getUgcCreatorScriptByShareId } from '@/lib/services/ugcCreatorService';
import { UgcCreatorScript, ScriptSegment } from '@/lib/types/ugcCreator';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function PublicUgcScriptPage({ params }: { params: { shareId: string } }) {
  const [script, setScript] = useState<UgcCreatorScript | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScript = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const scriptData = await getUgcCreatorScriptByShareId(params.shareId);
        setScript(scriptData);
      } catch (err) {
        console.error('Error fetching script:', err);
        setError('Could not load the requested script. It may have been removed or the share link is invalid.');
      } finally {
        setLoading(false);
      }
    };

    fetchScript();
  }, [params.shareId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
        <div className="p-8 bg-white shadow-lg rounded-lg max-w-4xl w-full">
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            <span className="ml-2 text-gray-600">Loading script...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !script) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
        <div className="p-8 bg-white shadow-lg rounded-lg max-w-4xl w-full">
          <Alert className="mb-6">
            <AlertDescription>
              {error || 'Script not found. It may have been removed or the share link is invalid.'}
            </AlertDescription>
          </Alert>
          <div className="mt-6 text-center">
            <Link href="/" className="text-primary-600 hover:text-primary-700">
              Return to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const renderScriptTable = () => {
    if (!script.script_content || !script.script_content.segments) {
      return (
        <div className="py-4">
          <p className="text-gray-500 italic">No script content available</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto mt-6">
        <table className="min-w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2 text-left w-1/4">Segment</th>
              <th className="border border-gray-300 px-4 py-2 text-left w-2/5">Script (Dialogue / Action)</th>
              <th className="border border-gray-300 px-4 py-2 text-left w-2/5">Visuals / Filming Instructions</th>
            </tr>
          </thead>
          <tbody>
            {script.script_content.segments?.map((segment: ScriptSegment, index: number) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border border-gray-300 px-4 py-2 align-top font-medium">{segment.segment}</td>
                <td className="border border-gray-300 px-4 py-2 align-top whitespace-pre-wrap">{segment.script}</td>
                <td className="border border-gray-300 px-4 py-2 align-top whitespace-pre-wrap">{segment.visuals}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-primary-600 text-white p-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">UGC BRIEF: {script.title}</h1>
              <div className="w-32">
                <Image 
                  src="/images/powerbrief-logo.png" 
                  alt="PowerBrief" 
                  width={150} 
                  height={40} 
                  className="object-contain"
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Scene Start */}
            {script.script_content?.scene_start && (
              <div className="mb-6">
                <p className="italic text-gray-800 whitespace-pre-wrap">{script.script_content.scene_start}</p>
              </div>
            )}

            {/* Script Table */}
            {renderScriptTable()}

            {/* Scene End */}
            {script.script_content?.scene_end && (
              <div className="mt-6">
                <p className="italic text-gray-800 whitespace-pre-wrap">{script.script_content.scene_end}</p>
              </div>
            )}

            {/* B-Roll Shot List */}
            {script.b_roll_shot_list && script.b_roll_shot_list.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">🎥 B-ROLL SHOT LIST:</h2>
                <div className="bg-gray-50 p-4 rounded-md">
                  <ul className="list-disc list-inside space-y-2">
                    {script.b_roll_shot_list.map((shot: string, index: number) => (
                      <li key={index} className="text-gray-800">{shot}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* System Instructions */}
            {script.system_instructions && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">🔧 SYSTEM INSTRUCTIONS:</h2>
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap">
                    {script.system_instructions}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-6 text-center text-gray-500 text-sm">
            This UGC creator brief was created with PowerBrief
          </div>
        </div>
      </div>
    </div>
  );
} 