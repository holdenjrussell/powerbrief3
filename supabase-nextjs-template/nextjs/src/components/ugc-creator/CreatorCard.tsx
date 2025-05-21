import Link from 'next/link';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent,
  CardFooter,
  Button,
  Badge
} from "@/components/ui";
import { UgcCreator } from '@/lib/types/ugcCreator';
import { ChevronRight } from 'lucide-react';

interface CreatorCardProps {
  creator: UgcCreator;
  brandId: string;
}

export default function CreatorCard({ creator, brandId }: CreatorCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>{creator.name}</span>
          <Badge variant={
            creator.status === 'Active' ? "default" :
            creator.status === 'Paused' ? "outline" :
            creator.status === 'Inactive' ? "destructive" :
            creator.status === 'Active in Slack' ? "secondary" : "default"
          }>
            {creator.status || 'Active'}
          </Badge>
        </CardTitle>
        <CardDescription className="flex flex-col">
          {creator.email && (
            <span className="truncate">{creator.email}</span>
          )}
          {creator.phone_number && (
            <span>{creator.phone_number}</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 text-sm mb-4">
          <div>
            <span className="font-medium">Contract:</span>
            <Badge 
              variant={
                creator.contract_status === 'contract signed' ? "success" :
                creator.contract_status === 'contract sent' ? "outline" : "secondary"
              }
              className="ml-2"
            >
              {creator.contract_status || 'not signed'}
            </Badge>
          </div>
          {creator.per_script_fee && (
            <div>
              <span className="font-medium">Fee:</span>
              <span className="ml-2">${creator.per_script_fee}</span>
            </div>
          )}
        </div>

        {(creator.instagram_handle || creator.tiktok_handle) && (
          <div className="flex flex-wrap gap-2 mb-3">
            {creator.instagram_handle && (
              <Badge variant="outline" className="flex items-center gap-1">
                <span className="text-pink-500 font-bold">Insta:</span> 
                {creator.instagram_handle}
              </Badge>
            )}
            {creator.tiktok_handle && (
              <Badge variant="outline" className="flex items-center gap-1">
                <span className="text-black font-bold">TikTok:</span> 
                {creator.tiktok_handle}
              </Badge>
            )}
          </div>
        )}

        {creator.content_types && creator.content_types.length > 0 && (
          <div className="mt-2">
            <span className="text-sm font-medium block mb-1">Content Types:</span>
            <div className="flex flex-wrap gap-1">
              {creator.content_types.map((type, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {type}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Link href={`/app/powerbrief/${brandId}/ugc-pipeline/creators/${creator.id}`} className="w-full">
          <Button variant="outline" className="w-full justify-between">
            View Creator
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
} 