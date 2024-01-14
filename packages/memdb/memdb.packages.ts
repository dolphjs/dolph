export class MemDB {
  data: Object;
  constructor() {
    this.data = {};
  }

  /**
   * Adds a new key-value pair to the database
   */
  add(key: string, value: string) {
    this.data[key] = value;
  }

  /**
   * Get a value from the database using the key
   */
  get(key: string) {
    return this.data[key];
  }

  /**
   * Remove data from database
   * @returns the data if found
   */
  remove(key: string) {
    const data = this.data[key];
    if (!data) return null;
    delete this.data[key];
    return data;
  }

  /**
   * Checks if data exists in the database then returns it
   */
  has(key: string) {
    return key in this.data;
  }

  /**
   * Returns all the keys in the database
   */
  getAllKeys() {
    return Object.keys(this.data);
  }

  /**
   * Returns all the values in the database
   */
  getAllValues() {
    return Object.values(this.data);
  }

  /**
   * Clears the database
   */
  empty() {
    this.data = {};
  }
}
