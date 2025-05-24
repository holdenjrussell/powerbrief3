"use client";
import React from 'react';
import { Sparkles, Palette, Volume2, Eye, MessageSquare, Type, Maximize2, MousePointer, Link } from 'lucide-react';
import { AdvantageCreativeEnhancements } from './adUploadTypes';

interface AdvantageCreativeManagerProps {
  advantageCreative: AdvantageCreativeEnhancements;
  onChange: (settings: AdvantageCreativeEnhancements) => void;
}

const CREATIVE_ENHANCEMENTS = [
  {
    key: 'inline_comment' as keyof AdvantageCreativeEnhancements,
    label: 'Relevant Comments',
    description: 'Display the most relevant comment below your ad on Facebook and Instagram',
    icon: MessageSquare,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    percentage: 'Comments can increase engagement and social proof'
  },
  {
    key: 'image_templates' as keyof AdvantageCreativeEnhancements,
    label: 'Add Overlays',
    description: 'Add overlays that show text along with your ad creative when likely to improve performance',
    icon: Palette,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
    percentage: '62% of ecommerce businesses have turned on image templates'
  },
  {
    key: 'image_touchups' as keyof AdvantageCreativeEnhancements,
    label: 'Visual Touch-ups (Images)',
    description: 'Automatically crop and expand images to fit more placements',
    icon: Eye,
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    percentage: '62% of ecommerce businesses have turned on visual touch-ups'
  },
  {
    key: 'video_auto_crop' as keyof AdvantageCreativeEnhancements,
    label: 'Visual Touch-ups (Videos)',
    description: 'Automatically crop and expand videos to fit more placements',
    icon: Volume2,
    color: 'text-pink-500',
    bgColor: 'bg-pink-50',
    percentage: 'Video content sees higher engagement across placements'
  },
  {
    key: 'text_optimizations' as keyof AdvantageCreativeEnhancements,
    label: 'Text Improvements',
    description: 'Show text options as primary text, headline or description when likely to improve performance',
    icon: Type,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-50',
    percentage: '75% of ecommerce businesses have turned on text improvements'
  },
  {
    key: 'image_uncrop' as keyof AdvantageCreativeEnhancements,
    label: 'Expand Image',
    description: 'Automatically expand images to fit more placements using AI',
    icon: Maximize2,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-50',
    percentage: 'Expanded images perform better across different placements'
  },
  {
    key: 'enhance_cta' as keyof AdvantageCreativeEnhancements,
    label: 'Enhance CTA',
    description: 'Pair keyphrases from your ad sources with your call-to-action',
    icon: MousePointer,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    percentage: 'Enhanced CTAs can improve click-through rates'
  },
  {
    key: 'site_extensions' as keyof AdvantageCreativeEnhancements,
    label: 'Add Site Links',
    description: 'Showcase additional URLs below your media when likely to improve performance',
    icon: Link,
    color: 'text-teal-500',
    bgColor: 'bg-teal-50',
    percentage: 'Site links provide additional navigation options'
  }
];

const AdvantageCreativeManager: React.FC<AdvantageCreativeManagerProps> = ({ 
  advantageCreative = {
    inline_comment: false,
    image_templates: false,
    image_touchups: false,
    video_auto_crop: false,
    image_brightness_and_contrast: false,
    enhance_cta: false,
    text_optimizations: false,
    image_uncrop: false,
    adapt_to_placement: false,
    media_type_automation: false,
    product_extensions: false,
    description_automation: false,
    add_text_overlay: false,
    site_extensions: false
  }, 
  onChange 
}) => {
  // Ensure advantageCreative is always a valid object
  const safeAdvantageCreative = advantageCreative || {
    inline_comment: false,
    image_templates: false,
    image_touchups: false,
    video_auto_crop: false,
    image_brightness_and_contrast: false,
    enhance_cta: false,
    text_optimizations: false,
    image_uncrop: false,
    adapt_to_placement: false,
    media_type_automation: false,
    product_extensions: false,
    description_automation: false,
    add_text_overlay: false,
    site_extensions: false
  };

  const toggleEnhancement = (key: keyof AdvantageCreativeEnhancements) => {
    onChange({
      ...safeAdvantageCreative,
      [key]: !safeAdvantageCreative[key]
    });
  };

  const enabledCount = Object.values(safeAdvantageCreative).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 flex items-center">
          <Sparkles className="h-4 w-4 mr-2 text-purple-500" />
          Advantage+ Creative Enhancements
        </h4>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
          {enabledCount} enabled
        </span>
      </div>

      <div className="text-xs text-gray-600 bg-gradient-to-r from-purple-50 to-blue-50 p-3 rounded-lg border border-purple-200">
        <p className="font-medium text-purple-800 mb-1">✨ Powered by Meta AI</p>
        <p>These enhancements use artificial intelligence to automatically optimize your ad creative for better performance. You can review how your ad will show up on different placements as well as how it might be adapted with Advantage+ creative.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {CREATIVE_ENHANCEMENTS.map((enhancement) => {
          const IconComponent = enhancement.icon;
          const isEnabled = safeAdvantageCreative[enhancement.key];

          return (
            <div 
              key={enhancement.key}
              className={`relative border rounded-lg p-4 transition-all duration-200 cursor-pointer hover:shadow-sm ${
                isEnabled 
                  ? `border-${enhancement.color.split('-')[1]}-200 ${enhancement.bgColor}` 
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
              onClick={() => toggleEnhancement(enhancement.key)}
            >
              <div className="flex items-start space-x-3">
                <div className={`flex-shrink-0 p-2 rounded-lg ${isEnabled ? enhancement.bgColor : 'bg-gray-100'}`}>
                  <IconComponent className={`h-4 w-4 ${isEnabled ? enhancement.color : 'text-gray-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h5 className="text-sm font-medium text-gray-900">{enhancement.label}</h5>
                    <div className="flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleEnhancement(enhancement.key);
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        aria-label={`Toggle ${enhancement.label}`}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{enhancement.description}</p>
                  <div className="text-xs text-gray-500 bg-white/50 p-2 rounded border border-dashed border-gray-200">
                    <span className="font-medium">📊</span> {enhancement.percentage}
                  </div>
                </div>
              </div>

              {isEnabled && (
                <div className="absolute top-2 right-2">
                  <div className={`w-2 h-2 rounded-full ${enhancement.color.replace('text-', 'bg-')}`}></div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-200">
        <p className="font-medium text-gray-700 mb-1">How it works:</p>
        <ul className="space-y-1 text-gray-600">
          <li>• Meta AI analyzes your creative and applies selected enhancements</li>
          <li>• Enhancements are tested automatically to improve performance</li>
          <li>• You can preview variations before publishing</li>
          <li>• Turn on/off individual enhancements based on your preferences</li>
        </ul>
      </div>
    </div>
  );
};

export default AdvantageCreativeManager; 