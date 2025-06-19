"use client";

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Lightbulb, 
  Sparkles,
  Video,
  Image,
  MessageSquare
} from 'lucide-react';

interface CreativeBrainstormPanelProps {
  onesheetId: string;
  brandId: string;
}

export function CreativeBrainstormPanel({ onesheetId, brandId }: CreativeBrainstormPanelProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Creative Brainstorm</CardTitle>
              <CardDescription>
                Generate concepts, hooks, and visuals based on your research
              </CardDescription>
            </div>
            <Button>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Ideas
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              No creative concepts generated yet
            </p>
            <p className="text-sm text-muted-foreground">
              Complete the previous stages to generate creative ideas
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Placeholder sections for future implementation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Concepts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Full creative concepts with angles and formats
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Hooks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Opening lines using customer language
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Visuals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Visual ideas and production notes
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 