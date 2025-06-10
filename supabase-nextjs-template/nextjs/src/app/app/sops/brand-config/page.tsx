"use client";
import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Settings, Clock, CheckCircle, AlertCircle, Info, Users, Zap, Globe, MessageSquare } from 'lucide-react';
import SOPVideoUpload from '@/components/sops/SOPVideoUpload';

export default function BrandConfigSOPPage() {
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
              <Settings className="h-8 w-8 text-primary-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">PowerBrief: Brand Config</h1>
              <div className="flex items-center mt-2 space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>6 minutes</span>
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
              sopId="brand-config"
              isAdmin={true} // TODO: Replace with actual admin check
            />
          </div>
        </div>

        {/* Content Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Brand Configuration Guide</h2>
            
            {/* Overview */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Overview</h3>
              <p className="text-gray-700 mb-4">
                Brand configuration is where you set up all the essential settings for your brand to ensure AI-generated briefs have the right context, 
                integrations work properly, and your team can collaborate effectively. This comprehensive setup includes everything from basic brand 
                information to advanced integrations like Meta, ElevenLabs, and Slack.
              </p>
              
              <div className="bg-info-50 border border-info-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Info className="h-5 w-5 text-info-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-info-900 mb-1">Access Brand Config</h4>
                    <p className="text-info-800 text-sm">
                      Navigate to <strong>Manage Brands</strong> to add new brands or click into an existing brand to configure all settings. 
                      Remember to click <strong>Save</strong> after making any changes.
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
                  <span className="text-gray-700">Configure core brand identity and positioning</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Set up product catalog with pricing for AI context</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Configure ElevenLabs for voice generation</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Set up Meta integration for ad uploading</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Configure Slack notifications and team management</span>
                </div>
              </div>
            </section>

            {/* Step-by-Step Guide */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Step-by-Step Configuration</h3>
              
              <div className="space-y-6">
                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      1
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Create and Access Brand</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• Go to <strong>Manage Brands</strong></li>
                    <li>• Click <strong>Add New Brand</strong> and enter a name (e.g., &quot;Test&quot;)</li>
                    <li>• Click into the brand to access all configuration options</li>
                    <li>• Use an existing brand like &quot;Glamoury&quot; to see a fully configured example</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      2
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Core Brand Information</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• <strong>Brand Name:</strong> Set your official brand name</li>
                    <li>• <strong>Positioning:</strong> Define your brand's market position</li>
                    <li>• <strong>Product Technology:</strong> Describe your product technology</li>
                    <li>• <strong>Benefits:</strong> List key product benefits</li>
                    <li>• <strong>Target Audience:</strong> Define who you're targeting</li>
                    <li>• <strong>Brand Voice:</strong> Set your communication style</li>
                    <li>• <strong>Competitive Advantage:</strong> What sets you apart</li>
                    <li>• <strong>Gender/Age/Demographics:</strong> Detailed audience info</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      3
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Product Catalog Setup</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• Add individual products that can be selected in briefs</li>
                    <li>• Example: &quot;Glamoury Micro Infusion Kit&quot;</li>
                    <li>• Set <strong>MSRP</strong> and <strong>Sale Price</strong> for each product</li>
                    <li>• This pricing context helps AI generate relevant scripts</li>
                    <li>• Products appear as selectable options when creating briefs</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      4
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Content Guidelines & Assets</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• <strong>Notes & Competition:</strong> Add research notes and competitor info</li>
                    <li>• <strong>Links Libraries:</strong> Reference links for inspiration</li>
                    <li>• <strong>Default Video Instructions:</strong> These appear at the top of each brief</li>
                    <li>• <strong>Editing Resources:</strong> Upload brand assets for editors</li>
                    <li>• <strong>Brand Identity:</strong> Images, icons, logos, brand URL</li>
                    <li>• <strong>Resource Logins:</strong> Access credentials for ElevenLabs, Envato, Google, etc.</li>
                    <li>• <strong>Do&apos;s and Don&apos;ts:</strong> Content creation guidelines</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      <Zap className="h-4 w-4" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">ElevenLabs Voice Integration</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• Briefs include ElevenLabs integration for voice generation</li>
                    <li>• Go to <strong>elevenlabs.io</strong> → <strong>My Account</strong> → <strong>API Keys</strong></li>
                    <li>• Click <strong>Create API Key</strong></li>
                    <li>• Copy the API key and paste it into the ElevenLabs field</li>
                    <li>• This enables voice generation directly within briefs</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      <Globe className="h-4 w-4" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Meta Integration (Ad Uploader)</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• Click <strong>Connect</strong> to link your Meta account</li>
                    <li>• Select your brand from the dropdown</li>
                    <li>• Instagram linking is automatic if you have full permissions</li>
                    <li>• If Instagram doesn't appear (partial access), manually add the <strong>Page ID</strong></li>
                    <li>• Add your <strong>Meta Pixel ID</strong> for tracking</li>
                    <li>• Click <strong>Save Selection</strong> to complete setup</li>
                    <li>• <em>Note: May be in development mode, contact admin for additional brand connections</em></li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Slack Integration Setup</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• Go to <strong>api.slack.com/apps</strong></li>
                    <li>• Click <strong>Create New App</strong> → <strong>From App Manifest</strong></li>
                    <li>• Import the provided manifest file (or create from scratch)</li>
                    <li>• Name it &quot;PowerBrief Notifications&quot;</li>
                    <li>• Go to <strong>Incoming Webhooks</strong> in left sidebar</li>
                    <li>• Toggle <strong>Activate Incoming Webhooks</strong> to ON</li>
                    <li>• Click <strong>Add New Webhook to Workspace</strong></li>
                    <li>• Select your channel and copy the webhook URL</li>
                    <li>• Paste the webhook URL into PowerBrief</li>
                    <li>• Select channels for different notification categories</li>
                    <li>• <strong>Enable notifications</strong> and click <strong>Save</strong></li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      <Users className="h-4 w-4" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Team Management & UGC Settings</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• <strong>Invite Users:</strong> Add team members via email</li>
                    <li>• Set permissions to <strong>Edit</strong> or <strong>View</strong></li>
                    <li>• Generate invite links for easier team onboarding</li>
                    <li>• Add tracking emails for user accountability</li>
                    <li>• <strong>UGC Pipeline Settings:</strong> Configure emails, contracts, etc.</li>
                    <li>• <strong>Custom Reply Email:</strong> Set branded email for creator replies (e.g., glamoury@mail.powerbrief.ai)</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Best Practices */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Best Practices & Important Notes</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-green-900 mb-2">Do&apos;s</h4>
                      <ul className="text-green-800 text-sm space-y-1">
                        <li>• Always click <strong>Save</strong> after making changes</li>
                        <li>• Set up products with pricing for better AI context</li>
                        <li>• Configure integrations early in setup process</li>
                        <li>• Use detailed brand voice and positioning descriptions</li>
                        <li>• Test Slack webhooks after setup</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-red-900 mb-2">Don&apos;ts</h4>
                      <ul className="text-red-800 text-sm space-y-1">
                        <li>• Don&apos;t forget to save configuration changes</li>
                        <li>• Avoid skipping product setup - it provides crucial AI context</li>
                        <li>• Don&apos;t share API keys outside your organization</li>
                        <li>• Don&apos;t set permissions higher than necessary</li>
                        <li>• Avoid leaving integration fields empty if you plan to use them</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Summary */}
            <section>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Summary</h3>
              <p className="text-gray-700 mb-4">
                Brand configuration is a comprehensive setup that connects all aspects of your PowerBrief workflow. From basic brand identity 
                to advanced integrations with Meta, ElevenLabs, and Slack, proper configuration ensures your team has all the tools and 
                context needed for effective brief creation and execution.
              </p>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Quick Access Points</h4>
                <ul className="text-gray-700 text-sm space-y-1">
                  <li>• <strong>Brand Access:</strong> Manage Brands → Select Brand</li>
                  <li>• <strong>Meta Integration:</strong> Developer may need to connect additional brands</li>
                  <li>• <strong>Slack Setup:</strong> api.slack.com/apps for webhook creation</li>
                  <li>• <strong>ElevenLabs:</strong> elevenlabs.io for API key generation</li>
                </ul>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
} 