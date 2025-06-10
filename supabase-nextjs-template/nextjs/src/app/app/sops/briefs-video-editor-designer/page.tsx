"use client";
import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Video, Clock, CheckCircle, Palette, Monitor, Layers } from 'lucide-react';
import SOPVideoUpload from '@/components/sops/SOPVideoUpload';

export default function BriefsVideoEditorDesignerSOPPage() {
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
              <Video className="h-8 w-8 text-primary-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Briefs: Video Editor/Designer Version</h1>
              <div className="flex items-center mt-2 space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>15 minutes</span>
                </div>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                  Beginner
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
              sopId="briefs-video-editor-designer"
              isAdmin={true} // TODO: Replace with actual admin check
            />
          </div>
        </div>

        {/* Content Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Creative Execution: From Brief to Delivery</h2>
            
            {/* Overview */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Overview</h3>
              <p className="text-gray-700 mb-4">
                As a video editor or designer, you transform strategic briefs into compelling visual content that drives results. 
                This module covers brief interpretation, technical requirements, creative workflows, and delivery standards 
                to ensure your work aligns perfectly with campaign objectives and brand guidelines.
              </p>
              
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Palette className="h-5 w-5 text-emerald-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-emerald-900 mb-1">Creative Excellence Through Understanding</h4>
                    <p className="text-emerald-800 text-sm">
                      Great creative work starts with deep understanding of the brief, brand, and audience. 
                      This module helps you decode strategic direction into impactful visual execution.
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
                  <span className="text-gray-700">Interpret strategic briefs and translate them into creative concepts</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Master technical specifications and platform requirements</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Implement brand guidelines and maintain visual consistency</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Collaborate effectively with strategists and stakeholders</span>
                </div>
              </div>
            </section>

            {/* Creative Disciplines */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Creative Disciplines</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-red-50 to-pink-50 border border-red-200 rounded-lg p-4">
                  <Video className="h-8 w-8 text-red-600 mb-3" />
                  <h4 className="font-semibold text-red-900 mb-2">Video Editing</h4>
                  <p className="text-red-800 text-sm">Motion graphics, storytelling, and post-production</p>
                </div>
                
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                  <Palette className="h-8 w-8 text-blue-600 mb-3" />
                  <h4 className="font-semibold text-blue-900 mb-2">Graphic Design</h4>
                  <p className="text-blue-800 text-sm">Static ads, layouts, and visual identity</p>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                  <Monitor className="h-8 w-8 text-green-600 mb-3" />
                  <h4 className="font-semibold text-green-900 mb-2">Digital Design</h4>
                  <p className="text-green-800 text-sm">Web assets, digital campaigns, and interactive content</p>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-lg p-4">
                  <Layers className="h-8 w-8 text-purple-600 mb-3" />
                  <h4 className="font-semibold text-purple-900 mb-2">Multi-Format</h4>
                  <p className="text-purple-800 text-sm">Cross-platform asset creation and adaptation</p>
                </div>
              </div>
            </section>

            {/* Brief Interpretation */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Brief Interpretation & Analysis</h3>
              
              <div className="space-y-6">
                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      1
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Understanding the Objective</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• Identify the primary campaign goal and success metrics</li>
                    <li>• Understand the target audience and their motivations</li>
                    <li>• Recognize the desired emotional response and action</li>
                    <li>• Note any specific performance requirements or constraints</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      2
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Creative Direction Decoding</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• Analyze tone of voice and visual style requirements</li>
                    <li>• Study reference materials and inspiration provided</li>
                    <li>• Understand messaging hierarchy and key callouts</li>
                    <li>• Identify mandatory elements vs. creative flexibility areas</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      3
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Technical Requirements</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• Review platform specifications and format requirements</li>
                    <li>• Note dimensions, duration, and file size limitations</li>
                    <li>• Understand delivery timelines and milestone dates</li>
                    <li>• Identify any special technical considerations or features</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      4
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Asset & Resource Planning</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• Inventory available brand assets and stock materials</li>
                    <li>• Identify what additional assets need to be created or sourced</li>
                    <li>• Plan for music, sound effects, or voiceover needs</li>
                    <li>• Estimate production time and resource requirements</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Creative Workflow */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Creative Production Workflow</h3>
              
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
                  <h4 className="font-semibold text-blue-900 mb-3">Concept Development</h4>
                  <ul className="text-blue-800 text-sm space-y-1">
                    <li>• Create initial concept sketches or storyboards</li>
                    <li>• Develop multiple creative approaches for review</li>
                    <li>• Consider platform-specific adaptations early</li>
                    <li>• Present concepts with strategic rationale</li>
                  </ul>
                </div>
                
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-5">
                  <h4 className="font-semibold text-green-900 mb-3">Production Execution</h4>
                  <ul className="text-green-800 text-sm space-y-1">
                    <li>• Set up organized project files and folder structures</li>
                    <li>• Create assets using approved brand guidelines</li>
                    <li>• Build in flexibility for potential revisions</li>
                    <li>• Maintain version control throughout production</li>
                  </ul>
                </div>
                
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-5">
                  <h4 className="font-semibold text-yellow-900 mb-3">Review & Refinement</h4>
                  <ul className="text-yellow-800 text-sm space-y-1">
                    <li>• Present work in context with clear explanations</li>
                    <li>• Incorporate feedback while maintaining creative integrity</li>
                    <li>• Test across different devices and platforms</li>
                    <li>• Optimize for performance and accessibility</li>
                  </ul>
                </div>
                
                <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-lg p-5">
                  <h4 className="font-semibold text-purple-900 mb-3">Delivery & Handoff</h4>
                  <ul className="text-purple-800 text-sm space-y-1">
                    <li>• Export in all required formats and specifications</li>
                    <li>• Provide organized asset packages with documentation</li>
                    <li>• Include source files and project documentation</li>
                    <li>• Deliver within agreed timelines with quality checks</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Platform Specifications */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Platform-Specific Requirements</h3>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                <h4 className="font-medium text-gray-900 mb-3">Key Platform Considerations</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div>
                    <h5 className="font-medium text-gray-800 mb-2">Facebook & Instagram</h5>
                    <ul className="text-gray-600 space-y-1">
                      <li>• Square (1:1), Portrait (4:5), Story (9:16) formats</li>
                      <li>• Video: 15s-60s duration, MP4 format</li>
                      <li>• Text overlay: Max 20% for optimal reach</li>
                      <li>• Captions: Essential for mobile viewing</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-800 mb-2">YouTube & TikTok</h5>
                    <ul className="text-gray-600 space-y-1">
                      <li>• YouTube: 16:9 landscape, various durations</li>
                      <li>• TikTok: 9:16 vertical, 15s-60s optimal</li>
                      <li>• High-energy openings to capture attention</li>
                      <li>• Platform-native editing styles and effects</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-800 mb-2">LinkedIn & Twitter</h5>
                    <ul className="text-gray-600 space-y-1">
                      <li>• Professional tone and business context</li>
                      <li>• Text-heavy content performs well</li>
                      <li>• Landscape (16:9) and square (1:1) formats</li>
                      <li>• Clear, readable fonts and high contrast</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-800 mb-2">Google Ads & Display</h5>
                    <ul className="text-gray-600 space-y-1">
                      <li>• Multiple format variations required</li>
                      <li>• Banner sizes: 728x90, 300x250, 160x600</li>
                      <li>• File size optimization critical</li>
                      <li>• Clear call-to-action placement</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Brand Compliance */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Brand Guidelines & Quality Standards</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-green-900 mb-2">Visual Standards</h4>
                      <ul className="text-green-800 text-sm space-y-1">
                        <li>• Use approved brand colors and typography</li>
                        <li>• Maintain proper logo placement and sizing</li>
                        <li>• Follow grid systems and layout principles</li>
                        <li>• Ensure accessibility and readability standards</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <Monitor className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-blue-900 mb-2">Technical Quality</h4>
                      <ul className="text-blue-800 text-sm space-y-1">
                        <li>• Export at optimal resolution and compression</li>
                        <li>• Test across different devices and screens</li>
                        <li>• Validate color accuracy and consistency</li>
                        <li>• Ensure smooth playback and loading</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Collaboration Best Practices */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Collaboration & Communication</h3>
              
              <div className="space-y-4">
                <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Working with Strategists</h4>
                  <p className="text-blue-800 text-sm mb-2">Ask clarifying questions early, present concepts with strategic reasoning, and collaborate on optimization.</p>
                  <p className="text-blue-700 text-sm font-medium">Key: Understand the &quot;why&quot; behind creative decisions to make better executions.</p>
                </div>
                
                <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-2">Client & Stakeholder Feedback</h4>
                  <p className="text-green-800 text-sm mb-2">Present work professionally, explain creative choices, and manage feedback constructively.</p>
                  <p className="text-green-700 text-sm font-medium">Key: Guide stakeholders toward feedback that improves performance, not just preferences.</p>
                </div>
                
                <div className="border border-purple-200 bg-purple-50 rounded-lg p-4">
                  <h4 className="font-medium text-purple-900 mb-2">Team Coordination</h4>
                  <p className="text-purple-800 text-sm mb-2">Share progress updates, flag potential issues early, and coordinate with other team members.</p>
                  <p className="text-purple-700 text-sm font-medium">Key: Proactive communication prevents last-minute rushes and quality compromises.</p>
                </div>
              </div>
            </section>

            {/* Delivery Standards */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Professional Delivery Standards</h3>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                <h4 className="font-medium text-gray-900 mb-3">Complete Delivery Package</h4>
                <div className="space-y-3 text-gray-700 text-sm">
                  <p>• <strong>Final Assets:</strong> All required formats and platform variations</p>
                  <p>• <strong>Source Files:</strong> Editable project files for future modifications</p>
                  <p>• <strong>Asset Library:</strong> Individual elements and components used</p>
                  <p>• <strong>Documentation:</strong> Specifications, notes, and usage guidelines</p>
                  <p>• <strong>Preview Materials:</strong> Mockups or demos showing assets in context</p>
                </div>
              </div>
            </section>

            {/* Summary */}
            <section>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Summary</h3>
              <p className="text-gray-700 mb-4">
                Successful creative execution requires deep understanding of strategic objectives, meticulous attention to 
                technical requirements, and seamless collaboration with team members. By mastering brief interpretation 
                and maintaining high delivery standards, you contribute directly to campaign success and client satisfaction.
              </p>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Next Steps</h4>
                <p className="text-gray-700 text-sm">
                  Practice brief analysis with real examples, familiarize yourself with platform requirements, 
                  and explore the &quot;Ad Upload Tool&quot; module to learn about proper asset organization and delivery.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
} 