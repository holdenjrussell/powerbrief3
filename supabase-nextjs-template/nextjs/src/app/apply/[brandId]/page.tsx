import CreatorApplicationForm from '@/components/ugc/public/CreatorApplicationForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Creator Application',
  description: 'Apply to become a UGC creator',
};

interface PageProps {
  params: {
    brandId: string;
  };
}

export default function CreatorApplicationPage({ params }: PageProps) {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <CreatorApplicationForm 
        brandId={params.brandId}
        onSuccess={() => {
          // Could redirect or show additional content
        }}
      />
    </div>
  );
} 