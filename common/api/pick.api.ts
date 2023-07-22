import { pick as corePick } from '@dolphjs/core';

/**
 * Create an object composed of the picked object properties
 * -  const filter = pick(req.query, ['limit', 'page']); would get the limit and page properties from the query object.
 * filter would become an object:
 * - { limit:any, page:any }
 */
const pick = corePick;
export { pick };
