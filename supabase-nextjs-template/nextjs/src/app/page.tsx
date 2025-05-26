/**
 * Home Page Component
 * 
 * KEYWORDS: landing page, home page, features, pricing, marketing
 * 
 * This is the main landing page for the application. It showcases the product
 * features, pricing, and calls-to-action to encourage user signups.
 */
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Sparkles, FileText, Briefcase, Share2, Users, Video, MessageSquare, Upload, Zap, CheckCircle, Play, Eye, Send } from 'lucide-react';
import AuthAwareButtons from '@/components/AuthAwareButtons';
import HomePricing from "@/components/HomePricing";

export default function Home() {
  // Get product name from environment variables or use default
  const productName = process.env.NEXT_PUBLIC_PRODUCTNAME || 'PowerBrief';

  /**
   * Core feature cards configuration
   * 
   * KEYWORDS: features, feature cards, product features
   */
  const coreFeatures = [
    {
      icon: Briefcase,
      title: 'Brand Management',
      description: 'Organize all your brand information, guidelines, and audience details in one centralized hub',
      color: 'text-blue-600'
    },
    {
      icon: Sparkles,
      title: 'AI-Powered Concepts',
      description: 'Generate compelling ad concepts with AI assistance to speed up your creative process',
      color: 'text-purple-600'
    },
    {
      icon: FileText,
      title: 'Structured Briefs',
      description: 'Create detailed, structured ad briefs with scene-by-scene descriptions for video production',
      color: 'text-green-600'
    },
    {
      icon: Users,
      title: 'UGC Creator Pipeline',
      description: 'Seamlessly onboard, manage, and assign scripts to UGC creators with automated workflows',
      color: 'text-pink-600'
    },
    {
      icon: Video,
      title: 'Video Editor Submissions',
      description: 'Streamlined submission and upload process for video editors with asset management',
      color: 'text-indigo-600'
    },
    {
      icon: MessageSquare,
      title: 'Ad Review & Feedback',
      description: 'Advanced review tool with timeline comments - a complete Frame.io replacement',
      color: 'text-orange-600'
    },
    {
      icon: Upload,
      title: 'Meta Ad Uploader',
      description: 'Bulk upload hundreds of approved ads directly to Meta with one click',
      color: 'text-red-600'
    },
    {
      icon: Share2,
      title: 'Public UGC Scripts',
      description: 'Auto-formatted public scripts that creators can access and use immediately',
      color: 'text-teal-600'
    }
  ];

  /**
   * Workflow steps configuration
   */
  const workflowSteps = [
    {
      step: '01',
      title: 'Create & Generate',
      description: 'Use AI to generate compelling ad concepts and structured briefs',
      icon: Sparkles,
      color: 'bg-purple-100 text-purple-600'
    },
    {
      step: '02',
      title: 'Assign to Creators',
      description: 'Seamlessly assign scripts to UGC creators through our management pipeline',
      icon: Users,
      color: 'bg-pink-100 text-pink-600'
    },
    {
      step: '03',
      title: 'Review & Feedback',
      description: 'Use our advanced review tool with timeline comments for precise feedback',
      icon: Eye,
      color: 'bg-orange-100 text-orange-600'
    },
    {
      step: '04',
      title: 'Bulk Upload to Meta',
      description: 'Upload hundreds of approved ads to Meta advertising platform instantly',
      icon: Send,
      color: 'bg-red-100 text-red-600'
    }
  ];

  /**
   * Statistics display configuration
   * 
   * KEYWORDS: stats, statistics, metrics
   */
  const stats = [
    { label: 'Ad Concepts Created', value: '10K+' },
    { label: 'UGC Creators Managed', value: '500+' },
    { label: 'Hours Saved Weekly', value: '2000+' },
    { label: 'Ads Uploaded to Meta', value: '50K+' }
  ];

  return (
      <div className="min-h-screen">
        {/* Navigation Bar */}
        <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-sm z-50 border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex-shrink-0">
                <Image 
                  src="/images/powerbrief-logo.png" 
                  alt={productName} 
                  width={140} 
                  height={32} 
                  className="object-contain" 
                  priority
                />
              </div>
              <div className="hidden md:flex items-center space-x-8">
                <Link href="#features" className="text-gray-600 hover:text-gray-900">
                  Features
                </Link>
                <Link href="#workflow" className="text-gray-600 hover:text-gray-900">
                  Workflow
                </Link>
                <Link href="#pricing" className="text-gray-600 hover:text-gray-900">
                  Pricing
                </Link>
                <Link
                    href="#"
                    className="text-gray-600 hover:text-gray-900"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                  Documentation
                </Link>

                <AuthAwareButtons variant="nav" />
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative pt-32 pb-24 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
                Complete UGC & Ad Creative
                <span className="block text-primary-600">Management Platform</span>
              </h1>
              <p className="mt-6 text-xl text-gray-600 max-w-4xl mx-auto">
                From AI-powered concept generation to UGC creator management, video review, and bulk Meta ad uploads. 
                The only platform you need for your entire creative workflow.
              </p>
              <div className="mt-10 flex gap-4 justify-center">
                <AuthAwareButtons />
              </div>
              
              {/* Key Benefits */}
              <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                <div className="flex items-center justify-center space-x-3 text-gray-600">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Replace Frame.io</span>
                </div>
                <div className="flex items-center justify-center space-x-3 text-gray-600">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Manage 500+ UGC Creators</span>
                </div>
                <div className="flex items-center justify-center space-x-3 text-gray-600">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Bulk Upload to Meta</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Statistics Section */}
        <section className="py-16 bg-gradient-to-b from-white to-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-4xl font-bold text-primary-600">{stat.value}</div>
                    <div className="mt-2 text-sm text-gray-600">{stat.label}</div>
                  </div>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow Section */}
        <section id="workflow" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold">Complete Creative Workflow</h2>
              <p className="mt-4 text-xl text-gray-600">
                From concept to Meta ads in 4 simple steps
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {workflowSteps.map((step, index) => (
                  <div key={index} className="text-center">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${step.color} mb-4`}>
                      <step.icon className="h-8 w-8" />
                    </div>
                    <div className="text-sm font-semibold text-gray-500 mb-2">STEP {step.step}</div>
                    <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                    <p className="text-gray-600">{step.description}</p>
                  </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold">Everything You Need in One Platform</h2>
              <p className="mt-4 text-xl text-gray-600">
                Powerful features that replace multiple tools and streamline your entire creative process
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {coreFeatures.map((feature, index) => (
                  <div
                      key={index}
                      className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                  >
                    <feature.icon className={`h-8 w-8 ${feature.color}`} />
                    <h3 className="mt-4 text-xl font-semibold">{feature.title}</h3>
                    <p className="mt-2 text-gray-600">{feature.description}</p>
                  </div>
              ))}
            </div>
          </div>
        </section>

        {/* UGC Pipeline Highlight */}
        <section className="py-24 bg-gradient-to-r from-pink-50 to-purple-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-6">UGC Creator Pipeline</h2>
                <p className="text-xl text-gray-600 mb-8">
                  Seamlessly manage hundreds of UGC creators with automated onboarding, script assignment, 
                  and submission handling. Public-facing scripts are automatically formatted for easy creator access.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Automated creator onboarding</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Script assignment & tracking</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Public script formatting</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Submission review process</span>
                  </li>
                </ul>
              </div>
              <div className="bg-white p-8 rounded-2xl shadow-lg">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Users className="h-6 w-6 text-pink-600" />
                    <span className="font-semibold">500+ Active Creators</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <FileText className="h-6 w-6 text-purple-600" />
                    <span className="font-semibold">Auto-formatted Scripts</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Zap className="h-6 w-6 text-orange-600" />
                    <span className="font-semibold">Instant Assignment</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Review & Upload Highlight */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="bg-gradient-to-br from-orange-50 to-red-50 p-8 rounded-2xl">
                <div className="space-y-6">
                  <div className="flex items-center space-x-3">
                    <MessageSquare className="h-8 w-8 text-orange-600" />
                    <span className="text-xl font-semibold">Frame.io Replacement</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Play className="h-6 w-6 text-red-600" />
                    <span>Timeline-based comments</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Eye className="h-6 w-6 text-red-600" />
                    <span>Advanced review tools</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Upload className="h-6 w-6 text-red-600" />
                    <span>Direct Meta upload</span>
                  </div>
                </div>
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-6">Review & Upload in One Flow</h2>
                <p className="text-xl text-gray-600 mb-8">
                  Our advanced review tool with timeline comments replaces Frame.io completely. 
                  Once assets are approved, send them directly to the ad uploader and bulk upload 
                  hundreds of ads to Meta at once.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Timeline-based video comments</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Approval workflow automation</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Bulk Meta ad upload (100s at once)</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Seamless asset management</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <HomePricing />

        {/* Call-to-Action Section */}
        <section className="py-24 bg-primary-600">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white">
              Ready to Transform Your Creative Workflow?
            </h2>
            <p className="mt-4 text-xl text-primary-100">
              Join marketing teams using {productName} to manage UGC creators, review content, and upload thousands of ads to Meta
            </p>
            <Link
                href="/auth/register"
                className="mt-8 inline-flex items-center px-6 py-3 rounded-lg bg-white text-primary-600 font-medium hover:bg-primary-50 transition-colors"
            >
              Start Your Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </section>

        {/* Footer Section */}
        <footer className="bg-gray-50 border-t border-gray-200">
          <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div>
                <h4 className="text-sm font-semibold text-gray-900">Product</h4>
                <ul className="mt-4 space-y-2">
                  <li>
                    <Link href="#features" className="text-gray-600 hover:text-gray-900">
                      Features
                    </Link>
                  </li>
                  <li>
                    <Link href="#workflow" className="text-gray-600 hover:text-gray-900">
                      Workflow
                    </Link>
                  </li>
                  <li>
                    <Link href="#pricing" className="text-gray-600 hover:text-gray-900">
                      Pricing
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900">Features</h4>
                <ul className="mt-4 space-y-2">
                  <li>
                    <Link href="#" className="text-gray-600 hover:text-gray-900">
                      UGC Pipeline
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-gray-600 hover:text-gray-900">
                      Creator Management
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-gray-600 hover:text-gray-900">
                      Review Tools
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-gray-600 hover:text-gray-900">
                      Meta Upload
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900">Resources</h4>
                <ul className="mt-4 space-y-2">
                  <li>
                    <Link href="#" className="text-gray-600 hover:text-gray-900">
                      Documentation
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-gray-600 hover:text-gray-900">
                      Help Center
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-gray-600 hover:text-gray-900">
                      API Reference
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900">Legal</h4>
                <ul className="mt-4 space-y-2">
                  <li>
                    <Link href="/legal/privacy" className="text-gray-600 hover:text-gray-900">
                      Privacy
                    </Link>
                  </li>
                  <li>
                    <Link href="/legal/terms" className="text-gray-600 hover:text-gray-900">
                      Terms
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-gray-200">
              <p className="text-center text-gray-600">
                © {new Date().getFullYear()} {productName}. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
  );
}