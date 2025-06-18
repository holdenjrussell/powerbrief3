"use client";

import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Badge,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  Play,
  Brain,
  ExternalLink
} from 'lucide-react';
import type { AdPerformanceData } from '@/lib/types/onesheet';

interface AdPerformanceTableProps {
  data: AdPerformanceData[];
  onAnalyzeAd: (adId: string) => void;
}

type SortField = keyof AdPerformanceData;
type SortDirection = 'asc' | 'desc';

export function AdPerformanceTable({ data, onAnalyzeAd, onUpdateAd }: AdPerformanceTableProps) {
  const [sortField, setSortField] = useState<SortField>('spend');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterAngle, setFilterAngle] = useState<string>('all');
  const [filterFormat, setFilterFormat] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAds, setSelectedAds] = useState<Set<string>>(new Set());

  // Get unique values for filters
  const uniqueAngles = useMemo(() => {
    const angles = new Set(data.map(ad => ad.angle).filter(Boolean));
    return Array.from(angles);
  }, [data]);

  const uniqueFormats = useMemo(() => {
    const formats = new Set(data.map(ad => ad.format).filter(Boolean));
    return Array.from(formats);
  }, [data]);

  // Filter and sort data
  const processedData = useMemo(() => {
    let filtered = data;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(ad => 
        ad.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ad.landingPage.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply angle filter
    if (filterAngle !== 'all') {
      filtered = filtered.filter(ad => ad.angle === filterAngle);
    }

    // Apply format filter
    if (filterFormat !== 'all') {
      filtered = filtered.filter(ad => ad.format === filterFormat);
    }

    // Sort data
    return filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const aStr = String(aValue || '');
      const bStr = String(bValue || '');
      return sortDirection === 'asc' 
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });
  }, [data, searchTerm, filterAngle, filterFormat, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (field !== sortField) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4" />
      : <ArrowDown className="h-4 w-4" />;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getEmotionColor = (emotion: string) => {
    const colors: Record<string, string> = {
      'Happiness': 'bg-yellow-100 text-yellow-800',
      'Fear': 'bg-red-100 text-red-800',
      'Curiosity': 'bg-blue-100 text-blue-800',
      'Urgency': 'bg-orange-100 text-orange-800',
      'Trust': 'bg-green-100 text-green-800',
    };
    return colors[emotion] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <Input
          placeholder="Search ads..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
        
        <Select value={filterAngle} onValueChange={setFilterAngle}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by angle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Angles</SelectItem>
            {uniqueAngles.map(angle => (
              <SelectItem key={angle} value={angle}>{angle}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterFormat} onValueChange={setFilterFormat}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Formats</SelectItem>
            {uniqueFormats.map(format => (
              <SelectItem key={format} value={format}>{format}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto text-sm text-gray-600">
          Showing {processedData.length} of {data.length} ads
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-[50px]">
                  <input
                    type="checkbox"
                    aria-label="Select all ads"
                    checked={selectedAds.size === processedData.length && processedData.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedAds(new Set(processedData.map(ad => ad.id)));
                      } else {
                        setSelectedAds(new Set());
                      }
                    }}
                  />
                </TableHead>
                <TableHead className="w-[100px]">Ad</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('spend')}
                    className="flex items-center gap-1"
                  >
                    Spend <SortIcon field="spend" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('cpa')}
                    className="flex items-center gap-1"
                  >
                    CPA <SortIcon field="cpa" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('hookRate')}
                    className="flex items-center gap-1"
                  >
                    Hook Rate <SortIcon field="hookRate" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('holdRate')}
                    className="flex items-center gap-1"
                  >
                    Hold Rate <SortIcon field="holdRate" />
                  </Button>
                </TableHead>
                <TableHead>Angle</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Emotion</TableHead>
                <TableHead>Framework</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedData.map((ad) => (
                <TableRow key={ad.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      aria-label={`Select ad ${ad.id}`}
                      checked={selectedAds.has(ad.id)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedAds);
                        if (e.target.checked) {
                          newSelected.add(ad.id);
                        } else {
                          newSelected.delete(ad.id);
                        }
                        setSelectedAds(newSelected);
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                        <Play className="h-6 w-6 text-gray-500" />
                      </div>
                      <a
                        href={ad.adLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(ad.spend)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(ad.cpa)}
                  </TableCell>
                  <TableCell>
                    <span className={ad.hookRate > 3 ? 'text-green-600 font-medium' : ''}>
                      {formatPercentage(ad.hookRate)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={ad.holdRate > 20 ? 'text-green-600 font-medium' : ''}>
                      {formatPercentage(ad.holdRate)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {ad.angle ? (
                      <Badge variant="outline">{ad.angle}</Badge>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {ad.format ? (
                      <Badge variant="outline">{ad.format}</Badge>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {ad.emotion ? (
                      <Badge className={getEmotionColor(ad.emotion)}>
                        {ad.emotion}
                      </Badge>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {ad.framework ? (
                      <Badge variant="secondary">{ad.framework}</Badge>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onAnalyzeAd(ad.id)}
                      disabled={!!ad.angle} // Disable if already analyzed
                    >
                      <Brain className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
} 