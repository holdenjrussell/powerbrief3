// src/app/app/layout.tsx
import AppLayout from '@/components/AppLayout';
import { GlobalProvider } from '@/lib/context/GlobalContext';
import { BrandProvider } from '@/lib/context/BrandContext';

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <GlobalProvider>
            <BrandProvider>
                <AppLayout>{children}</AppLayout>
            </BrandProvider>
        </GlobalProvider>
    );
}