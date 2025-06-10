"use client";
import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Star, Clock, CheckCircle, AlertCircle, Info, Eye, MessageSquare, RefreshCw, CheckSquare } from 'lucide-react';
import SOPVideoUpload from '@/components/sops/SOPVideoUpload';

export default function AssetReviewsSOPPage() {
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
              <Star className="h-8 w-8 text-primary-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Asset Reviews</h1>
              <div className="flex items-center mt-2 space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>16 minutes</span>
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
              sopId="asset-reviews"
              isAdmin={true} // TODO: Replace with actual admin check
            />
          </div>
        </div>

        {/* Content Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Asset Review Process & Quality Standards</h2>
            
            {/* Overview */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Overview</h3>
              <p className="text-gray-700 mb-4">
                The asset review process is crucial for maintaining brand consistency, ensuring quality standards, and optimizing campaign performance across all content types. 
                This module covers the complete review workflow, feedback systems, and approval processes in PowerBrief for ads, web assets, email campaigns, SMS, organic social content, and blog posts.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">Quality Gate System</h4>
                    <p className="text-blue-800 text-sm">
                      PowerBrief&apos;s review system acts as quality gates, ensuring all content meets brand standards 
                      and campaign objectives before going live.
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
                  <span className="text-gray-700">Master the complete asset review workflow in PowerBrief</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Provide constructive, actionable feedback to creative teams</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Implement efficient approval processes and quality standards</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Manage review timelines and stakeholder coordination</span>
                </div>
              </div>
            </section>

            {/* Review Process Stages */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Review Process Stages</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                  <Eye className="h-8 w-8 text-blue-600 mb-3" />
                  <h4 className="font-semibold text-blue-900 mb-2">Initial Review</h4>
                  <p className="text-blue-800 text-sm">First look at creative concepts and executions</p>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                  <MessageSquare className="h-8 w-8 text-green-600 mb-3" />
                  <h4 className="font-semibold text-green-900 mb-2">Feedback Round</h4>
                  <p className="text-green-800 text-sm">Collaborative feedback and revision requests</p>
                </div>
                
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
                  <RefreshCw className="h-8 w-8 text-yellow-600 mb-3" />
                  <h4 className="font-semibold text-yellow-900 mb-2">Revision Cycle</h4>
                  <p className="text-yellow-800 text-sm">Implementation of feedback and re-review</p>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-lg p-4">
                  <CheckSquare className="h-8 w-8 text-purple-600 mb-3" />
                  <h4 className="font-semibold text-purple-900 mb-2">Final Approval</h4>
                  <p className="text-purple-800 text-sm">Stakeholder sign-off and campaign launch</p>
                </div>
              </div>
            </section>

            {/* Review Workflow */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Complete Review Workflow</h3>
              
              <div className="space-y-6">
                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      1
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Content Submission</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• Creative team submits content through PowerBrief system</li>
                    <li>• Ensure all required assets and formats are included</li>
                    <li>• Tag relevant stakeholders and reviewers</li>
                    <li>• Set review deadlines and priority levels</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      2
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Initial Assessment</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• Review against original brief and brand guidelines</li>
                    <li>• Check technical specifications and quality standards</li>
                    <li>• Assess creative execution and message clarity</li>
                    <li>• Evaluate platform compliance and best practices</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      3
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Feedback & Collaboration</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• Provide specific, actionable feedback using PowerBrief tools</li>
                    <li>• Use annotation features for precise visual feedback</li>
                    <li>• Coordinate with multiple stakeholders and reviewers</li>
                    <li>• Track feedback implementation and progress</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      4
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Approval & Launch</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• Conduct final quality check and compliance review</li>
                    <li>• Secure stakeholder approvals and sign-offs</li>
                    <li>• Document approved versions and launch details</li>
                    <li>• Set up performance monitoring and tracking</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Quality Standards */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Quality Standards Checklist</h3>
              
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
                  <h4 className="font-semibold text-blue-900 mb-3">Brand Compliance</h4>
                  <ul className="text-blue-800 text-sm space-y-1">
                    <li>✓ Logo usage and placement according to brand guidelines</li>
                    <li>✓ Color palette and typography consistency</li>
                    <li>✓ Brand voice and tone alignment</li>
                    <li>✓ Message consistency with brand positioning</li>
                  </ul>
                </div>
                
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-5">
                  <h4 className="font-semibold text-green-900 mb-3">Technical Quality</h4>
                  <ul className="text-green-800 text-sm space-y-1">
                    <li>✓ Image/video resolution and format specifications</li>
                    <li>✓ File size optimization for platform requirements</li>
                    <li>✓ Audio quality and synchronization (for video)</li>
                    <li>✓ Text readability and accessibility standards</li>
                  </ul>
                </div>
                
                <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-lg p-5">
                  <h4 className="font-semibold text-purple-900 mb-3">Platform Compliance</h4>
                  <ul className="text-purple-800 text-sm space-y-1">
                    <li>✓ Ad policy compliance for target platforms</li>
                    <li>✓ Character limits and text overlay restrictions</li>
                    <li>✓ Call-to-action clarity and placement</li>
                    <li>✓ Legal disclaimers and required disclosures</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Feedback Best Practices */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Effective Feedback Practices</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-green-900 mb-2">Constructive Feedback</h4>
                      <ul className="text-green-800 text-sm space-y-1">
                        <li>• Be specific about what needs changing</li>
                        <li>• Explain the reasoning behind feedback</li>
                        <li>• Suggest solutions, not just problems</li>
                        <li>• Reference brand guidelines and objectives</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-red-900 mb-2">Feedback Pitfalls</h4>
                      <ul className="text-red-800 text-sm space-y-1">
                        <li>• Vague or subjective comments</li>
                        <li>• Last-minute major directional changes</li>
                        <li>• Conflicting feedback from multiple reviewers</li>
                        <li>• Personal preferences over strategic direction</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* PowerBrief Review Tools */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">PowerBrief Review Features</h3>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                <h4 className="font-medium text-gray-900 mb-3">Review Tools & Features</h4>
                <div className="space-y-3 text-gray-700 text-sm">
                  <p>• <strong>Visual Annotations:</strong> Pin comments directly on creative elements</p>
                  <p>• <strong>Version Control:</strong> Track changes and compare iterations</p>
                  <p>• <strong>Stakeholder Management:</strong> Assign reviewers and manage approvals</p>
                  <p>• <strong>Automated Notifications:</strong> Keep all parties informed of review status</p>
                  <p>• <strong>Approval Workflows:</strong> Customize approval chains for different content types</p>
                  <p>• <strong>Deadline Tracking:</strong> Monitor review timelines and bottlenecks</p>
                </div>
              </div>
            </section>

            {/* Common Review Scenarios */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Common Review Scenarios</h3>
              
              <div className="space-y-4">
                <div className="border border-orange-200 bg-orange-50 rounded-lg p-4">
                  <h4 className="font-medium text-orange-900 mb-2">Scenario: Urgent Campaign Launch</h4>
                  <p className="text-orange-800 text-sm mb-2">Campaign needs to launch within 24 hours with limited review time.</p>
                  <p className="text-orange-700 text-sm font-medium">Solution: Use expedited review process with focused feedback on critical elements only.</p>
                </div>
                
                <div className="border border-orange-200 bg-orange-50 rounded-lg p-4">
                  <h4 className="font-medium text-orange-900 mb-2">Scenario: Conflicting Stakeholder Feedback</h4>
                  <p className="text-orange-800 text-sm mb-2">Multiple reviewers provide contradictory direction on creative execution.</p>
                  <p className="text-orange-700 text-sm font-medium">Solution: Schedule alignment meeting to resolve conflicts before proceeding with revisions.</p>
                </div>
                
                <div className="border border-orange-200 bg-orange-50 rounded-lg p-4">
                  <h4 className="font-medium text-orange-900 mb-2">Scenario: Major Creative Pivot Required</h4>
                  <p className="text-orange-800 text-sm mb-2">Initial creative direction doesn&apos;t align with campaign objectives.</p>
                  <p className="text-orange-700 text-sm font-medium">Solution: Return to brief review process and realign creative strategy before continuing.</p>
                </div>
              </div>
            </section>

            {/* Summary */}
            <section>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Summary</h3>
              <p className="text-gray-700 mb-4">
                Effective asset review processes are essential for campaign success across all content types. By implementing structured workflows, 
                maintaining quality standards, and providing constructive feedback, you can ensure consistent, high-quality 
                creative output that drives business results.
              </p>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Next Steps</h4>
                <p className="text-gray-700 text-sm">
                  Practice using PowerBrief&apos;s review tools with your team. Establish clear quality standards and 
                  feedback guidelines. Consider exploring the &quot;Team Sync&quot; module to learn how review processes 
                  integrate with broader team collaboration workflows.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
} 