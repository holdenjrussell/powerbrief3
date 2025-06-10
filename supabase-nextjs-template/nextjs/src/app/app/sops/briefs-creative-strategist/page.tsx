"use client";
import React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, Clock, CheckCircle, Lightbulb, Target, Zap, Upload, Filter, Share } from 'lucide-react';
import SOPVideoUpload from '@/components/sops/SOPVideoUpload';

export default function BriefsCreativeStrategistSOPPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 px-4">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href="/app/sops" 
            className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to SOPs
          </Link>
          
          <div className="flex items-center mb-4">
            <div className="p-3 bg-primary-50 rounded-lg mr-4">
              <FileText className="h-8 w-8 text-primary-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Briefs: Creative Strategist Version</h1>
              <div className="flex items-center mt-2 space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>7 minutes</span>
                </div>
                <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                  Intermediate
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Video Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Training Video</h2>
            <SOPVideoUpload 
              sopId="briefs-creative-strategist"
              isAdmin={true} // TODO: Replace with actual admin check
            />
          </div>
        </div>

        {/* Content Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">PowerBrief: Creative Brief Workflow</h2>
            
            {/* Overview */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Overview</h3>
              <p className="text-gray-700 mb-4">
                PowerBrief streamlines the creative brief process from concept creation to editor delivery. This comprehensive workflow 
                covers batch management, AI-powered script generation, asset organization, and team collaboration features that make 
                brief creation efficient and scalable.
              </p>
              
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Lightbulb className="h-5 w-5 text-purple-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-purple-900 mb-1">AI-Powered Brief Creation</h4>
                    <p className="text-purple-800 text-sm">
                      Leverage AI to generate scripts, hooks, and video instructions while maintaining full creative control 
                      over the strategic direction and brand consistency.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Learning Objectives */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Learning Objectives</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Create and manage concept batches effectively</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Generate AI-powered scripts using reference videos</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Organize teams and assign creative roles</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Use batch sharing for seamless editor collaboration</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Master asset upload and Easy Upload features</span>
                </div>
              </div>
            </section>

            {/* Step-by-Step Workflow */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">PowerBrief Creative Workflow</h3>
              
              <div className="space-y-6">
                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      1
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Create and Setup Batches</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• <strong>Create New Batch:</strong> Start with a new creative batch</li>
                    <li>• <strong>Rename Batches:</strong> Click on batch name to rename for better organization</li>
                    <li>• <strong>Add Concepts:</strong> Add individual concepts or drag to add multiple at once</li>
                    <li>• <strong>Set Status:</strong> Use &quot;Briefing in Progress&quot; while actively working on briefs</li>
                    <li>• <strong>Assign Team:</strong> Add Creative Strategists, Coordinators, and Video Editors</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      <Zap className="h-4 w-4" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">AI Script Generation</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• <strong>Upload Reference Video:</strong> Download examples from Facebook Ad Library or use existing assets</li>
                    <li>• <strong>Add Products:</strong> Select from brand products configured in Brand Config</li>
                    <li>• <strong>Generate AI Scripts:</strong> Use &quot;Generate AI&quot; or upload reference and say &quot;recreate this&quot;</li>
                    <li>• <strong>Choose AI Model:</strong> Select Gemini 2.5 Pro or other available models</li>
                    <li>• <strong>Hook Types:</strong> Generate text hooks, verbal hooks, or both</li>
                    <li>• <strong>Manual Editing:</strong> Hooks often need manual refinement, body content is typically better</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      <Target className="h-4 w-4" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Concept Enhancement</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• <strong>Prerequisites & Links:</strong> Add custom footage links, asset packs, or special requirements</li>
                    <li>• <strong>Asset Checklist:</strong> Mark needs like &quot;AI voiceover&quot; or &quot;UGC scripts&quot; for high-level tracking</li>
                    <li>• <strong>ElevenLabs Integration:</strong> Generate and preview AI voiceovers directly in the platform</li>
                    <li>• <strong>Video Editor Instructions:</strong> Customize default instructions from Brand Config as needed</li>
                    <li>• <strong>AI Context Preview:</strong> View everything being sent to AI including full brand context</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      <Share className="h-4 w-4" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Batch Sharing & Collaboration</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• <strong>Set Status to &quot;Ready for Editor&quot;:</strong> Required before concepts appear on public batch page</li>
                    <li>• <strong>Batch Share:</strong> Use More Actions → Batch Share → Create Link for team access</li>
                    <li>• <strong>Editor Experience:</strong> Editors see organized concepts, can generate voices, and upload assets</li>
                    <li>• <strong>Brand Resources:</strong> All editing resources from Brand Config automatically appear</li>
                    <li>• <strong>Asset Integration:</strong> Editor uploads go directly to Ad Uploader workflow</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      <Upload className="h-4 w-4" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Asset Management Features</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• <strong>PDF Import:</strong> Import scripts from ChatGPT/Claude via Google Docs - AI extracts scenes automatically</li>
                    <li>• <strong>Easy Upload:</strong> Upload multiple images/videos to auto-create concepts for each asset</li>
                    <li>• <strong>Auto-Description:</strong> AI generates descriptions for uploaded images and videos</li>
                    <li>• <strong>Batch Numbering:</strong> Set custom starting numbers for organized batch management</li>
                    <li>• <strong>Bulk Processing:</strong> Efficient way to create multiple concepts from existing assets</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      <Filter className="h-4 w-4" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Daily Workflow Management</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• <strong>Smart Organization:</strong> Completed concepts automatically move to bottom</li>
                    <li>• <strong>Priority View:</strong> Revision requests appear at top, then assigned/ready concepts</li>
                    <li>• <strong>Editor Filtering:</strong> Filter by specific editors to see their workload and progress</li>
                    <li>• <strong>Status Filtering:</strong> View concepts by status (Completed, Approved, Ready for Review)</li>
                    <li>• <strong>Bookmark Workflow:</strong> Teams can bookmark batch pages for daily work reference</li>
                    <li>• <strong>Real-time Updates:</strong> Batch updates automatically as editors submit work</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Best Practices */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">PowerBrief Best Practices</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-green-900 mb-2">Workflow Efficiency</h4>
                      <ul className="text-green-800 text-sm space-y-1">
                        <li>• Work from the same batch for 2-3 weeks for continuity</li>
                        <li>• Use Facebook Ad Library for reference video sourcing</li>
                        <li>• Set clear statuses to track progress effectively</li>
                        <li>• Leverage batch sharing for seamless team collaboration</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-blue-900 mb-2">AI Optimization</h4>
                      <ul className="text-blue-800 text-sm space-y-1">
                        <li>• Manually refine AI-generated hooks for better results</li>
                        <li>• Use &quot;recreate this&quot; with reference videos for consistency</li>
                        <li>• Include brand products for contextual AI generation</li>
                        <li>• Preview full AI context before generating scripts</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Advanced Features */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Advanced PowerBrief Features</h3>
              
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-5">
                  <h4 className="font-semibold text-purple-900 mb-3">📊 Analytics & Tracking</h4>
                  <ul className="text-purple-800 text-sm space-y-1">
                    <li>• Real-time status updates across all concepts</li>
                    <li>• Editor workload distribution and progress tracking</li>
                    <li>• Revision request management and prioritization</li>
                    <li>• Batch completion metrics and timeline tracking</li>
                  </ul>
                </div>
                
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-5">
                  <h4 className="font-semibold text-blue-900 mb-3">🔗 Integration Benefits</h4>
                  <ul className="text-blue-800 text-sm space-y-1">
                    <li>• Direct asset pipeline to Ad Uploader for seamless publishing</li>
                    <li>• ElevenLabs integration for instant AI voiceover generation</li>
                    <li>• Brand Config synchronization for consistent resources</li>
                    <li>• PDF import with AI scene extraction capabilities</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Summary */}
            <section>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Summary</h3>
              <p className="text-gray-700 mb-4">
                PowerBrief transforms the creative brief process by combining AI-powered script generation with intelligent workflow management. 
                From initial concept creation to final asset delivery, the platform streamlines collaboration between strategists and editors 
                while maintaining creative quality and brand consistency.
              </p>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Key Workflow Benefits</h4>
                <ul className="text-gray-700 text-sm space-y-1">
                  <li>• <strong>Efficiency:</strong> AI-powered script generation saves hours of manual writing</li>
                  <li>• <strong>Organization:</strong> Smart status management and filtering keeps teams aligned</li>
                  <li>• <strong>Collaboration:</strong> Batch sharing enables seamless editor workflows</li>
                  <li>• <strong>Integration:</strong> Direct pipeline from brief creation to ad publishing</li>
                </ul>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
} 