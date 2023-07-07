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

  @SubscribeMessage('subscribeMessageSession')
  handleSubscriptionToMessageSession(
    @MessageBody() messageSessionId: string,
    @ConnectedSocket() client: Socket
  ): WsResponse<string> {
    client.join(messageSessionId);
    console.log('🚀 ~ file: message.gateway.ts:47 ~ MessageGateway ~ messageSessionId:', messageSessionId);

    return {
      event: 'subscribeMessageSession',
      data: client.id
    };
  }

  //Code below is for page owner listening for new PageMessageSession
  @SubscribeMessage('subscribePageChannel')
  handlePageMessageSessionSubscription(
    @MessageBody() pageMessageSessionId: string,
    @ConnectedSocket() client: Socket
  ): WsResponse<string> {
    client.join(pageMessageSessionId);
    console.log('🚀 ~ file: message.gateway.ts:62 ~ MessageGateway ~ subscribePageChannel:', pageMessageSessionId);

    return {
      event: 'subscribePageChannel',
      data: client.id
    };
  }

  publishMessage(messageSessionId: string, message: any) {
    this.server.to(messageSessionId).emit('publishMessage', message);
  }

  publishPageChannel(pageChannelId: string, message: any) {
    this.server.to(pageChannelId).emit('publishPageChannel', message);
  }
}
