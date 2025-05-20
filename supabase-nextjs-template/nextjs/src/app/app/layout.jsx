// src/app/app/layout.tsx
import AppLayout from '@/components/AppLayout';
import { GlobalProvider } from '@/lib/context/GlobalContext';
export default function Layout({ children }) {
    return (<GlobalProvider>
            <AppLayout>{children}</AppLayout>
        </GlobalProvider>);
}
