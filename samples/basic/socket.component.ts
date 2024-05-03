import { Socket } from '../../decorators';
import { SocketComponent } from '../../packages';
import { AnotherEventService } from './another_event.service';
import { EventService } from './event.service';
import { TestEventService } from './test_event_service_dep.service';

@Socket({ services: [TestEventService], socketServices: [EventService, AnotherEventService] })
export class EventsComponent extends SocketComponent {}
