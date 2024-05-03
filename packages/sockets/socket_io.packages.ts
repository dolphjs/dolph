import { Service } from 'typedi';
import { Server as SocketServer } from 'socket.io';
import { DSocket } from '../../common/interfaces/socket.interfaces';

@Service()
export class SocketService {
  private socketIo: SocketServer;

  constructor(params: DSocket) {
    this.socketIo = new SocketServer(params.server, params.options);
  }

  public getSocket(): SocketServer {
    return this.socketIo;
  }
}
