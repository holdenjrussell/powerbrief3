"use client";
import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, Clock, CheckCircle, Info, FolderOpen, Tag, FileCheck } from 'lucide-react';
import SOPVideoUpload from '@/components/sops/SOPVideoUpload';

export default function AdUploadToolSOPPage() {
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
              <Upload className="h-8 w-8 text-primary-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Ad Upload Tool</h1>
              <div className="flex items-center mt-2 space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>14 minutes</span>
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
              sopId="ad-upload-tool"
              isAdmin={true} // TODO: Replace with actual admin check
            />
          </div>
        </div>

        {/* Content Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Ad Upload Tool: File Management & Organization</h2>
            
            {/* Overview */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Overview</h3>
              <p className="text-gray-700 mb-4">
                The Ad Upload Tool is your central hub for managing creative assets, organizing campaigns, and maintaining 
                a structured library of advertising content. This module covers efficient file management, metadata organization, 
                and best practices for asset discovery and collaboration.
              </p>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Info className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-green-900 mb-1">Centralized Asset Management</h4>
                    <p className="text-green-800 text-sm">
                      Keep all your creative assets organized in one place, making it easy for teams to find, 
                      share, and repurpose content across campaigns.
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
                  <span className="text-gray-700">Efficiently upload and organize advertising assets</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Implement consistent tagging and metadata strategies</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Create organized folder structures for easy navigation</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Manage file versions and maintain quality standards</span>
                </div>
              </div>
            </section>

            {/* Tool Features */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Key Features</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                  <Upload className="h-8 w-8 text-blue-600 mb-3" />
                  <h4 className="font-semibold text-blue-900 mb-2">Bulk Upload</h4>
                  <p className="text-blue-800 text-sm">Upload multiple files simultaneously with drag-and-drop</p>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                  <FolderOpen className="h-8 w-8 text-green-600 mb-3" />
                  <h4 className="font-semibold text-green-900 mb-2">Smart Organization</h4>
                  <p className="text-green-800 text-sm">Automatic folder suggestions and campaign categorization</p>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-lg p-4">
                  <Tag className="h-8 w-8 text-purple-600 mb-3" />
                  <h4 className="font-semibold text-purple-900 mb-2">Metadata Tagging</h4>
                  <p className="text-purple-800 text-sm">Rich tagging system for easy search and discovery</p>
                </div>
              </div>
            </section>

            {/* Upload Process */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Upload Process</h3>
              
              <div className="space-y-6">
                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      1
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">File Selection & Upload</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• Navigate to Ad Upload Tool from main navigation</li>
                    <li>• Select files using drag-and-drop or file browser</li>
                    <li>• Choose upload destination folder or create new one</li>
                    <li>• Monitor upload progress and file validation</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      2
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Metadata & Organization</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• Add descriptive titles and file descriptions</li>
                    <li>• Apply relevant tags (campaign, brand, format, etc.)</li>
                    <li>• Set campaign associations and date ranges</li>
                    <li>• Configure access permissions and sharing settings</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      3
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Quality Control</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• Review file specifications and quality metrics</li>
                    <li>• Check for compliance with platform requirements</li>
                    <li>• Validate brand guideline adherence</li>
                    <li>• Confirm metadata accuracy and completeness</li>
                  </ul>
                </div>

                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                      4
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">Finalization & Sharing</h4>
                  </div>
                  <ul className="space-y-2 ml-11 text-gray-700">
                    <li>• Confirm upload completion and file availability</li>
                    <li>• Share assets with relevant team members</li>
                    <li>• Generate asset links and download options</li>
                    <li>• Update project documentation and brief references</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Organization Best Practices */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Organization Best Practices</h3>
              
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
                  <h4 className="font-semibold text-blue-900 mb-3">Folder Structure Strategy</h4>
                  <ul className="text-blue-800 text-sm space-y-1">
                    <li>• Use consistent naming conventions (Brand → Campaign → Format)</li>
                    <li>• Create separate folders for drafts vs. final assets</li>
                    <li>• Organize by time periods (quarterly, monthly campaigns)</li>
                    <li>• Maintain archive folders for historical content</li>
                  </ul>
                </div>
                
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-5">
                  <h4 className="font-semibold text-green-900 mb-3">Tagging & Metadata Standards</h4>
                  <ul className="text-green-800 text-sm space-y-1">
                    <li>• Use standardized tag vocabulary across teams</li>
                    <li>• Include platform-specific tags (Facebook, Instagram, etc.)</li>
                    <li>• Tag by creative theme, audience, and objective</li>
                    <li>• Add performance indicators (high-performing, tested, etc.)</li>
                  </ul>
                </div>
                
                <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-lg p-5">
                  <h4 className="font-semibold text-purple-900 mb-3">Version Control</h4>
                  <ul className="text-purple-800 text-sm space-y-1">
                    <li>• Use version numbers in file names (v1, v2, v3)</li>
                    <li>• Mark final versions clearly (_FINAL, _APPROVED)</li>
                    <li>• Keep change logs for major revisions</li>
                    <li>• Archive old versions rather than deleting</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* File Types & Specifications */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Supported File Types & Specifications</h3>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                <h4 className="font-medium text-gray-900 mb-3">File Format Support</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div>
                    <h5 className="font-medium text-gray-800 mb-2">Images</h5>
                    <ul className="text-gray-600 space-y-1">
                      <li>• JPG/JPEG (up to 50MB)</li>
                      <li>• PNG (up to 50MB)</li>
                      <li>• SVG (vector graphics)</li>
                      <li>• WebP (web-optimized)</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-800 mb-2">Videos</h5>
                    <ul className="text-gray-600 space-y-1">
                      <li>• MP4 (up to 2GB)</li>
                      <li>• MOV (up to 2GB)</li>
                      <li>• AVI (up to 2GB)</li>
                      <li>• GIF (animated)</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-800 mb-2">Documents</h5>
                    <ul className="text-gray-600 space-y-1">
                      <li>• PDF (briefs, guidelines)</li>
                      <li>• DOC/DOCX (copy documents)</li>
                      <li>• XLS/XLSX (data sheets)</li>
                      <li>• TXT (copy files)</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-800 mb-2">Design Files</h5>
                    <ul className="text-gray-600 space-y-1">
                      <li>• PSD (Photoshop)</li>
                      <li>• AI (Illustrator)</li>
                      <li>• SKETCH (Sketch files)</li>
                      <li>• FIGMA (design links)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Collaboration Features */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Collaboration & Sharing</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-green-900 mb-2">Sharing Options</h4>
                      <ul className="text-green-800 text-sm space-y-1">
                        <li>• Generate shareable links with expiration dates</li>
                        <li>• Set download permissions and access levels</li>
                        <li>• Create asset collections for stakeholders</li>
                        <li>• Integrate with PowerBrief workflow notifications</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <FileCheck className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-blue-900 mb-2">Team Collaboration</h4>
                      <ul className="text-blue-800 text-sm space-y-1">
                        <li>• Comment and feedback on uploaded assets</li>
                        <li>• Track file usage across different campaigns</li>
                        <li>• Maintain asset approval history</li>
                        <li>• Sync with brief references and project files</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Common Issues & Solutions */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Troubleshooting Common Issues</h3>
              
              <div className="space-y-4">
                <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                  <h4 className="font-medium text-red-900 mb-2">Issue: Upload Fails or Stalls</h4>
                  <p className="text-red-800 text-sm mb-2">Large files fail to upload or upload process freezes.</p>
                  <p className="text-red-700 text-sm font-medium">Solution: Check file size limits, internet connection, and try batch uploads for multiple files.</p>
                </div>
                
                <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                  <h4 className="font-medium text-red-900 mb-2">Issue: Files Not Found in Search</h4>
                  <p className="text-red-800 text-sm mb-2">Uploaded assets don&apos;t appear in search results or are difficult to locate.</p>
                  <p className="text-red-700 text-sm font-medium">Solution: Ensure proper tagging, check folder organization, and use consistent naming conventions.</p>
                </div>
                
                <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                  <h4 className="font-medium text-red-900 mb-2">Issue: Version Confusion</h4>
                  <p className="text-red-800 text-sm mb-2">Team members working with outdated or incorrect file versions.</p>
                  <p className="text-red-700 text-sm font-medium">Solution: Implement clear version naming and archive old versions in separate folders.</p>
                </div>
              </div>
            </section>

            {/* Summary */}
            <section>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Summary</h3>
              <p className="text-gray-700 mb-4">
                The Ad Upload Tool is essential for maintaining organized, accessible creative assets. By following 
                best practices for file organization, metadata tagging, and team collaboration, you can ensure your 
                creative assets are always findable and ready for use across campaigns.
              </p>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Next Steps</h4>
                <p className="text-gray-700 text-sm">
                  Start organizing your current asset library using the folder structure and tagging strategies covered. 
                  Consider exploring the &quot;Ad Reviews&quot; module to understand how uploaded assets integrate with 
                  the review and approval workflow.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
} 