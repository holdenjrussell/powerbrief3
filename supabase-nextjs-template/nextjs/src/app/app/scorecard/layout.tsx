import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Scorecard (In-Development)',
  description: 'Track your key metrics and performance goals'
};

export default function ScorecardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 