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
import { ArrowRight, Sparkles, Users, MessageSquare, Upload, CheckCircle, LibraryBig, DraftingCompass, BarChartBig, LocateFixed, ScrollText, FileSignature, Workflow as WorkflowIcon, Bot, Lightbulb, ListChecks, MessageCircle as MessageCircleIcon, Rocket, Edit3, ScanSearch, LayoutDashboard, TrendingUp, Megaphone as MegaphoneIcon, AlertOctagon as AlertOctagonIcon, ClipboardList as ClipboardListIcon, Film, FlaskConical, Swords, Calculator, Store, ShoppingCart, CalendarDays, Presentation as PresentationIcon, Twitter, Linkedin, Instagram, Youtube, Shapes } from 'lucide-react';
import AuthAwareButtons from '@/components/AuthAwareButtons';
import HomePricing from "@/components/HomePricing";

export default function Home() {
  // Get product name from environment variables or use default
  const productName = process.env.NEXT_PUBLIC_PRODUCTNAME || 'PowerBrief AI';

  /**
   * Core feature cards configuration
   * 
   * KEYWORDS: features, feature cards, product features
   */
  const coreFeatures = [
    {
      icon: LibraryBig,
      title: 'Unified Content Briefing',
      description: 'Brief everything: ads, emails, SMS, web assets, organic social, and more, all in one place.',
      color: 'text-sky-600'
    },
    {
      icon: Sparkles,
      title: 'AI-Powered Concepts',
      description: 'Generate compelling ad concepts with AI assistance to speed up your creative process.',
      color: 'text-purple-600'
    },
    {
      icon: DraftingCompass,
      title: 'PowerFrame AI Wireframing',
      description: 'Instantly turn competitor sites into wireframes with our unique AI-powered whiteboard tool.',
      color: 'text-amber-600'
    },
    {
      icon: Users,
      title: 'Advanced UGC Pipeline',
      description: 'Onboard, manage, communicate (Email/SMS), sign contracts, and automate UGC workflows with AI assistance.',
      color: 'text-pink-600'
    },
    {
      icon: MessageSquare,
      title: 'Asset Review & Collaboration',
      description: 'Advanced review for all asset types with timeline comments. A complete Frame.io replacement.',
      color: 'text-orange-600'
    },
    {
      icon: Upload,
      title: 'Smart Ad Uploader',
      description: 'Bulk upload ads to Meta with AI copy generation, thumbnail selection, and more.',
      color: 'text-red-600'
    },
    {
      icon: BarChartBig,
      title: 'Team Sync & Performance',
      description: 'Align your team with scorecards, announcements, issue tracking, and to-dos. The Ninety.io alternative.',
      color: 'text-lime-600'
    },
    {
      icon: LocateFixed,
      title: 'AdRipper',
      description: 'Gain competitive insights by analyzing successful ad creatives in your market.',
      color: 'text-cyan-600'
    },
    {
      icon: ScrollText,
      title: 'SOP Management',
      description: 'Create, store, and manage your Standard Operating Procedures directly within the platform.',
      color: 'text-slate-600'
    },
    {
      icon: FileSignature,
      title: 'Integrated Document Signing',
      description: 'Replace DocuSign/PandaDoc with built-in, legally binding document signing for creators.',
      color: 'text-emerald-600'
    },
    {
      icon: WorkflowIcon,
      title: 'AI Workflow Automation',
      description: 'Build custom, AI-driven drag-and-drop workflows for your UGC and creative processes.',
      color: 'text-violet-600'
    },
    {
      icon: Bot,
      title: 'AI Task Assistant',
      description: 'Your virtual paid influencer manager: handles communication, contracts, shipments, and reviews.',
      color: 'text-rose-600'
    }
  ];

  /**
   * Workflow steps configuration
   */
  const workflowSteps = [
    {
      step: '01',
      title: 'Ideate & Brief',
      description: 'Spark creativity with AI concept generation and create detailed multi-channel briefs.',
      icon: Lightbulb,
      color: 'bg-purple-100 text-purple-600'
    },
    {
      step: '02',
      title: 'Manage & Assign',
      description: 'Organize projects, assign tasks to team members or UGC creators, and track progress seamlessly.',
      icon: ListChecks,
      color: 'bg-pink-100 text-pink-600'
    },
    {
      step: '03',
      title: 'Collaborate & Revise',
      description: 'Utilize advanced review tools for feedback, comments, and revisions on all asset types.',
      icon: MessageCircleIcon,
      color: 'bg-orange-100 text-orange-600'
    },
    {
      step: '04',
      title: 'Approve & Deliver',
      description: 'Finalize assets, secure approvals, and prepare for launch with integrated delivery tools.',
      icon: CheckCircle,
      color: 'bg-green-100 text-green-600'
    },
    {
      step: '05',
      title: 'Launch to Meta Fast',
      description: 'Export approved ads directly to the Ad Uploader and go live on Meta in minutes.',
      icon: Rocket,
      color: 'bg-red-100 text-red-600'
    }
  ];

  /**
   * Statistics display configuration
   * 
   * KEYWORDS: stats, statistics, metrics
   */
  const stats = [
    { label: 'Content Types Briefed', value: '12+' },
    { label: 'Marketing Workflows Automated', value: '1000s' },
    { label: 'Teams Operating Efficiently', value: '500+' },
    { label: 'Assets Managed & Delivered', value: '1M+' }
  ];

  /**
   * Coming Soon features configuration
   */
  const comingSoonFeatures = [
    {
      icon: Film,
      title: 'VEO 3 AI Video Integration',
      description: "Harness Google's cutting-edge video generation. VEO 3 will be integrated directly into briefs, allowing AI to automatically generate B-roll for editors and create hyper-realistic draft visuals, revolutionizing your video production workflow.",
      color: 'text-blue-500'
    },
    {
      icon: FlaskConical,
      title: 'Product Development Suite',
      description: 'Unlock advanced tools for product innovation, including in-depth ingredient and formulation research, development tracking, and analysis to bring your next groundbreaking product to market faster and smarter.',
      color: 'text-teal-500'
    },
    {
      icon: Swords,
      title: 'PowerKombat™ Competitor Intel',
      description: 'Gain a decisive edge with deep-dive competitor analysis. PowerKombat™ will offer detailed comparisons of competitor products, ingredients, components, features, and overall market strategies.',
      color: 'text-red-500'
    },
    {
      icon: Calculator,
      title: 'Integrated Financial Planning',
      description: 'Forecast success with a comprehensive suite of financial tools: MSRP & break-even point analysis, sales projections, demand forecasting, and robust financial modeling capabilities, all within PowerBrief.',
      color: 'text-green-500'
    },
    {
      icon: Store,
      title: 'UGC Creator Marketplace & Hub',
      description: "A dedicated public database where UGC creators can apply and build profiles. Brands can discover, vet, and hire top talent directly, similar to Backstage, but seamlessly integrated with PowerBrief's UGC pipeline and management tools.",
      color: 'text-purple-500'
    },
    {
      icon: CalendarDays,
      title: 'PowerCalendar: Integrated Scheduling',
      description: "Calendly-like scheduling, seamlessly integrated within PowerBrief for all your team, client, and creator meeting needs.",
      color: 'text-indigo-500'
    },
    {
      icon: Shapes,
      title: 'AI Ideation Whiteboard',
      description: 'A Poppy AI replacement for creative brainstorming. Upload assets or links for context, then chat with AI on a React Flow style whiteboard interface to spark and develop new ideas collaboratively.',
      color: 'text-pink-500'
    }
  ];

  /**
   * Ecosystem features configuration
   */
  const ecosystemFeatures = [
    {
      icon: ShoppingCart,
      title: 'PowerShop.ai: AI-Powered Commerce',
      description: "The AI-first Shopify alternative: AI-generated themes (via PowerFrame), an AI coding assistant in a browser-based IDE, plus integrated e-commerce essentials for effortless scaling.",
      color: 'text-orange-500'
    },
    {
      icon: PresentationIcon,
      title: 'PowerReports & PowerInsights: Deep Analytics',
      description: "Gain Motion/Atria-level insights with customizable, Meta-integrated reports. Features flexible timeframes, advanced filtering, and clear data visualizations for actionable ad performance and team productivity data.",
      color: 'text-cyan-500'
    }
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
        <section className="relative pt-32 pb-24 overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
          <div className="absolute inset-0 bg-grid-slate-900/[0.04] [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0))]" style={{ backgroundPosition: '10px 10px' }}></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
            <div className="text-center">
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900">
                The AI-Powered Platform For Modern
                <span className="block text-primary-600 font-extrabold mt-1 md:mt-2">Marketing Teams</span>
              </h1>
              <p className="mt-6 text-xl text-gray-700 max-w-4xl mx-auto">
                {productName} centralizes your entire marketing workflow. From multi-channel briefing (ads, email, web, social) 
                and AI wireframing with PowerFrame, to team collaboration, ad creation, UGC management, and direct Meta uploads.
              </p>
              <div className="mt-10 flex gap-4 justify-center">
                <AuthAwareButtons />
              </div>
              
              {/* Key Benefits - Enhanced Styling */}
              <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {[
                  { text: 'Brief Any Asset Type' },
                  { text: 'AI-Powered Wireframing' },
                  { text: 'Streamline Team Collaboration' },
                  { text: 'Automate UGC Workflows' },
                  { text: 'Replace Multiple Tools' },
                  { text: 'Launch Ads in Minutes' }
                ].map((benefit, index) => (
                  <div key={index} className="bg-white/60 backdrop-blur-md p-5 rounded-xl shadow-lg hover:shadow-xl transition-shadow text-center ring-1 ring-inset ring-gray-900/5">
                    <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-3" />
                    <span className="font-medium text-gray-800 text-sm">{benefit.text}</span>
                  </div>
                ))}
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
        <section id="workflow" className="py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold">Your Seamless Path from Idea to Impact</h2>
              <p className="mt-4 text-xl text-gray-600">
                PowerBrief AI streamlines your entire marketing lifecycle, from initial concept to live campaigns.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8">
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

        {/* Vision Section - New */}
        <section className="py-16 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Stop Juggling Tools. <span className="text-primary-600">Start Dominating Your Marketing.</span>
            </h2>
            <p className="mt-4 text-lg md:text-xl text-gray-700 leading-relaxed">
              Traditional project management is janky, disjointed, and disconnected from your critical platforms—ad managers, email, e-commerce. Marketing teams are forced to fit square pegs into round holes, wrestling with a patchwork of Sheets, ClickUp, Asana, Notion, and manually bridging gaps with VAs. Reviews are scattered across Frame.io, Google Drive, and Slack. Influencer hiring means tedious searches on Backstage. Teams work in silos, and brilliant ideas get lost in the chaos.
            </p>
            <p className="mt-6 text-xl md:text-2xl text-gray-800 font-semibold">
              {productName} is built to change that. We are the <span className="text-primary-600">all-in-one, AI-powered command center</span> where modern marketing teams unite to run their entire operation—from ideation to execution and analysis—seamlessly.
            </p>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold">A Full Suite of AI-Powered Marketing Tools</h2>
              <p className="mt-4 text-xl text-gray-600">
                {productName} replaces a dozen tools, bringing all your marketing creation, collaboration, and management into one intelligent platform.
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

        {/* PowerFrame AI Wireframing Highlight */}
        <section id="powerframe" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-6">Visualize Success with PowerFrame AI</h2>
                <p className="text-xl text-gray-600 mb-8">
                  Revolutionize your web design process. Upload competitor sites or existing designs, and let PowerFrame AI instantly generate interactive wireframes. 
                  Collaborate on our unique digital whiteboard for rapid prototyping.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>AI-Powered Competitor Site Analysis</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Instant Wireframe Generation</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Interactive Digital Whiteboard Tool</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Streamlined Web Asset Briefing</span>
                  </li>
                </ul>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-yellow-100 p-8 rounded-2xl">
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <ScanSearch className="h-8 w-8 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">Competitor to Wireframe</h4>
                      <p className="text-gray-500">Turn any URL into a detailed wireframe in seconds.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <DraftingCompass className="h-8 w-8 text-yellow-700" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">Unique Whiteboard Canvas</h4>
                      <p className="text-gray-500">Collaborate and iterate on designs with intuitive tools.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <LayoutDashboard className="h-8 w-8 text-amber-800" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">Rapid Prototyping</h4>
                      <p className="text-gray-500">Visualize user flows and site structures faster than ever.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Team Sync & Performance Highlight */}
        <section id="teamsync" className="py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="bg-gradient-to-br from-lime-50 to-green-100 p-8 rounded-2xl order-last lg:order-first">
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <TrendingUp className="h-8 w-8 text-lime-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">Data-Driven Scorecards</h4>
                      <p className="text-gray-500">Track KPIs and measure team performance effectively.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <AlertOctagonIcon className="h-8 w-8 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">Proactive Issue Tracking</h4>
                      <p className="text-gray-500">Identify, discuss, and resolve roadblocks collaboratively.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <ClipboardListIcon className="h-8 w-8 text-lime-700" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">Organized To-Dos</h4>
                      <p className="text-gray-500">Manage tasks and ensure accountability across projects.</p>
                    </div>
                  </div>
                   <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <MegaphoneIcon className="h-8 w-8 text-green-700" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">Clear Announcements</h4>
                      <p className="text-gray-500">Keep everyone informed and aligned with team updates.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lg:order-last">
                <h2 className="text-3xl font-bold mb-6">Align Your Team, Amplify Results</h2>
                <p className="text-xl text-gray-600 mb-8">
                  Bring focus and accountability to your marketing operations. Our Team Sync feature helps you manage scorecards, 
                  track issues, organize to-dos, and share announcements—a powerful alternative to Ninety.io.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Customizable Scorecards & KPIs</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Centralized Issue & Bottleneck Tracking</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Actionable To-Do Lists & Task Management</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Team-Wide Announcements & Updates</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* UGC Pipeline Highlight */}
        <section id="ugc-pipeline" className="py-24 bg-gradient-to-r from-pink-50 to-purple-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-6">Next-Gen UGC Creator Hub</h2>
                <p className="text-xl text-gray-600 mb-8">
                  Transform your UGC operations with an AI-powered pipeline. Manage everything from initial outreach 
                  and contract signing to workflow automation and AI-assisted creator management, all in one place.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Integrated Email & SMS Communication</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Built-in Document Signing (Replaces DocuSign)</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>AI-Powered Drag & Drop Workflow Builder</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>AI Agent for Virtual Influencer Management</span>
                  </li>
                   <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Automated Onboarding & Product Shipment Tracking</span>
                  </li>
                </ul>
              </div>
              <div className="bg-white p-8 rounded-2xl shadow-lg">
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <WorkflowIcon className="h-8 w-8 text-violet-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">Automate Your Process</h4>
                      <p className="text-gray-500">Design custom UGC workflows with our intuitive drag-and-drop AI builder.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <Bot className="h-8 w-8 text-rose-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">AI Creator Assistant</h4>
                      <p className="text-gray-500">Let our AI agent handle communications, contracts, and guide creators.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <FileSignature className="h-8 w-8 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">Seamless Contract Signing</h4>
                      <p className="text-gray-500">No more third-party tools. Handle all creator agreements in-app.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Review & Upload Highlight - Updated */}
        <section id="review-upload" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="bg-gradient-to-br from-sky-50 to-blue-100 p-8 rounded-2xl order-last lg:order-first">
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                        <MessageSquare className="h-8 w-8 text-sky-600" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-lg">Universal Asset Review</h4>
                        <p className="text-gray-500">Collaborate on ads, emails, web assets, social posts & more with precision feedback tools.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                        <Edit3 className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-lg">AI-Enhanced Ad Uploader</h4>
                        <p className="text-gray-500">Generate ad copy, select optimal thumbnails, and prepare campaigns efficiently.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                        <Rocket className="h-8 w-8 text-red-600" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-lg">Direct-to-Meta Launch</h4>
                        <p className="text-gray-500">Push approved ads live to Meta in minutes, streamlining your campaign deployment.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lg:order-last">
                <h2 className="text-3xl font-bold mb-6">Seamless Reviews & Smart Delivery</h2>
                <p className="text-xl text-gray-600 mb-8">
                  Review all your creative assets in one collaborative space. Then, leverage our AI-powered Ad Uploader 
                  for rapid, intelligent campaign launches directly to Meta.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Centralized review for all marketing assets</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Timeline comments & version control</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>AI Ad Copy Generation & Thumbnail Selection</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Bulk ad uploads directly to Meta</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Coming Soon Section - New */}
        <section id="coming-soon" className="py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold">What&apos;s Next: The Future of {productName}</h2>
              <p className="mt-4 text-xl text-gray-600">
                We&apos;re constantly innovating. Get a sneak peek at some incredible new capabilities coming soon!
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {comingSoonFeatures.map((feature, index) => (
                  <div
                      key={index}
                      className="bg-white p-6 rounded-xl shadow-sm hover:shadow-lg transition-shadow border border-gray-200"
                  >
                    <div className="flex items-center space-x-4 mb-4">
                      <feature.icon className={`h-10 w-10 ${feature.color}`} />
                      <h3 className="text-xl font-semibold">{feature.title}</h3>
                    </div>
                    <p className="text-gray-600">{feature.description}</p>
                  </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <HomePricing />

        {/* Ecosystem Vision Section - New */}
        <section id="ecosystem-vision" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold tracking-tight text-gray-900">Beyond Briefs: Our Expanding Ecosystem</h2>
              <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
                Our vision extends to a fully integrated suite of AI-powered tools designed to revolutionize how you manage marketing, commerce, and team operations.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-10">
              {ecosystemFeatures.map((feature, index) => (
                <div key={index} className="flex flex-col items-center text-center p-8 bg-gray-50 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
                  <feature.icon className={`h-12 w-12 mb-6 ${feature.color}`} />
                  <h3 className="text-2xl font-semibold text-gray-800 mb-3">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Call-to-Action Section */}
        <section className="py-24 bg-primary-600">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white">
              Ready to Supercharge Your Entire Marketing Lifecycle?
            </h2>
            <p className="mt-4 text-xl text-primary-100">
              From AI-powered briefing and wireframing to team sync, UGC automation, and rapid ad deployment—{productName} has you covered.
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

        {/* Footer Section - Enhanced */}
        <footer className="bg-gray-900 text-gray-400">
          <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
              <div className="col-span-2 md:col-span-4 lg:col-span-1 mb-8 lg:mb-0">
                <Link href="/" className="inline-block mb-6">
                  <Image 
                    src="/images/powerbrief-logo.png"
                    alt={`${productName} Logo`}
                    width={150} 
                    height={36}
                    className="object-contain filter invert brightness-0 saturate-100%"
                  />
                </Link>
                <p className="text-sm mb-6">
                  The AI-Powered Platform For Modern Marketing Teams.
                </p>
                <div className="flex space-x-5">
                  <Link href="#" className="text-gray-400 hover:text-white"><span className="sr-only">Twitter</span><Twitter size={20}/></Link>
                  <Link href="#" className="text-gray-400 hover:text-white"><span className="sr-only">LinkedIn</span><Linkedin size={20}/></Link>
                  <Link href="#" className="text-gray-400 hover:text-white"><span className="sr-only">Instagram</span><Instagram size={20}/></Link>
                  <Link href="#" className="text-gray-400 hover:text-white"><span className="sr-only">YouTube</span><Youtube size={20}/></Link>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-200 tracking-wider uppercase mb-4">Product</h4>
                <ul className="space-y-3">
                  <li>
                    <Link href="#features" className="hover:text-white transition-colors duration-200">
                      All Features
                    </Link>
                  </li>
                  <li>
                    <Link href="#workflow" className="hover:text-white transition-colors duration-200">
                      Workflow
                    </Link>
                  </li>
                  <li>
                    <Link href="#pricing" className="hover:text-white transition-colors duration-200">
                      Pricing
                    </Link>
                  </li>
                   <li>
                    <Link href="#coming-soon" className="hover:text-white transition-colors duration-200">
                      Coming Soon
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-200 tracking-wider uppercase mb-4">Key Solutions</h4>
                <ul className="space-y-3">
                  <li>
                    <Link href="#powerframe" className="hover:text-white transition-colors duration-200">
                      PowerFrame AI
                    </Link>
                  </li>
                  <li>
                    <Link href="#teamsync" className="hover:text-white transition-colors duration-200">
                      Team Sync
                    </Link>
                  </li>
                  <li>
                    <Link href="#ugc-pipeline" className="hover:text-white transition-colors duration-200">
                      UGC Platform
                    </Link>
                  </li>
                  <li>
                    <Link href="#review-upload" className="hover:text-white transition-colors duration-200">
                      Ad Management
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-200 tracking-wider uppercase mb-4">Resources</h4>
                <ul className="space-y-3">
                  <li>
                    <Link href="#" className="hover:text-white transition-colors duration-200">
                      Documentation
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="hover:text-white transition-colors duration-200">
                      Help Center
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="hover:text-white transition-colors duration-200">
                      API Reference
                    </Link>
                  </li>
                   <li>
                    <Link href="#" className="hover:text-white transition-colors duration-200">
                      Blog
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-200 tracking-wider uppercase mb-4">Legal</h4>
                <ul className="space-y-3">
                  <li>
                    <Link href="/legal/privacy" className="hover:text-white transition-colors duration-200">
                      Privacy
                    </Link>
                  </li>
                  <li>
                    <Link href="/legal/terms" className="hover:text-white transition-colors duration-200">
                      Terms
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-12 pt-8 border-t border-gray-700 text-center">
              <p className="text-sm">
                &copy; {new Date().getFullYear()} {productName}. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
  );
}