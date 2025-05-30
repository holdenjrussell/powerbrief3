'use client';

import React, { useState } from 'react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Plus, X } from "lucide-react";
import { 
  UgcCreator, 
  UGC_CREATOR_ONBOARDING_STATUSES, 
  UGC_CREATOR_CONTRACT_STATUSES,
  UGC_CREATOR_PRODUCT_SHIPMENT_STATUSES,
  UGC_CREATOR_GENDERS
} from '@/lib/types/ugcCreator';

// Define the form schema
const creatorFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  gender: z.string().optional(),
  status: z.string().default("New Creator Submission"),
  contract_status: z.string().default("not signed"),
  product_shipment_status: z.string().optional(),
  product_shipped: z.boolean().default(false),
  tracking_number: z.string().optional(),
  portfolio_link: z.string().optional(),
  per_script_fee: z.number().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone_number: z.string().optional(),
  instagram_handle: z.string().optional(),
  tiktok_handle: z.string().optional(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  contacted_by: z.string().optional()
});

type CreatorFormValues = z.infer<typeof creatorFormSchema>;

interface CreatorFormProps {
  creator?: UgcCreator;
  onSubmit: (data: CreatorFormValues & { products: string[], content_types: string[], platforms: string[] }) => Promise<void>;
  isSubmitting: boolean;
  brandId: string;
}

