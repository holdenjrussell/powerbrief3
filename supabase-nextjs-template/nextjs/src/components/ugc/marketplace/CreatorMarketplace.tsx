'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search,
  Filter,
  DollarSign,
  Calendar,
  Send,
  Briefcase
} from 'lucide-react';
import { createSPAClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

const supabase = createSPAClient();

interface JobPosting {
  id: string;
  brand_id: string;
  brand_name?: string;
  title: string;
  description: string;
  requirements?: string;
  compensation_range?: string;
  content_types: string[];
  target_demographics: Record<string, unknown>;
  application_deadline?: string;
  slots_available?: number;
  slots_filled: number;
  created_at: string;
}

interface MarketplaceApplication {
  job_id: string;
  creator_id?: string;
  cover_letter?: string;
  portfolio_samples: string[];
  proposed_rate?: number;
}

export default function CreatorMarketplace() {
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [filteredPostings, setFilteredPostings] = useState<JobPosting[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContentType, setSelectedContentType] = useState<string>('all');
  const [isApplicationDialogOpen, setIsApplicationDialogOpen] = useState(false);
  
  // Application form state
  const [applicationData, setApplicationData] = useState<MarketplaceApplication>({
    job_id: '',
    cover_letter: '',
    portfolio_samples: [],
    proposed_rate: undefined
  });

  useEffect(() => {
    loadJobPostings();
  }, []);

  useEffect(() => {
    filterPostings();
  }, [searchTerm, selectedContentType, jobPostings]);

  const loadJobPostings = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('ugc_brand_job_postings')
        .select(`
          *,
          brands (
            name
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const postingsWithBrandName = (data || []).map(posting => ({
        ...posting,
        brand_name: posting.brands?.name
      }));

      setJobPostings(postingsWithBrandName);
      setFilteredPostings(postingsWithBrandName);
    } catch (error) {
      console.error('Error loading job postings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterPostings = () => {
    let filtered = [...jobPostings];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(job => 
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.brand_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Content type filter
    if (selectedContentType !== 'all') {
      filtered = filtered.filter(job => 
        job.content_types.includes(selectedContentType)
      );
    }

    setFilteredPostings(filtered);
  };

  const handleApplyToJob = async () => {
    if (!selectedJob) return;

    try {
      // In a real app, you'd get the creator_id from auth
      // For now, we'll create a marketplace application without a creator_id
      const { error } = await supabase
        .from('ugc_job_applications')
        .insert({
          id: uuidv4(),
          job_id: selectedJob.id,
          cover_letter: applicationData.cover_letter,
          portfolio_samples: applicationData.portfolio_samples,
          proposed_rate: applicationData.proposed_rate,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      // Update slots filled
      await supabase
        .from('ugc_brand_job_postings')
        .update({ slots_filled: selectedJob.slots_filled + 1 })
        .eq('id', selectedJob.id);

      setIsApplicationDialogOpen(false);
      setApplicationData({
        job_id: '',
        cover_letter: '',
        portfolio_samples: [],
        proposed_rate: undefined
      });

      // Reload postings
      loadJobPostings();
    } catch (error) {
      console.error('Error submitting application:', error);
    }
  };

  const getContentTypes = () => {
    const types = new Set<string>();
    jobPostings.forEach(job => {
      job.content_types.forEach(type => types.add(type));
    });
    return Array.from(types);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Creator Marketplace</h1>
              <p className="mt-2 text-gray-600">Find your next brand collaboration</p>
            </div>
            <div className="mt-4 md:mt-0 flex items-center gap-4">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                <Briefcase className="h-5 w-5 mr-2" />
                {jobPostings.length} Active Opportunities
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Search opportunities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-64">
              <Select
                value={selectedContentType}
                onValueChange={setSelectedContentType}
              >
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Content Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Content Types</SelectItem>
                  {getContentTypes().map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPostings.map((job) => (
            <Card key={job.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{job.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {job.brand_name || 'Brand'}
                    </CardDescription>
                  </div>
                  {job.slots_available && (
                    <Badge variant={job.slots_filled >= job.slots_available ? 'secondary' : 'default'}>
                      {job.slots_available - job.slots_filled} spots left
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                  {job.description}
                </p>

                <div className="space-y-2 mb-4">
                  {job.compensation_range && (
                    <div className="flex items-center text-sm text-gray-600">
                      <DollarSign className="h-4 w-4 mr-2" />
                      {job.compensation_range}
                    </div>
                  )}
                  {job.application_deadline && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      Apply by {new Date(job.application_deadline).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {job.content_types.map((type) => (
                    <Badge key={type} variant="outline" className="text-xs">
                      {type}
                    </Badge>
                  ))}
                </div>

                <Dialog open={isApplicationDialogOpen && selectedJob?.id === job.id} onOpenChange={setIsApplicationDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      className="w-full"
                      onClick={() => {
                        setSelectedJob(job);
                        setApplicationData({ ...applicationData, job_id: job.id });
                      }}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Apply Now
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Apply to {job.title}</DialogTitle>
                      <DialogDescription>
                        Submit your application for this opportunity at {job.brand_name}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label>Cover Letter</Label>
                        <Textarea
                          value={applicationData.cover_letter}
                          onChange={(e) => setApplicationData({ ...applicationData, cover_letter: e.target.value })}
                          placeholder="Tell us why you're perfect for this opportunity..."
                          rows={6}
                        />
                      </div>

                      <div>
                        <Label>Portfolio Links</Label>
                        <Input
                          placeholder="Add portfolio links (comma separated)"
                          onChange={(e) => setApplicationData({ 
                            ...applicationData, 
                            portfolio_samples: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                          })}
                        />
                      </div>

                      <div>
                        <Label>Proposed Rate (Optional)</Label>
                        <Input
                          type="number"
                          placeholder="Your rate per content piece"
                          value={applicationData.proposed_rate || ''}
                          onChange={(e) => setApplicationData({ 
                            ...applicationData, 
                            proposed_rate: e.target.value ? parseFloat(e.target.value) : undefined
                          })}
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsApplicationDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleApplyToJob}>
                          Submit Application
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredPostings.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No opportunities found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
} 