// src/app/app/layout.tsx
import AppLayout from '@/components/AppLayout';
import { GlobalProvider } from '@/lib/context/GlobalContext';
import { BrandProvider } from '@/lib/context/BrandContext';
import { TeamProvider } from '@/lib/context/TeamContext';

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <GlobalProvider>
            <BrandProvider>
                <TeamProvider>
                    <AppLayout>{children}</AppLayout>
                </TeamProvider>
            </BrandProvider>
        </GlobalProvider>
    );
}