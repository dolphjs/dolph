import { Component } from '../../../../../decorators';
import { HealthController } from './health.controller';

@Component({ controllers: [HealthController], services: [] })
export class HealthComponent {}
