import Link from 'next/link';
import { useState } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent,
  CardFooter,
  Button,
  Badge,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel
} from "@/components/ui";
import { ChevronRight, User2, ShoppingBag, FileVideo, AtSign, Package } from 'lucide-react';
import { UgcCreator, UGC_CREATOR_ONBOARDING_STATUSES, UGC_CREATOR_CONTRACT_STATUSES, UGC_CREATOR_PRODUCT_SHIPMENT_STATUSES } from '@/lib/types/ugcCreator';
import { updateUgcCreator } from '@/lib/services/ugcCreatorService';

interface CreatorCardProps {
  creator: UgcCreator;
  brandId: string;
  onUpdate?: (updatedCreator: UgcCreator) => void;
}

export default function CreatorCard({ creator, brandId, onUpdate }: CreatorCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Function to get badge variant based on status
  const getStatusVariant = (status: string | undefined) => {
    if (!status) return "default";
    
    // Success statuses (completed onboarding steps)
    if (['READY FOR SCRIPTS', 'Call Scheduled'].includes(status)) {
      return "success";
    }
    
    // In progress statuses
    if (['Schedule Call Call Schedule Attempted', 'Backlog Approved for Next Steps'].includes(status)) {
      return "default";
    }
    
    // Early stage statuses
    if (['New Creator Submission', 'Cold Outreach', 'Primary Screen'].includes(status)) {
      return "secondary";
    }
    
    return "outline";
  };
  
  const getContractStatusVariant = (status: string | undefined) => {
    if (!status) return "default";
    
    if (status === 'contract signed') {
      return "success";
    }
    
    if (status === 'contract sent') {
      return "default";
    }
    
    if (status === 'not signed') {
      return "secondary";
    }
    
    return "outline";
  };
  
  const getProductShipmentStatusVariant = (status: string | undefined, shipped: boolean | undefined) => {
    if (shipped) return "success";
    
    if (!status) return "default";
    
    if (['Delivered', 'Shipped'].includes(status)) {
      return "success";
    }
    
    if (['Processing'].includes(status)) {
      return "default";
    }
    
    if (['Not Shipped', 'Returned'].includes(status)) {
      return "secondary";
    }
    
    return "outline";
  };
  
  // Handle status update
  const handleStatusChange = async (newStatus: string) => {
    try {
      setIsUpdating(true);
      
      const updatedCreator = await updateUgcCreator({
        id: creator.id,
        status: newStatus
      });
      
      if (onUpdate) {
        onUpdate(updatedCreator);
      }
    } catch (error) {
      console.error('Error updating creator status:', error);
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Handle contract status update
  const handleContractStatusChange = async (newStatus: string) => {
    try {
      setIsUpdating(true);
      
      const updatedCreator = await updateUgcCreator({
        id: creator.id,
        contract_status: newStatus
      });
      
      if (onUpdate) {
        onUpdate(updatedCreator);
      }
    } catch (error) {
      console.error('Error updating creator contract status:', error);
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Handle product shipment status update
  const handleProductShipmentStatusChange = async (newStatus: string) => {
    try {
      setIsUpdating(true);
      
      const updatedCreator = await updateUgcCreator({
        id: creator.id,
        product_shipment_status: newStatus,
        // Auto-set product_shipped to true if status is Shipped or Delivered
        product_shipped: ['Shipped', 'Delivered'].includes(newStatus)
      });
      
      if (onUpdate) {
        onUpdate(updatedCreator);
      }
    } catch (error) {
      console.error('Error updating product shipment status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span className="truncate">{creator.name}</span>
        </CardTitle>
        <CardDescription className="flex flex-wrap gap-2">
          <Select 
            value={creator.status || 'New Creator Submission'} 
            onValueChange={handleStatusChange}
            disabled={isUpdating}
          >
            <SelectTrigger className="h-6 w-auto">
              <Badge variant={getStatusVariant(creator.status)}>
                {creator.status || 'New Creator Submission'}
              </Badge>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Creator Status</SelectLabel>
                {UGC_CREATOR_ONBOARDING_STATUSES.map(status => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          
          <Select 
            value={creator.contract_status || 'not signed'} 
            onValueChange={handleContractStatusChange}
            disabled={isUpdating}
          >
            <SelectTrigger className="h-6 w-auto">
              <Badge variant={getContractStatusVariant(creator.contract_status)}>
                {creator.contract_status || 'not signed'}
              </Badge>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Contract Status</SelectLabel>
                {UGC_CREATOR_CONTRACT_STATUSES.map(status => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          
          <Select 
            value={creator.product_shipment_status || 'Not Shipped'} 
            onValueChange={handleProductShipmentStatusChange}
            disabled={isUpdating}
          >
            <SelectTrigger className="h-6 w-auto">
              <Badge variant={getProductShipmentStatusVariant(creator.product_shipment_status, creator.product_shipped)}>
                <Package className="h-3 w-3 mr-1" />
                {creator.product_shipped ? 'Product Shipped' : (creator.product_shipment_status || 'Not Shipped')}
              </Badge>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Product Shipment</SelectLabel>
                {UGC_CREATOR_PRODUCT_SHIPMENT_STATUSES.map(status => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {creator.gender && (
            <div className="flex items-center text-sm">
              <User2 className="h-4 w-4 mr-2 text-gray-500" />
              <span>{creator.gender}</span>
            </div>
          )}
          
          {creator.products && creator.products.length > 0 && (
            <div className="flex items-center text-sm">
              <ShoppingBag className="h-4 w-4 mr-2 text-gray-500" />
              <span>{creator.products.slice(0, 2).join(', ')}{creator.products.length > 2 ? '...' : ''}</span>
            </div>
          )}
          
          {creator.content_types && creator.content_types.length > 0 && (
            <div className="flex items-center text-sm">
              <FileVideo className="h-4 w-4 mr-2 text-gray-500" />
              <span>{creator.content_types.slice(0, 2).join(', ')}{creator.content_types.length > 2 ? '...' : ''}</span>
            </div>
          )}
          
          {creator.email && (
            <div className="flex items-center text-sm">
              <AtSign className="h-4 w-4 mr-2 text-gray-500" />
              <span className="truncate">{creator.email}</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Link href={`/app/powerbrief/${brandId}/ugc-pipeline/creators/${creator.id}`} className="w-full">
          <Button variant="outline" className="w-full justify-between">
            View Creator
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
} 