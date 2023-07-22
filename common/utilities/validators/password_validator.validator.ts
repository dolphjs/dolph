import { DolphErrors } from '../../../constants';
import { passwordStrength } from '../../types';

const validatePassword = (level: passwordStrength, value: string, helpers: any) => {
  if ((level = 'basic')) {
    if (value.length < 6) {
      return helpers.message(DolphErrors.passwordShort(6));
    }
  } else if ((level = 'medium')) {
    if (value.length < 6) {
      return helpers.message(DolphErrors.passwordShort(6));
    }
    if (value.match(/\d/) || !value.match(/[a-zA-Z]/)) {
      return helpers.message(DolphErrors.passwordMustContain(1, 1));
    }
  } else if ((level = 'strong')) {
    if (value.length < 7) {
      return helpers.message(DolphErrors.passwordShort(7));
    }
    if (value.match(/\d/) || !value.match(/[a-zA-Z]/)) {
      return helpers.message(DolphErrors.passwordMustContain(1, 1));
    }
  }
  // implement for extra strong
};

export { validatePassword };
