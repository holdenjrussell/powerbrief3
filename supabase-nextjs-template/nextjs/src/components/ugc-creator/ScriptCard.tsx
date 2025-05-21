import Link from 'next/link';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent,
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UgcCreatorScript } from '@/lib/types/ugcCreator';
import { ChevronRight } from 'lucide-react';

interface ScriptCardProps {
  script: UgcCreatorScript;
  brandId: string;
}

export default function ScriptCard({ script, brandId }: ScriptCardProps) {
  // Function to get badge variant based on status
  const getStatusVariant = (status: string | undefined) => {
    if (!status) return "default";
    
    if (['COMPLETED', 'CONTENT UPLOADED', 'READY FOR PAYMENT'].includes(status)) {
      return "success";
    }
    
    if (['SCRIPT ASSIGNED', 'CREATOR FILMING', 'FINAL CONTENT UPLOAD'].includes(status)) {
      return "default";
    }
    
    if (['BACKLOG', 'COLD OUTREACH', 'PRIMARY SCREEN'].includes(status)) {
      return "secondary";
    }
    
    if (['INACTIVE/REJECTED'].includes(status)) {
      return "destructive";
    }
    
    return "outline";
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span className="truncate">{script.title}</span>
          <Badge variant={getStatusVariant(script.status)}>
            {script.status || 'NEW'}
          </Badge>
        </CardTitle>
        <CardDescription>
          Creator Script
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {script.creator_id && (
            <div className="text-sm">
              <span className="font-medium">Creator:</span>
              <span className="ml-2">ID: {script.creator_id.slice(0, 8)}...</span>
            </div>
          )}
          
          {script.hook_type && (
            <div className="text-sm">
              <span className="font-medium">Hook Type:</span>
              <Badge variant="outline" className="ml-2">
                {script.hook_type}
              </Badge>
              {script.hook_count && (
                <span className="ml-2">({script.hook_count})</span>
              )}
            </div>
          )}
          
          {script.final_content_link && (
            <div className="text-sm">
              <span className="font-medium">Content:</span>
              <a 
                href={script.final_content_link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-2 text-blue-500 hover:underline"
              >
                View Content
              </a>
            </div>
          )}
          
          {script.public_share_id && (
            <div className="text-sm">
              <span className="font-medium">Public Link:</span>
              <a 
                href={`/public/ugc-script/${script.public_share_id}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-2 text-blue-500 hover:underline"
              >
                Share Link
              </a>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Link href={`/app/powerbrief/${brandId}/ugc-pipeline/scripts/${script.id}`} className="w-full">
          <Button variant="outline" className="w-full justify-between">
            View Script
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
} 