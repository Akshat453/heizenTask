import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { BillingController } from './billing.controller.js';
import { BillingQueryService } from './services/billing-query.service.js';
import { InvoiceCreationService } from './services/invoice-creation.service.js';
import { InvoiceLifecycleService } from './services/invoice-lifecycle.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [BillingController],
  providers: [
    BillingQueryService,
    InvoiceCreationService,
    InvoiceLifecycleService,
  ],
})
export class BillingModule {}
