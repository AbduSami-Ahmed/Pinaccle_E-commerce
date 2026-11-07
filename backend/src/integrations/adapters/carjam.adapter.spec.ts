import { CarJamAdapter } from './carjam.adapter';
import { VEHICLE_FITMENT_DISCLAIMER } from '@pinnacle/contracts';

describe('CarJamAdapter', () => {
  let adapter: CarJamAdapter;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    adapter = new CarJamAdapter();
    originalFetch = global.fetch;
    delete process.env['CARJAM_API_KEY'];
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env['CARJAM_API_KEY'];
  });

  it('declares authentic provider identity and capabilities', () => {
    expect(adapter.providerKey).toBe('CARJAM');
    expect(adapter.displayName).toBe('CarJam Vehicle Data NZ');
    expect(adapter.isMock).toBe(false);
    expect(adapter.capabilities).toContain('VEHICLE_FITMENT_QUERY');
  });

  describe('validateCredentials', () => {
    it('approves valid commercial API key', async () => {
      const valid = await adapter.validateCredentials({ apiKey: 'carjam_live_sec_key_12345' });
      expect(valid).toBe(true);
    });

    it('rejects missing or empty credentials', async () => {
      expect(await adapter.validateCredentials({})).toBe(false);
      expect(await adapter.validateCredentials({ apiKey: 'short' })).toBe(false);
    });
  });

  describe('Access Verification & Blocker Protection', () => {
    it('blocks query and executes zero network requests when credentials are not configured', async () => {
      const fetchSpy = jest.fn();
      global.fetch = fetchSpy;

      const res = await adapter.lookupVehicle({ plate: 'HYP360' });

      // Verifies rule: If access is missing, implement no live calls & report exact blocker
      expect(res.success).toBe(false);
      expect(res.isBlocked).toBe(true);
      expect(res.blockerReason).toContain('Missing CarJam API credentials');
      expect(res.disclaimer).toBe(VEHICLE_FITMENT_DISCLAIMER);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('Live Network Call & Schema Normalization', () => {
    const validCredentials = { apiKey: 'carjam_valid_commercial_key_999' };

    it('successfully queries CarJam endpoint and normalizes fields into canonical vehicle model', async () => {
      const mockCarJamResponse = {
        make: 'TOYOTA',
        model: 'RAV4',
        submodel: 'GXL 2.5P HYBRID AWD',
        year_of_manufacture: 2021,
        vin: 'JTMK43FV50D192834',
        chassis: 'AXAH54',
        engine_no: 'A25A-X98765',
        cc_rating: 2487,
        fuel_type: 'PETROL / ELECTRIC',
        body_style: 'STATION WAGON',
        transmission_type: 'CONTINUOUSLY VARIABLE TRANSMISSION',
        main_colour: 'SILVER',
        assembly_type: 'Imported Built-Up',
        country_of_origin: 'Japan',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockCarJamResponse,
      });

      const res = await adapter.lookupVehicle({ plate: 'HYP360' }, validCredentials);

      expect(res.success).toBe(true);
      expect(res.found).toBe(true);
      expect(res.data?.make).toBe('Toyota');
      expect(res.data?.model).toBe('RAV4');
      expect(res.data?.submodel).toBe('GXL 2.5P HYBRID AWD');
      expect(res.data?.year).toBe(2021);
      expect(res.data?.chassisCode).toBe('AXAH54');
      expect(res.data?.ccRating).toBe(2487);
      expect(res.data?.fuelType).toBe('Petrol / Electric');
      expect(res.data?.bodyType).toBe('Station Wagon');
      expect(res.data?.plate).toBe('HYP360');
      expect(res.data?.vin).toBe('JTMK43FV50D192834');
      expect(res.disclaimer).toBe(VEHICLE_FITMENT_DISCLAIMER);
      expect(res.sourceAttribution).toContain('CarJam NZ Transport Agency');

      // Verify request parameters
      const calledUrl = new URL((global.fetch as jest.Mock).mock.calls[0][0]);
      expect(calledUrl.searchParams.get('key')).toBe('carjam_valid_commercial_key_999');
      expect(calledUrl.searchParams.get('plate')).toBe('HYP360');
      expect(calledUrl.searchParams.get('f')).toBe('json');
    });

    it('handles 404 Vehicle Not Found gracefully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const res = await adapter.lookupVehicle({ plate: 'UNKNOWN99' }, validCredentials);
      expect(res.success).toBe(true);
      expect(res.found).toBe(false);
      expect(res.disclaimer).toBe(VEHICLE_FITMENT_DISCLAIMER);
    });

    it('handles 401 Unauthorized by failing fast without retry', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Invalid key',
      });

      const res = await adapter.lookupVehicle({ plate: 'HYP360' }, validCredentials);
      expect(res.success).toBe(false);
      expect(res.isBlocked).toBe(true);
      expect(res.statusCode).toBe(401);
      expect(res.blockerReason).toContain('Invalid CarJam API credentials');
      expect(global.fetch).toHaveBeenCalledTimes(1); // No retries on 401
    });

    it('handles 429 Rate Limit with transient flag', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Headers({ 'Retry-After': '30' }),
      });

      const res = await adapter.lookupVehicle({ plate: 'HYP360' }, validCredentials);
      expect(res.success).toBe(false);
      expect(res.isTransient).toBe(true);
      expect(res.statusCode).toBe(429);
      expect(res.error).toContain('rate limit exceeded');
    });

    it('retries on 500 error before returning failure', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const res = await adapter.lookupVehicle({ plate: 'HYP360' }, validCredentials);
      expect(res.success).toBe(false);
      expect(res.isTransient).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });
});

