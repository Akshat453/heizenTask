'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/api-client';

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [markingPaid, setMarkingPaid] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiRequest<any>(`/invoices/${id}`);
        setInvoice(data);
      } catch (e: any) {
        if (e.status === 404) {
          router.push('/billing');
          return;
        }
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, router]);

  const markAsPaid = async () => {
    setMarkingPaid(true);
    try {
      const updated = await apiRequest<any>(`/invoices/${id}/pay`, {
        method: 'POST',
      });
      setInvoice(updated);
      toast.success('Invoice marked as paid');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setMarkingPaid(false);
    }
  };

  if (loading) return <div>Loading invoice...</div>;
  if (!invoice) return <div>Invoice not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoice {invoice.invoiceNumber}</h1>
          <p className="text-muted-foreground mt-2">
            Generated on {new Date(invoice.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={invoice.status === 'PAID' ? 'default' : 'secondary'} className="text-sm px-3 py-1">
            {invoice.status}
          </Badge>
          {invoice.status === 'UNPAID' && (
            <Button onClick={markAsPaid} disabled={markingPaid}>
              {markingPaid ? 'Processing...' : 'Mark as Paid'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Company Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="font-semibold text-lg">{invoice.company.name}</div>
              {invoice.company.billingAddress && (
                <div className="text-muted-foreground whitespace-pre-line">
                  {invoice.company.billingAddress}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Amount</span>
                <span className="font-bold text-xl">{formatCurrency(invoice.totalCents)}</span>
              </div>
              {invoice.paidAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Paid On</span>
                  <span>{new Date(invoice.paidAt).toLocaleString()}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Orders Included</CardTitle>
          <CardDescription>
            {invoice.orders.length} order(s) in this invoice
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead className="text-right">Billable Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.orders.map((invOrder: any) => (
                <TableRow key={invOrder.id}>
                  <TableCell className="font-medium">{invOrder.order.orderNumber}</TableCell>
                  <TableCell>{invOrder.order.employee.name}</TableCell>
                  <TableCell>{new Date(invOrder.order.deliveryDate).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">{formatCurrency(invOrder.amountCents)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
