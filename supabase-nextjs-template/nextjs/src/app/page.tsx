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
import { ArrowRight, Sparkles, FileText, Briefcase, Repeat, Target, Share2 } from 'lucide-react';
import AuthAwareButtons from '@/components/AuthAwareButtons';
import HomePricing from "@/components/HomePricing";

export default function Home() {
  // Get product name from environment variables or use default
  const productName = process.env.NEXT_PUBLIC_PRODUCTNAME || 'PowerBrief';

  /**
   * Feature cards configuration
   * 
   * KEYWORDS: features, feature cards, product features
   */
  const features = [
    {
      icon: Briefcase,
      title: 'Brand Management',
      description: 'Organize all your brand information, guidelines, and audience details in one place',
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
      icon: Repeat,
      title: 'Batch Processing',
      description: 'Organize and manage multiple ad concepts in batches for efficient campaign development',
      color: 'text-orange-600'
    },
    {
      icon: Target,
      title: 'Audience Targeting',
      description: 'Define and store target audience demographics and characteristics for better ad targeting',
      color: 'text-red-600'
    },
    {
      icon: Share2,
      title: 'Collaboration Tools',
      description: 'Share briefs with team members and clients via link or email with customizable permissions',
      color: 'text-teal-600'
    }
  ];

  /**
   * Statistics display configuration
   * 
   * KEYWORDS: stats, statistics, metrics
   */
  const stats = [
    { label: 'Ad Concepts Created', value: '5K+' },
    { label: 'Hours Saved', value: '1000+' },
    { label: 'Brands Managed', value: '200+' },
    { label: 'Customer Satisfaction', value: '98%' }
  ];

  return (
      <div className="min-h-screen">
        {/* Navigation Bar */}
        <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-sm z-50 border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex-shrink-0">
              <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">
                {productName}
              </span>
              </div>
              <div className="hidden md:flex items-center space-x-8">
                <Link href="#features" className="text-gray-600 hover:text-gray-900">
                  Features
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
                Streamline Your Ad Creative
                <span className="block text-primary-600">With AI-Powered Briefs</span>
              </h1>
              <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto">
                Create professional ad briefs and video concepts in minutes, not days. Organize your brand information, generate compelling concepts, and collaborate with your team seamlessly.
              </p>
              <div className="mt-10 flex gap-4 justify-center">
                <AuthAwareButtons />
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

        {/* Features Section */}
        <section id="features" className="py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold">Craft Better Ad Briefs, Faster</h2>
              <p className="mt-4 text-xl text-gray-600">
                PowerBrief simplifies the creative process from brand management to concept delivery
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
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

        {/* Pricing Section */}
        <HomePricing />

        {/* Call-to-Action Section */}
        <section className="py-24 bg-primary-600">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white">
              Ready to Transform Your Ad Creation Process?
            </h2>
            <p className="mt-4 text-xl text-primary-100">
              Join marketing teams using {productName} to create compelling ad briefs in minutes
            </p>
            <Link
                href="/auth/register"
                className="mt-8 inline-flex items-center px-6 py-3 rounded-lg bg-white text-primary-600 font-medium hover:bg-primary-50 transition-colors"
            >
              Get Started Now
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
                    <Link href="#pricing" className="text-gray-600 hover:text-gray-900">
                      Pricing
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