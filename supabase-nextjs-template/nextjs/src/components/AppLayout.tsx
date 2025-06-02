"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import Image from 'next/image';
import {
    Home,
    User,
    Menu,
    X,
    ChevronDown,
    LogOut,
    Key, Presentation, Film,
    UploadCloud,
    DownloadCloud,
    BarChart3,
    Users,
} from 'lucide-react';
import { useGlobal } from "@/lib/context/GlobalContext";
import { createSPASassClient } from "@/lib/supabase/client";
import { getPendingReviewsCount } from '@/lib/services/powerbriefService';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isUserDropdownOpen, setUserDropdownOpen] = useState(false);
    const [pendingReviewsCount, setPendingReviewsCount] = useState(0);
    const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);
    const pathname = usePathname();
    const router = useRouter();

    const { user } = useGlobal();

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
        { name: 'PowerBrief', href: '/app/powerbrief', icon: Presentation },
        {
            name: 'Team Sync',
            icon: Users,
            subItems: [
                { name: 'Scorecard', href: '/app/scorecard', icon: BarChart3 },
            ],
        },
        { 
            name: 'Ad Reviews', 
            href: '/app/reviews', 
            icon: Film,
            badge: pendingReviewsCount > 0 ? pendingReviewsCount : null
        },
        { name: 'AdRipper', href: '/app/adripper', icon: DownloadCloud },
        { name: 'Ad Upload Tool', href: '/app/ad-upload-tool', icon: UploadCloud },
        { name: 'User Settings', href: '/app/user-settings', icon: User },
    ];

    const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

    // Check if the current path is a brand-specific path
    const isBrandPage = pathname.includes('/powerbrief/') && pathname.split('/').length > 3;

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
                        const isActive = pathname === item.href || 
                          (item.href === '/app/powerbrief' && pathname.startsWith('/app/powerbrief') && !isBrandPage) ||
                          (item.subItems && item.subItems.some(subItem => pathname === subItem.href));
                          
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
                <div className="sticky top-0 z-10 flex items-center justify-between h-16 bg-white shadow-sm px-4">
                    <button
                        onClick={toggleSidebar}
                        className="lg:hidden text-gray-500 hover:text-gray-700"
                        aria-label="Open sidebar"
                    >
                        <Menu className="h-6 w-6"/>
                    </button>

                    <div className="relative ml-auto">
                        <button
                            onClick={() => setUserDropdownOpen(!isUserDropdownOpen)}
                            className="flex items-center space-x-2 text-sm text-gray-700 hover:text-gray-900"
                            aria-expanded={isUserDropdownOpen}
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

                <main className="h-[calc(100vh-4rem)] overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}