export function CreatorForm({ creator, onSubmit, isSubmitting }: CreatorFormProps) {
  const [products, setProducts] = useState<string[]>(creator?.products || []);
  const [contentTypes, setContentTypes] = useState<string[]>(creator?.content_types || []);
  const [platforms, setPlatforms] = useState<string[]>(creator?.platforms || []);
  const [newProduct, setNewProduct] = useState('');
  const [newContentType, setNewContentType] = useState('');
  const [newPlatform, setNewPlatform] = useState('');

  // Set up the form with default values from creator
  const form = useForm<CreatorFormValues>({
    resolver: zodResolver(creatorFormSchema),
    defaultValues: {
      name: creator?.name || '',
      gender: creator?.gender || '',
      status: creator?.status || 'New Creator Submission',
      contract_status: creator?.contract_status || 'not signed',
      product_shipment_status: creator?.product_shipment_status || '',
      product_shipped: creator?.product_shipped || false,
      tracking_number: creator?.tracking_number || '',
      portfolio_link: creator?.portfolio_link || '',
      per_script_fee: creator?.per_script_fee || undefined,
      email: creator?.email || '',
      phone_number: creator?.phone_number || '',
      instagram_handle: creator?.instagram_handle || '',
      tiktok_handle: creator?.tiktok_handle || '',
      address_line1: creator?.address_line1 || '',
      address_line2: creator?.address_line2 || '',
      city: creator?.city || '',
      state: creator?.state || '',
      zip: creator?.zip || '',
      country: creator?.country || '',
      contacted_by: creator?.contacted_by || ''
    }
  });
  
  // Handle form submission
  const handleFormSubmit = async (data: CreatorFormValues) => {
    // Combine form data with array fields
    await onSubmit({
      ...data,
      products,
      content_types: contentTypes,
      platforms
    });
  };
  
  // Handlers for array fields
  const addProduct = () => {
    if (newProduct.trim() !== '' && !products.includes(newProduct.trim())) {
      setProducts([...products, newProduct.trim()]);
      setNewProduct('');
    }
  };
  
  const removeProduct = (productToRemove: string) => {
    setProducts(products.filter(product => product !== productToRemove));
  };
  
  const addContentType = () => {
    if (newContentType.trim() !== '' && !contentTypes.includes(newContentType.trim())) {
      setContentTypes([...contentTypes, newContentType.trim()]);
      setNewContentType('');
    }
  };
  
  const removeContentType = (typeToRemove: string) => {
    setContentTypes(contentTypes.filter(type => type !== typeToRemove));
  };
  
  const addPlatform = () => {
    if (newPlatform.trim() !== '' && !platforms.includes(newPlatform.trim())) {
      setPlatforms([...platforms, newPlatform.trim()]);
      setNewPlatform('');
    }
  };
  
  const removePlatform = (platformToRemove: string) => {
    setPlatforms(platforms.filter(platform => platform !== platformToRemove));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Creator name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {UGC_CREATOR_GENDERS.map((gender) => (
                          <SelectItem key={gender} value={gender}>
                            {gender}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {UGC_CREATOR_ONBOARDING_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="contract_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract Status</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select contract status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {UGC_CREATOR_CONTRACT_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="portfolio_link"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Portfolio Link</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="per_script_fee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Per Script Fee</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="contacted_by"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contacted By</FormLabel>
                    <FormControl>
                      <Input placeholder="Contact person" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          {/* Product Shipment Information */}
          <Card>
            <CardHeader>
              <CardTitle>Product Shipment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="product_shipped"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        title="Product shipped checkbox"
                        aria-label="Product shipped"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Product Shipped</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="product_shipment_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shipment Status</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select shipment status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {UGC_CREATOR_PRODUCT_SHIPMENT_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="tracking_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tracking Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter tracking number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 (123) 456-7890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="instagram_handle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instagram Handle</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="@username" 
                        {...field}
                        onChange={(e) => {
                          let value = e.target.value;
                          if (value.startsWith('@')) {
                            value = value.substring(1);
                          }
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="tiktok_handle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>TikTok Handle</FormLabel>
                    <FormControl>
                      <Input placeholder="@username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle>Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="address_line1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 1</FormLabel>
                    <FormControl>
                      <Input placeholder="Street address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="address_line2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 2</FormLabel>
                    <FormControl>
                      <Input placeholder="Apt, Suite, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="City" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State/Province</FormLabel>
                      <FormControl>
                        <Input placeholder="State" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="zip"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP/Postal Code</FormLabel>
                      <FormControl>
                        <Input placeholder="ZIP" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input placeholder="Country" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
          
          {/* Products, Content Types, Platforms */}
          <Card>
            <CardHeader>
              <CardTitle>Creator Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Products */}
              <div className="space-y-2">
                <FormLabel>Products</FormLabel>
                <div className="flex flex-wrap gap-2 mb-2">
                  {products.map((product, index) => (
                    <div key={index} className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full flex items-center text-sm">
                      {product}
                      <button
                        type="button"
                        onClick={() => removeProduct(product)}
                        className="ml-2 text-secondary-foreground/70 hover:text-secondary-foreground"
                        title="Remove product"
                        aria-label="Remove product"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newProduct}
                    onChange={(e) => setNewProduct(e.target.value)}
                    placeholder="Add a product"
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    onClick={addProduct} 
                    variant="outline" 
                    size="icon"
                    title="Add product"
                    aria-label="Add product"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Content Types */}
              <div className="space-y-2">
                <FormLabel>Content Types</FormLabel>
                <div className="flex flex-wrap gap-2 mb-2">
                  {contentTypes.map((type, index) => (
                    <div key={index} className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full flex items-center text-sm">
                      {type}
                      <button
                        type="button"
                        onClick={() => removeContentType(type)}
                        className="ml-2 text-secondary-foreground/70 hover:text-secondary-foreground"
                        title="Remove content type"
                        aria-label="Remove content type"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newContentType}
                    onChange={(e) => setNewContentType(e.target.value)}
                    placeholder="Add content type"
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    onClick={addContentType} 
                    variant="outline" 
                    size="icon"
                    title="Add content type"
                    aria-label="Add content type"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Platforms */}
              <div className="space-y-2">
                <FormLabel>Platforms</FormLabel>
                <div className="flex flex-wrap gap-2 mb-2">
                  {platforms.map((platform, index) => (
                    <div key={index} className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full flex items-center text-sm">
                      {platform}
                      <button
                        type="button"
                        onClick={() => removePlatform(platform)}
                        className="ml-2 text-secondary-foreground/70 hover:text-secondary-foreground"
                        title="Remove platform"
                        aria-label="Remove platform"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newPlatform}
                    onChange={(e) => setNewPlatform(e.target.value)}
                    placeholder="Add platform"
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    onClick={addPlatform} 
                    variant="outline" 
                    size="icon"
                    title="Add platform"
                    aria-label="Add platform"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Creator'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
} 