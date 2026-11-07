import { MockVehicleAdapter } from './mock-vehicle.adapter';
import { VEHICLE_FITMENT_DISCLAIMER } from '@pinnacle/contracts';

describe('MockVehicleAdapter', () => {
  let adapter: MockVehicleAdapter;

  beforeEach(() => {
    adapter = new MockVehicleAdapter();
  });

  it('declares unmistakable test harness identity', () => {
    expect(adapter.providerKey).toBe('MOCK_VEHICLE_DATA');
    expect(adapter.displayName).toContain('[TEST HARNESS - DO NOT USE IN PRODUCTION]');
    expect(adapter.isMock).toBe(true);
    expect(adapter.capabilities).toContain('VEHICLE_FITMENT_QUERY');
  });

  it('validates mock credentials successfully', async () => {
    const valid = await adapter.validateCredentials({});
    expect(valid).toBe(true);
  });

  it('returns normalized vehicle data for known plate HYP360 (Toyota RAV4 Hybrid)', async () => {
    const res = await adapter.lookupVehicle({ plate: 'hyp360' });
    expect(res.success).toBe(true);
    expect(res.found).toBe(true);
    expect(res.data?.make).toBe('Toyota');
    expect(res.data?.model).toBe('RAV4');
    expect(res.data?.year).toBe(2021);
    expect(res.data?.chassisCode).toBe('AXAH54');
    expect(res.data?.fuelType).toContain('Hybrid');
    expect(res.disclaimer).toBe(VEHICLE_FITMENT_DISCLAIMER);
    expect(res.sourceAttribution).toContain('Mock Vehicle Data Provider');
  });

  it('returns normalized vehicle data for known plate NZT442 (Ford Ranger)', async () => {
    const res = await adapter.lookupVehicle({ plate: 'NZT442' });
    expect(res.success).toBe(true);
    expect(res.found).toBe(true);
    expect(res.data?.make).toBe('Ford');
    expect(res.data?.model).toBe('Ranger');
    expect(res.data?.chassisCode).toBe('PX3');
  });

  it('matches vehicle by VIN', async () => {
    const res = await adapter.lookupVehicle({ vin: 'JF1VAGH50J8271923' });
    expect(res.success).toBe(true);
    expect(res.found).toBe(true);
    expect(res.data?.make).toBe('Subaru');
    expect(res.data?.model).toBe('WRX');
    expect(res.data?.chassisCode).toBe('VA');
  });

  it('handles simulated rate limit with RATELIMIT plate', async () => {
    const res = await adapter.lookupVehicle({ plate: 'RATELIMIT' });
    expect(res.success).toBe(false);
    expect(res.isTransient).toBe(true);
    expect(res.statusCode).toBe(429);
    expect(res.error).toContain('Rate limit exceeded');
    expect(res.disclaimer).toBe(VEHICLE_FITMENT_DISCLAIMER);
  });

  it('handles simulated timeout with TIMEOUT plate', async () => {
    const res = await adapter.lookupVehicle({ plate: 'TIMEOUT' });
    expect(res.success).toBe(false);
    expect(res.isTransient).toBe(true);
    expect(res.statusCode).toBe(408);
    expect(res.error).toContain('timed out');
  });

  it('handles simulated server error with ERROR500 plate', async () => {
    const res = await adapter.lookupVehicle({ plate: 'ERROR500' });
    expect(res.success).toBe(false);
    expect(res.isTransient).toBe(true);
    expect(res.statusCode).toBe(500);
  });

  it('returns found: false for NOTFOUND plate', async () => {
    const res = await adapter.lookupVehicle({ plate: 'NOTFOUND' });
    expect(res.success).toBe(true);
    expect(res.found).toBe(false);
    expect(res.disclaimer).toBe(VEHICLE_FITMENT_DISCLAIMER);
  });

  it('generates deterministic vehicle for any 6-char alphanumeric test plate', async () => {
    const res = await adapter.lookupVehicle({ plate: 'ABC123' });
    expect(res.success).toBe(true);
    expect(res.found).toBe(true);
    expect(res.data?.make).toBe('Toyota');
    expect(res.data?.model).toBe('Corolla');
    expect(res.data?.plate).toBe('ABC123');
  });

  it('executes sync job for VEHICLE_LOOKUP', async () => {
    const syncRes = await adapter.executeSync({
      jobId: 'job-1',
      jobType: 'VEHICLE_LOOKUP',
      direction: 'INBOUND',
      payload: { plate: 'HYP360' },
      correlationId: 'corr-1',
    });
    expect(syncRes.success).toBe(true);
    expect(syncRes.data?.['make']).toBe('Toyota');
  });
});

