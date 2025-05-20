'use client';
import React from 'react';
import LegalDocument from '@/components/LegalDocument';
import { notFound } from 'next/navigation';
const legalDocuments = {
    'privacy': {
        title: 'Privacy Notice',
        path: '/terms/privacy-notice.md'
    },
    'terms': {
        title: 'Terms of Service',
        path: '/terms/terms-of-service.md'
    },
    'refund': {
        title: 'Refund Policy',
        path: '/terms/refund-policy.md'
    }
};
export default function LegalPage({ params }) {
    const { document } = React.use(params);
    if (!legalDocuments[document]) {
        notFound();
    }
    const { title, path } = legalDocuments[document];
    return (<div className="container mx-auto px-4 py-8">
            <LegalDocument title={title} filePath={path}/>
        </div>);
}
