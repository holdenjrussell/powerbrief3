"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Code2, FileSearch, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RetrieverField {
  id: string;
  name: string;
  type: string;
  description: string;
  required: boolean;
}

interface RetrieverConfig {
  name: string;
  description: string;
  type: string;
  fields: RetrieverField[];
  implementation: string;
}

interface RetrieverBuilderProps {
  retrievers: RetrieverConfig[];
  onChange: (retrievers: RetrieverConfig[]) => void;
}

export function RetrieverBuilder({ retrievers, onChange }: RetrieverBuilderProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [currentRetriever, setCurrentRetriever] = useState<RetrieverConfig>({
    name: "",
    description: "",
    type: "vector",
    fields: [],
    implementation: "",
  });

  const retrieverTemplates = {
    vector: {
      name: "Vector Search Retriever",
      description: "Semantic similarity search using embeddings",
      fields: [
        { id: "1", name: "embedding_model", type: "string", description: "Model for embeddings", required: true },
        { id: "2", name: "similarity_threshold", type: "number", description: "Minimum similarity score", required: true },
        { id: "3", name: "max_results", type: "number", description: "Maximum results to return", required: true },
      ],
      implementation: `async function retrieve(query: string, context: any) {
  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);
  
  // Search for similar documents
  const results = await searchVectorStore({
    embedding: queryEmbedding,
    threshold: context.similarity_threshold,
    limit: context.max_results
  });
  
  return results.map(r => ({
    content: r.content,
    score: r.similarity,
    metadata: r.metadata
  }));
}`,
    },
    keyword: {
      name: "Keyword Search Retriever",
      description: "Full-text search using keywords",
      fields: [
        { id: "1", name: "search_fields", type: "array", description: "Fields to search in", required: true },
        { id: "2", name: "boost_recent", type: "boolean", description: "Boost recent results", required: false },
      ],
      implementation: `async function retrieve(query: string, context: any) {
  // Perform keyword search
  const results = await searchKeywords({
    query: query,
    fields: context.search_fields,
    boostRecent: context.boost_recent || false
  });
  
  return results.map(r => ({
    content: r.content,
    score: r.relevance,
    metadata: r.metadata
  }));
}`,
    },
    hybrid: {
      name: "Hybrid Retriever",
      description: "Combines vector and keyword search",
      fields: [
        { id: "1", name: "vector_weight", type: "number", description: "Weight for vector search (0-1)", required: true },
        { id: "2", name: "keyword_weight", type: "number", description: "Weight for keyword search (0-1)", required: true },
      ],
      implementation: `async function retrieve(query: string, context: any) {
  // Perform both vector and keyword search
  const [vectorResults, keywordResults] = await Promise.all([
    vectorSearch(query),
    keywordSearch(query)
  ]);
  
  // Combine and weight results
  const combined = mergeResults(
    vectorResults,
    keywordResults,
    context.vector_weight,
    context.keyword_weight
  );
  
  return combined;
}`,
    },
  };

  const handleTemplateSelect = (templateKey: keyof typeof retrieverTemplates) => {
    const template = retrieverTemplates[templateKey];
    setCurrentRetriever({
      ...currentRetriever,
      type: templateKey,
      fields: template.fields,
      implementation: template.implementation,
    });
  };

  const addField = () => {
    const newField: RetrieverField = {
      id: Date.now().toString(),
      name: "",
      type: "string",
      description: "",
      required: false,
    };
    setCurrentRetriever({
      ...currentRetriever,
      fields: [...currentRetriever.fields, newField],
    });
  };

  const updateField = (fieldId: string, updates: Partial<RetrieverField>) => {
    setCurrentRetriever({
      ...currentRetriever,
      fields: currentRetriever.fields.map((f) =>
        f.id === fieldId ? { ...f, ...updates } : f
      ),
    });
  };

  const removeField = (fieldId: string) => {
    setCurrentRetriever({
      ...currentRetriever,
      fields: currentRetriever.fields.filter((f) => f.id !== fieldId),
    });
  };

  const saveRetriever = () => {
    if (currentRetriever.name && currentRetriever.implementation) {
      onChange([...retrievers, currentRetriever]);
      setCurrentRetriever({
        name: "",
        description: "",
        type: "vector",
        fields: [],
        implementation: "",
      });
      setIsCreating(false);
    }
  };

  const deleteRetriever = (index: number) => {
    onChange(retrievers.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Existing Retrievers */}
      {retrievers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Custom Retrievers</CardTitle>
            <CardDescription>
              Your custom retriever implementations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {retrievers.map((retriever, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FileSearch className="h-4 w-4" />
                    <span className="font-medium">{retriever.name}</span>
                    <Badge variant="secondary">{retriever.type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {retriever.description}
                  </p>
                  <div className="flex gap-2 mt-2">
                    {retriever.fields.map((field) => (
                      <Badge key={field.id} variant="outline" className="text-xs">
                        {field.name}: {field.type}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteRetriever(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Create New Retriever */}
      {!isCreating ? (
        <Button onClick={() => setIsCreating(true)} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Create Custom Retriever
        </Button>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Create Custom Retriever</CardTitle>
            <CardDescription>
              Build a custom retriever for your agent&apos;s memory system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={currentRetriever.name}
                  onChange={(e) =>
                    setCurrentRetriever({ ...currentRetriever, name: e.target.value })
                  }
                  placeholder="My Custom Retriever"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={currentRetriever.description}
                  onChange={(e) =>
                    setCurrentRetriever({ ...currentRetriever, description: e.target.value })
                  }
                  placeholder="Describe what this retriever does..."
                  rows={2}
                />
              </div>
            </div>

            {/* Template Selection */}
            <div className="space-y-2">
              <Label>Start from Template</Label>
              <Select onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vector">Vector Search</SelectItem>
                  <SelectItem value="keyword">Keyword Search</SelectItem>
                  <SelectItem value="hybrid">Hybrid Search</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Configuration Fields */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Configuration Fields</Label>
                <Button size="sm" variant="outline" onClick={addField}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Field
                </Button>
              </div>
              {currentRetriever.fields.map((field) => (
                <div key={field.id} className="space-y-2 p-4 border rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Field Name</Label>
                      <Input
                        value={field.name}
                        onChange={(e) =>
                          updateField(field.id, { name: e.target.value })
                        }
                        placeholder="field_name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={field.type}
                        onValueChange={(value) =>
                          updateField(field.id, { type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="string">String</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="boolean">Boolean</SelectItem>
                          <SelectItem value="array">Array</SelectItem>
                          <SelectItem value="object">Object</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={field.description}
                      onChange={(e) =>
                        updateField(field.id, { description: e.target.value })
                      }
                      placeholder="What this field configures..."
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={field.required}
                        onCheckedChange={(checked) =>
                          updateField(field.id, { required: checked })
                        }
                      />
                      <Label>Required</Label>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeField(field.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Implementation */}
            <div className="space-y-2">
              <Label>Implementation</Label>
              <Textarea
                value={currentRetriever.implementation}
                onChange={(e) =>
                  setCurrentRetriever({ ...currentRetriever, implementation: e.target.value })
                }
                placeholder="async function retrieve(query: string, context: any) {
  // Your retriever logic here
  return results;
}"
                className="font-mono text-sm h-64"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button onClick={saveRetriever}>
                <Code2 className="h-4 w-4 mr-2" />
                Save Retriever
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreating(false);
                  setCurrentRetriever({
                    name: "",
                    description: "",
                    type: "vector",
                    fields: [],
                    implementation: "",
                  });
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 