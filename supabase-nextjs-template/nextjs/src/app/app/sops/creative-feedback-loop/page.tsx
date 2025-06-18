"use client";
import React from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  Lightbulb, 
  Target, 
  Search, 
  BarChart3, 
  Brain, 
  TrendingUp,
  Users,
  MessageSquare,
  Eye,
  Zap,
  Database,
  FileText,
  Star,
  Settings,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import SOPVideoUpload from '@/components/sops/SOPVideoUpload';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from '@/components/ui';

export default function CreativeFeedbackLoopSOPPage() {
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
              <RefreshCw className="h-8 w-8 text-primary-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Alex Cooper's Creative Feedback Loop</h1>
              <div className="flex items-center mt-2 space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>32 minutes</span>
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
              sopId="creative-feedback-loop"
              isAdmin={true} // TODO: Replace with actual admin check
            />
          </div>
        </div>

        {/* Content Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Strategic Creative Feedback Loop System</h2>
            
            {/* Overview */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Overview</h3>
              <p className="text-gray-700 mb-4">
                This guide outlines a four-step process used by multi-million dollar brands to generate a continuous stream of winning ad ideas. 
                By the end, your issue will shift from "I can't think of ad ideas" to "I have too many data-backed ideas, which ones do I test first?"
              </p>
              
              <p className="text-gray-700 mb-4">
                We will explore the psychology of understanding your audience, the operational systems for tracking creative, and how to leverage 
                AI tools like ChatGPT with a full prompt cheat sheet to consistently produce high-performing ads. The core of this system is a 
                cyclical feedback loop that makes your creative strategy smarter with every iteration.
              </p>
              
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-start">
                  <TrendingUp className="h-5 w-5 text-purple-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-purple-900 mb-1">Compound Learning Effect</h4>
                    <p className="text-purple-800 text-sm">
                      Just like compound interest, the value of your creative knowledge grows exponentially with each cycle. 
                      Your 10th creative sprint will be infinitely more effective than your first.
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
                  <span className="text-gray-700">Master the foundational "OneSheet" documentation system - <Link href="/app/powerbrief" className="text-blue-600 hover:underline font-medium">Access your OneSheet here</Link></span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Conduct comprehensive qualitative and quantitative research</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Execute structured testing and data collection strategies</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Extract actionable insights from performance data</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Integrate learnings back into strategy for continuous improvement</span>
                </div>
              </div>
            </section>

            {/* Foundation Section */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">The Foundation: The "OneSheet"</h3>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-6">
                <div className="flex items-start">
                  <FileText className="h-6 w-6 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-2">Central Documentation Hub</h4>
                    <p className="text-blue-800 text-sm mb-3">
                      Before diving into the process, it's crucial to have a central document, or "OneSheet." The goal of this document 
                      is to centralize all qualitative and quantitative research about a product, audience, or angle.
                    </p>
                    <p className="text-blue-800 text-sm">
                      It ensures that everyone—from creative strategists and media buyers to editors—has access to the same core insights, 
                      allowing them to understand the personas and messaging strategy deeply. This document prevents creative strategists 
                      from becoming mere "script machines" and empowers them to think like true marketers.
                    </p>
                    <div className="mt-4 p-3 bg-blue-100 rounded">
                      <h5 className="font-medium text-blue-900 mb-2">🔗 Your PowerBrief OneSheet</h5>
                      <p className="text-blue-800 text-sm mb-2">
                        PowerBrief includes a fully integrated OneSheet system with four key sections:
                      </p>
                      <ul className="text-blue-800 text-sm space-y-1">
                        <li>• <strong>Audience Research:</strong> Research checklist, angles, audience insights, and personas</li>
                        <li>• <strong>Competitor Analysis:</strong> Competitive positioning and gap analysis</li>
                        <li>• <strong>Ad Account Audit:</strong> Historical performance data and key learnings</li>
                        <li>• <strong>Creative Brainstorm:</strong> Concepts, hooks, and visual ideas generated from research</li>
                      </ul>
                      <p className="text-blue-800 text-sm mt-2">
                        <Link href="/app/powerbrief" className="font-medium underline">Access your OneSheet here</Link> 
                        and use it throughout this entire creative feedback loop process.
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <Zap className="h-4 w-4 text-purple-600" />
                        <Link 
                          href="/app/powerbrief" 
                          className="text-purple-700 font-medium underline hover:text-purple-800"
                        >
                          Try the new Intelligent OneSheet Generator
                        </Link>
                        <span className="text-purple-600 text-xs">(Select a brand to access automated AI research)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Four Stages Overview */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">The Four Stages of the Creative Feedback Loop</h3>
              
              <p className="text-gray-700 mb-6">Think of this as a continuous cycle with four distinct stages:</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                  <Search className="h-8 w-8 text-green-600 mb-3" />
                  <h4 className="font-semibold text-green-900 mb-2">Research & Hypothesis</h4>
                  <p className="text-green-800 text-sm">Gather raw materials and form educated guesses</p>
                </div>
                
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-4">
                  <Zap className="h-8 w-8 text-blue-600 mb-3" />
                  <h4 className="font-semibold text-blue-900 mb-2">Execution & Launch</h4>
                  <p className="text-blue-800 text-sm">Turn hypotheses into real-world experiments</p>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-lg p-4">
                  <BarChart3 className="h-8 w-8 text-purple-600 mb-3" />
                  <h4 className="font-semibold text-purple-900 mb-2">Data Analysis</h4>
                  <p className="text-purple-800 text-sm">Extract insights from performance data</p>
                </div>
                
                <div className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-lg p-4">
                  <RefreshCw className="h-8 w-8 text-orange-600 mb-3" />
                  <h4 className="font-semibold text-orange-900 mb-2">Integration & Iteration</h4>
                  <p className="text-orange-800 text-sm">Close the loop with smarter strategy</p>
                </div>
              </div>
            </section>

            {/* Stage 1: Research & Hypothesis Generation */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Stage 1: Research & Hypothesis Generation (The Input)</h3>
              
              <p className="text-gray-700 mb-6">
                This is the starting point where you gather the raw materials for your creative. It's about forming educated guesses, 
                or hypotheses, about what will resonate with your audience. This stage is divided into two key research types.
              </p>

              {/* Qualitative Research */}
              <div className="border border-gray-200 rounded-lg p-5 mb-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                    <Brain className="h-4 w-4" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900">Qualitative Research (The "Psychology" Side)</h4>
                </div>
                
                <p className="text-gray-700 mb-4 ml-11">
                  This is the most crucial part of the process. It involves deeply understanding your audience's psychology, 
                  pain points, desires, and the language they use.
                </p>

                <div className="ml-11 space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h5 className="font-semibold text-blue-900 mb-2">📝 Customer-Generated Content & Data</h5>
                    <ul className="text-blue-800 text-sm space-y-1">
                      <li><strong>Customer Reviews:</strong> Mine website reviews, Trustpilot for benefits, pain points, and customer language</li>
                      <li><strong>Surveys & Support Tickets:</strong> Analyze post-purchase surveys and support interactions</li>
                      <li><strong>Ad Comments:</strong> Read comments on your own ads and competitors' ads for unfiltered feedback</li>
                    </ul>
                  </div>

                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h5 className="font-semibold text-purple-900 mb-2">🔍 Social Listening & Community Analysis</h5>
                    <ul className="text-purple-800 text-sm space-y-1">
                      <li><strong>How to Use:</strong> Search Reddit, Quora for your brand, competitors, or core problems</li>
                      <li><strong>What to Look For:</strong> Unfiltered opinions, comparisons, real customer language</li>
                      <li><strong>AI Application:</strong> Copy relevant threads and use prompts to identify keywords and phrases</li>
                    </ul>
                    <div className="mt-3 p-3 bg-purple-100 rounded text-xs text-purple-900">
                      <strong>Example Prompt:</strong> "Analyze this Reddit post and identify keywords and phrases people use when talking about [Product]. 
                      Use real customer language from the post. Identify key language regarding benefits, pain points, features, objections, or failed solutions."
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h5 className="font-semibold text-green-900 mb-2">📱 Organic Content Research</h5>
                    <ul className="text-green-800 text-sm space-y-1">
                      <li><strong>Platforms:</strong> TikTok & YouTube Shorts for organic (non-ad) content</li>
                      <li><strong>Search Terms:</strong> Brand name, product category, related pain points</li>
                      <li><strong>What to Look For:</strong> High-engagement organic videos that captured your audience's attention</li>
                      <li><strong>Application:</strong> Recreate successful organic concepts as paid ads with your product as the solution</li>
                    </ul>
                  </div>

                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h5 className="font-semibold text-orange-900 mb-2">🎯 Competitor Research & Gap Analysis</h5>
                    <ul className="text-orange-800 text-sm space-y-1">
                      <li><strong>Meta Ads Library:</strong> Research competitor ads and their messaging</li>
                      <li><strong>Customer Dissatisfaction:</strong> Find what customers dislike about competitors (price, taste, etc.)</li>
                      <li><strong>Positioning Opportunity:</strong> Position your brand as the solution to competitor shortcomings</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Quantitative Research */}
              <div className="border border-gray-200 rounded-lg p-5">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                    <Database className="h-4 w-4" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900">Quantitative Research (Ad Account Audit)</h4>
                </div>
                
                <p className="text-gray-700 mb-4 ml-11">
                  This involves analyzing your own historical ad data to identify patterns.
                </p>

                <div className="ml-11">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h5 className="font-semibold text-gray-900 mb-3">📊 Data Analysis Process</h5>
                    <ul className="text-gray-700 text-sm space-y-2">
                      <li><strong>Export Data:</strong> Export your ad data from the last 6-12 months into a spreadsheet</li>
                      <li><strong>Tag Variables:</strong> Tag each ad with variables such as:
                        <ul className="ml-4 mt-1 space-y-1">
                          <li>• Angle (Weight Management, Time/Convenience, Energy/Focus)</li>
                          <li>• Ad Format (Testimonial, UGC, Static, "3 Reasons Why")</li>
                          <li>• Emotion (Hope, Fear, Urgency)</li>
                          <li>• Framework (PAS - Problem, Agitate, Solve)</li>
                        </ul>
                      </li>
                      <li><strong>Performance Analysis:</strong> Analyze CPA, Hook Rate, Hold Rate against these tags</li>
                    </ul>
                    
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-yellow-800 text-xs">
                        <strong>Caveat:</strong> You don't know what you don't know. If you haven't tested something, it won't show up in the data. 
                        Therefore, a good mixture of qualitative (new ideas) and quantitative (proven ideas) is essential.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Key Outputs */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Key Outputs of the Brainstorm</h3>
              
              <p className="text-gray-700 mb-6">
                The research from both qualitative and quantitative sources fuels a creative brainstorm that produces a tangible list of assets:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                  <Target className="h-6 w-6 text-blue-600 mb-3" />
                  <h4 className="font-semibold text-blue-900 mb-2">Concepts</h4>
                  <p className="text-blue-800 text-sm mb-2">High-level themes for a set of ads, born from research angles and personas.</p>
                  <p className="text-blue-700 text-xs italic">Example: "The 2-Minute Healthy Meal for Busy Professionals"</p>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                  <Zap className="h-6 w-6 text-green-600 mb-3" />
                  <h4 className="font-semibold text-green-900 mb-2">Hooks</h4>
                  <p className="text-green-800 text-sm mb-2">Attention-grabbing first 3 seconds, pulled from supporting evidence.</p>
                  <p className="text-green-700 text-xs italic">Example: "Did you know probiotics can reduce bloating by 50%?"</p>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-lg p-4">
                  <Eye className="h-6 w-6 text-purple-600 mb-3" />
                  <h4 className="font-semibold text-purple-900 mb-2">Visuals</h4>
                  <p className="text-purple-800 text-sm mb-2">Visual direction inspired by organic research and competitor analysis.</p>
                  <p className="text-purple-700 text-xs italic">Example: Recreating a viral TikTok transformation video</p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-5">
                <h4 className="font-semibold text-yellow-900 mb-3">🎯 The Outcome: Testable Hypothesis</h4>
                <p className="text-yellow-800 text-sm mb-3">
                  You combine these inputs to form a testable hypothesis:
                </p>
                <div className="bg-white border border-yellow-300 rounded p-3">
                  <p className="text-gray-700 text-sm italic">
                    <strong>Example Hypothesis:</strong> "Qualitative data from Reddit shows many customers find our competitor, AG1, to be too expensive. 
                    Our own quantitative data shows that 'value for money' has been a successful, albeit under-tested, angle for us. Therefore, 
                    we hypothesize that an ad concept directly comparing the cost-effectiveness of Huel to AG1 will perform well."
                  </p>
                </div>
              </div>
            </section>

            {/* Stage 2: Execution & Launch */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Stage 2: Execution & Launch (The Test)</h3>
              
              <div className="border border-gray-200 rounded-lg p-5">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                    <Zap className="h-4 w-4" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900">Structured Testing Implementation</h4>
                </div>
                
                <p className="text-gray-700 mb-4 ml-11">
                  This is where you turn your hypothesis into a real-world experiment. This isn't just about making one ad; 
                  it's about structured testing with several variations to test the hypothesis effectively.
                </p>

                <div className="ml-11">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h5 className="font-semibold text-blue-900 mb-3">🧪 Example: Testing Cost-Effectiveness vs. AG1</h5>
                    <ul className="text-blue-800 text-sm space-y-1">
                      <li>• <strong>Static Image:</strong> "Half the Price, All the Nutrients" headline</li>
                      <li>• <strong>UGC Video:</strong> Creator breaks down monthly cost of your product vs. AG1</li>
                      <li>• <strong>Simple Text Video:</strong> Price-per-serving comparison on screen</li>
                    </ul>
                    
                    <div className="mt-3 p-3 bg-blue-100 rounded">
                      <p className="text-blue-900 text-xs">
                        <strong>The Outcome:</strong> Launch these ads and let them run to gather performance data (spend, clicks, conversions, etc.)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Stage 3: Data Analysis */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Stage 3: Data Analysis & Insight Extraction (The Measurement)</h3>
              
              <div className="border border-gray-200 rounded-lg p-5">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900">Critical Learning Phase</h4>
                </div>
                
                <p className="text-gray-700 mb-4 ml-11">
                  This is the most critical stage for learning. You're not just looking at which ad "won," but why it won.
                </p>

                <div className="ml-11">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h5 className="font-semibold text-purple-900 mb-3">📊 Analysis Process</h5>
                    <ul className="text-purple-800 text-sm space-y-2">
                      <li><strong>Performance Review:</strong> Analyze data from Stage 2 using your Ad Account Audit spreadsheet</li>
                      <li><strong>Tag Connection:</strong> Connect performance metrics to specific creative choices by tagging each ad</li>
                      <li><strong>Pattern Recognition:</strong> Look for patterns across multiple variables and performance indicators</li>
                    </ul>
                    
                    <div className="mt-3 p-3 bg-purple-100 rounded">
                      <p className="text-purple-900 text-xs">
                        <strong>Example Insight:</strong> "The ads for our 'Cost-Effectiveness' concept performed 30% better than our account average. 
                        The UGC video version had the highest Hold Rate and lowest CPA. This validates that our audience is price-sensitive and 
                        responds well to seeing real people discuss value."
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Stage 4: Integration & Iteration */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Stage 4: Integration & Iteration (The Refinement)</h3>
              
              <div className="border border-gray-200 rounded-lg p-5">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                    <RefreshCw className="h-4 w-4" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900">Closing the Loop</h4>
                </div>
                
                <p className="text-gray-700 mb-4 ml-11">
                  This step closes the loop and makes it a continuous cycle. Insights are useless if they just sit in a report.
                </p>

                <div className="ml-11">
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h5 className="font-semibold text-orange-900 mb-3">🔄 Integration Process</h5>
                    <p className="text-orange-800 text-sm mb-3">
                      Take the actionable insights and formally integrate them back into your central creative strategy document (the "OneSheet").
                    </p>
                    
                    <div className="space-y-2 text-orange-800 text-sm">
                      <div><strong>Competitor Research section:</strong> "Positioning against AG1 on price is a highly effective strategy"</div>
                      <div><strong>Audience Personas section:</strong> Emphasize "Budget-Conscious" as a key trait</div>
                      <div><strong>Creative Brainstorm section:</strong> Add new concept for "UGC-Style Price Breakdowns"</div>
                    </div>
                    
                    <div className="mt-3 p-3 bg-orange-100 rounded">
                      <p className="text-orange-900 text-xs">
                        <strong>The Outcome:</strong> Your OneSheet is now smarter and more data-backed. When you begin Stage 1 for your next round of creative, 
                        your starting point is significantly more advanced, leading to even better hypotheses, tests, and data.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Why the Feedback Loop is Essential */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Why the Feedback Loop is Essential for Long-Term Success</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-5">
                  <TrendingUp className="h-6 w-6 text-green-600 mb-3" />
                  <h4 className="font-semibold text-green-900 mb-3">Compound Learning</h4>
                  <p className="text-green-800 text-sm">
                    Just like compound interest, the value of your creative knowledge grows exponentially with each cycle. 
                    Your 10th creative sprint will be infinitely more effective than your first.
                  </p>
                </div>
                
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-5">
                  <Target className="h-6 w-6 text-blue-600 mb-3" />
                  <h4 className="font-semibold text-blue-900 mb-3">Increased Efficiency</h4>
                  <p className="text-blue-800 text-sm">
                    You waste less money testing misaligned ideas and can focus your budget on concepts with a higher probability of success.
                  </p>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-lg p-5">
                  <Settings className="h-6 w-6 text-purple-600 mb-3" />
                  <h4 className="font-semibold text-purple-900 mb-3">Adaptability</h4>
                  <p className="text-purple-800 text-sm">
                    This process is an early-warning system. If a new pain point emerges in reviews or a competitor's ad format gains traction, 
                    your qualitative research will catch it immediately.
                  </p>
                </div>
                
                <div className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-lg p-5">
                  <Users className="h-6 w-6 text-orange-600 mb-3" />
                  <h4 className="font-semibold text-orange-900 mb-3">Customer Empathy</h4>
                  <p className="text-orange-800 text-sm">
                    By constantly engaging with the voice of your customer, your marketing messages stay authentic and relevant. 
                    You become a brand that talks with its customers, not at them.
                  </p>
                </div>
              </div>
            </section>

            {/* Best Practices */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Implementation Best Practices</h3>
              
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
                  <h4 className="font-semibold text-blue-900 mb-3">🎯 Research Optimization</h4>
                  <ul className="text-blue-800 text-sm space-y-1">
                    <li>• Schedule dedicated research time weekly - treat it like a non-negotiable meeting</li>
                    <li>• Create standardized templates for collecting qualitative insights</li>
                    <li>• Use AI tools to process large amounts of customer feedback data</li>
                    <li>• Maintain separate documents for each major customer segment or product line</li>
                  </ul>
                </div>
                
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-5">
                  <h4 className="font-semibold text-green-900 mb-3">📊 Testing Structure</h4>
                  <ul className="text-green-800 text-sm space-y-1">
                    <li>• Always test at least 3 variations of each hypothesis</li>
                    <li>• Allow sufficient budget and time for statistical significance</li>
                    <li>• Tag every ad consistently from day one - retroactive tagging is painful</li>
                    <li>• Test one major variable at a time to isolate what's driving performance</li>
                  </ul>
                </div>
                
                <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-lg p-5">
                  <h4 className="font-semibold text-purple-900 mb-3">🔄 Loop Maintenance</h4>
                  <ul className="text-purple-800 text-sm space-y-1">
                    <li>• Review and update your OneSheet monthly, not just after big wins</li>
                    <li>• Share insights across teams - don't let knowledge stay siloed</li>
                    <li>• Archive old hypotheses that have been thoroughly tested</li>
                    <li>• Celebrate both wins and instructive failures - both generate valuable data</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Summary */}
            <section>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Summary</h3>
              <p className="text-gray-700 mb-4">
                By following this comprehensive and continuous process, the problem shifts from a scarcity of ideas to an abundance of them. 
                This positions the creative team to operate not just as "script machines" but as true, strategic marketers who understand 
                their audience deeply and can predict what will resonate before testing.
              </p>
              
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-lg p-5">
                <h4 className="font-medium text-gray-900 mb-3">🎯 The Ultimate Transformation</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-red-600 mb-2">❌ Before: Creative Scarcity</p>
                    <ul className="text-gray-700 space-y-1">
                      <li>• "I can't think of ad ideas"</li>
                      <li>• Random testing without strategy</li>
                      <li>• Wasted budget on misaligned concepts</li>
                      <li>• Creative strategists as "script machines"</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-green-600 mb-2">✅ After: Strategic Abundance</p>
                    <ul className="text-gray-700 space-y-1">
                      <li>• "I have too many data-backed ideas"</li>
                      <li>• Systematic, hypothesis-driven testing</li>
                      <li>• Efficient budget allocation to winning concepts</li>
                      <li>• True strategic marketers with deep customer empathy</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
} 