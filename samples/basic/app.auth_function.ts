import { IPayload } from '../../common';

export const authFunc = (payload: IPayload) => {
    console.log(payload);

    if (payload.info) {
        return false;
    }
    return true;
};
