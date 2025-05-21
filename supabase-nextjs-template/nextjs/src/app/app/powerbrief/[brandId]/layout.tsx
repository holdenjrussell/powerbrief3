'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui';
import { ArrowLeft, ArrowRight, Presentation, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getBrandById } from '@/lib/services/powerbriefService';
import { Brand } from '@/lib/types/powerbrief';

export default function BrandLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { brandId: string };
}) {
  const { user } = useAuth();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const fetchBrand = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const brandData = await getBrandById(params.brandId);
        setBrand(brandData);
      } catch (error) {
        console.error('Error fetching brand:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBrand();
  }, [user?.id, params.brandId]);

  const navigation = [
    {
      name: 'Briefs',
      href: `/app/powerbrief/${params.brandId}`,
      icon: Presentation,
      current: !pathname.includes('/ugc-pipeline'),
    },
    {
      name: 'UGC Creator Pipeline',
      href: `/app/powerbrief/${params.brandId}/ugc-pipeline`,
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
    <div className="h-full flex">
      {/* Brand Sidebar */}
      <div 
        className={`bg-white border-r fixed lg:static h-full transition-all duration-300 z-10 ${
          sidebarOpen ? 'w-64' : 'w-0 lg:w-16 overflow-hidden'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between h-16 px-4 border-b">
            <div className={`font-medium truncate ${sidebarOpen ? 'block' : 'hidden lg:block lg:overflow-hidden'}`}>
              {brand?.name || 'Loading...'}
            </div>
            <button
              onClick={toggleSidebar}
              className="text-gray-500 hover:text-gray-700"
            >
              {sidebarOpen ? (
                <ArrowLeft className="h-5 w-5" />
              ) : (
                <ArrowRight className="h-5 w-5" />
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-4">
            <nav className="space-y-1 px-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    item.current
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon
                    className={`${
                      sidebarOpen ? 'mr-3' : ''
                    } h-5 w-5 ${
                      item.current
                        ? 'text-primary-500'
                        : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  <span className={`${sidebarOpen ? 'block' : 'hidden lg:hidden'}`}>
                    {item.name}
                  </span>
                </Link>
              ))}
            </nav>
          </div>

          <div className="p-4 border-t">
            <Link href="/app/powerbrief">
              <Button variant="outline" className="w-full" size="sm">
                <ArrowLeft className={`h-4 w-4 ${sidebarOpen ? 'mr-2' : ''}`} />
                <span className={`${sidebarOpen ? 'block' : 'hidden lg:hidden'}`}>
                  All Brands
                </span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'}`}>
        {children}
      </div>
    </div>
  );
} 