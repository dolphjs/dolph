import 'reflect-metadata';
import { Container } from 'typedi';
import { logger } from '../../utilities';

type injectedServices = {
  service: string;
  value: any;
};

export const GlobalInjection = (service: string, value: any) => {
  Container.set(service, value);
};

export const getInjectedService = (service: string) => {
  return Container.get(service);
};

const injectGlobalServices = (services: injectedServices[]) => {
  services.forEach((service) => {
    try {
      Container.set(service.service, service.value);
    } catch {
      logger.error(`Cannot inject service: ${service.service}`);
    }
  });
};

export class GlobalInjector {
  constructor(services?: injectedServices[]) {
    if (services) {
      injectGlobalServices(services);
    }
  }

  register(service: string, value: any) {
    injectGlobalServices([{ service, value }]);
  }

  get(service: string) {
    return getInjectedService(service);
  }
}
