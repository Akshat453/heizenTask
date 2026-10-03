import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

describe('KitchenController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/kitchen (GET) - fails without auth', () => {
    return request(app.getHttpServer())
      .get('/kitchen?date=2025-01-01')
      .expect(401);
  });

  it('/kitchen/prep-units/:id/start (POST) - fails without auth', () => {
    return request(app.getHttpServer())
      .post('/kitchen/prep-units/uuid/start')
      .expect(401);
  });
});
