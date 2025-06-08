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
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  AlertCircle,
  Instagram,
  User,
  Link,
  MapPin,
  Camera,
  DollarSign,
  Video,
  Loader2
} from 'lucide-react';
import {
  UgcOnboardingFormConfig,
  CustomFormField
} from '@/lib/types/ugcWorkflow';
import {
  getOnboardingFormConfig,
  createFormSubmission
} from '@/lib/services/ugcWorkflowService';
import {
  getPublicFormFieldConfigs,
  saveCreatorWithCustomFields
} from '@/lib/services/ugcCreatorFieldService';
import {
  CreatorFieldConfig,
  CreatorFieldType,
  FIELD_GROUPS
} from '@/lib/types/ugcCreatorFields';

interface CreatorApplicationFormProps {
  brandId: string;
  formId?: string;
  onSuccess?: () => void;
}

interface FormData {
  // Basic Information
  name: string;
  email: string;
  phone_number?: string;
  
  // Social Media
  instagram_handle?: string;
  tiktok_handle?: string;
  portfolio_link?: string;
  
  // Demographics
  demographics: {
    age?: string;
    location?: string;
    gender?: string;
  };
  
  // Creator Details
  content_types: string[];
  platforms: string[];
  per_script_fee?: number;
  
  // Address Information
  address: {
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  
  // Custom Fields
  custom_fields: Record<string, string | boolean | number>;
  
  // Consent
  consent_email: boolean;
  consent_sms: boolean;
}

const DEFAULT_CONTENT_TYPES = [
  'Product Reviews',
  'Unboxing Videos',
  'Tutorials',
  'Lifestyle Content',
  'Before/After',
  'Testimonials',
  'Get Ready With Me',
  'Day in the Life',
  'Product Demos',
  'Comparison Videos',
  'Hauls',
  'Styling Tips'
];

const DEFAULT_PLATFORMS = [
  'Instagram',
  'TikTok',
  'YouTube',
  'Facebook',
  'Twitter/X',
  'Pinterest',
  'Snapchat',
  'LinkedIn'
];

const GENDER_OPTIONS = [
  'Female',
  'Male',
  'Non-binary',
  'Prefer not to say'
];

const AGE_RANGES = [
  '16-20',
  '21-25',
  '26-30',
  '31-35',
  '36-40',
  '41-45',
  '46-50',
  '50+'
];

export default function CreatorApplicationForm({ 
  brandId, 
  formId,
  onSuccess 
}: CreatorApplicationFormProps) {
  const [fieldConfigs, setFieldConfigs] = useState<CreatorFieldConfig[]>([]);
  const [formConfig, setFormConfig] = useState<UgcOnboardingFormConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  
  const [formData, setFormData] = useState({
    // Core fields (existing columns)
    name: '',
    email: '',
    phone_number: '',
    gender: '',
    instagram_handle: '',
    tiktok_handle: '',
    portfolio_link: '',
    per_script_fee: undefined as number | undefined,
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip: '',
    country: '',
    content_types: [] as string[],
    platforms: [] as string[],
    
    // Custom fields will be added dynamically
    custom_fields: {} as Record<string, any>,
    
    // Consent fields
    consent_email: false,
    consent_sms: false
  });

  useEffect(() => {
    loadFormConfig();
  }, [brandId, formId]);

  const loadFormConfig = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      
      // Load both form config and field configs
      const [config, fields] = await Promise.all([
        getOnboardingFormConfig(brandId),
        getPublicFormFieldConfigs(brandId)
      ]);
      
      if (!config || !config.is_active) {
        setErrorMessage('This application form is not currently available.');
        return;
      }
      
      setFormConfig(config);
      setFieldConfigs(fields);
      
      // Initialize form data with default values from field configs
      const initialData = {
        // Core fields (existing columns)
        name: '',
        email: '',
        phone_number: '',
        gender: '',
        instagram_handle: '',
        tiktok_handle: '',
        portfolio_link: '',
        per_script_fee: undefined as number | undefined,
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        zip: '',
        country: '',
        content_types: [] as string[],
        platforms: [] as string[],
        
        // Custom fields from field configs
        custom_fields: {} as Record<string, any>,
        
        // Consent fields
        consent_email: false,
        consent_sms: false
      };
      
      // Add custom fields from field configs
      fields.forEach(field => {
        if (!field.is_protected) { // Only add truly custom fields
          if (field.field_type === 'checkbox') {
            initialData.custom_fields[field.field_name] = false;
          } else if (field.field_type === 'multiselect') {
            initialData.custom_fields[field.field_name] = [];
          } else {
            initialData.custom_fields[field.field_name] = '';
          }
        }
      });
      
      setFormData(initialData);
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
      const result = await createFormSubmission({
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
      
      // Store the success message for display
      if (result.message) {
        setErrorMessage(''); // Clear any previous errors
      }
      
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

  const handleContentTypeToggle = (contentType: string) => {
    setFormData(prev => ({
      ...prev,
      content_types: prev.content_types.includes(contentType)
        ? prev.content_types.filter(type => type !== contentType)
        : [...prev.content_types, contentType]
    }));
  };

  const handlePlatformToggle = (platform: string) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.name && formData.email);
      case 2:
        return formData.content_types.length > 0 && formData.platforms.length > 0;
      case 3:
        return true; // Optional step
      case 4:
        return formData.consent_email; // At least email consent required
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep) && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
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
              value={(formData.custom_fields[field.name] as string) || ''}
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
              value={(formData.custom_fields[field.name] as string) || ''}
              onChange={(e) => setFormData({
                ...formData,
                custom_fields: {
                  ...formData.custom_fields,
                  [field.name]: e.target.value
                }
              })}
              placeholder={field.placeholder}
              required={field.required}
              rows={3}
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
              value={(formData.custom_fields[field.name] as string) || ''}
              onValueChange={(value) => setFormData({
                ...formData,
                custom_fields: {
                  ...formData.custom_fields,
                  [field.name]: value
                }
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder={field.placeholder} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option: string | { value: string; label: string }, index: number) => {
                  // Handle both string options and object options
                  const optionValue = typeof option === 'string' ? option : (option?.value || '');
                  const optionLabel = typeof option === 'string' ? option : (option?.label || '');
                  
                  return (
                    <SelectItem key={`${field.name}-option-${index}-${optionValue}`} value={optionValue}>
                      {optionLabel}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        );
      
      case 'checkbox':
        return (
          <div key={field.name} className="flex items-center space-x-2">
            <Checkbox
              id={field.name}
              checked={!!formData.custom_fields[field.name]}
              onCheckedChange={(checked) => setFormData({
                ...formData,
                custom_fields: {
                  ...formData.custom_fields,
                  [field.name]: checked
                }
              })}
            />
            <Label htmlFor={field.name}>
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
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (errorMessage && !formConfig) {
    return (
      <div className="max-w-2xl mx-auto">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (submitStatus === 'success') {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Application Submitted!</h2>
            <p className="text-gray-600 mb-4">
              {formConfig?.success_message || 'Thank you for your application! We will review it and get back to you soon.'}
            </p>
            <Button onClick={() => window.location.reload()}>
              Submit Another Application
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">
            {formConfig?.form_name || 'Creator Application'}
          </CardTitle>
          <CardDescription className="text-lg">
            {formConfig?.description || 'Join our creator community and start creating amazing content!'}
          </CardDescription>
          
          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Step {currentStep} of {totalSteps}</span>
              <span className="text-sm text-gray-500">{Math.round((currentStep / totalSteps) * 100)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {formConfig?.welcome_message && currentStep === 1 && (
            <Alert className="mb-6">
              <AlertDescription>{formConfig.welcome_message}</AlertDescription>
            </Alert>
          )}

          {errorMessage && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <User className="h-12 w-12 text-blue-600 mx-auto mb-2" />
                  <h3 className="text-xl font-semibold">Basic Information</h3>
                  <p className="text-gray-600">Let's start with your basic details</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">
                      Full Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">
                      Email Address <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="your@email.com"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone_number || ''}
                      onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div>
                    <Label htmlFor="gender">Gender</Label>
                    <Select
                      value={formData.gender || ''}
                      onValueChange={(value) => setFormData({
                        ...formData,
                        gender: value
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        {GENDER_OPTIONS.map((gender) => (
                          <SelectItem key={gender} value={gender}>
                            {gender}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="age">Age Range</Label>
                    <Select
                      value={formData.custom_fields.age || ''}
                      onValueChange={(value) => setFormData({
                        ...formData,
                        custom_fields: { ...formData.custom_fields, age: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select age range" />
                      </SelectTrigger>
                      <SelectContent>
                        {AGE_RANGES.map((age) => (
                          <SelectItem key={age} value={age}>
                            {age}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.custom_fields.location || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        custom_fields: { ...formData.custom_fields, location: e.target.value }
                      })}
                      placeholder="City, State/Country"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Creator Profile */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <Camera className="h-12 w-12 text-blue-600 mx-auto mb-2" />
                  <h3 className="text-xl font-semibold">Creator Profile</h3>
                  <p className="text-gray-600">Tell us about your content creation experience</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="instagram">Instagram Handle</Label>
                    <div className="relative">
                      <Instagram className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="instagram"
                        value={formData.instagram_handle || ''}
                        onChange={(e) => setFormData({ ...formData, instagram_handle: e.target.value })}
                        placeholder="@yourusername"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="tiktok">TikTok Handle</Label>
                    <div className="relative">
                      <Video className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="tiktok"
                        value={formData.tiktok_handle || ''}
                        onChange={(e) => setFormData({ ...formData, tiktok_handle: e.target.value })}
                        placeholder="@yourusername"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="portfolio">Portfolio/Website Link</Label>
                    <div className="relative">
                      <Link className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="portfolio"
                        type="url"
                        value={formData.portfolio_link || ''}
                        onChange={(e) => setFormData({ ...formData, portfolio_link: e.target.value })}
                        placeholder="https://yourportfolio.com"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="rate">Rate per Script (USD)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="rate"
                        type="number"
                        value={formData.per_script_fee?.toString() || ''}
                        onChange={(e) => setFormData({ ...formData, per_script_fee: e.target.value ? Number(e.target.value) : undefined })}
                        placeholder="150"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Content Types You Create <span className="text-red-500">*</span></Label>
                  <p className="text-sm text-gray-600 mb-3">Select all that apply</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {DEFAULT_CONTENT_TYPES.map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={`content-${type}`}
                          checked={formData.content_types.includes(type)}
                          onCheckedChange={() => handleContentTypeToggle(type)}
                        />
                        <Label htmlFor={`content-${type}`} className="text-sm">
                          {type}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Platforms You're Active On <span className="text-red-500">*</span></Label>
                  <p className="text-sm text-gray-600 mb-3">Select all that apply</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {DEFAULT_PLATFORMS.map((platform) => (
                      <div key={platform} className="flex items-center space-x-2">
                        <Checkbox
                          id={`platform-${platform}`}
                          checked={formData.platforms.includes(platform)}
                          onCheckedChange={() => handlePlatformToggle(platform)}
                        />
                        <Label htmlFor={`platform-${platform}`} className="text-sm">
                          {platform}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Address Information */}
            {currentStep === 3 && formConfig?.collect_address && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <MapPin className="h-12 w-12 text-blue-600 mx-auto mb-2" />
                  <h3 className="text-xl font-semibold">Address Information</h3>
                  <p className="text-gray-600">For shipping products and contracts</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="address1">Address Line 1</Label>
                    <Input
                      id="address1"
                      value={formData.address_line1 || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        address_line1: e.target.value
                      })}
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div>
                    <Label htmlFor="address2">Address Line 2 (Optional)</Label>
                    <Input
                      id="address2"
                      value={formData.address_line2 || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        address_line2: e.target.value
                      })}
                      placeholder="Apartment, suite, etc."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          city: e.target.value
                        })}
                        placeholder="New York"
                      />
                    </div>

                    <div>
                      <Label htmlFor="state">State/Province</Label>
                      <Input
                        id="state"
                        value={formData.state || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          state: e.target.value
                        })}
                        placeholder="NY"
                      />
                    </div>

                    <div>
                      <Label htmlFor="zip">ZIP/Postal Code</Label>
                      <Input
                        id="zip"
                        value={formData.zip || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          zip: e.target.value
                        })}
                        placeholder="10001"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={formData.country || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        country: e.target.value
                      })}
                      placeholder="United States"
                    />
                  </div>
                </div>

                {/* Custom Fields */}
                {formConfig?.custom_fields && Array.isArray(formConfig.custom_fields) && formConfig.custom_fields.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-semibold">Additional Information</h4>
                    {formConfig.custom_fields.map((field, index) => renderCustomField(field as CustomFormField))}
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Consent & Submit */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <CheckCircle2 className="h-12 w-12 text-blue-600 mx-auto mb-2" />
                  <h3 className="text-xl font-semibold">Almost Done!</h3>
                  <p className="text-gray-600">Review your information and provide consent</p>
                </div>

                {/* Summary */}
                <Card className="bg-gray-50">
                  <CardHeader>
                    <CardTitle className="text-lg">Application Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Name:</span>
                      <span>{formData.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Email:</span>
                      <span>{formData.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Content Types:</span>
                      <span>{formData.content_types.length} selected</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Platforms:</span>
                      <span>{formData.platforms.length} selected</span>
                    </div>
                    {formData.per_script_fee && (
                      <div className="flex justify-between">
                        <span className="font-medium">Rate per Script:</span>
                        <span>${formData.per_script_fee}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Consent */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Communication Preferences</h4>
                  
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="consent-email"
                      checked={formData.consent_email}
                      onCheckedChange={(checked) => setFormData({ ...formData, consent_email: !!checked })}
                    />
                    <Label htmlFor="consent-email" className="text-sm leading-relaxed">
                      I consent to receive email communications about opportunities, updates, and important information. <span className="text-red-500">*</span>
                    </Label>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="consent-sms"
                      checked={formData.consent_sms}
                      onCheckedChange={(checked) => setFormData({ ...formData, consent_sms: !!checked })}
                    />
                    <Label htmlFor="consent-sms" className="text-sm leading-relaxed">
                      I consent to receive SMS/text messages for time-sensitive opportunities and updates.
                    </Label>
                  </div>

                  <p className="text-xs text-gray-500">
                    You can unsubscribe from communications at any time. We respect your privacy and will never share your information with third parties.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                Previous
              </Button>

              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={!validateStep(currentStep)}
                >
                  Next Step
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting || !validateStep(currentStep)}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Application'
                  )}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 