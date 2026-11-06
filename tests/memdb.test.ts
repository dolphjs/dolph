import { MemDB } from '../packages';

describe('MemDB', () => {
    let db: MemDB<unknown>;

    beforeEach(() => {
        db = new MemDB();
    });

    it.each(['constructor', 'toString', '__proto__', 'hasOwnProperty'])('should not find %s until it is added', (key) => {
        expect(db.has(key)).toBe(false);
        expect(db.get(key)).toBeUndefined();
    });

    it('should store __proto__ as a plain key without touching any prototype', () => {
        db.add('__proto__', { polluted: true });

        expect(db.get('__proto__')).toEqual({ polluted: true });
        expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
    });

    it('should refuse to overwrite a falsy value', () => {
        db.add('count', 0);

        expect(() => db.add('count', 1)).toThrow('already exists');
    });

    it('should stay safe after being emptied', () => {
        db.add('a', 1);
        db.empty();

        expect(db.has('a')).toBe(false);
        expect(db.has('constructor')).toBe(false);
    });

    it('should remove keys', () => {
        db.add('a', 1);

        expect(db.remove('a')).toBe(1);
        expect(db.remove('a')).toBeUndefined();
    });
});
