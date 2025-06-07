'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  AlertCircle,
  Instagram,
  User,
  Mail,
  Phone,
  Link
} from 'lucide-react';
import {
  UgcOnboardingFormConfig,
  CustomFormField
} from '@/lib/types/ugcWorkflow';
import {
  getOnboardingFormConfig,
  createFormSubmission
} from '@/lib/services/ugcWorkflowService';

interface CreatorApplicationFormProps {
  brandId: string;
  formId?: string;
  onSuccess?: () => void;
}

interface FormData {
  name: string;
  email: string;
  phone_number?: string;
  instagram_handle?: string;
  tiktok_handle?: string;
  portfolio_link?: string;
  demographics: {
    age?: string;
    location?: string;
    gender?: string;
  };
  content_types: string[];
  platforms: string[];
  custom_fields: Record<string, string | boolean | number>;
  consent_email: boolean;
  consent_sms: boolean;
}

const DEFAULT_CONTENT_TYPES = [
  'Product Reviews',
  'Unboxing Videos',
  'Tutorials',
  'Lifestyle Content',
  'Before/After',
  'Testimonials'
];

const DEFAULT_PLATFORMS = [
  'Instagram',
  'TikTok',
  'YouTube',
  'Facebook',
  'Twitter/X'
];

export default function CreatorApplicationForm({ 
  brandId, 
  formId,
  onSuccess 
}: CreatorApplicationFormProps) {
  const [formConfig, setFormConfig] = useState<UgcOnboardingFormConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone_number: '',
    instagram_handle: '',
    tiktok_handle: '',
    portfolio_link: '',
    demographics: {},
    content_types: [],
    platforms: [],
    custom_fields: {},
    consent_email: false,
    consent_sms: false
  });

  useEffect(() => {
    loadFormConfig();
  }, [brandId, formId]);

  const loadFormConfig = async () => {
    try {
      setIsLoading(true);
      const config = await getOnboardingFormConfig(brandId);
      
      if (!config || !config.is_active) {
        setErrorMessage('This application form is not currently available.');
        return;
      }
      
      setFormConfig(config);
    } catch (error) {
      console.error('Error loading form config:', error);
      setErrorMessage('Failed to load application form.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formConfig) return;
    
    setIsSubmitting(true);
    setErrorMessage('');
    
    try {
      // Validate required fields
      if (!formData.name || !formData.email) {
        throw new Error('Please fill in all required fields.');
      }
      
      // Create submission
      await createFormSubmission({
        form_config_id: formConfig.id,
        brand_id: brandId,
        submission_data: {
          ...formData,
          submitted_at: new Date().toISOString()
        },
        status: formConfig.requires_approval ? 'pending' : 'approved',
        utm_source: new URLSearchParams(window.location.search).get('utm_source') || undefined,
        utm_medium: new URLSearchParams(window.location.search).get('utm_medium') || undefined,
        utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign') || undefined
      });
      
      setSubmitStatus('success');
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to submit application.');
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCustomField = (field: CustomFormField) => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'url':
        return (
          <div key={field.name}>
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              type={field.type}
              value={formData.custom_fields[field.name] || ''}
              onChange={(e) => setFormData({
                ...formData,
                custom_fields: {
                  ...formData.custom_fields,
                  [field.name]: e.target.value
                }
              })}
              placeholder={field.placeholder}
              required={field.required}
            />
          </div>
        );
      
      case 'textarea':
        return (
          <div key={field.name}>
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={field.name}
              value={formData.custom_fields[field.name] || ''}
              onChange={(e) => setFormData({
                ...formData,
                custom_fields: {
                  ...formData.custom_fields,
                  [field.name]: e.target.value
                }
              })}
              placeholder={field.placeholder}
              required={field.required}
              rows={4}
            />
          </div>
        );
      
      case 'select':
        return (
          <div key={field.name}>
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select
              value={formData.custom_fields[field.name] || ''}
              onValueChange={(value) => setFormData({
                ...formData,
                custom_fields: {
                  ...formData.custom_fields,
                  [field.name]: value
                }
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder={field.placeholder || 'Select an option'} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      
      case 'checkbox':
        return (
          <div key={field.name} className="flex items-center space-x-2">
            <Checkbox
              id={field.name}
              checked={formData.custom_fields[field.name] || false}
              onCheckedChange={(checked) => setFormData({
                ...formData,
                custom_fields: {
                  ...formData.custom_fields,
                  [field.name]: checked
                }
              })}
            />
            <Label htmlFor={field.name} className="cursor-pointer">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
          </div>
        );
      
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!formConfig) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{errorMessage}</AlertDescription>
      </Alert>
    );
  }

  if (submitStatus === 'success') {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Application Submitted!</h2>
            <p className="text-gray-600">
              {formConfig.success_message || 'Thank you for your application. We\'ll review it and get back to you soon!'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{formConfig.form_name}</CardTitle>
        {formConfig.description && (
          <CardDescription>{formConfig.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {formConfig.welcome_message && (
          <Alert className="mb-6">
            <AlertDescription>{formConfig.welcome_message}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            
            <div>
              <Label htmlFor="name">
                <User className="h-4 w-4 inline mr-1" />
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="email">
                <Mail className="h-4 w-4 inline mr-1" />
                Email Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="phone">
                <Phone className="h-4 w-4 inline mr-1" />
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              />
            </div>
          </div>

          {/* Social Media */}
          {formConfig.collect_social_handles && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Social Media</h3>
              
              <div>
                <Label htmlFor="instagram">
                  <Instagram className="h-4 w-4 inline mr-1" />
                  Instagram Handle
                </Label>
                <Input
                  id="instagram"
                  value={formData.instagram_handle}
                  onChange={(e) => setFormData({ ...formData, instagram_handle: e.target.value })}
                  placeholder="@username"
                />
              </div>

              <div>
                <Label htmlFor="tiktok">
                  TikTok Handle
                </Label>
                <Input
                  id="tiktok"
                  value={formData.tiktok_handle}
                  onChange={(e) => setFormData({ ...formData, tiktok_handle: e.target.value })}
                  placeholder="@username"
                />
              </div>
            </div>
          )}

          {/* Portfolio */}
          {formConfig.collect_portfolio && (
            <div>
              <Label htmlFor="portfolio">
                <Link className="h-4 w-4 inline mr-1" />
                Portfolio Link
              </Label>
              <Input
                id="portfolio"
                type="url"
                value={formData.portfolio_link}
                onChange={(e) => setFormData({ ...formData, portfolio_link: e.target.value })}
                placeholder="https://..."
              />
            </div>
          )}

          {/* Content Preferences */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Content Preferences</h3>
            
            <div>
              <Label>Content Types You Create</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {DEFAULT_CONTENT_TYPES.map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={`content-${type}`}
                      checked={formData.content_types.includes(type)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({
                            ...formData,
                            content_types: [...formData.content_types, type]
                          });
                        } else {
                          setFormData({
                            ...formData,
                            content_types: formData.content_types.filter(t => t !== type)
                          });
                        }
                      }}
                    />
                    <Label htmlFor={`content-${type}`} className="cursor-pointer">
                      {type}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Platforms You Use</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {DEFAULT_PLATFORMS.map((platform) => (
                  <div key={platform} className="flex items-center space-x-2">
                    <Checkbox
                      id={`platform-${platform}`}
                      checked={formData.platforms.includes(platform)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({
                            ...formData,
                            platforms: [...formData.platforms, platform]
                          });
                        } else {
                          setFormData({
                            ...formData,
                            platforms: formData.platforms.filter(p => p !== platform)
                          });
                        }
                      }}
                    />
                    <Label htmlFor={`platform-${platform}`} className="cursor-pointer">
                      {platform}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Custom Fields */}
          {formConfig.custom_fields && Array.isArray(formConfig.custom_fields) && formConfig.custom_fields.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Additional Information</h3>
              {(formConfig.custom_fields as unknown as CustomFormField[]).map(renderCustomField)}
            </div>
          )}

          {/* Consent */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="consent-email"
                checked={formData.consent_email}
                onCheckedChange={(checked) => setFormData({ ...formData, consent_email: !!checked })}
              />
              <Label htmlFor="consent-email" className="cursor-pointer">
                I agree to receive emails about collaboration opportunities
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="consent-sms"
                checked={formData.consent_sms}
                onCheckedChange={(checked) => setFormData({ ...formData, consent_sms: !!checked })}
              />
              <Label htmlFor="consent-sms" className="cursor-pointer">
                I agree to receive SMS messages about collaboration opportunities
              </Label>
            </div>
          </div>

          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 