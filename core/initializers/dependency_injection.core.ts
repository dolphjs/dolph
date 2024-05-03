import 'reflect-metadata';
import { Container } from 'typedi';

export const GlobalInjection = (service: string, value: any) => {
  Container.set(service, value);
};

export const getInjectedService = (service: string) => {
  return Container.get(service);
};
