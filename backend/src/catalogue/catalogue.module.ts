import { Module } from '@nestjs/common';
import { CatalogueService } from './catalogue.service.js';
import { DishesController, OptionsController } from './catalogue.controller.js';

@Module({ controllers: [DishesController, OptionsController], providers: [CatalogueService], exports: [CatalogueService] })
export class CatalogueModule {}
