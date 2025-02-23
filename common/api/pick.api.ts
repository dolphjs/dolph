/**
 * Creates an object composed of the picked object properties
 * -  const filter = pick(req.query, ['limit', 'page']); would get the limit and page properties from the query object.
 * filter would become an object:
 * - { limit:any, page:any }
 */
const pick = (object: Object, keys: string[]) => {
    return keys.reduce((obj, key) => {
        if (object && Object.prototype.hasOwnProperty.call(object, key)) {
            obj[key] = object[key];
        }
        return obj;
    }, {});
};
export { pick };
