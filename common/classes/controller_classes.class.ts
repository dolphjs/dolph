/**
 * serviceHandlers Array takes in an object which has a name for a key and the serviceHandler as value
 * Example: [{'userService': new UserService()<string>}]
 */

import { DolphServiceHandler } from './service_classes.class';

/**
 * ''DolphControllerHandler" takes a string generic.
 *
 * - The `serviceHandler` method takes an array of services and instantiates them.
 *
 * - The `getHandler` method takes the name of the service and returns the service who's name matches the name param.
 */
abstract class DolphControllerHandler<T extends string> {
  /**
   * an array of DolphServicehandlers which would be used by the controller
   * ```js
   *  serviceHandlers : DolphServiceHandler<string>[] = [new AppService()];
   * ```
   */
  abstract serviceHandlers: Array<DolphServiceHandler<T>>;
  /**
   * 
   * @param name takes the name of the service specified in the DolphServiceHandler
   * ```js
   *  abstract class DolphServiceHandler<T extends string> {

    public name: string;
    protected declare schema: any;
    constructor(name: T) {
      this.name = name;
    }
}
   * ````
   * @returns the service who's name matches the  name param
   */
  getHandler(name: string) {
    return this.serviceHandlers.find((handler) => handler.name === name);
  }
}

export { DolphControllerHandler };
/**
 * Example of use
 */

/**
 * serviceHandlers Array takes in an object which has a name for a key and the serviceHandler as value
 * Example: [{'userService': new UserService()<string>}]
 */

// import { DolphServiceHandler } from "./service_classes.class";

// abstract class DolphControllerHandler<T extends string>{
//     abstract path: string;
//     abstract serviceHandlers: Array<DolphServiceHandler<T>>
//     getHandler(name: string){
//         return this.serviceHandlers.find((handler)=> handler.name === name)
//     }
// }

// class NewO extends DolphServiceHandler<"services">{
//     getUser = ()=>{
//         console.log("It is working");
//     }
// }

// class NewH extends DolphControllerHandler<string>{
//     path: string = "/home";
//     serviceHandlers: DolphServiceHandler<string>[] = [new NewO("services")];

//     CreateUser = ()=>{
//         const service = this.getHandler("service")
//         if(service instanceof NewO){
//             service.getUser();
//         }
//     }
// }
