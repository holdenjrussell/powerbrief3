"use client";
import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Settings, Clock, CheckCircle, AlertCircle, Info } from 'lucide-react';

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
                  <span>12 minutes</span>
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
            <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Settings className="h-8 w-8 text-primary-600" />
                </div>
                <p className="text-gray-600 font-medium">Brand Config Training Video</p>
                <p className="text-gray-500 text-sm mt-1">Video content will be embedded here</p>
              </div>
            </div>
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
                Brand configuration is the foundation of your PowerBrief experience. This module will teach you how to set up, 
                configure, and manage brand settings to ensure consistent and effective brief creation across your organization.
              </p>
              
              <div className="bg-info-50 border border-info-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Info className="h-5 w-5 text-info-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-info-900 mb-1">Why Brand Config Matters</h4>
                    <p className="text-info-800 text-sm">
                      Proper brand configuration ensures consistency across all briefs, saves time on repeated setups, 
                      and maintains brand integrity throughout your creative process.
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
                  <span className="text-gray-700">Set up brand basic information and identity</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Configure brand guidelines and preferences</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Upload and manage brand assets</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Set up team permissions and access controls</span>
                </div>
              </div>
            </section>

            {/* Step-by-Step Guide */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Step-by-Step Guide</h3>
              
              <div className="space-y-6">
                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      1
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Basic Brand Information</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• Navigate to PowerBrief → Brand Config</li>
                    <li>• Enter brand name, description, and industry</li>
                    <li>• Upload brand logo and primary visuals</li>
                    <li>• Set brand colors and typography preferences</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      2
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Brand Guidelines Setup</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• Define brand voice and tone guidelines</li>
                    <li>• Set content themes and messaging pillars</li>
                    <li>• Configure do&apos;s and don&apos;ts for content creation</li>
                    <li>• Upload brand style guide documents</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      3
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Asset Management</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• Upload brand assets (logos, images, videos)</li>
                    <li>• Organize assets with tags and categories</li>
                    <li>• Set usage rights and restrictions</li>
                    <li>• Configure auto-suggestions for briefs</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      4
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Team & Permissions</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• Add team members and assign roles</li>
                    <li>• Set permissions for brand editing</li>
                    <li>• Configure approval workflows</li>
                    <li>• Set up notification preferences</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Best Practices */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Best Practices</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-green-900 mb-2">Do&apos;s</h4>
                      <ul className="text-green-800 text-sm space-y-1">
                        <li>• Keep brand information up to date</li>
                        <li>• Use high-quality asset uploads</li>
                        <li>• Regularly review and update guidelines</li>
                        <li>• Train team members on brand standards</li>
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
                        <li>• Don&apos;t skip brand guideline setup</li>
                        <li>• Avoid uploading low-resolution assets</li>
                        <li>• Don&apos;t give excessive permissions</li>
                        <li>• Avoid inconsistent naming conventions</li>
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
                Brand configuration is the cornerstone of effective PowerBrief usage. By following this guide, you&apos;ll establish 
                a solid foundation that ensures consistency, efficiency, and brand integrity across all your creative briefs.
              </p>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Next Steps</h4>
                <p className="text-gray-700 text-sm">
                  Once you&apos;ve completed your brand configuration, you&apos;re ready to create your first brief. 
                  Continue with the &quot;Briefs: Creative Strategist Version&quot; or &quot;Briefs: Video Editor/Designer Version&quot; modules.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
} 