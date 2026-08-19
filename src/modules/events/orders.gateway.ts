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

@Injectable()
@WebSocketGateway({ cors: true })
export class OrdersGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  constructor(private readonly usersService: UsersService) {}

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
    const session = (client.request as { session?: { passport?: { user?: number } } }).session;
    const userId = session?.passport?.user;
    const user = userId ? await this.usersService.findById(userId) : null;
    const isAllowedRole =
      user?.role === 'admin' ||
      (payload.role === 'kitchen' && user?.role === 'kitchen') ||
      (payload.role === 'waiters' && user?.role === 'waiter');
    if (!user || user.barId !== payload.barId || !isAllowedRole) {
      client.disconnect();
      return;
    }
    client.join(this.room(payload.barId, payload.role));
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
