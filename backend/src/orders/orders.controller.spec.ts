import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { CustomerOrdersController } from './customer-orders.controller';
import { OrdersService } from './orders.service';
import { AuthenticatedUser } from '@pinnacle/contracts';

describe('Orders and CustomerOrders Controllers (Hardening & Ownership)', () => {
  let ordersController: OrdersController;
  let customerOrdersController: CustomerOrdersController;
  let mockOrdersService: any;

  const customerUserA: AuthenticatedUser = {
    sub: 'user-cust-a',
    email: 'customera@test.co.nz',
    isStaff: false,
    customerId: 'cust-uuid-a',
    permissions: ['orders:view:own', 'orders:cancel:own', 'returns:request:own'],
  };

  const userWithoutCustomerProfile: AuthenticatedUser = {
    sub: 'user-no-profile',
    email: 'noprofile@test.co.nz',
    isStaff: false,
    permissions: ['orders:view:own'],
  };

  const staffUser: AuthenticatedUser = {
    sub: 'staff-lead-1',
    email: 'staff@pinnacleparts.co.nz',
    isStaff: true,
    permissions: [
      'orders:view:all',
      'orders:status:update',
      'orders:fulfill:pick_pack',
      'orders:fulfill:dispatch',
      'orders:cancel:any',
    ],
  };

  beforeEach(async () => {
    mockOrdersService = {
      getCustomerOrders: jest.fn().mockResolvedValue({ data: [], meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 } }),
      getCustomerOrderDetail: jest.fn().mockResolvedValue({ id: 'ord-1', orderNumber: 'ORD-NZ-001', customerId: 'cust-uuid-a' }),
      requestCustomerCancellation: jest.fn().mockResolvedValue({ id: 'ord-1', orderStatus: 'CANCELLED' }),
      createReturnRequest: jest.fn().mockResolvedValue({ id: 'rma-1', status: 'PENDING_REVIEW' }),
      getOrders: jest.fn().mockResolvedValue({ data: [], meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 } }),
      getOrderById: jest.fn().mockResolvedValue({ id: 'ord-1', orderNumber: 'ORD-NZ-001' }),
      updateOrderStatus: jest.fn().mockResolvedValue({ id: 'ord-1', orderStatus: 'PROCESSING' }),
      pickPackOrder: jest.fn().mockResolvedValue({ id: 'ord-1', orderStatus: 'PACKED' }),
      dispatchCourierShipment: jest.fn().mockResolvedValue({ id: 'ord-1', orderStatus: 'SHIPPED' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController, CustomerOrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
      ],
    }).compile();

    ordersController = module.get<OrdersController>(OrdersController);
    customerOrdersController = module.get<CustomerOrdersController>(CustomerOrdersController);
  });

  describe('Customer Ownership Boundary Enforcement', () => {
    it('allows customer to view only their own orders via customerId', async () => {
      await customerOrdersController.getMyOrders(customerUserA);
      expect(mockOrdersService.getCustomerOrders).toHaveBeenCalledWith('cust-uuid-a', { page: 1, pageSize: 10 });
    });

    it('rejects customer without customer profile with 403 Forbidden', async () => {
      await expect(
        customerOrdersController.getMyOrders(userWithoutCustomerProfile),
      ).rejects.toThrow(ForbiddenException);
    });

    it('retrieves order detail bounded strictly to customer ownership', async () => {
      await customerOrdersController.getMyOrderDetail(customerUserA, 'ORD-NZ-001');
      expect(mockOrdersService.getCustomerOrderDetail).toHaveBeenCalledWith('cust-uuid-a', 'ORD-NZ-001');
    });

    it('rejects cancellation request with empty reason', async () => {
      await expect(
        customerOrdersController.requestCancellation(customerUserA, 'ORD-NZ-001', '  '),
      ).rejects.toThrow(BadRequestException);
    });

    it('submits return request bounded to customer ownership', async () => {
      await customerOrdersController.requestReturn(customerUserA, 'ORD-NZ-001', {
        orderId: 'ord-1',
        reason: 'PART_INCOMPATIBLE',
        notes: 'Does not fit vehicle chassis',
        items: [{ orderLineId: 'line-1', quantity: 1, conditionOnReturn: 'AS_NEW_UNFITTED' }],
      } as any);

      expect(mockOrdersService.createReturnRequest).toHaveBeenCalledWith(
        'cust-uuid-a',
        expect.objectContaining({ orderId: 'ord-1' }),
      );
    });
  });

  describe('Staff Orders Admin Controller', () => {
    it('allows staff with orders:view:all to query orders across all customers', async () => {
      await ordersController.getOrders({ page: '1', pageSize: '20' } as any, staffUser);
      expect(mockOrdersService.getOrders).toHaveBeenCalled();
    });

    it('records operatorId on fulfillment and status updates', async () => {
      await ordersController.pickPackOrder(
        'ord-1',
        {
          lineItemsPacked: [{ orderLineItemId: 'line-1', quantityPacked: 1 }],
        } as any,
        staffUser,
      );

      expect(mockOrdersService.pickPackOrder).toHaveBeenCalledWith('ord-1', expect.any(Object), 'staff-lead-1');
    });
  });
});
