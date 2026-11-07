import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService wraps the generated PrismaClient.
 * It is registered as a global module so every module can inject it
 * without re-importing PrismaModule.
 *
 * In unit tests, mock this service with jest.mock or provide a stub
 * via the NestJS testing utilities — never connect a live database in tests.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
