export class MemDB<T> {
    data: Record<string, T>;

    constructor() {
        this.data = {};
    }

    /**
     * Adds a new key-value pair to the database.
     * If the key is not a string, it will be converted to a string using JSON.stringify.
     */
    add(key: string, value: T) {
        if (this.get(key)) throw new Error('cannot add new value because `key` already exists. ');
        this.data[key] = value;
    }

    /**
     * Get a value from the database using the key.
     */
    get(key: string) {
        return this.data[key];
    }

    /**
     * Remove data from the database.
     * @returns the data if found, otherwise throws an error.
     */
    remove(key: string) {
        if (!(key in this.data)) return undefined;

        const data = this.data[key];
        delete this.data[key];
        return data;
    }

    /**
     * Checks if data exists in the database then returns it.
     */
    has(key: string) {
        return key in this.data;
    }

    /**
     * Returns all the keys in the database.
     */
    getAllKeys() {
        return Object.keys(this.data);
    }

    /**
     * Returns all the values in the database.
     */
    getAllValues() {
        return Object.values(this.data);
    }

    /**
     * Clears the database.
     */
    empty() {
        this.data = {};
    }
}
