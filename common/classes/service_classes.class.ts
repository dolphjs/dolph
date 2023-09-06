/**
 * Types of dolph srvices: upperlevel and lowerlevel.
 * UpperLevel classes are used to interact with controllers while lowerlevel are used for interactions with one another
 */

/**
 * Dolph's service handler
 * - takes a string generic
 *
 * - `name`  accepts a unique name for the each service which is used behind the scenes by the controller handler
 *
 * @version 1.0.0
 */
abstract class DolphServiceHandler<T extends string> {
  public name: string;
  constructor(name: T) {
    this.name = name;
  }
}

export { DolphServiceHandler };
