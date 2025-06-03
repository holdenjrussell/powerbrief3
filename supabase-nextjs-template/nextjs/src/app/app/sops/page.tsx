"use client";
import React from 'react';
import Link from 'next/link';
import { 
  Settings, 
  FileText, 
  Video, 
  Users, 
  Calendar, 
  Star, 
  Upload, 
  Download,
  Clock,
  BookOpen,
  AlertTriangle
} from 'lucide-react';

const modules = [
  {
    id: 'brand-config',
    title: 'PowerBrief: Brand Config',
    description: 'Learn how to set up and configure brand settings, guidelines, and preferences in PowerBrief.',
    icon: Settings,
    duration: '12 min',
    difficulty: 'Beginner',
    topics: ['Brand Setup', 'Guidelines', 'Preferences', 'Assets Management']
  },
  {
    id: 'briefs-creative-strategist',
    title: 'Briefs: Creative Strategist Version',
    description: 'Complete guide for creative strategists on creating, managing, and optimizing briefs.',
    icon: FileText,
    duration: '18 min',
    difficulty: 'Intermediate',
    topics: ['Brief Creation', 'Strategy Framework', 'Concept Development', 'Client Communication']
  },
  {
    id: 'briefs-video-editor-designer',
    title: 'Briefs: Video Editor/Designer Version',
    description: 'Essential training for video editors and designers working with PowerBrief briefs.',
    icon: Video,
    duration: '15 min',
    difficulty: 'Beginner',
    topics: ['Brief Interpretation', 'Asset Requirements', 'Design Guidelines', 'Delivery Standards']
  },
  {
    id: 'ugc-pipeline',
    title: 'UGC Pipeline',
    description: 'Master the user-generated content pipeline from concept to completion.',
    icon: Users,
    duration: '25 min',
    difficulty: 'Advanced',
    topics: ['Creator Management', 'Content Strategy', 'Pipeline Workflow', 'Quality Control']
  },
  {
    id: 'team-sync',
    title: 'Team Sync',
    description: 'Learn how to effectively use team synchronization features and collaboration tools.',
    icon: Calendar,
    duration: '10 min',
    difficulty: 'Beginner',
    topics: ['Team Collaboration', 'Status Updates', 'Communication', 'Project Tracking']
  },
  {
    id: 'ad-reviews',
    title: 'Ad Reviews',
    description: 'Comprehensive guide to the ad review process, feedback systems, and approval workflows.',
    icon: Star,
    duration: '16 min',
    difficulty: 'Intermediate',
    topics: ['Review Process', 'Feedback Systems', 'Approval Workflow', 'Quality Standards']
  },
  {
    id: 'adripper',
    title: 'AdRipper',
    description: 'Learn how to use AdRipper for competitive research and ad analysis.',
    icon: Download,
    duration: '20 min',
    difficulty: 'Intermediate',
    topics: ['Competitive Research', 'Ad Analysis', 'Data Extraction', 'Insights Generation']
  },
  {
    id: 'ad-upload-tool',
    title: 'Ad Upload Tool',
    description: 'Master the ad upload process, file management, and campaign organization.',
    icon: Upload,
    duration: '14 min',
    difficulty: 'Beginner',
    topics: ['File Upload', 'Campaign Organization', 'Asset Management', 'Metadata Tagging']
  }
];

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'Beginner': return 'bg-green-100 text-green-800';
    case 'Intermediate': return 'bg-yellow-100 text-yellow-800';
    case 'Advanced': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export default function SOPsPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Under Construction Warning */}
      <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-amber-900 mb-1">⚠️ This page is not functional yet. Build out in progress</h4>
            <p className="text-amber-800 text-sm">
              The content shown here is placeholder material for development purposes only. 
              These are not actual SOPs and should not be used for guidance until this notice is removed.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-center mb-4">
          <BookOpen className="h-8 w-8 text-primary-600 mr-3" />
          <h1 className="text-3xl font-bold text-gray-900">Standard Operating Procedures</h1>
        </div>
        <p className="text-lg text-gray-600">
          Learn how to use PowerBrief effectively with our comprehensive training modules. 
          Each module includes video tutorials and detailed documentation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((module) => {
          const IconComponent = module.icon;
          return (
            <Link
              key={module.id}
              href={`/app/sops/${module.id}`}
              className="group block"
            >
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 p-6 h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-primary-50 rounded-lg">
                    <IconComponent className="h-6 w-6 text-primary-600" />
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    <span>{module.duration}</span>
                  </div>
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                  {module.title}
                </h3>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {module.description}
                </p>
                
                <div className="mb-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(module.difficulty)}`}>
                    {module.difficulty}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-900">Topics Covered:</h4>
                  <div className="flex flex-wrap gap-1">
                    {module.topics.slice(0, 3).map((topic, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700"
                      >
                        {topic}
                      </span>
                    ))}
                    {module.topics.length > 3 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700">
                        +{module.topics.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
} 