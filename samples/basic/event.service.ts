import { DolphSocketServiceHandler } from '../../classes';
import { Dolph } from '../../common';
import { TestEventService } from './test_event_service_dep.service';

export class EventService extends DolphSocketServiceHandler<Dolph> {
  constructor() {
    super();
    this.socketService;
    this.handleEvents();
  }

  private TestEventService: TestEventService;

  private handleEvents() {
    this.socket.on('connection', (socket) => {
      socket.emit('connected', 'connection successful');
      socket.on('new-user', (message) => {
        this.socket.emit('new-user', message);
      });
      socket.on('data', (data) => {
        this.TestEventService.logData(data);
        socket.emit('new-user', socket.id);
      });
    });
  }
}
