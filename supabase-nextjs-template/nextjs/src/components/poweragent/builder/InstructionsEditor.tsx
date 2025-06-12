import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { FileText, Eye, Code } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface InstructionsEditorProps {
  instructions: string;
  markdown: boolean;
  onUpdate: (updates: Partial<{ instructions: string; markdown: boolean }>) => void;
}

const instructionTemplates = [
  {
    name: 'Customer Support',
    template: `You are a helpful customer support agent. Your primary goals are:

1. **Understand the customer's issue** - Listen carefully and ask clarifying questions
2. **Provide accurate information** - Give clear, correct answers based on available knowledge
3. **Be empathetic and professional** - Show understanding and maintain a friendly tone
4. **Resolve issues efficiently** - Work towards quick, effective solutions

Always:
- Greet customers warmly
- Use their name when provided
- Apologize for any inconvenience
- Thank them for their patience`
  },
  {
    name: 'Technical Assistant',
    template: `You are a technical assistant specializing in software development. Your role is to:

1. **Analyze technical problems** - Break down complex issues into manageable parts
2. **Provide code examples** - Include relevant, working code snippets
3. **Explain concepts clearly** - Use appropriate technical language while remaining accessible
4. **Follow best practices** - Recommend secure, efficient, and maintainable solutions

When providing code:
- Use proper syntax highlighting
- Include comments for clarity
- Consider edge cases
- Suggest error handling`
  },
  {
    name: 'Creative Writer',
    template: `You are a creative writing assistant. Your purpose is to:

1. **Generate original content** - Create unique, engaging narratives
2. **Adapt writing style** - Match tone and voice to the requested format
3. **Develop compelling characters** - Build realistic, relatable personalities
4. **Craft vivid descriptions** - Paint pictures with words

Remember to:
- Show, don't tell
- Use varied sentence structures
- Incorporate sensory details
- Maintain consistent voice`
  }
];

export default function InstructionsEditor({ instructions, markdown, onUpdate }: InstructionsEditorProps) {
  const [activeTab, setActiveTab] = useState('edit');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Instructions</CardTitle>
        <CardDescription>
          Craft detailed instructions that guide your agent&apos;s behavior, personality, and response style. Well-written instructions are key to creating effective agents.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Switch
              id="markdown-mode"
              checked={markdown}
              onCheckedChange={(checked) => onUpdate({ markdown: checked })}
            />
            <Label htmlFor="markdown-mode">Enable Markdown formatting</Label>
          </div>
          
          <div className="flex gap-2">
            {instructionTemplates.map((template) => (
              <Button
                key={template.name}
                variant="outline"
                size="sm"
                onClick={() => onUpdate({ instructions: template.template })}
              >
                <FileText className="h-4 w-4 mr-1" />
                {template.name}
              </Button>
            ))}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="edit" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              Edit
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="edit" className="mt-4">
            <div className="space-y-2">
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea
                id="instructions"
                placeholder="Example: You are a helpful customer support agent for an e-commerce platform. Always be polite, professional, and empathetic. Start by greeting the customer and asking how you can help. If you don't know something, admit it honestly and offer to find the information or escalate to a human agent. Always verify order details before making changes..."
                value={instructions}
                onChange={(e) => onUpdate({ instructions: e.target.value })}
                rows={12}
                className="font-mono text-sm"
              />
              <p className="text-sm text-gray-500">
                Use clear, specific instructions. {markdown && 'Markdown formatting is enabled.'}
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="preview" className="mt-4">
            <div className="min-h-[300px] p-4 border rounded-lg bg-gray-50">
              {instructions ? (
                markdown ? (
                  <ReactMarkdown className="prose prose-sm max-w-none">
                    {instructions}
                  </ReactMarkdown>
                ) : (
                  <pre className="whitespace-pre-wrap font-sans">{instructions}</pre>
                )
              ) : (
                <p className="text-gray-500 italic">No instructions provided yet.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 