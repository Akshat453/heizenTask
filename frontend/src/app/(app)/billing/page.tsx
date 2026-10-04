'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
import { describeError } from '@/lib/api-client';
import { billingApi, type InvoiceSummary } from '@/lib/api';

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export default function BillingPage() {
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    billingApi
      .listInvoices()
      .then((res) => setInvoices(res.data))
      .catch((e: unknown) => setError(describeError(e, 'Failed to load invoices')))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8">Loading invoices...</div>;
  if (error) return <div className="p-8 text-destructive">{error}</div>;

  return (
    <div className="space-y-6 p-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing & Invoices</h1>
        <p className="text-muted-foreground mt-2">
          View all generated invoices across all companies.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Date Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    No invoices generated yet.
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                    <TableCell>{inv.company.name}</TableCell>
                    <TableCell>{new Date(inv.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={inv.status === 'PAID' ? 'default' : 'secondary'}>
                        {inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(inv.totalCents)}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/billing/invoices/${inv.id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                        View Details
                      </Link>
                    </TableCell>
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
