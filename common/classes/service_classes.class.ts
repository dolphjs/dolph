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
 * - `schema` takes the default database entitiy or schema to be used in this service
 */
abstract class DolphServiceHandler<T extends string> {
  public name: string;
  protected declare schema: any;
  constructor(name: T) {
    this.name = name;
  }
}

export { DolphServiceHandler };
