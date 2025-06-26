"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import Image from 'next/image';
import {
    Home,
    Menu,
    X,
    ChevronDown,
    LogOut,
    Key, Presentation, Film,
    UploadCloud,
    DownloadCloud,
    BarChart3,
    Users,
    BookOpen,
    Frame,
    Megaphone,
    CheckSquare,
    AlertTriangle,
    Settings,
    FileText,
    Link2,
} from 'lucide-react';
import { useGlobal } from "@/lib/context/GlobalContext";
import { useTeam } from "@/lib/context/TeamContext";
import { createSPASassClient } from "@/lib/supabase/client";
import { getPendingReviewsCount } from '@/lib/services/powerbriefService';
import BrandSelector from './BrandSelector';
import TeamSelector from './teams/TeamSelector';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isUserDropdownOpen, setUserDropdownOpen] = useState(false);
    const [pendingReviewsCount, setPendingReviewsCount] = useState(0);
    const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);
    const pathname = usePathname();
    const router = useRouter();

    const { user } = useGlobal();
    const { hasFeatureAccess } = useTeam();

    // Fetch pending reviews count
    useEffect(() => {
        if (!user?.id) return;
        
        const fetchPendingReviewsCount = async () => {
            try {
                const count = await getPendingReviewsCount(user.id);
                setPendingReviewsCount(count);
            } catch (err) {
                console.error('Error fetching pending reviews count:', err);
            }
        };
        
        fetchPendingReviewsCount();
        
        // Set up a polling interval to check for new reviews every minute
        const intervalId = setInterval(fetchPendingReviewsCount, 60000);
        
        return () => clearInterval(intervalId);
    }, [user?.id]);

    // Refresh count when navigating away from reviews page (user likely completed reviews)
    useEffect(() => {
        if (!user?.id) return;
        
        // If user navigates away from reviews page, refresh the count
        if (pathname !== '/app/reviews') {
            const fetchPendingReviewsCount = async () => {
                try {
                    const count = await getPendingReviewsCount(user.id);
                    setPendingReviewsCount(count);
                } catch (err) {
                    console.error('Error fetching pending reviews count:', err);
                }
            };
            
            fetchPendingReviewsCount();
        }
    }, [pathname, user?.id]);

    const handleLogout = async () => {
        try {
            const client = await createSPASassClient();
            await client.logout();
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };
    const handleChangePassword = async () => {
        router.push('/app/user-settings')
    };

    const getInitials = (email: string) => {
        const parts = email.split('@')[0].split(/[._-]/);
        return parts.length > 1
            ? (parts[0][0] + parts[1][0]).toUpperCase()
            : parts[0].slice(0, 2).toUpperCase();
    };

    const productName = process.env.NEXT_PUBLIC_PRODUCTNAME;

    const navigation = [
        { name: 'Homepage', href: '/app', icon: Home },
        ...(hasFeatureAccess('powerbrief_onesheet') || hasFeatureAccess('powerbrief_ads') || hasFeatureAccess('powerbrief_web_assets') || hasFeatureAccess('powerbrief_email') || hasFeatureAccess('powerbrief_sms') || hasFeatureAccess('powerbrief_organic_social') || hasFeatureAccess('powerbrief_blog') 
            ? [{ name: 'PowerBrief', href: '/app/powerbrief', icon: Presentation }] 
            : []),
        ...(hasFeatureAccess('powerframe') ? [{ name: 'PowerFrame', href: '/app/powerframe', icon: Frame }] : []),
        ...(hasFeatureAccess('ugc_creator_pipeline') ? [{ name: 'UGC Creator Pipeline', href: '/app/ugc-creator-pipeline', icon: FileText }] : []),
        ...(hasFeatureAccess('team_sync') ? [{
            name: 'Team Sync',
            icon: Users,
            subItems: [
                { name: 'Scorecard', href: '/app/team-sync?tab=scorecard', icon: BarChart3 },
                { name: 'Announcements', href: '/app/team-sync?tab=announcements', icon: Megaphone },
                { name: 'To-Dos', href: '/app/team-sync?tab=todos', icon: CheckSquare },
                { name: 'Issues', href: '/app/team-sync?tab=issues', icon: AlertTriangle },
            ],
        }] : []),
        ...(hasFeatureAccess('asset_reviews') ? [{ 
            name: 'Asset Reviews', 
            href: '/app/reviews', 
            icon: Film,
            badge: pendingReviewsCount > 0 ? pendingReviewsCount : null
        }] : []),
        ...(hasFeatureAccess('ad_ripper') ? [{ name: 'AdRipper', href: '/app/adripper', icon: DownloadCloud }] : []),
        ...(hasFeatureAccess('ad_upload_tool') ? [{ name: 'Ad Upload Tool', href: '/app/ad-upload-tool', icon: UploadCloud }] : []),
        { name: 'SOPs', href: '/app/sops', icon: BookOpen },
        ...(hasFeatureAccess('url_to_markdown') ? [{ name: 'URL to Markdown', href: '/app/url-to-markdown', icon: Link2 }] : []),
    ];

    const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

    const toggleSubMenu = (itemName: string) => {
        setOpenSubMenu(openSubMenu === itemName ? null : itemName);
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
                    onClick={toggleSidebar}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 w-64 bg-white shadow-lg transform transition-transform duration-200 ease-in-out z-30 
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>

                <div className="h-16 flex items-center justify-between px-4 border-b">
                    <div className="flex items-center py-0">
                        <Image 
                            src="/images/powerbrief-logo.png" 
                            alt={productName || "PowerBrief"} 
                            width={150} 
                            height={40} 
                            className="object-contain my-0"
                            priority
                            style={{ maxHeight: "40px" }}
                        />
                    </div>
                    <button
                        onClick={toggleSidebar}
                        className="lg:hidden text-gray-500 hover:text-gray-700"
                        aria-label="Close sidebar"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="mt-4 px-2 space-y-1">
                    {navigation.map((item) => {
                        // Enhanced active state logic to handle brand-specific routes
                        let isActive = false;
                        
                        if (item.href === pathname) {
                            // Exact match
                            isActive = true;
                        } else if (item.href === '/app/ugc-creator-pipeline' && pathname.includes('/ugc-pipeline')) {
                            // UGC Pipeline - matches both standalone and brand-specific routes (check this FIRST)
                            isActive = true;
                        } else if (item.href === '/app/powerbrief' && pathname.startsWith('/app/powerbrief') && !pathname.includes('/ugc-pipeline')) {
                            // PowerBrief - includes brand-specific pages but excludes UGC pipeline pages
                            isActive = true;
                        } else if (item.href === '/app/powerframe' && pathname.startsWith('/app/powerframe')) {
                            // PowerFrame - includes both main page and brand-specific pages
                            isActive = true;

                        } else if (item.subItems && item.subItems.some(subItem => pathname === subItem.href)) {
                            // Sub-menu items
                            isActive = true;
                        }
                          
                        return (
                            <div key={item.name}>
                                {item.subItems ? (
                                    <>
                                        <button
                                            onClick={() => toggleSubMenu(item.name)}
                                            className={`group flex items-center w-full px-2 py-2 text-sm font-medium rounded-md ${
                                                isActive
                                                    ? 'bg-primary-50 text-primary-600'
                                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                            }`}
                                        >
                                            <item.icon
                                                className={`mr-3 h-5 w-5 ${
                                                    isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                                                }`}
                                                aria-hidden="true"
                                            />
                                            <span className="flex-1 text-left">{item.name}</span>
                                            <ChevronDown
                                                className={`ml-auto h-5 w-5 transform transition-colors transition-transform duration-150 ${
                                                    openSubMenu === item.name ? 'rotate-180 text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                                                }`}
                                            />
                                        </button>
                                        {openSubMenu === item.name && (
                                            <div className="pl-4 mt-1 space-y-1">
                                                {item.subItems.map((subItem) => {
                                                    const isSubActive = pathname === subItem.href;
                                                    return (
                                                        <Link
                                                            key={subItem.name}
                                                            href={subItem.href}
                                                            className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                                                                isSubActive
                                                                    ? 'bg-primary-50 text-primary-600'
                                                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                                            }`}
                                                        >
                                                            <subItem.icon
                                                                className={`mr-3 h-5 w-5 ${
                                                                    isSubActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                                                                }`}
                                                                aria-hidden="true"
                                                            />
                                                            <span className="flex-1">{subItem.name}</span>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <Link
                                        key={item.name}
                                        href={item.href!}
                                        className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                                            isActive
                                                ? 'bg-primary-50 text-primary-600'
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                    >
                                        <item.icon
                                            className={`mr-3 h-5 w-5 ${
                                                isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                                            }`}
                                            aria-hidden="true"
                                        />
                                        <span className="flex-1">{item.name}</span>
                                        {item.badge && (
                                            <span className="ml-auto inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-red-500 rounded-full">
                                                {item.badge > 99 ? '99+' : item.badge}
                                            </span>
                                        )}
                                    </Link>
                                )}
                            </div>
                        );
                    })}
                </nav>

            </div>

            <div className="lg:pl-64">
                <div className="sticky top-0 z-40 flex items-center justify-between h-16 bg-white shadow-sm px-4">
                    <button
                        onClick={toggleSidebar}
                        className="lg:hidden text-gray-500 hover:text-gray-700"
                        aria-label="Open sidebar"
                    >
                        <Menu className="h-6 w-6"/>
                    </button>

                    <div className="flex items-center space-x-4 ml-auto">
                        {/* Brand Selector */}
                        <BrandSelector />
                        
                        {/* Team Selector */}
                        <TeamSelector />

                        {/* User Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setUserDropdownOpen(!isUserDropdownOpen)}
                                className="flex items-center space-x-2 text-sm text-gray-700 hover:text-gray-900"
                                aria-haspopup="true"
                            >
                                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                                    <span className="text-primary-700 font-medium">
                                        {user ? getInitials(user.email) : '??'}
                                    </span>
                                </div>
                                <span>{user?.email || 'Loading...'}</span>
                                <ChevronDown className="h-4 w-4"/>
                            </button>

                            {isUserDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg border">
                                    <div className="p-2 border-b border-gray-100">
                                        <p className="text-xs text-gray-500">Signed in as</p>
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {user?.email}
                                        </p>
                                    </div>
                                    <div className="py-1">
                                        <Link
                                            href="/app/user-settings"
                                            onClick={() => setUserDropdownOpen(false)}
                                            className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                        >
                                            <Settings className="mr-3 h-4 w-4 text-gray-400"/>
                                            User Settings
                                        </Link>
                                        <button
                                            onClick={() => {
                                                setUserDropdownOpen(false);
                                                handleChangePassword()
                                            }}
                                            className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                            aria-label="Change password"
                                        >
                                            <Key className="mr-3 h-4 w-4 text-gray-400"/>
                                            Change Password
                                        </button>
                                        <button
                                            onClick={() => {
                                                handleLogout();
                                                setUserDropdownOpen(false);
                                            }}
                                            className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                            aria-label="Sign out"
                                        >
                                            <LogOut className="mr-3 h-4 w-4 text-red-400"/>
                                            Sign Out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <main className="h-[calc(100vh-4rem)] overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}