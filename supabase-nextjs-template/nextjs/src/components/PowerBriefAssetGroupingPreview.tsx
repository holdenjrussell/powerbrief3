import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Upload, Edit3, Plus, Trash2, GripVertical } from 'lucide-react';
import { UploadedAssetGroup, UploadedAsset } from '@/lib/types/powerbrief';

interface AssetGroupingPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  assetGroups: UploadedAssetGroup[];
  conceptTitle: string;
  onConfirmSend: (groups: UploadedAssetGroup[]) => void;
}

const AssetGroupingPreview: React.FC<AssetGroupingPreviewProps> = ({
  isOpen,
  onClose,
  assetGroups,
  conceptTitle,
  onConfirmSend
}) => {
  const [editableGroups, setEditableGroups] = useState<UploadedAssetGroup[]>(assetGroups);
  const [isEditing, setIsEditing] = useState(false);
  const [draggedAsset, setDraggedAsset] = useState<UploadedAsset | null>(null);

  // Reset editable groups when assetGroups prop changes
  React.useEffect(() => {
    setEditableGroups(assetGroups);
  }, [assetGroups]);

  const handleEditGroupName = (groupIndex: number, newName: string) => {
    const updatedGroups = [...editableGroups];
    updatedGroups[groupIndex] = {
      ...updatedGroups[groupIndex],
      baseName: newName
    };
    setEditableGroups(updatedGroups);
  };

  const handleCreateNewGroup = () => {
    const newGroup: UploadedAssetGroup = {
      baseName: `New Group ${editableGroups.length + 1}`,
      assets: [],
      aspectRatios: [],
      uploadedAt: new Date().toISOString()
    };
    setEditableGroups([...editableGroups, newGroup]);
  };

  const handleDeleteGroup = (groupIndex: number) => {
    if (editableGroups[groupIndex].assets.length > 0) {
      if (!confirm('This group contains assets. Are you sure you want to delete it? Assets will be moved to the first group.')) {
        return;
      }
      // Move assets to first group
      const assetsToMove = editableGroups[groupIndex].assets;
      const updatedGroups = [...editableGroups];
      if (updatedGroups.length > 1) {
        updatedGroups[0].assets = [...updatedGroups[0].assets, ...assetsToMove];
        updatedGroups[0].aspectRatios = [...new Set([...updatedGroups[0].aspectRatios, ...assetsToMove.map(a => a.aspectRatio)])];
      }
    }
    
    const updatedGroups = editableGroups.filter((_, index) => index !== groupIndex);
    setEditableGroups(updatedGroups);
  };

  const handleDragStart = (asset: UploadedAsset) => {
    setDraggedAsset(asset);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetGroupIndex: number) => {
    e.preventDefault();
    
    if (!draggedAsset) return;

    // Find source group
    const sourceGroupIndex = editableGroups.findIndex(group => 
      group.assets.some(asset => asset.id === draggedAsset.id)
    );

    if (sourceGroupIndex === -1 || sourceGroupIndex === targetGroupIndex) {
      setDraggedAsset(null);
      return;
    }

    // Remove asset from source group
    const updatedGroups = [...editableGroups];
    updatedGroups[sourceGroupIndex].assets = updatedGroups[sourceGroupIndex].assets.filter(
      asset => asset.id !== draggedAsset.id
    );
    updatedGroups[sourceGroupIndex].aspectRatios = [
      ...new Set(updatedGroups[sourceGroupIndex].assets.map(a => a.aspectRatio))
    ];

    // Add asset to target group
    updatedGroups[targetGroupIndex].assets.push(draggedAsset);
    updatedGroups[targetGroupIndex].aspectRatios = [
      ...new Set(updatedGroups[targetGroupIndex].assets.map(a => a.aspectRatio))
    ];

    setEditableGroups(updatedGroups);
    setDraggedAsset(null);
  };

  const handleConfirm = () => {
    // Filter out empty groups
    const nonEmptyGroups = editableGroups.filter(group => group.assets.length > 0);
    onConfirmSend(nonEmptyGroups);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col m-4">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Asset Grouping Preview</h2>
            <p className="text-sm text-gray-600 mt-1">
              Review how your assets will be grouped for &ldquo;{conceptTitle}&rdquo; before sending to Ad Uploader
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

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {editableGroups.filter(g => g.assets.length > 0).length} groups will create {editableGroups.filter(g => g.assets.length > 0).length} ad drafts
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center"
              >
                <Edit3 className="h-4 w-4 mr-1" />
                {isEditing ? 'Done Editing' : 'Edit Grouping'}
              </Button>
              {isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCreateNewGroup}
                  className="flex items-center"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Group
                </Button>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-1">Manual Grouping Instructions</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• <strong>Drag and drop</strong> assets between groups to reorganize them</li>
                <li>• <strong>Click group names</strong> to edit them</li>
                <li>• <strong>Add new groups</strong> using the &ldquo;Add Group&rdquo; button</li>
                <li>• <strong>Delete empty groups</strong> using the trash icon</li>
                <li>• Each group will become one ad draft with multiple asset formats</li>
              </ul>
            </div>
          )}

          <div className="space-y-4">
            {editableGroups.map((group, groupIndex) => (
              <Card 
                key={groupIndex} 
                className={`${isEditing ? 'border-2 border-dashed border-gray-300 hover:border-blue-400' : ''}`}
                onDragOver={isEditing ? handleDragOver : undefined}
                onDrop={isEditing ? (e) => handleDrop(e, groupIndex) : undefined}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <div className="flex items-center">
                      <Edit3 className="h-4 w-4 mr-2 text-gray-500" />
                      {isEditing ? (
                        <input
                          type="text"
                          value={group.baseName}
                          onChange={(e) => handleEditGroupName(groupIndex, e.target.value)}
                          className="bg-transparent border-none outline-none font-semibold text-lg focus:bg-gray-50 focus:border focus:border-blue-300 rounded px-2 py-1"
                          title="Edit group name"
                          aria-label={`Edit group name for ${group.baseName}`}
                        />
                      ) : (
                        <span>{group.baseName}</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        {group.assets.length} assets
                      </span>
                      {isEditing && (
                        <button
                          onClick={() => handleDeleteGroup(groupIndex)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Delete group"
                          aria-label={`Delete group ${group.baseName}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {group.assets.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                      <p className="text-sm">Drop assets here</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-3">
                        {group.assets.map((asset, assetIndex) => (
                          <div 
                            key={assetIndex} 
                            className={`relative border rounded-lg overflow-hidden bg-gray-50 ${
                              isEditing ? 'cursor-move hover:shadow-md transition-shadow' : ''
                            }`}
                            draggable={isEditing}
                            onDragStart={isEditing ? () => handleDragStart(asset) : undefined}
                          >
                            {isEditing && (
                              <div className="absolute top-1 left-1 z-10 bg-white rounded p-1 shadow-sm">
                                <GripVertical className="h-3 w-3 text-gray-400" />
                              </div>
                            )}
                            {asset.type === 'image' ? (
                              <img
                                src={asset.supabaseUrl}
                                alt={asset.name}
                                className="w-full h-20 object-cover"
                              />
                            ) : (
                              <video
                                src={asset.supabaseUrl}
                                className="w-full h-20 object-cover"
                              />
                            )}
                            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-1">
                              <div className="truncate">{asset.name}</div>
                              <div className="text-xs opacity-75">{asset.aspectRatio}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="text-sm text-gray-600">
                        <strong>Aspect Ratios:</strong> {group.aspectRatios.join(', ') || 'None'}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="border-t p-6">
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={editableGroups.filter(g => g.assets.length > 0).length === 0}
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