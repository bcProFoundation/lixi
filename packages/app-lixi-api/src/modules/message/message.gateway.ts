import { Message } from '@bcpros/lixi-models';
import { Injectable, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsResponse
} from '@nestjs/websockets';
import io, { Server, Socket } from 'socket.io';

// https://build.diligent.com/message-queues-in-database-transactions-f830718f4f12
// https://cloudificationzone.com/2021/08/13/notification-system-design/
// https://towardsdatascience.com/designing-notification-system-with-message-queues-c30a2c9046de

@Injectable()
@WebSocketGateway({ namespace: 'ws/message', cors: true })
export class MessageGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private logger: Logger = new Logger('MessageGateway');
  constructor() {}

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  afterInit(server: Server) {
    this.logger.log('Message gateway initialized');
  }

  @SubscribeMessage('subscribe')
  handleSubscription(@MessageBody() messageSessionId: string, @ConnectedSocket() client: Socket): WsResponse<string> {
    client.join(messageSessionId);

    return {
      event: 'subscribeMessageSession',
      data: client.id
    };
  }

  //Code below is for page owner listening for new PageMessageSession
  @SubscribeMessage('subscribePageMessageSession')
  handlePageMessageSessionSubscription(
    @MessageBody() pageMessageSessionId: string,
    @ConnectedSocket() client: Socket
  ): WsResponse<string> {
    client.join(pageMessageSessionId);

    return {
      event: 'subscribePageMessageSession',
      data: client.id
    };
  }

  publishMessage(room: string, message: any) {
    this.server.to(room).emit('publishMessage', message);
  }

  publishPageMessageSession(pageMessageSessionId: string, message: any) {
    this.server.to(pageMessageSessionId).emit('publishPageMessageSession', message);
  }
}
