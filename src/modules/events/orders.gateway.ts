import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@Injectable()
@WebSocketGateway({ cors: true })
export class OrdersGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('join')
  handleJoin(client: Socket, room: string) {
    client.join(room);
  }

  notifyKitchenNewItems(tableId: number, tableName: string) {
    this.server.to('kitchen').emit('kitchen:newItems', { tableId, tableName });
  }

  notifyKitchenItemsUpdated(tableId: number, tableName: string) {
    this.server
      .to('kitchen')
      .emit('kitchen:itemsUpdated', { tableId, tableName });
  }

  notifyWaiterItemReady(tableId: number) {
    this.server.to('waiters').emit('waiter:itemReady', { tableId });
  }

  notifyTableStatusChanged() {
    this.server.to('waiters').emit('waiter:tablesChanged');
  }
}
