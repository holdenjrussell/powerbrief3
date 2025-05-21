/**
 * Authentication Aware Button Component
 * 
 * KEYWORDS: authentication, auth buttons, conditional rendering, login, signup
 * 
 * This component dynamically renders different buttons based on the user's authentication state.
 * It shows login/signup buttons for unauthenticated users and dashboard access for authenticated users.
 * Can be configured with different visual variants for different placements on the site.
 */
"use client";
import { useState, useEffect } from 'react';
import { createSPASassClient } from '@/lib/supabase/client';
import { ArrowRight, ChevronRight } from 'lucide-react';
import Link from "next/link";

/**
 * Component for rendering authentication-aware buttons
 * 
 * KEYWORDS: conditional rendering, authentication UI, navigation buttons
 * 
 * @param props - Component props
 * @param props.variant - Visual style variant ('primary' or 'nav')
 * @returns Buttons appropriate for the user's authentication state
 */
export default function AuthAwareButtons({ variant = 'primary' }) {
    // Track authentication state
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    // Track loading state to prevent flash of incorrect UI
    const [loading, setLoading] = useState(true);

    /**
     * Effect to check the user's authentication status on component mount
     * 
     * KEYWORDS: auth check, useEffect, Supabase auth
     */
    useEffect(() => {
        const checkAuth = async () => {
            try {
                // Create Supabase client and get current user
                const supabase = await createSPASassClient();
                const { data: { user } } = await supabase.getSupabaseClient().auth.getUser();
                setIsAuthenticated(!!user);
            } catch (error) {
                console.error('Error checking auth status:', error);
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, []);

    // Don't render anything while checking auth status
    if (loading) {
        return null;
    }

    /**
     * Navigation variant - Used in the header/navigation bar
     * 
     * KEYWORDS: nav buttons, header buttons, auth navigation
     */
    if (variant === 'nav') {
        return isAuthenticated ? (
            // Show dashboard link for authenticated users
            <Link
                href="/app"
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
                Go to Dashboard
            </Link>
        ) : (
            // Show login and register links for unauthenticated users
            <>
                <Link href="/auth/login" className="text-gray-600 hover:text-gray-900">
                    Login
                </Link>
                <Link
                    href="/auth/register"
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                >
                    Get Started
                </Link>
            </>
        );
    }

    /**
     * Primary variant - Used in hero sections and CTAs
     * 
     * KEYWORDS: primary buttons, CTA buttons, hero buttons
     */
    return isAuthenticated ? (
        // Show dashboard link with arrow icon for authenticated users
        <Link
            href="/app"
            className="inline-flex items-center px-6 py-3 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
        >
            Go to Dashboard
            <ArrowRight className="ml-2 h-5 w-5" />
        </Link>
    ) : (
        // Show registration and info buttons for unauthenticated users
        <>
            <Link
                href="/auth/register"
                className="inline-flex items-center px-6 py-3 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
            >
                Start Building Free
                <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
                href="#features"
                className="inline-flex items-center px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
                Learn More
                <ChevronRight className="ml-2 h-5 w-5" />
            </Link>
        </>
    );
}