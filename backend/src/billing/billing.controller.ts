import { Controller, Get, Post, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { BillingQueryService } from './services/billing-query.service.js';
import { InvoiceCreationService } from './services/invoice-creation.service.js';
import { InvoiceLifecycleService } from './services/invoice-lifecycle.service.js';
import { CreateInvoiceDto, InvoiceQueryDto } from './dto/billing.dto.js';
import type { StaffUser } from '../generated/prisma/client.js';

@Controller()
export class BillingController {
  constructor(
    private readonly queryService: BillingQueryService,
    private readonly creationService: InvoiceCreationService,
    private readonly lifecycleService: InvoiceLifecycleService,
  ) {}

  @Get('companies/:id/billing/uninvoiced')
  @RequirePermissions('billing.read')
  getUninvoicedOrders(@Param('id', ParseUUIDPipe) companyId: string) {
    return this.queryService.getUninvoicedOrders(companyId);
  }

  @Get('invoices')
  @RequirePermissions('billing.read')
  listInvoices(@Query() query: InvoiceQueryDto) {
    return this.queryService.listInvoices(query);
  }

  @Get('invoices/:id')
  @RequirePermissions('billing.read')
  getInvoiceDetail(@Param('id', ParseUUIDPipe) invoiceId: string) {
    return this.queryService.getInvoiceDetail(invoiceId);
  }

  @Post('invoices')
  @RequirePermissions('billing.manage')
  createInvoice(
    @Body() dto: CreateInvoiceDto,
    @CurrentUser() user: StaffUser,
  ) {
    return this.creationService.createInvoice(dto, user.id);
  }

  @Post('invoices/:id/pay')
  @RequirePermissions('billing.manage')
  markPaid(
    @Param('id', ParseUUIDPipe) invoiceId: string,
    @CurrentUser() user: StaffUser,
  ) {
    return this.lifecycleService.markPaid(invoiceId, user.id);
  }
}
