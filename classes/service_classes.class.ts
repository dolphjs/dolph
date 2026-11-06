/**
 * Types of dolph srvices: upperlevel and lowerlevel.
 * UpperLevel classes are used to interact with controllers while lowerlevel are used for interactions with one another
 */

import { Dolph } from '../common';

/**
 * Optional base class for services. Any class can be a service, so new code can
 * leave this out. Add `@DService()` when it has constructor dependencies.
 *
 * - `name` is optional, and the framework doesn't read it
 *
 * @version 2.0.0
 */
abstract class DolphServiceHandler<T extends Dolph = Dolph> {
    public name?: string;
    constructor(name?: T) {
        this.name = name;
    }
}

export { DolphServiceHandler };
