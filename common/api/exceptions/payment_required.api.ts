import { HttpStatus } from '../HttpStatus.api';
import { DefaultException } from './default_exception.api';

class PaymentRequiredException extends DefaultException {
  statusCode: number = HttpStatus.PAYMENT_REQUIRED;
  name: string = 'Payment Required';
}

export { PaymentRequiredException };
