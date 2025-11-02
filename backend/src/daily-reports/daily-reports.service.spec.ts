import { Test, TestingModule } from '@nestjs/testing';
import { DailyReportsService } from './daily-reports.service';

describe('DailyReportsService', () => {
  let service: DailyReportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DailyReportsService],
    }).compile();

    service = module.get<DailyReportsService>(DailyReportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
