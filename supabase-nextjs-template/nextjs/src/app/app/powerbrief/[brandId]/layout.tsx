'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui';
import { ArrowLeft, ArrowRight, ChevronLeft, Presentation, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getBrandById } from '@/lib/services/powerbriefService';
import { Brand } from '@/lib/types/powerbrief';

// Helper to unwrap params safely
type ParamsType = { brandId: string };

export default function BrandLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: ParamsType | Promise<ParamsType>;
}) {
  const { user } = useAuth();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Unwrap params using React.use()
  const unwrappedParams = params instanceof Promise ? React.use(params) : params;
  const { brandId } = unwrappedParams;

  useEffect(() => {
    const fetchBrand = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const brandData = await getBrandById(brandId);
        setBrand(brandData);
      } catch (error) {
        console.error('Error fetching brand:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBrand();
  }, [user?.id, brandId]);

  const navigation = [
    {
      name: 'Briefs',
      href: `/app/powerbrief/${brandId}`,
      icon: Presentation,
      current: !pathname.includes('/ugc-pipeline'),
    },
    {
      name: 'UGC Creator Pipeline',
      href: `/app/powerbrief/${brandId}/ugc-pipeline`,
      icon: Users,
      current: pathname.includes('/ugc-pipeline'),
    }
  ];

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  if (loading && !brand) {
    // Loading state could be used here if needed
  }

  return (
    <div className="h-full flex flex-col">
      {/* Brand Header with Back Button */}
      <div className="bg-white border-b flex items-center justify-between px-4 h-14 sticky top-0 z-20">
        <div className="flex items-center">
          <Link href="/app/powerbrief" className="mr-4">
            <Button variant="ghost" size="sm" className="text-gray-600">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Brands
            </Button>
          </Link>
          <h1 className="text-lg font-semibold truncate">{brand?.name || 'Loading...'}</h1>
        </div>
        
        <button
          onClick={toggleSidebar}
          className="text-gray-500 hover:text-gray-700 p-1"
          aria-label={sidebarOpen ? "Collapse menu" : "Expand menu"}
        >
          {sidebarOpen ? (
            <ArrowLeft className="h-4 w-4" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Submenu Sidebar */}
        <div 
          className={`bg-white border-r h-full transition-all duration-300 overflow-hidden ${
            sidebarOpen ? 'w-56' : 'w-0'
          }`}
        >
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto py-4">
              <nav className="space-y-1 px-3">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                      item.current
                        ? 'bg-primary-50 text-primary-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <item.icon
                      className={`mr-3 h-5 w-5 ${
                        item.current
                          ? 'text-primary-500'
                          : 'text-gray-400 group-hover:text-gray-500'
                      }`}
                    />
                    <span>
                      {item.name}
                    </span>
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="h-full bg-gray-50">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
} 