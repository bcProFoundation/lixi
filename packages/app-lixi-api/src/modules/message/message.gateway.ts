import { Message, SessionAction } from '@bcpros/lixi-models';
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

  @SubscribeMessage('subscribePageMessageSession')
  handleSubscriptionToMessageSession(
    @MessageBody() pageMessageSessionId: string,
    @ConnectedSocket() client: Socket
  ): WsResponse<string> {
    //Check if already join a room
    const joinedRoom = Array.from(client.rooms).find(room => {
      return room === pageMessageSessionId;
    });

    if (!joinedRoom) {
      client.join(pageMessageSessionId);
      console.log('🚀 ~ file: message.gateway.ts:47 ~ MessageGateway ~ pageMessageSessionId:', pageMessageSessionId);

      return {
        event: 'subscribePageMessageSession',
        data: client.id
      };
    } else {
      return {
        event: '',
        data: client.id
      };
    }
  }

  //Code below is for page owner listening for new PageMessageSession
  @SubscribeMessage('subscribePageChannel')
  handlePageMessageSessionSubscription(
    @MessageBody() pageChannelId: string,
    @ConnectedSocket() client: Socket
  ): WsResponse<string> {
    //Check if already join a room
    const joinedRoom = Array.from(client.rooms).find(room => {
      return room === pageChannelId;
    });

    if (!joinedRoom) {
      client.join(pageChannelId);
      console.log('🚀 ~ file: message.gateway.ts:47 ~ MessageGateway ~ pageChannelId:', pageChannelId);

      return {
        event: 'pageChannelId',
        data: client.id
      };
    } else {
      return {
        event: '',
        data: client.id
      };
    }
  }

  publishMessage(pageMessageSessionId: string, message: any) {
    this.server.to(pageMessageSessionId).emit('publishMessage', message);
  }

  publishPageChannel(pageChannelId: string, message: any) {
    this.server.to(pageChannelId).emit('publishPageChannel', message);
  }

  publishSessionAction(pageMessageSessionId: string, message: SessionAction) {
    this.server.to(pageMessageSessionId).emit('sessionAction', message);
  }
}
