import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';

interface MarkdownTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  previewClassName?: string;
}

const MarkdownTextarea = React.forwardRef<
  HTMLTextAreaElement,
  MarkdownTextareaProps
>(({ className, previewClassName, ...props }, ref) => {
  const [activeTab, setActiveTab] = useState<string>('edit');

  return (
    <Tabs defaultValue="edit" value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="mb-2">
        <TabsTrigger value="edit">Edit</TabsTrigger>
        <TabsTrigger value="preview">Preview</TabsTrigger>
      </TabsList>
      <TabsContent value="edit" className="mt-0">
        <Textarea
          ref={ref}
          className={cn("resize-none", className)}
          {...props}
        />
      </TabsContent>
      <TabsContent value="preview" className="mt-0">
        <Card className={cn("p-3 min-h-[6rem] overflow-auto prose prose-sm max-w-none", previewClassName)}>
          <ReactMarkdown>{props.value as string || ''}</ReactMarkdown>
        </Card>
      </TabsContent>
    </Tabs>
  );
});

MarkdownTextarea.displayName = 'MarkdownTextarea';

export default MarkdownTextarea; 