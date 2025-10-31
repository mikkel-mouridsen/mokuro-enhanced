import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { ProgressUpdate } from '../queue/queue.service';

@WebSocketGateway({
  cors: {
    origin: '*', // In production, configure this to your frontend domain
    credentials: true,
  },
  namespace: '/progress',
})
export class ProgressGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ProgressGateway.name);

  afterInit(server: Server) {
    this.logger.log('Progress WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Listen to progress events and broadcast to all connected clients
   */
  @OnEvent('mokuro.progress')
  handleProgressUpdate(update: ProgressUpdate) {
    this.logger.debug(
      `Broadcasting progress update: ${update.jobId} - ${update.progress}% - ${update.message}`,
    );

    // Broadcast to all connected clients
    this.server.emit('processing.progress', update);
  }

  /**
   * Manually emit a progress update (for testing)
   */
  emitProgress(update: ProgressUpdate) {
    this.server.emit('processing.progress', update);
  }
}

