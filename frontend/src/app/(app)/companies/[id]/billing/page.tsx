'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { describeError } from '@/lib/api-client';
import { billingApi, companiesApi, type Company, type UninvoicedOrder } from '@/lib/api';

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export default function CompanyBillingPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;
  
  const [orders, setOrders] = useState<UninvoicedOrder[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);

  useEffect(() => {
    Promise.all([companiesApi.get(companyId), billingApi.uninvoiced(companyId)])
      .then(([companyResponse, uninvoiced]) => {
        setCompany(companyResponse);
        setOrders(uninvoiced.data);
      })
      .catch((e: unknown) => toast.error(describeError(e)))
      .finally(() => setLoading(false));
  }, [companyId]);

  const toggleOrder = (id: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedOrderIds.length === orders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(orders.map(o => o.id));
    }
  };

  const selectedTotal = orders
    .filter(o => selectedOrderIds.includes(o.id))
    .reduce((sum, o) => sum + o.billableTotalCents, 0);

  const generateInvoice = async () => {
    if (selectedOrderIds.length === 0) return;
    
    setGenerating(true);
    try {
      const invoice = await billingApi.createInvoice(companyId, selectedOrderIds);

      toast.success('Invoice generated successfully');
      router.push(`/billing/invoices/${invoice.id}`);
    } catch (e: unknown) {
      toast.error(describeError(e));
      setGenerating(false);
    }
  };

  if (loading) return <div>Loading uninvoiced orders...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Generate Invoice</h1>
          <p className="text-muted-foreground mt-2">
            {company?.name ? `Uninvoiced orders for ${company.name}` : 'Select orders to include in the invoice'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Selected Total</div>
            <div className="text-2xl font-bold">{formatCurrency(selectedTotal)}</div>
          </div>
          <Button 
            onClick={generateInvoice} 
            disabled={selectedOrderIds.length === 0 || generating}
          >
            {generating ? 'Generating...' : 'Generate Invoice'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Billable Orders</CardTitle>
          <CardDescription>
            Orders that have been confirmed and delivered (or cancelled after confirmation) and have not yet been invoiced.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox 
                    checked={orders.length > 0 && selectedOrderIds.length === orders.length}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>Order #</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Billable Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No uninvoiced orders found for this company.
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id} className={selectedOrderIds.includes(order.id) ? "bg-muted/50" : ""}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedOrderIds.includes(order.id)}
                        onCheckedChange={() => toggleOrder(order.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{order.orderNumber}</TableCell>
                    <TableCell>{order.employee.name}</TableCell>
                    <TableCell>{new Date(order.deliveryDate).toLocaleDateString()}</TableCell>
                    <TableCell>{order.status}</TableCell>
                    <TableCell className="text-right">{formatCurrency(order.billableTotalCents)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
