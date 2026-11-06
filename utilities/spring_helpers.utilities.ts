import 'reflect-metadata';
import { SHIELD_METADATA_KEY, UN_SHIELD_METADATA_KEY } from '../decorators/spring/meta_data_keys.decorators';
import { Middleware } from '../common';

export const getShieldMiddlewares = (targetClass: any): Middleware[] | undefined => {
    return Reflect.getMetadata(SHIELD_METADATA_KEY, targetClass.prototype);
};

export const getUnShieldMiddlewares = (targetMethod: any): Middleware[] | undefined => {
    return Reflect.getMetadata(UN_SHIELD_METADATA_KEY, targetMethod);
};

export const getFunctionNames = (arr: Function[]) => {
    return arr.map((fn) => fn.name);
};

/**
 * Works out which shields apply to a route after any `@UnShield`.
 *
 * Shields are matched by reference, never by source text: two guards from the
 * same factory (`requireRole('admin')`, `requireRole('user')`) have identical
 * source, so comparing text would remove both and open the route. Anything
 * unmatched is reported and leaves the route protected.
 */
export const resolveRouteShields = (
    shields: Middleware[],
    unshielded: Middleware[] | undefined,
): { active: Middleware[]; unmatched: Middleware[] } => {
    if (!unshielded) return { active: shields, unmatched: [] };
    if (unshielded.length === 0) return { active: [], unmatched: [] };

    return {
        active: shields.filter((shield) => !unshielded.includes(shield)),
        unmatched: unshielded.filter((middleware) => !shields.includes(middleware)),
    };
};
