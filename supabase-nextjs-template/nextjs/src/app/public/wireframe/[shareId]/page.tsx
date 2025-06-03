"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  Frame,
  Type,
  Image,
  Video,
  Square,
  Loader2
} from 'lucide-react';
import { 
  Wireframe, 
  WireframeModule,
  TextContent,
  ImageContent,
  VideoContent,
  ButtonContent
} from '@/lib/types/powerframe';
import { getWireframeByShareId } from '@/lib/services/powerframeService';

export default function PublicWireframePage() {
  const params = useParams();
  const shareId = params.shareId as string;
  
  const [wireframe, setWireframe] = useState<Wireframe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWireframe = async () => {
      try {
        const data = await getWireframeByShareId(shareId);
        if (!data) {
          setError('Wireframe not found or share link has expired');
        } else {
          setWireframe(data);
        }
      } catch (err) {
        console.error('Error fetching wireframe:', err);
        setError('Failed to load wireframe');
      } finally {
        setLoading(false);
      }
    };

    fetchWireframe();
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading wireframe...</p>
        </div>
      </div>
    );
  }

  if (error || !wireframe) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Frame className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            {error || 'Wireframe not found'}
          </h1>
          <p className="text-gray-600">
            The wireframe you&apos;re looking for doesn&apos;t exist or the share link has expired.
          </p>
        </div>
      </div>
    );
  }

  const renderModuleContent = (module: WireframeModule) => {
    switch (module.type) {
      case 'text':
        const textContent = module.content as TextContent;
        return (
          <p className="text-sm">{textContent.text}</p>
        );
      
      case 'image':
        const imageContent = module.content as ImageContent;
        return (
          <div className="bg-gray-200 h-32 rounded flex items-center justify-center">
            {imageContent.url ? (
              <img 
                src={imageContent.url} 
                alt={imageContent.alt || 'Image'} 
                className="w-full h-full object-cover rounded"
              />
            ) : (
              <>
                <Image className="h-8 w-8 text-gray-400 mr-2" />
                <span className="text-gray-500">{imageContent.placeholder || 'Image'}</span>
              </>
            )}
          </div>
        );
      
      case 'video':
        const videoContent = module.content as VideoContent;
        return (
          <div className="bg-gray-200 h-32 rounded flex items-center justify-center">
            {videoContent.url ? (
              <video 
                src={videoContent.url} 
                poster={videoContent.thumbnail}
                className="w-full h-full object-cover rounded"
                controls
              />
            ) : (
              <>
                <Video className="h-8 w-8 text-gray-400 mr-2" />
                <span className="text-gray-500">{videoContent.placeholder || 'Video'}</span>
              </>
            )}
          </div>
        );
      
      case 'button':
        const buttonContent = module.content as ButtonContent;
        return (
          <button className={`px-4 py-2 rounded text-sm ${
            buttonContent.style === 'primary' 
              ? 'bg-primary-600 text-white' 
              : buttonContent.style === 'secondary'
              ? 'bg-gray-200 text-gray-800'
              : 'border border-gray-300 text-gray-700'
          }`}>
            {buttonContent.text}
          </button>
        );
      
      case 'header':
        return (
          <div className="text-lg font-semibold">
            {(module.content as TextContent).text || 'Header Section'}
          </div>
        );
      
      case 'footer':
        return (
          <div className="text-sm text-gray-600">
            {(module.content as TextContent).text || 'Footer Section'}
          </div>
        );
      
      case 'container':
        return (
          <div 
            className="p-4 rounded"
            style={{ backgroundColor: ((module.content as Record<string, string>).backgroundColor) || '#f3f4f6' }}
          >
            <Square className="h-8 w-8 text-gray-400 mx-auto" />
          </div>
        );
      
      default:
        return <div>Unknown module type</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center space-x-2">
            <Frame className="h-6 w-6 text-primary-600" />
            <h1 className="text-xl font-semibold text-gray-900">{wireframe.name}</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Shared wireframe preview
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          {wireframe.structure.rows.length === 0 ? (
            <div className="bg-white rounded-lg border p-12 text-center">
              <Type className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Empty wireframe</h3>
              <p className="text-gray-500">This wireframe doesn&apos;t have any content yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {wireframe.structure.rows.map((row) => (
                <div
                  key={row.id}
                  className="bg-white rounded-lg border p-6"
                >
                  {row.modules.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-500">Empty row</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-12 gap-4">
                      {row.modules.map((module) => {
                        // Apply AI-generated content if available
                        const aiContent = wireframe.ai_generated_content?.[module.id];
                        if (aiContent && module.is_content_placeholder) {
                          module = {
                            ...module,
                            content: {
                              ...module.content,
                              ...(typeof aiContent === 'object' ? aiContent : { text: aiContent })
                            }
                          };
                        }

                        return (
                          <div
                            key={module.id}
                            className={`col-span-${module.position.width}`}
                            style={{ textAlign: module.alignment }}
                          >
                            {!module.is_design_descriptor && renderModuleContent(module)}
                            {module.is_design_descriptor && (
                              <div className="border-2 border-dashed border-gray-300 rounded p-4 text-center">
                                <p className="text-xs text-gray-500 uppercase mb-1">Design Note</p>
                                <p className="text-sm text-gray-600">
                                  {(module.content as TextContent).text}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 