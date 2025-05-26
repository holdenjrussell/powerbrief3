import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Upload, Edit3 } from 'lucide-react';
import { UploadedAssetGroup } from '@/lib/types/powerbrief';

interface AssetGroupingPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  assetGroups: UploadedAssetGroup[];
  conceptTitle: string;
  onConfirmSend: (groups: UploadedAssetGroup[]) => void;
  onEditGrouping?: (groups: UploadedAssetGroup[]) => void;
}

const AssetGroupingPreview: React.FC<AssetGroupingPreviewProps> = ({
  isOpen,
  onClose,
  assetGroups,
  conceptTitle,
  onConfirmSend,
  onEditGrouping
}) => {
  const [editableGroups, setEditableGroups] = useState<UploadedAssetGroup[]>(assetGroups);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirmSend(editableGroups);
    onClose();
  };

  const handleEditGroupName = (groupIndex: number, newName: string) => {
    const updatedGroups = [...editableGroups];
    updatedGroups[groupIndex] = {
      ...updatedGroups[groupIndex],
      baseName: newName
    };
    setEditableGroups(updatedGroups);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Asset Grouping Preview</h2>
            <p className="text-sm text-gray-600 mt-1">
              Review how your assets will be grouped for &quot;{conceptTitle}&quot; before sending to Ad Uploader
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600"
            title="Close preview"
            aria-label="Close asset grouping preview"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-800 mb-2">Grouping Logic</h3>
            <p className="text-sm text-blue-700">
              Assets are now grouped by version (v1, v2, v3, etc.) so that different aspect ratios of the same concept variation are kept together.
              Each group will create one ad draft with multiple asset formats.
            </p>
          </div>

          {editableGroups.map((group, groupIndex) => (
            <Card key={groupIndex} className="border-2 border-gray-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center">
                    <Edit3 className="h-4 w-4 mr-2 text-gray-500" />
                    <input
                      type="text"
                      value={group.baseName}
                      onChange={(e) => handleEditGroupName(groupIndex, e.target.value)}
                      className="bg-transparent border-none outline-none font-semibold text-lg focus:bg-gray-50 focus:border focus:border-blue-300 rounded px-2 py-1"
                      title="Edit group name"
                      aria-label={`Edit group name for ${group.baseName}`}
                    />
                  </CardTitle>
                  <span className="text-sm text-gray-500">
                    {group.assets.length} asset{group.assets.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Aspect ratios: {group.aspectRatios.join(', ')}
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {group.assets.map((asset, assetIndex) => (
                    <div key={assetIndex} className="relative">
                      {asset.type === 'image' ? (
                        <img
                          src={asset.supabaseUrl}
                          alt={asset.name}
                          className="w-full h-24 object-cover rounded border"
                        />
                      ) : (
                        <video
                          src={asset.supabaseUrl}
                          className="w-full h-24 object-cover rounded border"
                          muted
                        />
                      )}
                      <div className="absolute bottom-1 left-1 bg-black bg-opacity-75 text-white text-xs px-1 rounded">
                        {asset.aspectRatio}
                      </div>
                      <div className="absolute top-1 right-1 bg-blue-600 text-white text-xs px-1 rounded">
                        {asset.type}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-600">
            {editableGroups.length} ad draft{editableGroups.length !== 1 ? 's' : ''} will be created
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {onEditGrouping && (
              <Button 
                variant="outline" 
                onClick={() => onEditGrouping(editableGroups)}
                className="border-orange-300 text-orange-700 hover:bg-orange-50"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Adjust Grouping
              </Button>
            )}
            <Button 
              onClick={handleConfirm}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Upload className="h-4 w-4 mr-2" />
              Confirm & Send to Ad Uploader
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetGroupingPreview; 