"use client";
import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, CheckCircle, AlertCircle, Info, MessageCircle, Users, Bell, BarChart } from 'lucide-react';

export default function TeamSyncSOPPage() {
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
              <Calendar className="h-8 w-8 text-primary-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Team Sync</h1>
              <div className="flex items-center mt-2 space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>10 minutes</span>
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
                  <Calendar className="h-8 w-8 text-primary-600" />
                </div>
                <p className="text-gray-600 font-medium">Team Sync Training Video</p>
                <p className="text-gray-500 text-sm mt-1">Collaboration and communication tools</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Team Sync: Collaboration & Communication</h2>
            
            {/* Overview */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Overview</h3>
              <p className="text-gray-700 mb-4">
                Team Sync is PowerBrief&apos;s collaboration hub that keeps everyone aligned, informed, and productive. 
                This module covers communication tools, project tracking, status updates, and best practices for 
                maintaining seamless team coordination across all campaigns and projects.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">Unified Team Communication</h4>
                    <p className="text-blue-800 text-sm">
                      Team Sync integrates all communication channels, project updates, and team insights 
                      into one centralized platform for maximum efficiency.
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
                  <span className="text-gray-700">Master team communication and collaboration features</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Implement effective project tracking and status updates</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Optimize meeting coordination and scheduling</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Leverage team performance insights and analytics</span>
                </div>
              </div>
            </section>

            {/* Core Features */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Core Team Sync Features</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                  <MessageCircle className="h-8 w-8 text-blue-600 mb-3" />
                  <h4 className="font-semibold text-blue-900 mb-2">Team Chat</h4>
                  <p className="text-blue-800 text-sm">Real-time messaging and project discussions</p>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                  <Users className="h-8 w-8 text-green-600 mb-3" />
                  <h4 className="font-semibold text-green-900 mb-2">Team Directory</h4>
                  <p className="text-green-800 text-sm">Team member profiles and availability status</p>
                </div>
                
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
                  <Bell className="h-8 w-8 text-yellow-600 mb-3" />
                  <h4 className="font-semibold text-yellow-900 mb-2">Notifications</h4>
                  <p className="text-yellow-800 text-sm">Smart alerts and project updates</p>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-lg p-4">
                  <BarChart className="h-8 w-8 text-purple-600 mb-3" />
                  <h4 className="font-semibold text-purple-900 mb-2">Analytics</h4>
                  <p className="text-purple-800 text-sm">Team performance and productivity insights</p>
                </div>
              </div>
            </section>

            {/* Team Communication */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Team Communication Best Practices</h3>
              
              <div className="space-y-6">
                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      1
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Channel Organization</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• Create dedicated channels for each project or campaign</li>
                    <li>• Use general channels for team-wide announcements</li>
                    <li>• Set up topic-specific channels (creative, strategy, client)</li>
                    <li>• Archive completed project channels to reduce clutter</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      2
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Message Etiquette</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• Use clear, descriptive subject lines for important updates</li>
                    <li>• Tag relevant team members using @mentions</li>
                    <li>• Include context and background for new team members</li>
                    <li>• Use threads for detailed discussions to keep channels organized</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      3
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Status Updates</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• Post regular project progress updates</li>
                    <li>• Share completed milestones and achievements</li>
                    <li>• Communicate blockers and needed support</li>
                    <li>• Update availability and working hours</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      4
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Meeting Coordination</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• Schedule meetings through the integrated calendar</li>
                    <li>• Share agendas and meeting materials in advance</li>
                    <li>• Record meeting notes and action items</li>
                    <li>• Follow up with meeting summaries and next steps</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Project Tracking */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Project Tracking & Management</h3>
              
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
                  <h4 className="font-semibold text-blue-900 mb-3">Project Dashboards</h4>
                  <ul className="text-blue-800 text-sm space-y-1">
                    <li>• View all active projects and their current status</li>
                    <li>• Track deadlines, milestones, and deliverables</li>
                    <li>• Monitor team workload and capacity</li>
                    <li>• Identify potential bottlenecks and resource needs</li>
                  </ul>
                </div>
                
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-5">
                  <h4 className="font-semibold text-green-900 mb-3">Task Management</h4>
                  <ul className="text-green-800 text-sm space-y-1">
                    <li>• Assign tasks with clear descriptions and deadlines</li>
                    <li>• Set priority levels and dependencies</li>
                    <li>• Update task status and completion percentage</li>
                    <li>• Link tasks to specific briefs and campaigns</li>
                  </ul>
                </div>
                
                <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-lg p-5">
                  <h4 className="font-semibold text-purple-900 mb-3">Performance Metrics</h4>
                  <ul className="text-purple-800 text-sm space-y-1">
                    <li>• Track project completion rates and timelines</li>
                    <li>• Monitor team productivity and collaboration</li>
                    <li>• Analyze communication patterns and response times</li>
                    <li>• Generate reports for stakeholder updates</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Notification Management */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Smart Notification Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-green-900 mb-2">Recommended Settings</h4>
                      <ul className="text-green-800 text-sm space-y-1">
                        <li>• Enable notifications for direct mentions</li>
                        <li>• Get alerts for urgent project updates</li>
                        <li>• Receive daily digest emails</li>
                        <li>• Turn on deadline reminders</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-amber-900 mb-2">Focus Time Settings</h4>
                      <ul className="text-amber-800 text-sm space-y-1">
                        <li>• Set &quot;Do Not Disturb&quot; hours for deep work</li>
                        <li>• Customize notification frequency</li>
                        <li>• Use mobile vs desktop preferences</li>
                        <li>• Configure weekend and holiday settings</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Team Directory Features */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Team Directory & Profiles</h3>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                <h4 className="font-medium text-gray-900 mb-3">Profile Information</h4>
                <div className="space-y-3 text-gray-700 text-sm">
                  <p>• <strong>Role & Expertise:</strong> Define your role, skills, and areas of expertise</p>
                  <p>• <strong>Availability Status:</strong> Set working hours, time zone, and current availability</p>
                  <p>• <strong>Current Projects:</strong> Display active campaigns and workload status</p>
                  <p>• <strong>Contact Preferences:</strong> Specify best communication methods and times</p>
                  <p>• <strong>Bio & Background:</strong> Share relevant experience and team context</p>
                </div>
              </div>
            </section>

            {/* Integration Features */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Integration with PowerBrief Workflow</h3>
              
              <div className="space-y-4">
                <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Brief Collaboration</h4>
                  <p className="text-blue-800 text-sm mb-2">Seamlessly discuss briefs, share feedback, and coordinate creative development.</p>
                  <p className="text-blue-700 text-sm font-medium">Connect: Team discussions link directly to specific briefs and campaigns.</p>
                </div>
                
                <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-2">Review Process Integration</h4>
                  <p className="text-green-800 text-sm mb-2">Coordinate review cycles, feedback collection, and approval workflows.</p>
                  <p className="text-green-700 text-sm font-medium">Connect: Review notifications and discussions centralized in team channels.</p>
                </div>
                
                <div className="border border-purple-200 bg-purple-50 rounded-lg p-4">
                  <h4 className="font-medium text-purple-900 mb-2">Asset Management Sync</h4>
                  <p className="text-purple-800 text-sm mb-2">Share assets, coordinate uploads, and discuss creative materials.</p>
                  <p className="text-purple-700 text-sm font-medium">Connect: Asset sharing and feedback integrated with team communication.</p>
                </div>
              </div>
            </section>

            {/* Summary */}
            <section>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Summary</h3>
              <p className="text-gray-700 mb-4">
                Team Sync transforms how creative teams collaborate by providing centralized communication, 
                transparent project tracking, and seamless integration with all PowerBrief workflows. 
                Effective use of these tools leads to better coordination, faster decision-making, and higher team productivity.
              </p>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Getting Started</h4>
                <p className="text-gray-700 text-sm">
                  Set up your team profile, join relevant project channels, and configure notification preferences. 
                  Start using daily check-ins and status updates to build strong team communication habits.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
} 