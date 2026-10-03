import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { getSessionMiddleware } from '../../common/session-middleware';
import { UsersService } from '../users/services/users/users.service';
import { BillingService } from '../billing/billing.service';

@Injectable()
@WebSocketGateway({ cors: true })
export class OrdersGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  constructor(private readonly usersService: UsersService, private readonly billing: BillingService) {}

  afterInit(server: Server): void {
    server.use((socket, next) => {
      const sessionMiddleware = getSessionMiddleware();
      if (!sessionMiddleware) {
        next(new Error('Sesión no inicializada'));
        return;
      }
      sessionMiddleware(socket.request as never, {} as never, (error?: unknown) =>
        next(error as Error | undefined),
      );
    });
  }

  @SubscribeMessage('join')
  async handleJoin(client: Socket, payload: { barId: number; role: 'kitchen' | 'waiters' }) {
    if (!payload || !Number.isSafeInteger(payload.barId)) { client.disconnect(); return; }
    const session = (client.request as { session?: { passport?: { user?: number | { id: number; version: number } } } }).session;
    const identity = session?.passport?.user;
    const userId = typeof identity === 'number' ? identity : identity?.id;
    const version = typeof identity === 'number' ? 0 : identity?.version;
    const user = userId ? await this.usersService.findById(userId) : null;
    const isAllowedRole =
      user?.role === 'admin' ||
      (payload.role === 'kitchen' && user?.role === 'kitchen') ||
      (payload.role === 'waiters' && user?.role === 'waiter');
    if (!user || (user.sessionVersion ?? 0) !== version || user.barId !== payload.barId || !isAllowedRole) {
      client.disconnect();
      return;
    }
    try {
      if (!(await this.billing.access(user.barId)).allowed) { client.disconnect(); return; }
    } catch { client.disconnect(); return; }
    client.join(this.room(payload.barId, payload.role));
    if (!client.data.billingTimer) {
      const timer = setInterval(async () => {
        try {
          const current = await this.usersService.findById(user.id);
          if (!current || (current.sessionVersion ?? 0) !== version) { client.disconnect(); return; }
          if (!(await this.billing.access(user.barId)).allowed) client.disconnect();
        } catch { client.disconnect(); }
      }, 60000);
      timer.unref();
      client.data.billingTimer = timer;
      client.once('disconnect', () => clearInterval(timer));
    }
  }

  notifyKitchenNewItems(barId: number, tableId: number, tableName: string) {
    this.server.to(this.room(barId, 'kitchen')).emit('kitchen:newItems', { tableId, tableName });
  }

  notifyKitchenItemsUpdated(barId: number, tableId: number, tableName: string) {
    this.server
      .to(this.room(barId, 'kitchen'))
      .emit('kitchen:itemsUpdated', { tableId, tableName });
  }

  notifyWaiterItemReady(barId: number, tableId: number) {
    this.server.to(this.room(barId, 'waiters')).emit('waiter:itemReady', { tableId });
  }

  notifyTableStatusChanged(barId: number) {
    this.server.to(this.room(barId, 'waiters')).emit('waiter:tablesChanged');
  }

  private room(barId: number, role: 'kitchen' | 'waiters'): string {
    return `bar:${barId}:${role}`;
  }
}
