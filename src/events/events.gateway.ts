import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.WEB_ORIGIN ?? true,
  },
  path: '/socket.io',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwtService: JwtService) {}

  handleConnection(client: {
    handshake: { auth?: { token?: string }; query?: { token?: string } };
    join: (room: string) => void;
    disconnect: () => void;
  }) {
    const token =
      (client.handshake?.auth?.token as string) ||
      (client.handshake?.query?.token as string);
    if (!token) {
      client.disconnect();
      return;
    }
    try {
      const payload = this.jwtService.verify<{ sub: string }>(token);
      const userId = payload?.sub;
      if (!userId) {
        client.disconnect();
        return;
      }
      client.join(`user:${userId}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect() {}

  /**
   * Emite evento para todas as conexões de um usuário (ex.: web + mobile).
   */
  emitToUser(userId: string, event: string, payload: unknown) {
    this.server?.to(`user:${userId}`).emit(event, payload);
  }
}
