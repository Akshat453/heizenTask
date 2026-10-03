import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryProofService } from './delivery-proof.service.js';

describe('DeliveryProofService', () => {
  let service: DeliveryProofService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeliveryProofService],
    }).compile();

    service = module.get<DeliveryProofService>(DeliveryProofService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
