import { Module } from '@nestjs/common';
import { AllergensController, DietaryTagsController, KitchenStationsController, PackagingTypesController, PortionSizesController } from './reference-data.controller.js';
import { ReferenceDataService } from './reference-data.service.js';

@Module({
  controllers: [AllergensController, DietaryTagsController, KitchenStationsController, PortionSizesController, PackagingTypesController],
  providers: [ReferenceDataService],
  exports: [ReferenceDataService],
})
export class ReferenceDataModule {}
