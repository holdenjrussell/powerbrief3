import CreatorMarketplace from '@/components/ugc/marketplace/CreatorMarketplace';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Creator Marketplace',
  description: 'Find brand collaboration opportunities',
};

export default function MarketplacePage() {
  return <CreatorMarketplace />;
} 