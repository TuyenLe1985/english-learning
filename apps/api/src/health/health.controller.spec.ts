import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('check() returns status ok', () => {
    const result = controller.check();
    expect(result.status).toEqual('ok');
    expect(typeof result.timestamp).toBe('string');
  });

  it('check() timestamp is a valid ISO string', () => {
    const result = controller.check();
    const date = new Date(result.timestamp);
    expect(date.toISOString()).toBe(result.timestamp);
  });
});
