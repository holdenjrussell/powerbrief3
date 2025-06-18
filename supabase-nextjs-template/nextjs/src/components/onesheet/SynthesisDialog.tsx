"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Button,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
} from '@/components/ui';
import { Plus, Star } from 'lucide-react';
import type { SynthesisItem } from '@/lib/types/onesheet';

interface SynthesisDialogProps {
  category: string;
  onAdd: (item: Omit<SynthesisItem, 'id' | 'dateAdded'>) => void;
}

export function SynthesisDialog({ category, onAdd }: SynthesisDialogProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [source, setSource] = useState<SynthesisItem['source']>('manual');
  const [sourceDetails, setSourceDetails] = useState('');
  const [relevance, setRelevance] = useState(3);
  const [evidence, setEvidence] = useState<Array<{ type: string; text: string; url?: string }>>([]);
  const [newEvidence, setNewEvidence] = useState({ type: 'information', text: '', url: '' });

  const handleSubmit = () => {
    if (!text.trim()) return;

    onAdd({
      text: text.trim(),
      source,
      sourceDetails: sourceDetails.trim() || undefined,
      relevance,
      evidence: evidence.length > 0 ? evidence : undefined
    });

    // Reset form
    setText('');
    setSource('manual');
    setSourceDetails('');
    setRelevance(3);
    setEvidence([]);
    setNewEvidence({ type: 'information', text: '', url: '' });
    setOpen(false);
  };

  const addEvidence = () => {
    if (newEvidence.text.trim()) {
      setEvidence([...evidence, {
        type: newEvidence.type,
        text: newEvidence.text.trim(),
        url: newEvidence.url.trim() || undefined
      }]);
      setNewEvidence({ type: 'information', text: '', url: '' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add {category} Insight</DialogTitle>
          <DialogDescription>
            Add a new insight to your synthesis with supporting evidence
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="text">Insight Text*</Label>
            <Textarea
              id="text"
              placeholder="Enter the key insight..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Select value={source} onValueChange={(v) => setSource(v as SynthesisItem['source'])}>
                <SelectTrigger id="source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Entry</SelectItem>
                  <SelectItem value="research">Research</SelectItem>
                  <SelectItem value="competitor">Competitor Analysis</SelectItem>
                  <SelectItem value="social">Social Listening</SelectItem>
                  <SelectItem value="organic">Organic Content</SelectItem>
                  <SelectItem value="ads">Ad Performance</SelectItem>
                  <SelectItem value="ai">AI Generated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sourceDetails">Source Details</Label>
              <Input
                id="sourceDetails"
                placeholder="e.g., Reddit r/fitness"
                value={sourceDetails}
                onChange={(e) => setSourceDetails(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Relevance</Label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRelevance(star)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`h-6 w-6 ${
                      star <= relevance
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
              <span className="text-sm text-gray-600 ml-2">
                {relevance === 1 && 'Low relevance'}
                {relevance === 2 && 'Below average'}
                {relevance === 3 && 'Average'}
                {relevance === 4 && 'Above average'}
                {relevance === 5 && 'Highly relevant'}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Supporting Evidence</Label>
            <div className="space-y-2">
              {evidence.map((ev, idx) => (
                <div key={idx} className="p-2 bg-gray-50 rounded text-sm">
                  <Badge variant="outline" className="text-xs mb-1">{ev.type}</Badge>
                  <p>{ev.text}</p>
                  {ev.url && (
                    <a href={ev.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                      {ev.url}
                    </a>
                  )}
                </div>
              ))}
            </div>

            <div className="border rounded-lg p-3 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <Select value={newEvidence.type} onValueChange={(v) => setNewEvidence({ ...newEvidence, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="statistic">Statistic</SelectItem>
                    <SelectItem value="information">Information</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Evidence text"
                  value={newEvidence.text}
                  onChange={(e) => setNewEvidence({ ...newEvidence, text: e.target.value })}
                  className="col-span-2"
                />
              </div>
              <Input
                placeholder="Source URL (optional)"
                value={newEvidence.url}
                onChange={(e) => setNewEvidence({ ...newEvidence, url: e.target.value })}
              />
              <Button size="sm" variant="outline" onClick={addEvidence} disabled={!newEvidence.text.trim()}>
                Add Evidence
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!text.trim()}>
              Add Insight
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 