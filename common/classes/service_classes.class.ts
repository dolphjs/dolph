/**
 * Types of dolph srvices: upperlevel and lowerlevel.
 * UpperLevel classes are used to interact with controllers while lowerlevel are used for interactions with one another
 */

/**
 * "DolphServiceHandler" takes a string generic
 *
 * - `name` of the service which gets used by the controller
 *
 * - `schema` takes the default database entitiy or schema to be used in this service
 */
abstract class DolphServiceHandler<T extends string> {
  // sets the type of dolph service handler
  public name: string;
  protected schema: any;
  constructor(name: T) {
    this.name = name;
  }
}

export { DolphServiceHandler };
