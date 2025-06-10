"use client";
import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Clock, CheckCircle, AlertCircle, Info, Search, Target, TrendingUp } from 'lucide-react';
import SOPVideoUpload from '@/components/sops/SOPVideoUpload';

export default function AdRipperSOPPage() {
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
              <Download className="h-8 w-8 text-primary-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AdRipper</h1>
              <div className="flex items-center mt-2 space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>20 minutes</span>
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
              sopId="adripper"
              isAdmin={true} // TODO: Replace with actual admin check
            />
          </div>
        </div>

        {/* Content Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">AdRipper: Competitive Research & Ad Analysis</h2>
            
            {/* Overview */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Overview</h3>
              <p className="text-gray-700 mb-4">
                AdRipper is a powerful competitive intelligence tool that allows you to discover, analyze, and learn from competitor advertisements. 
                This module will teach you how to leverage AdRipper for market research, creative inspiration, and strategic insights.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">Why AdRipper is Essential</h4>
                    <p className="text-blue-800 text-sm">
                      Understanding competitor strategies helps you identify market gaps, improve your creative approach, 
                      and stay ahead of industry trends. AdRipper makes this research efficient and actionable.
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
                  <span className="text-gray-700">Master AdRipper&apos;s search and filtering capabilities</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Analyze competitor ad strategies and creative approaches</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Export and organize insights for team collaboration</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Integrate competitive insights into your creative strategy</span>
                </div>
              </div>
            </section>

            {/* Key Features */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Key Features</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                  <Search className="h-8 w-8 text-blue-600 mb-3" />
                  <h4 className="font-semibold text-blue-900 mb-2">Advanced Search</h4>
                  <p className="text-blue-800 text-sm">Search by keywords, brands, platforms, and date ranges</p>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                  <Target className="h-8 w-8 text-green-600 mb-3" />
                  <h4 className="font-semibold text-green-900 mb-2">Targeting Insights</h4>
                  <p className="text-green-800 text-sm">Analyze audience targeting and demographic data</p>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-lg p-4">
                  <TrendingUp className="h-8 w-8 text-purple-600 mb-3" />
                  <h4 className="font-semibold text-purple-900 mb-2">Performance Data</h4>
                  <p className="text-purple-800 text-sm">View engagement metrics and ad performance indicators</p>
                </div>
              </div>
            </section>

            {/* Step-by-Step Guide */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">How to Use AdRipper</h3>
              
              <div className="space-y-6">
                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      1
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Setting Up Your Search</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• Navigate to AdRipper from the main navigation</li>
                    <li>• Choose between Manual Ripping or AdSpy Search</li>
                    <li>• Select your target platform (Facebook, Instagram, YouTube, etc.)</li>
                    <li>• Enter competitor brand names or relevant keywords</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      2
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Applying Filters</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• Set date ranges to focus on recent campaigns</li>
                    <li>• Filter by ad format (video, image, carousel, etc.)</li>
                    <li>• Choose specific countries or regions</li>
                    <li>• Select engagement thresholds for high-performing ads</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      3
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Analyzing Results</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• Review ad creative elements and messaging strategies</li>
                    <li>• Analyze targeting data and audience insights</li>
                    <li>• Note performance metrics and engagement patterns</li>
                    <li>• Identify trends and common creative approaches</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      4
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Organizing & Sharing Insights</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• Save high-value ads to your collections</li>
                    <li>• Export data and creative assets for team review</li>
                    <li>• Create competitive analysis reports</li>
                    <li>• Share insights with creative and strategy teams</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Research Strategies */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Advanced Research Strategies</h3>
              
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-5">
                  <h4 className="font-semibold text-indigo-900 mb-3">Competitive Landscape Mapping</h4>
                  <ul className="text-indigo-800 text-sm space-y-1">
                    <li>• Identify all major competitors in your space</li>
                    <li>• Track their creative evolution over time</li>
                    <li>• Map their seasonal campaign patterns</li>
                    <li>• Analyze their product launch strategies</li>
                  </ul>
                </div>
                
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-5">
                  <h4 className="font-semibold text-green-900 mb-3">Creative Inspiration Mining</h4>
                  <ul className="text-green-800 text-sm space-y-1">
                    <li>• Look for unique visual styles and trends</li>
                    <li>• Analyze successful messaging frameworks</li>
                    <li>• Study high-performing video structures</li>
                    <li>• Identify gap opportunities in the market</li>
                  </ul>
                </div>
                
                <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-lg p-5">
                  <h4 className="font-semibold text-purple-900 mb-3">Performance Pattern Analysis</h4>
                  <ul className="text-purple-800 text-sm space-y-1">
                    <li>• Track which creative elements drive engagement</li>
                    <li>• Monitor competitor spend patterns</li>
                    <li>• Analyze targeting strategy effectiveness</li>
                    <li>• Identify best-performing content formats</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Best Practices */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Best Practices & Tips</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-green-900 mb-2">Do&apos;s</h4>
                      <ul className="text-green-800 text-sm space-y-1">
                        <li>• Set up regular competitive monitoring</li>
                        <li>• Focus on high-performing ads for insights</li>
                        <li>• Document trends and patterns systematically</li>
                        <li>• Share insights across creative teams</li>
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
                        <li>• Don&apos;t copy ads directly without adaptation</li>
                        <li>• Avoid focusing only on recent ads</li>
                        <li>• Don&apos;t ignore underperforming competitor content</li>
                        <li>• Avoid analysis without strategic application</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Integration with PowerBrief */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Integrating with PowerBrief</h3>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                <h4 className="font-medium text-gray-900 mb-3">From Research to Action</h4>
                <div className="space-y-3 text-gray-700 text-sm">
                  <p>• <strong>Brief Enhancement:</strong> Use competitive insights to inform creative briefs</p>
                  <p>• <strong>Reference Materials:</strong> Include competitor examples in brief references</p>
                  <p>• <strong>Strategy Development:</strong> Apply learnings to positioning and messaging</p>
                  <p>• <strong>Creative Direction:</strong> Guide designers with competitive landscape context</p>
                </div>
              </div>
            </section>

            {/* Summary */}
            <section>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Summary</h3>
              <p className="text-gray-700 mb-4">
                AdRipper is a powerful tool for competitive intelligence that can significantly enhance your creative strategy. 
                By systematically analyzing competitor activities, you can identify opportunities, avoid pitfalls, and develop more effective campaigns.
              </p>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Next Steps</h4>
                <p className="text-gray-700 text-sm">
                  Start by setting up regular competitive monitoring for your top 3-5 competitors. Use the insights to enhance 
                  your next brief creation process, and consider exploring the &quot;Ad Upload Tool&quot; module to learn how to organize 
                  and leverage the creative assets you discover.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
} 