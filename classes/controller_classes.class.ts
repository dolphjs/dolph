/**
 * serviceHandlers Array takes in an object which has a name for a key and the serviceHandler as value
 * Example: [{'userService': new UserService()<string>}]
 */

import { Dolph } from '../common';
import { DolphServiceHandler } from './service_classes.class';

/**
 * `DolphControllerHandler` takes a string generic.
 *
 */
// Note: string generic would be useful in the future
abstract class DolphControllerHandler<T extends Dolph> {}

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
