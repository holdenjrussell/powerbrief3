/**
 * Root Layout Component for Next.js Application (JavaScript version)
 * 
 * KEYWORDS: layout, root layout, app router, Next.js, theme, analytics, JS
 * 
 * This component defines the root layout wrapper for the entire application.
 * It includes global providers, analytics tracking, and theme configuration.
 */
import "./globals.css";
import { Analytics } from '@vercel/analytics/next';
import CookieConsent from "@/components/Cookies";
import { GoogleAnalytics } from '@next/third-parties/google';

/**
 * Metadata configuration for the application
 * Used for SEO and browser tab information
 * 
 * KEYWORDS: SEO, metadata, page title, description
 */
export const metadata = {
    title: process.env.NEXT_PUBLIC_PRODUCTNAME,
    description: "The best way to build your SaaS product.",
};

/**
 * Root Layout component that wraps all pages in the application
 * 
 * KEYWORDS: layout component, theme, analytics, providers
 * 
 * Responsible for:
 * 1. Setting up the HTML structure
 * 2. Applying theme classes
 * 3. Including global components
 * 4. Setting up analytics tracking
 * 
 * @param {object} props - Component props
 * @param {React.ReactNode} props.children - The child components/pages to render inside the layout
 */
export default function RootLayout({ children }) {
    // Get theme from environment variables or use default
    let theme = process.env.NEXT_PUBLIC_THEME;
    if (!theme) {
        theme = "theme-sass3";
    }
    
    // Get Google Analytics ID if configured
    const gaID = process.env.NEXT_PUBLIC_GOOGLE_TAG;
    
    return (<html lang="en">
    <body className={theme}>
      {children}
      <Analytics />
      <CookieConsent />
      {gaID && (<GoogleAnalytics gaId={gaID}/>)}

    </body>
    </html>);
}
