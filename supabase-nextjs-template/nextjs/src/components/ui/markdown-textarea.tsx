import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface MarkdownTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  previewClassName?: string;
}

const MarkdownTextarea = React.forwardRef<
  HTMLTextAreaElement,
  MarkdownTextareaProps
>(({ className, previewClassName, ...props }, ref) => {
  return (
    <div className="space-y-2">
      <Textarea
        ref={ref}
        className={cn("resize-none", className)}
        {...props}
      />
      <Card className={cn("p-3 min-h-[6rem] overflow-auto prose prose-sm max-w-none", previewClassName)}>
        <ReactMarkdown>{props.value as string || ''}</ReactMarkdown>
      </Card>
    </div>
  );
});

MarkdownTextarea.displayName = 'MarkdownTextarea';

export default MarkdownTextarea; 