'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  Truck, 
  MapPin, 
  CheckCircle,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Eye,
  ExternalLink,
  MessageSquare,
  Clock,
  Edit,
  Copy
} from 'lucide-react';
import { 
  UgcShipment, 
  ShipmentDashboardData, 
  CreateShipmentForm, 
  ShipmentProduct,
  ShippingAddress
} from '@/lib/types/ugcDashboards';

interface ShipmentsDashboardProps {
  brandId: string;
}

export default function ShipmentsDashboard({ brandId }: ShipmentsDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<ShipmentDashboardData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateShipment, setShowCreateShipment] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<UgcShipment | null>(null);

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, [brandId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ugc/shipments/dashboard?brandId=${brandId}`);
      const data = await response.json();
      if (data.success) {
        setDashboardData(data.data);
      }
    } catch (error) {
      console.error('Error loading shipments dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShipment = async (formData: CreateShipmentForm) => {
    try {
      const response = await fetch('/api/ugc/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, brand_id: brandId }),
      });
      
      if (response.ok) {
        setShowCreateShipment(false);
        loadDashboardData();
      }
    } catch (error) {
      console.error('Error creating shipment:', error);
    }
  };

  const handleUpdateStatus = async (shipmentId: string, status: UgcShipment['status'], trackingNumber?: string) => {
    try {
      const response = await fetch(`/api/ugc/shipments/${shipmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status,
          ...(trackingNumber && { tracking_number: trackingNumber }),
          ...(status === 'shipped' && { shipped_at: new Date().toISOString() }),
          ...(status === 'delivered' && { delivered_at: new Date().toISOString() })
        }),
      });
      
      if (response.ok) {
        loadDashboardData();
      }
    } catch (error) {
      console.error('Error updating shipment status:', error);
    }
  };

  const handleSendSlackNotification = async (shipmentId: string) => {
    try {
      const response = await fetch(`/api/ugc/shipments/${shipmentId}/slack-notify`, {
        method: 'POST',
      });
      
      if (response.ok) {
        loadDashboardData();
      }
    } catch (error) {
      console.error('Error sending Slack notification:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Shipments Dashboard</h1>
          <p className="text-gray-600">Manage product shipments and fulfillment workflow</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showCreateShipment} onOpenChange={setShowCreateShipment}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Shipment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <CreateShipmentModal onSubmit={handleCreateShipment} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Overview Cards */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Shipments</CardTitle>
              <Package className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {dashboardData.overview.totalShipments}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Shipments</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {dashboardData.overview.pendingShipments}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Transit</CardTitle>
              <Truck className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {dashboardData.overview.inTransit}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Delivered This Month</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {dashboardData.overview.deliveredThisMonth}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Shipments Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="in-transit">In Transit</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search shipments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        {dashboardData && (
          <>
            <TabsContent value="pending">
              <ShipmentsList 
                shipments={dashboardData.shipments.pending}
                onUpdateStatus={handleUpdateStatus}
                onSlackNotify={handleSendSlackNotification}
                onView={setSelectedShipment}
                searchTerm={searchTerm}
                showActions
              />
            </TabsContent>

            <TabsContent value="processing">
              <ShipmentsList 
                shipments={dashboardData.shipments.processing}
                onUpdateStatus={handleUpdateStatus}
                onSlackNotify={handleSendSlackNotification}
                onView={setSelectedShipment}
                searchTerm={searchTerm}
                showActions
              />
            </TabsContent>

            <TabsContent value="in-transit">
              <ShipmentsList 
                shipments={dashboardData.shipments.inTransit}
                onUpdateStatus={handleUpdateStatus}
                onSlackNotify={handleSendSlackNotification}
                onView={setSelectedShipment}
                searchTerm={searchTerm}
                showTracking
              />
            </TabsContent>

            <TabsContent value="recent">
              <ShipmentsList 
                shipments={dashboardData.shipments.recent}
                onUpdateStatus={handleUpdateStatus}
                onSlackNotify={handleSendSlackNotification}
                onView={setSelectedShipment}
                searchTerm={searchTerm}
                readonly
              />
            </TabsContent>

            <TabsContent value="analytics">
              <ShipmentAnalytics analytics={dashboardData.analytics} />
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Shipment Details Modal */}
      {selectedShipment && (
        <Dialog open={!!selectedShipment} onOpenChange={() => setSelectedShipment(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <ShipmentDetailsModal 
              shipment={selectedShipment} 
              onUpdateStatus={handleUpdateStatus}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Helper functions
function getStatusBadge(status: UgcShipment['status']) {
  const variants = {
    pending: 'secondary',
    processing: 'default',
    packed: 'default',
    shipped: 'default',
    in_transit: 'default',
    delivered: 'default',
    returned: 'destructive',
    cancelled: 'outline',
  } as const;

  const colors = {
    pending: 'bg-gray-100 text-gray-800',
    processing: 'bg-blue-100 text-blue-800',
    packed: 'bg-purple-100 text-purple-800',
    shipped: 'bg-orange-100 text-orange-800',
    in_transit: 'bg-yellow-100 text-yellow-800',
    delivered: 'bg-green-100 text-green-800',
    returned: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };

  return (
    <Badge variant={variants[status]} className={colors[status]}>
      {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
    </Badge>
  );
}

function getPriorityBadge(priority: UgcShipment['priority']) {
  const colors = {
    low: 'bg-gray-100 text-gray-800',
    standard: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800',
  };

  return (
    <Badge className={colors[priority]}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </Badge>
  );
}

// Shipments List Component
interface ShipmentsListProps {
  shipments: UgcShipment[];
  onUpdateStatus: (id: string, status: UgcShipment['status'], trackingNumber?: string) => void;
  onSlackNotify: (id: string) => void;
  onView: (shipment: UgcShipment) => void;
  searchTerm: string;
  showActions?: boolean;
  showTracking?: boolean;
  readonly?: boolean;
}

function ShipmentsList({ 
  shipments, 
  onUpdateStatus, 
  onSlackNotify, 
  onView,
  searchTerm, 
  showActions = false,
  showTracking = false,
  readonly = false 
}: ShipmentsListProps) {
  const filteredShipments = shipments.filter(shipment =>
    shipment.creator_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shipment.creator_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shipment.shipment_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shipment.tracking_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (filteredShipments.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="text-gray-500">No shipments found</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {filteredShipments.map((shipment) => (
        <Card key={shipment.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Package className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="font-medium">{shipment.shipment_title}</div>
                  <div className="text-sm text-gray-600">{shipment.creator_name}</div>
                  <div className="text-sm text-gray-500">{shipment.creator_email}</div>
                  <div className="text-sm text-gray-500">
                    {shipment.products.length} product(s) • {shipment.shipping_address.city}, {shipment.shipping_address.state}
                  </div>
                  {shipment.tracking_number && (
                    <div className="text-sm text-blue-600 font-mono">
                      Tracking: {shipment.tracking_number}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="flex gap-2 mb-1">
                    {getStatusBadge(shipment.status)}
                    {getPriorityBadge(shipment.priority)}
                  </div>
                  {shipment.carrier && (
                    <div className="text-sm text-gray-600">
                      {shipment.carrier} • {shipment.shipping_method}
                    </div>
                  )}
                  {shipment.estimated_delivery && (
                    <div className="text-sm text-gray-500">
                      ETA: {new Date(shipment.estimated_delivery).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onView(shipment)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    
                    {shipment.tracking_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(shipment.tracking_url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}

                    {!readonly && !shipment.slack_notification_sent && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onSlackNotify(shipment.id)}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    )}

                    {!readonly && showActions && shipment.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => onUpdateStatus(shipment.id, 'processing')}
                      >
                        Process
                      </Button>
                    )}

                    {!readonly && showActions && shipment.status === 'processing' && (
                      <Button
                        size="sm"
                        onClick={() => onUpdateStatus(shipment.id, 'packed')}
                      >
                        Mark Packed
                      </Button>
                    )}

                    {!readonly && showTracking && shipment.status === 'shipped' && (
                      <Button
                        size="sm"
                        onClick={() => onUpdateStatus(shipment.id, 'delivered')}
                      >
                        Mark Delivered
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Create Shipment Modal Component
function CreateShipmentModal({ onSubmit }: { onSubmit: (data: CreateShipmentForm) => void }) {
  const [formData, setFormData] = useState<CreateShipmentForm>({
    creator_id: '',
    shipment_title: '',
    products: [],
    shipping_address: {
      name: '',
      address_line1: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'US',
    },
    priority: 'standard',
  });

  const [currentProduct, setCurrentProduct] = useState<ShipmentProduct>({
    id: '',
    name: '',
    quantity: 1,
  });

  const handleAddProduct = () => {
    if (currentProduct.name) {
      setFormData(prev => ({
        ...prev,
        products: [...prev.products, { ...currentProduct, id: Date.now().toString() }]
      }));
      setCurrentProduct({ id: '', name: '', quantity: 1 });
    }
  };

  const handleRemoveProduct = (productId: string) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.filter(p => p.id !== productId)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Create New Shipment</DialogTitle>
        <DialogDescription>
          Create a new shipment for a creator with products and shipping details.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div>
          <Label htmlFor="creator">Creator</Label>
          <Select onValueChange={(value) => setFormData(prev => ({ ...prev, creator_id: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select creator" />
            </SelectTrigger>
            <SelectContent>
              {/* This would be populated with actual creators */}
              <SelectItem value="creator1">Creator 1</SelectItem>
              <SelectItem value="creator2">Creator 2</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="title">Shipment Title</Label>
          <Input
            value={formData.shipment_title}
            onChange={(e) => setFormData(prev => ({ ...prev, shipment_title: e.target.value }))}
            placeholder="Enter shipment title"
            required
          />
        </div>

        <div>
          <Label htmlFor="priority">Priority</Label>
          <Select 
            value={formData.priority}
            onValueChange={(value: CreateShipmentForm['priority']) => 
              setFormData(prev => ({ ...prev, priority: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Products Section */}
        <div className="space-y-4">
          <Label>Products</Label>
          
          {/* Add Product Form */}
          <div className="flex gap-2">
            <Input
              placeholder="Product name"
              value={currentProduct.name}
              onChange={(e) => setCurrentProduct(prev => ({ ...prev, name: e.target.value }))}
              className="flex-1"
            />
            <Input
              type="number"
              placeholder="Qty"
              value={currentProduct.quantity}
              onChange={(e) => setCurrentProduct(prev => ({ ...prev, quantity: parseInt(e.target.value) }))}
              className="w-20"
            />
            <Button type="button" onClick={handleAddProduct}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Products List */}
          {formData.products.length > 0 && (
            <div className="space-y-2">
              {formData.products.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span>{product.name} (Qty: {product.quantity})</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleRemoveProduct(product.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Shipping Address Section */}
        <div className="space-y-4">
          <Label>Shipping Address</Label>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                value={formData.shipping_address.name}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  shipping_address: { ...prev.shipping_address, name: e.target.value }
                }))}
                required
              />
            </div>
            
            <div className="col-span-2">
              <Label htmlFor="address1">Address Line 1</Label>
              <Input
                value={formData.shipping_address.address_line1}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  shipping_address: { ...prev.shipping_address, address_line1: e.target.value }
                }))}
                required
              />
            </div>
            
            <div className="col-span-2">
              <Label htmlFor="address2">Address Line 2 (Optional)</Label>
              <Input
                value={formData.shipping_address.address_line2 || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  shipping_address: { ...prev.shipping_address, address_line2: e.target.value }
                }))}
              />
            </div>
            
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                value={formData.shipping_address.city}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  shipping_address: { ...prev.shipping_address, city: e.target.value }
                }))}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="state">State</Label>
              <Input
                value={formData.shipping_address.state}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  shipping_address: { ...prev.shipping_address, state: e.target.value }
                }))}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="postal_code">Postal Code</Label>
              <Input
                value={formData.shipping_address.postal_code}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  shipping_address: { ...prev.shipping_address, postal_code: e.target.value }
                }))}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="country">Country</Label>
              <Select 
                value={formData.shipping_address.country}
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  shipping_address: { ...prev.shipping_address, country: value }
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="CA">Canada</SelectItem>
                  <SelectItem value="GB">United Kingdom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="instructions">Special Instructions (Optional)</Label>
          <Textarea
            placeholder="Any special shipping instructions..."
            onChange={(e) => setFormData(prev => ({ ...prev, special_instructions: e.target.value }))}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline">Cancel</Button>
        <Button type="submit">Create Shipment</Button>
      </div>
    </form>
  );
}

// Shipment Details Modal Component
function ShipmentDetailsModal({ 
  shipment, 
  onUpdateStatus 
}: { 
  shipment: UgcShipment;
  onUpdateStatus: (id: string, status: UgcShipment['status'], trackingNumber?: string) => void;
}) {
  const [trackingNumber, setTrackingNumber] = useState(shipment.tracking_number || '');

  const handleStatusUpdate = (status: UgcShipment['status']) => {
    onUpdateStatus(shipment.id, status, trackingNumber);
  };

  return (
    <div className="space-y-6">
      <DialogHeader>
        <DialogTitle>{shipment.shipment_title}</DialogTitle>
        <DialogDescription>
          Shipment details and tracking information
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Creator</Label>
          <div className="text-sm">{shipment.creator_name}</div>
          <div className="text-sm text-gray-500">{shipment.creator_email}</div>
        </div>
        <div>
          <Label>Status</Label>
          <div className="mt-1">{getStatusBadge(shipment.status)}</div>
        </div>
        <div>
          <Label>Priority</Label>
          <div className="mt-1">{getPriorityBadge(shipment.priority)}</div>
        </div>
        <div>
          <Label>Created</Label>
          <div className="text-sm">{new Date(shipment.created_at).toLocaleDateString()}</div>
        </div>
      </div>

      {/* Products */}
      <div>
        <Label>Products</Label>
        <div className="mt-2 space-y-2">
          {shipment.products.map((product, index) => (
            <div key={index} className="flex justify-between p-2 bg-gray-50 rounded">
              <span className="font-medium">{product.name}</span>
              <span>Qty: {product.quantity}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Shipping Address */}
      <div>
        <Label>Shipping Address</Label>
        <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
          <div className="font-medium">{shipment.shipping_address.name}</div>
          {shipment.shipping_address.company && (
            <div>{shipment.shipping_address.company}</div>
          )}
          <div>{shipment.shipping_address.address_line1}</div>
          {shipment.shipping_address.address_line2 && (
            <div>{shipment.shipping_address.address_line2}</div>
          )}
          <div>
            {shipment.shipping_address.city}, {shipment.shipping_address.state} {shipment.shipping_address.postal_code}
          </div>
          <div>{shipment.shipping_address.country}</div>
          {shipment.shipping_address.phone && (
            <div>Phone: {shipment.shipping_address.phone}</div>
          )}
        </div>
      </div>

      {/* Tracking Information */}
      <div>
        <Label>Tracking Information</Label>
        <div className="mt-2 space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Enter tracking number"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
            />
            <Button
              variant="outline"
              onClick={() => navigator.clipboard.writeText(trackingNumber)}
              disabled={!trackingNumber}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          {shipment.carrier && (
            <div className="text-sm text-gray-600">
              Carrier: {shipment.carrier} • Method: {shipment.shipping_method}
            </div>
          )}
          {shipment.tracking_url && (
            <Button
              variant="outline"
              onClick={() => window.open(shipment.tracking_url, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Track Package
            </Button>
          )}
        </div>
      </div>

      {/* Status Actions */}
      <div>
        <Label>Update Status</Label>
        <div className="mt-2 flex gap-2 flex-wrap">
          {shipment.status === 'pending' && (
            <Button size="sm" onClick={() => handleStatusUpdate('processing')}>
              Mark Processing
            </Button>
          )}
          {shipment.status === 'processing' && (
            <Button size="sm" onClick={() => handleStatusUpdate('packed')}>
              Mark Packed
            </Button>
          )}
          {shipment.status === 'packed' && (
            <Button size="sm" onClick={() => handleStatusUpdate('shipped')}>
              Mark Shipped
            </Button>
          )}
          {shipment.status === 'shipped' && (
            <Button size="sm" onClick={() => handleStatusUpdate('delivered')}>
              Mark Delivered
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => handleStatusUpdate('cancelled')}>
            Cancel Shipment
          </Button>
        </div>
      </div>

      {shipment.special_instructions && (
        <div>
          <Label>Special Instructions</Label>
          <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
            {shipment.special_instructions}
          </div>
        </div>
      )}
    </div>
  );
}

// Shipment Analytics Component
function ShipmentAnalytics({ analytics }: { analytics: ShipmentDashboardData['analytics'] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Monthly Shipping Costs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.shippingCosts.map((item, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm font-medium">{item.month}</span>
                <span className="text-sm">${item.cost.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Carrier Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.carrierPerformance.map((item, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm font-medium">{item.carrier}</span>
                <div className="text-right">
                  <div className="text-sm font-semibold">{item.deliveries} deliveries</div>
                  <div className="text-xs text-gray-500">Avg: {item.avgDays} days</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}