import { DNextFunc, DRequest, DResponse } from '../../common/interfaces';

export type Middleware = (req: DRequest, res: DResponse, next: DNextFunc) => void;
