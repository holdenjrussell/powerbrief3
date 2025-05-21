/**
 * Home Page Pricing Section Component
 * 
 * KEYWORDS: pricing, subscription tiers, pricing cards, pricing section
 * 
 * This component renders the pricing section for the landing page.
 * It displays different pricing tiers with their features and prices,
 * allowing users to compare options and start the registration process.
 */
"use client";
import React from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import PricingService from "@/lib/pricing";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

/**
 * Component to display pricing tiers on the home page
 * 
 * KEYWORDS: pricing display, subscription options, price comparison
 * 
 * @returns A section containing pricing cards for different subscription tiers
 */
const HomePricing = () => {
    // Get pricing data from the service
    const tiers = PricingService.getAllTiers();
    const commonFeatures = PricingService.getCommonFeatures();

    return (
        <section id="pricing" className="py-24 bg-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section heading */}
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
                    <p className="text-gray-600 text-lg">Choose the plan that&#39;s right for your business (IT&#39;S PLACEHOLDER NO PRICING FOR THIS TEMPLATE)</p>
                </div>

                {/* Pricing tier cards */}
                <div className="grid md:grid-cols-3 gap-8 mb-12">
                    {tiers.map((tier) => (
                        <Card
                            key={tier.name}
                            className={`relative flex flex-col ${
                                tier.popular ? 'border-primary-500 shadow-lg' : ''
                            }`}
                        >
                            {/* Popular tag for recommended tier */}
                            {tier.popular && (
                                <div className="absolute top-0 right-0 -translate-y-1/2 px-3 py-1 bg-primary-500 text-white text-sm rounded-full">
                                    Most Popular
                                </div>
                            )}

                            {/* Tier title and description */}
                            <CardHeader>
                                <CardTitle>{tier.name}</CardTitle>
                                <CardDescription>{tier.description}</CardDescription>
                            </CardHeader>

                            <CardContent className="flex-grow flex flex-col">
                                {/* Price display */}
                                <div className="mb-6">
                                    <span className="text-4xl font-bold">{PricingService.formatPrice(tier.price)}</span>
                                    <span className="text-gray-600 ml-2">/month</span>
                                </div>

                                {/* Feature list with checkmarks */}
                                <ul className="space-y-3 mb-8 flex-grow">
                                    {tier.features.map((feature) => (
                                        <li key={feature} className="flex items-center gap-2">
                                            <Check className="h-5 w-5 text-green-500" />
                                            <span className="text-gray-600">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                {/* Call-to-action button */}
                                <Link
                                    href="/auth/register"
                                    className={`w-full text-center px-6 py-3 rounded-lg font-medium transition-colors ${
                                        tier.popular
                                            ? 'bg-primary-600 text-white hover:bg-primary-700'
                                            : 'bg-gray-50 text-gray-900 hover:bg-gray-100'
                                    }`}
                                >
                                    Get Started
                                </Link>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Common features that all plans include */}
                <div className="text-center">
                    <p className="text-gray-600">
                        All plans include: {commonFeatures.join(', ')}
                    </p>
                </div>
            </div>
        </section>
    );
};

export default HomePricing;
