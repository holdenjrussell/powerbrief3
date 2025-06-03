"use client";
import React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, Clock, CheckCircle, AlertCircle, Lightbulb, Target, Users } from 'lucide-react';

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
                  <span>18 minutes</span>
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
            <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-primary-600" />
                </div>
                <p className="text-gray-600 font-medium">Creative Strategist Brief Training</p>
                <p className="text-gray-500 text-sm mt-1">Strategic brief creation and management</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Creative Brief Mastery for Strategists</h2>
            
            {/* Overview */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Overview</h3>
              <p className="text-gray-700 mb-4">
                As a creative strategist, you&apos;re responsible for translating business objectives into compelling creative direction. 
                This module covers the strategic approach to brief creation, from initial concept development to final execution guidance.
              </p>
              
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Lightbulb className="h-5 w-5 text-purple-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-purple-900 mb-1">Strategic Thinking Focus</h4>
                    <p className="text-purple-800 text-sm">
                      This module emphasizes strategic frameworks, audience insights, and creative direction 
                      that drives measurable business results.
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
                  <span className="text-gray-700">Develop comprehensive creative strategies aligned with business goals</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Create detailed audience personas and targeting strategies</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Master the PowerBrief strategic brief template system</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Collaborate effectively with creative teams and stakeholders</span>
                </div>
              </div>
            </section>

            {/* Strategic Framework */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Strategic Brief Framework</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                  <Target className="h-8 w-8 text-blue-600 mb-3" />
                  <h4 className="font-semibold text-blue-900 mb-2">Objective Setting</h4>
                  <p className="text-blue-800 text-sm">Define clear, measurable business and creative objectives</p>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                  <Users className="h-8 w-8 text-green-600 mb-3" />
                  <h4 className="font-semibold text-green-900 mb-2">Audience Analysis</h4>
                  <p className="text-green-800 text-sm">Deep dive into target audience insights and behaviors</p>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-lg p-4">
                  <Lightbulb className="h-8 w-8 text-purple-600 mb-3" />
                  <h4 className="font-semibold text-purple-900 mb-2">Creative Direction</h4>
                  <p className="text-purple-800 text-sm">Provide clear, inspiring direction for creative execution</p>
                </div>
              </div>
            </section>

            {/* Brief Creation Process */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Strategic Brief Creation Process</h3>
              
              <div className="space-y-6">
                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      1
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Strategic Foundation</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• Analyze business objectives and campaign goals</li>
                    <li>• Review brand positioning and key messages</li>
                    <li>• Define success metrics and KPIs</li>
                    <li>• Assess competitive landscape and opportunities</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      2
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Audience Strategy</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• Develop detailed audience personas</li>
                    <li>• Map customer journey and touchpoints</li>
                    <li>• Identify key insights and motivations</li>
                    <li>• Define targeting parameters and media strategy</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      3
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Creative Framework</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• Craft compelling creative challenge statement</li>
                    <li>• Define tone of voice and creative principles</li>
                    <li>• Provide reference materials and inspiration</li>
                    <li>• Set deliverable requirements and formats</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      4
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Execution Guidance</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• Provide detailed execution specifications</li>
                    <li>• Set timeline and milestone expectations</li>
                    <li>• Define approval process and stakeholders</li>
                    <li>• Plan for measurement and optimization</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Advanced Techniques */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Advanced Strategic Techniques</h3>
              
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-5">
                  <h4 className="font-semibold text-indigo-900 mb-3">Insight-Driven Creative Challenges</h4>
                  <ul className="text-indigo-800 text-sm space-y-1">
                    <li>• Transform data insights into creative opportunities</li>
                    <li>• Use consumer behavior research to guide direction</li>
                    <li>• Leverage cultural moments and trends strategically</li>
                    <li>• Connect emotional and rational benefits seamlessly</li>
                  </ul>
                </div>
                
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-5">
                  <h4 className="font-semibold text-green-900 mb-3">Multi-Channel Strategy Integration</h4>
                  <ul className="text-green-800 text-sm space-y-1">
                    <li>• Design cohesive cross-platform campaigns</li>
                    <li>• Adapt core message for different media channels</li>
                    <li>• Plan content ecosystem and touchpoint strategy</li>
                    <li>• Optimize for platform-specific behaviors</li>
                  </ul>
                </div>
                
                <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-lg p-5">
                  <h4 className="font-semibold text-purple-900 mb-3">Performance-Driven Creative Direction</h4>
                  <ul className="text-purple-800 text-sm space-y-1">
                    <li>• Build in testing and optimization frameworks</li>
                    <li>• Design for measurable creative performance</li>
                    <li>• Plan variations for A/B testing strategies</li>
                    <li>• Create scalable creative systems</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Collaboration Best Practices */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Stakeholder Collaboration</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-green-900 mb-2">Effective Practices</h4>
                      <ul className="text-green-800 text-sm space-y-1">
                        <li>• Involve key stakeholders in brief development</li>
                        <li>• Present strategic rationale clearly</li>
                        <li>• Anticipate and address potential concerns</li>
                        <li>• Document decisions and approvals</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-red-900 mb-2">Common Pitfalls</h4>
                      <ul className="text-red-800 text-sm space-y-1">
                        <li>• Creating briefs in isolation</li>
                        <li>• Lacking clear success metrics</li>
                        <li>• Providing vague creative direction</li>
                        <li>• Skipping stakeholder alignment</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* PowerBrief Features */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Leveraging PowerBrief Features</h3>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                <h4 className="font-medium text-gray-900 mb-3">Strategic Tools in PowerBrief</h4>
                <div className="space-y-3 text-gray-700 text-sm">
                  <p>• <strong>Template System:</strong> Use strategic brief templates for consistency</p>
                  <p>• <strong>Asset Integration:</strong> Link brand assets directly to brief context</p>
                  <p>• <strong>Collaboration Tools:</strong> Real-time feedback and approval workflows</p>
                  <p>• <strong>Version Control:</strong> Track brief evolution and stakeholder input</p>
                  <p>• <strong>Performance Tracking:</strong> Connect briefs to campaign results</p>
                </div>
              </div>
            </section>

            {/* Summary */}
            <section>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Summary</h3>
              <p className="text-gray-700 mb-4">
                Strategic brief creation is both an art and a science. By combining deep audience insights, 
                clear business objectives, and inspiring creative direction, you can create briefs that drive 
                exceptional campaign performance and meaningful business results.
              </p>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Next Steps</h4>
                <p className="text-gray-700 text-sm">
                  Practice creating strategic briefs using the PowerBrief template system. Consider exploring 
                  the &quot;UGC Pipeline&quot; module to understand how strategic briefs translate into 
                  creator-driven content campaigns.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
} 