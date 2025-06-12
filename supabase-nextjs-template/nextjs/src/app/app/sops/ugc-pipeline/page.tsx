"use client";
import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, Clock, CheckCircle, AlertCircle, ArrowRight, Zap } from 'lucide-react';
import SOPVideoUpload from '@/components/sops/SOPVideoUpload';

export default function UGCPipelineSOPPage() {
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
              <Users className="h-8 w-8 text-primary-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">UGC Pipeline</h1>
              <div className="flex items-center mt-2 space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>25 minutes</span>
                </div>
                <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                  Advanced
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
              sopId="ugc-pipeline"
              isAdmin={true} // TODO: Replace with actual admin check
            />
          </div>
        </div>

        {/* Content Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">User-Generated Content Pipeline Guide</h2>
            
            {/* Overview */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Overview</h3>
              <p className="text-gray-700 mb-4">
                The UGC Pipeline is a comprehensive system for managing user-generated content from initial concept through final delivery. 
                This advanced workflow involves creator management, content strategy, production oversight, and quality control processes.
              </p>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-amber-900 mb-1">Advanced Module</h4>
                    <p className="text-amber-800 text-sm">
                      This module requires understanding of PowerBrief basics and brief management. 
                      Complete the Brand Config and Briefs modules first if you haven&apos;t already.
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
                  <span className="text-gray-700">Master the complete UGC workflow from concept to delivery</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Manage creator relationships and communications</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Implement quality control and approval processes</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Track performance metrics and optimize campaigns</span>
                </div>
              </div>
            </section>

            {/* Pipeline Workflow */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">UGC Pipeline Workflow</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      1
                    </div>
                    <span className="font-medium text-gray-900">Concept Development</span>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
                
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      2
                    </div>
                    <span className="font-medium text-gray-900">Creator Selection & Briefing</span>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
                
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-yellow-100 text-yellow-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      3
                    </div>
                    <span className="font-medium text-gray-900">Content Production</span>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
                
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      4
                    </div>
                    <span className="font-medium text-gray-900">Review & Approval</span>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
                
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      5
                    </div>
                    <span className="font-medium text-gray-900">Launch & Performance Tracking</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Detailed Steps */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Detailed Implementation</h3>
              
              <div className="space-y-6">
                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      1
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Concept Development</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• Define campaign objectives and target audience</li>
                    <li>• Create detailed creative briefs with visual references</li>
                    <li>• Set budget parameters and timeline expectations</li>
                    <li>• Establish key performance indicators (KPIs)</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      2
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Creator Selection & Briefing</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• Research and vet potential creators based on brand fit</li>
                    <li>• Send detailed briefs with brand guidelines</li>
                    <li>• Negotiate terms, deliverables, and timelines</li>
                    <li>• Set up communication channels and check-in schedules</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-yellow-100 text-yellow-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      3
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Content Production</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• Monitor creator progress through regular check-ins</li>
                    <li>• Provide feedback on drafts and concept iterations</li>
                    <li>• Ensure brand compliance and quality standards</li>
                    <li>• Manage revisions and adjustment requests</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      4
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Review & Approval</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• Conduct comprehensive content review against brief</li>
                    <li>• Check legal compliance and platform requirements</li>
                    <li>• Gather stakeholder approvals and sign-offs</li>
                    <li>• Finalize content delivery and usage rights</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      5
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Launch & Performance Tracking</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• Coordinate content launch across platforms</li>
                    <li>• Monitor performance metrics and engagement</li>
                    <li>• Analyze ROI and campaign effectiveness</li>
                    <li>• Document learnings for future campaigns</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Contract Management */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Contract Management & Sending</h3>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-blue-600 mt-0.5 mr-4 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-2">Contract Overview</h4>
                    <p className="text-blue-800 text-sm">
                      Contracts are essential for protecting both your brand and creators. PowerBrief provides a complete contract management system
                      that handles creation, sending, signing, and tracking of all creator agreements.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="border border-gray-200 rounded-lg p-5">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Method 1: Sending Contracts from the Contracts Tab</h4>
                  
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-2">Step 1: Navigate to Contracts</h5>
                      <ul className="text-gray-700 text-sm space-y-1 ml-4">
                        <li>• Go to UGC Pipeline → Creators → Contracts</li>
                        <li>• You'll see existing contracts and templates</li>
                      </ul>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-2">Step 2: Select Template</h5>
                      <ul className="text-gray-700 text-sm space-y-1 ml-4">
                        <li>• Click on "Templates" tab</li>
                        <li>• Find your desired contract template</li>
                        <li>• Click the "bullseye" (🎯) icon to open the PowerBrief editor</li>
                        <li>• All fields (signatures, text fields, etc.) will be preloaded</li>
                      </ul>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-2">Step 3: Add Recipients</h5>
                      <ul className="text-gray-700 text-sm space-y-1 ml-4">
                        <li>• Click "Add Recipient"</li>
                        <li>• All creators loaded into PowerBrief are available in the dropdown</li>
                        <li>• Select the creator you want to send the contract to</li>
                        <li>• Click "Add" to confirm the recipient</li>
                      </ul>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-2">Step 4: Send Contract</h5>
                      <ul className="text-gray-700 text-sm space-y-1 ml-4">
                        <li>• Click the "Send" button</li>
                        <li>• Confirm by clicking "Send" again in the confirmation dialog</li>
                        <li>• Wait for the "Contract sent successfully" message</li>
                        <li>• The system will automatically send an email to the creator</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-5">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Method 2: Sending Contracts from Script Pipeline</h4>
                  
                  <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
                        <div>
                          <h5 className="font-medium text-amber-900 mb-1">Contract Requirement</h5>
                          <p className="text-amber-800 text-sm">
                            When a script reaches "Send Scripts to Creator" status, you cannot proceed without sending a contract first.
                            The system will show a warning if the creator's contract status is not signed.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-2">Step 1: Navigate to Script</h5>
                      <ul className="text-gray-700 text-sm space-y-1 ml-4">
                        <li>• Go to UGC Pipeline → Concept View</li>
                        <li>• Find a script with "Send Scripts to Creator" status</li>
                        <li>• Look for the contract warning if the creator hasn't signed</li>
                      </ul>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-2">Step 2: Send Contract</h5>
                      <ul className="text-gray-700 text-sm space-y-1 ml-4">
                        <li>• Click "Send Contract" button in the script card</li>
                        <li>• This opens the contract template selection dialog</li>
                        <li>• Select your preferred template and click "Send"</li>
                        <li>• The contract will be sent to the assigned creator automatically</li>
                      </ul>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-2">Step 3: Continue with Script</h5>
                      <ul className="text-gray-700 text-sm space-y-1 ml-4">
                        <li>• Once contract is sent, the warning changes to "Contract Pending"</li>
                        <li>• You can now proceed with sending the script to the creator</li>
                        <li>• The "Send Scripts to Creator" action will be enabled</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-5">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Creator Signing Process</h4>
                  
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-2">Email Delivery</h5>
                      <ul className="text-gray-700 text-sm space-y-1 ml-4">
                        <li>• Creator receives an email with a link to sign the contract</li>
                        <li>• The email contains all necessary information and instructions</li>
                        <li>• Creator clicks the link to access the signing interface</li>
                      </ul>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-2">Signing Interface</h5>
                      <ul className="text-gray-700 text-sm space-y-1 ml-4">
                        <li>• Creator can review the entire contract document</li>
                        <li>• Fill out any required text fields</li>
                        <li>• Provide digital signature where indicated</li>
                        <li>• Click "Complete" to finalize the signing</li>
                      </ul>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-2">Completion & Confirmation</h5>
                      <ul className="text-gray-700 text-sm space-y-1 ml-4">
                        <li>• System sends confirmation email to both parties</li>
                        <li>• Contract status automatically updates to "Contract Signed"</li>
                        <li>• Signed document is available for download</li>
                        <li>• Creator's profile is automatically updated in the system</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-5">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Creating New Templates</h4>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-2">PowerBrief Editor</h5>
                    <ul className="text-gray-700 text-sm space-y-1 ml-4">
                      <li>• Click "New Template" → "PowerBrief Editor"</li>
                      <li>• Upload a PDF contract document</li>
                      <li>• Add interactive fields (signature, text, date, etc.)</li>
                      <li>• Save as template for future use</li>
                      <li>• All field positions and types are preserved</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Pro Tips */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Pro Tips</h3>
              
              <div className="bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-200 rounded-lg p-6">
                <div className="flex items-start">
                  <Zap className="h-6 w-6 text-primary-600 mt-0.5 mr-4 flex-shrink-0" />
                  <div className="space-y-3">
                    <h4 className="font-semibold text-primary-900">Advanced Strategies</h4>
                    <ul className="text-primary-800 text-sm space-y-2">
                      <li>• Create creator personas to streamline selection process</li>
                      <li>• Use A/B testing for different creative approaches</li>
                      <li>• Implement automated approval workflows for efficiency</li>
                      <li>• Build long-term relationships with top-performing creators</li>
                      <li>• Leverage user-generated content for organic amplification</li>
                      <li>• Send contracts early in the creator relationship to establish legal protection</li>
                      <li>• Create different contract templates for different creator tiers or project types</li>
                      <li>• Monitor contract status regularly to avoid pipeline bottlenecks</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Common Challenges */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Common Challenges & Solutions</h3>
              
              <div className="space-y-4">
                <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                  <h4 className="font-medium text-red-900 mb-2">Challenge: Creator Communication Issues</h4>
                  <p className="text-red-800 text-sm mb-2">Difficulty maintaining clear communication with multiple creators simultaneously.</p>
                  <p className="text-red-700 text-sm font-medium">Solution: Use standardized templates and scheduled check-in systems.</p>
                </div>
                
                <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                  <h4 className="font-medium text-red-900 mb-2">Challenge: Quality Inconsistency</h4>
                  <p className="text-red-800 text-sm mb-2">Varying quality levels across different creators and content pieces.</p>
                  <p className="text-red-700 text-sm font-medium">Solution: Implement detailed quality checklists and creator vetting processes.</p>
                </div>
                
                <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                  <h4 className="font-medium text-red-900 mb-2">Challenge: Timeline Management</h4>
                  <p className="text-red-800 text-sm mb-2">Keeping multiple projects on track with different creators and deadlines.</p>
                  <p className="text-red-700 text-sm font-medium">Solution: Use project management tools and build buffer time into schedules.</p>
                </div>
                
                <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                  <h4 className="font-medium text-red-900 mb-2">Challenge: Contract Management Delays</h4>
                  <p className="text-red-800 text-sm mb-2">Scripts getting stuck in the pipeline because contracts haven't been sent or signed.</p>
                  <p className="text-red-700 text-sm font-medium">Solution: Send contracts immediately when creators are assigned and monitor contract status regularly.</p>
                </div>
              </div>
            </section>

            {/* Summary */}
            <section>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Summary</h3>
              <p className="text-gray-700 mb-4">
                The UGC Pipeline is a sophisticated system that requires careful planning, execution, and monitoring. 
                Success depends on clear communication, quality control, and continuous optimization based on performance data.
              </p>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Key Takeaways</h4>
                <ul className="text-gray-700 text-sm space-y-1">
                  <li>• Invest time in thorough creator vetting and briefing</li>
                  <li>• Maintain consistent communication throughout the process</li>
                  <li>• Build quality control checkpoints at every stage</li>
                  <li>• Track performance metrics to optimize future campaigns</li>
                  <li>• Send contracts early and monitor signing status to prevent pipeline delays</li>
                  <li>• Use automated contract status updates to keep creator profiles current</li>
                </ul>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
} 