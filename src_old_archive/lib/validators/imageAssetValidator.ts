export interface ImageAsset {
  name: string;
  type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export function validateImageAsset(asset: any): asset is ImageAsset {
  return (
    asset &&
    typeof asset.name === 'string' &&
    typeof asset.type === 'string' &&
    typeof asset.arrayBuffer === 'function'
  );
} 