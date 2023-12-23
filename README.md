Looking for the `dolphjs/core` repo? here it is: https://github.com/dolphjs/core 
Note: docs has not yet been updated to fit newest version, docs is only correct for version o.o.2-beta

# dolph.js

dolphjs is a typescript backend framework built to ease development time and shorten code while retaining simplicity.

dolphjs is built on the express.js framework and offers a wide range of classes, methods, functions and utility tools, from error handling middlewares to the best utiity loggers.

## dolph_config file

The most important file in your dolphjs codebase is the `dolph_config.yaml` file which seats at the root directory of your project. Without this file, on running your dolph server you'll receive an error. In this file, you can define different  fields which helps automate your application. An example of the contents of this file is show below: 

```yaml
database:
  mongo:
    url: mongodb://127.0.0.1:27017/dolphjs
    options:
      useNewUrlParser: true
  middlewares:
    cors:
      activate: true
      origin: '*'
      methods:
        - GET
        - POST
        - PUT
        - DELETE
 port: 3030
```

As of current, the `dolphjs_config` file only accepts this fields:

- **database** - this field should only be used if you want to connect to mongodb [support for other databases hasn't been added yet]. It takes an object of `mongo` as seen in the example above which also takes two objects as values, the `url` and `options` which do exactly what those fields do if using the `mongoose.connect` function manually. Dolphjs would detect this configuration on start and initialize the database as well as log info if successfully connected or not.

-  **middlewares** - this field currently takes two optional fields: `cors` and `xss`. If the *activate* field on both **cors** and **xss** is set to true, then this middlewares are initialized by dolphjs and the other fields the cors object can take include: 

  ```ts
    origin?: string | undefined;
    allowedHeaders?: string[] | undefined | null;
    maxAge?: number | undefined;
    exposedHeaders?: string[] | null | undefined;
    credentials?: boolean | undefined;
    preflightContinue?: boolean | undefined;
    optionsSuccessStatus: number | undefined;
  ```

- **port** - this is way you pass the port you want to dolphjs to server on. By default, dolphjs uses the port `3030` .

***Note***: *all these are optional as they are alternative ways to initialize these in dolphjs by calling the appropriate functions which would all be discussed later in this docs. However, even if you don't use the `dolph_config.yaml` file to set your configurations, the absence of the file in your root directory would make the dolphjs engine to scream at you with errors. So it's better to leave it empty than not include it.* 

## Starting The Server

This is probably the easiest thing to do in dolphjs. It is as easy as this:

```ts
import { DolphFactory } from "@dolphjs/dolph"

const routes = [];
const middlewares = [];
const dolph = new DolphFactory(routes, middlewares);

dolph.start();

```

This 5 lines of code starts the dolphjs server, initializes middlewares and database (assuming you used the dolph_config.yaml file to setup configurations) and exposes the dolph engine which is of type `express`. 

## Routing

The `routes` options of the **DolphFactory** class takes an array of routes. An example would look like this:

```ts
import { Router } from "@dolphjs/core";

const router = Router();
const appRoutes = {
  path: "/",
  router,
};

const routes = [appRoutes];

const dolph = new DolphFactory(routes);
```

The sample code shown above shows how to setup your router in dolphjs but this method is not recommended, despite not having any performance set-backs but because it doesn't let you enjoy the full power of dolphjs. Here is how a router should look like to harness the power of dolphjs:

```ts
import { DolphRouteHandler } from '@dolphjs/dolph/classes';
import { AppController } from './app.controller';
import { Dolph } from '@dolphjs/dolph/common';

class AppRouter extends DolphRouteHandler<Dolph> {
  constructor() {
    super();
    this.initRoutes();
  }

  public readonly path: string = '/app';
  // where AppController is your controller class
  controller: AppController = new AppController();

  initRoutes() {
  }
}

const routes = [new AppRouter()]

const dolph = new DolphFactory(routes);
```

From the above code, you utilize the strengths of dolphjs and follow the code pattern enforced by dolphjs to enhance clean code, scalability and readability. Now that we have established this, you might be wandering how we'll use our controller in this code above to process requests and send response. Unlike in the former which can be done like this: 

```ts
const router = Router();

router.get("/app", (req:Drequest, res:DResponse) => {})
const appRoutes = {
  path: "/",
  router,
};
```

to use the later, we do it this way:

```ts
class AppRouter extends DolphRouteHandler<Dolph> {
  constructor() {
    super();
    this.initRoutes();
  }

  public readonly path: string = '/app';
  controller: AppController = new AppController();

  initRoutes() {
    this.router.get(`${this.path}`, (req:DRequest, res:DResponse) => {});
  }
}
```

or by using the controller class:

```ts
class AppRouter extends DolphRouteHandler<Dolph> {
  constructor() {
    super();
    this.initRoutes();
  }

  public readonly path: string = '/app';
  controller: AppController = new AppController();

  initRoutes() {
    this.router.get(`${this.path}`, this.controller.sendGreeting());
  }
}
```

Where `sendGreeting` is a method on the `AppController` class that acts as a handler.

## Controllers

We will illustrate the two ways of setting up controllers whereby the first can be used with the first way of setting up a router and the second for the second way of setting up a router.

### Using the first method (functional paradigm)

```ts
const { TryCatchAsyncFn, SuccessResponse } = require("@dolphjs/dolph/common");

export const sendGreeting = ((req, res) => {
  SuccessResponse({ res, msg: "Hey there !" });
});

```

With this method, it is just as you are using express.js but the second method let's you leverage the strengths of dolphjs. 

### Using the second method (Object oriented paradigm)

```ts
import { DolphControllerHandler } from '@dolphjs/dolph/classes';
import { Dolph, SuccessResponse, DRequest, DResponse } from '@dolphjs/dolph/common';

export class AppController extends DolphControllerHandler<Dolph> {
  constructor() {
    super();
  }
    
  public async sendGreeting(req: DRequest, res: DResponse){
    SuccessResponse({ res, msg: "Hey there !" });
  };
}
```

Currently, you are probably wondering why anyone would use the second over the first method but as you go deeper into the docs to see the kind of control and simplicity being offered by the second, you'll love it. Dolphjs offers more functionalities when using the OOP approach.

***Note***: *It is recommended to use OOP approach when working with a medium-scale or large-scale code bases and the functional approach for small projects* 

## Services

When working with a large code base, you'll most likely want to divide your code into reusable components called services which can be used for several things with the most likely being to distribute code written in controllers.

Here is what a service looks like:

```ts
import { DolphServiceHandler } from '@dolphjs/dolph/classes';
import { Dolph } from '@dolphjs/dolph/common';

export class UserService extends DolphServiceHandler<Dolph> {

  constructor() {
    super('userService');
  }
    
  public readonly newUser = async (userData: userDataDTO) => {
      return {newUser};
  }
}
```

## Manually Initializing Database

You might not want to make use of the `dolph_config.yaml` file to initialize your mongodb or you might want to use another database. Here's how to do that for mongodb and MySQL.

### mongodb 

dolphjs also offers easier ways to manually initialize mongodb database without the config file and these are shown below:

***autoInitMongo*** - 

```ts
import { autoInitMongo } from "@dolphjs/dolph/packages";

autoInitMongo({url: "mongodb://localhost:127017/dolphjs", options: {}});
```

This method is what is ran behind the scene when you configure mongodb in the config file.

***initMongo*** -

```ts
import { initMongo } from "@dolphjs/dolph/packages";

initMongo({url, options}).then(res => {
    console.log("MongoDb Running")
}).catch(e=> {
    console.error(e)
});
```

As you can see, this method requires you to call the `.then` & `.catch` to handle the promise but the former does this for you by calling this function and handling the promise.

### mysql

dolphjs also offers an easier way to manually initialize mysql database without the config file by using sequelize under the hood.

```ts
import { autoInitMysql, initMysql } from "@dolphjs/dolph/packages";

const mysql = initMySql('dolph', 'root', 'password', 'localhost');

autoInitMySql(mysql);
```

In case you don't want to use another ORM like prisma then avoid using this function but setup your configuration as you would do in an express application.

## Inject MySQL & MongoDB model In DolphServiceHandler

If you are using the dolphjs offered way (which is recommended) in configuring your MySQL or MongoDb database and the OOP approach then dolphjs provides a way for injecting models in your service handlers. Here is an example of a full application flow using using this :

```ts
// app.model.ts

import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  age: string;
  work: string;
  height: string;
}

const UserSchema = new Schema({
  name: String,
  email: String,
  age: Number,
  work: String,
  height: String,
});

export const userModel = mongoose.model<IUser>('User', UserSchema);

```



```ts
//app.schema.ts

import { INTEGER, STRING } from 'sequelize';
import { mysql } from './sqlDb';

export const User = mysql.define('user', {
  id: {
    type: INTEGER,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true,
  },
  username: {
    type: STRING,
    allowNull: false,
  },
  age: INTEGER,
});
```



```ts
// sqlDb.ts

import { initMySql } from '@dolphjs/dolph/packages';

export const mysql = initMySql('dolph', 'root', 'password', 'localhost');

```



```ts
//app.service.ts

import { InjectMongo, InjectMySQL } from '@dolphjs/dolph/decorators';
import { DolphServiceHandler } from '@dolphjs/dolph/classes';
import { IUser, userModel } from './app.model';
import { Model } from 'mongoose';
import { User } from './app.schema';
import { ModelStatic, Model as SqlModel } from 'sequelize';
import { Dolph } from '@dolphjs/dolph/common';

@InjectMongo('userModel', userModel)
@InjectMySQL('userMySqlModel', User)
export class AppService extends DolphServiceHandler<Dolph> {
  userModel!: Model<IUser>;
  userMySqlModel!: ModelStatic<SqlModel<any, any>>;

  constructor() {
    super('appService');
  }

  createUser = async (body: any) => {
    const data = await this.userModel.create(body);
    return data;
  };

  createSQLUser = async (body: { username: string; age: string }) => {
    return this.userMySqlModel.create(body);
  };
}
```

```ts
// app.controller.ts

import { DolphControllerHandler, DolphServiceHandler } from '@dolphjs/dolph/classes';
import { TryCatchAsyncDec, DRequest, DResponse } from '@dolphjs/dolph/common';
import { AppService } from './app.service';
import { BadRequestException, Dolph, SuccessResponse } from '@dolphjs/dolph/common';
import { InjectServiceHandler } from '@dolphjs/dolph/decorators';

@InjectServiceHandler([{ serviceHandler: AppService, serviceName: 'appService' }])
class ControllerService {
  appService!: AppService;
}

const controllerServices = new ControllerService();
export class AppController extends DolphControllerHandler<Dolph> {
  constructor() {
    super();
  }

  @TryCatchAsyncDec
  public async createUser(req: DRequest, res: DResponse) {
    const { body, file } = req;
    if (body.height < 1.7) throw new 
    BadRequestException('sorry, you are too short for this 	program');
    const data = await controllerServices.appService.createUser(body);
    SuccessResponse({ res, body: data });
  }

  @TryCatchAsyncDec
  public async createUserMysql(req: DRequest, res: DResponse) {
    const { username, age } = req.body;
    const result = await controllerServices.appService.createSQLUser({ username, age });
    SuccessResponse({ res, body: result });
  }
}

```

```ts
// app.router.ts

import { DolphRouteHandler } from '@dolphjs/dolph/classes';
import { AppController } from './app.controller';
import { Dolph } from '@dolphjs/dolph/common';

export class AppRouter extends DolphRouteHandler<Dolph> {
  constructor() {
    super();
    this.initRoutes();
  }

  public readonly path: string = '/app';
  controller: AppController = new AppController();

  initRoutes() {
    this.router.post(`${this.path}/user`, this.controller.createUser);
    this.router.post(`${this.path}/user-sql`, this.controller.createUserMysql);
  }
}
```



This is how a sample basic flow looks like. We'll discuss later on the foreign functions you see in the codes above like: **SuccessResponse**, **BadRequestException**, **InjectServiceHandler** and the rest.

## Decorators

Decorators are used to make things easier when building with typescript. There are a couple of decorators provided by dolphjs for specific use cases which would be discussed in details below:

- TryCatchAsyncDec - this decorator is used to wrap the method with try-catch and handles exceptions. It should be used as a top level decorator which means that if there are more than one decorator attached to a method, it should be the on top of the others. Here is an example:

  ```typescript
  @TryCatchAsyncDec
  @JWTAuthVerifyDec('random_secret')
  @MediaParser({ fieldname: 'upload', type: 'single', extensions: ['.png'] })
  ```

  there are three decorators abpve but it is placed on top of the three.

  The equivalent of this decorator in the javascript environment is the `TryCatchAsyncFn` which is called as a function which wraps the method as seen below:

  ```typescript
   register = TryCatchAsyncFn(async (req, res, next) => {
      const { username } = req.body;
      SuccessResponse({ res, body: username });
    });
  ```

- TryCatchDec - work like the `TryCatchAsyncDec` but unlike it, this decorator is used for synchronous code, it doesn't handle asynchronous code. The javascript equivalent can be seen below:

  ```javascript
   register = TryCatchDec((req, res, next) => {
      const { username } = req.body;
      SuccessResponse({ res, body: username });
    });
  ```

- JWTAuthVerifyDec -  this decorator handles JWT authorization and sets the payload object to the payload object provided by DRequest. It takes one parameter which is the secret or path to private key depending on the method of authentication used. This is how it works:

  ```typescript
   @JWTAuthVerifyDec('random_secret')
   public async createUser(req: DRequest, res: DResponse) {
     const { body, file } = req;
     if (body.height < 1.7) throw new BadRequestException('sorry, you are too short for   this program');
     SuccessResponse({ res, body: { body, payload: req.payload } });
   }
  ```

  the `req.payload` holds the payload object that wa enctypted to the JWT secret.

  The javascript equivalent of this is the `JwtAuthMiddleware` function. It would be called as a middleware function on thr route by calling the `Verify` method on the `JwtBasicAuth` class which is passed as a parameter to it. Like this:

  ```javascript
  router.post("/user", JwtAuthMiddleware(new JwtBasicAuth("secret")), controller);
  ```

- CookieAuthVerifyDec -  this works like the JwtAuthVerifyDec but it is used when cookies are used for authorization not tokens. In order to use this decorator, the cookie name has to be "xAuthToken". It also accepts a parameter of the secret used for the cookie. An example:

  ```typescript
  @CookieAuthVerifyDec('random_secret')
  public async createUser(req: DRequest, res: DResponse) {
    const { body, file } = req;
    if (body.height < 1.7) throw new BadRequestException('sorry, you are too short for   this program');
    SuccessResponse({ res, body: { body, payload: req.payload } });
   }
  ```

  currently, there is no javascript equivalent for this decorator.

- InjectMySQL -  this is a very important decorator which is used for injecting the MySQL model instance into the service class. Here is an example:

  ```typescript
  @InjectMySQL('userModel', User)
  class AppService extends DolphServiceHandler<Dolph> {
    userModel!: ModelStatic<SqlModel<any, any>>;
  
    constructor() {
      super('app');
    }
    
    createUser = async (body: any) => {
      const data = await this.userModel.create(body);
      return data;
    };
  }
  ```

  

It accepts two parameters: the name of the instance and the mySQL model. Note: the name (firs paremter) should be the exact name used to attribute it's type else dolphjs wouldn't be able to set typings.

- InjectMongo -  works like the `InjectMySQL` decorator but for mogodb databases.

- InjectServiceHandler -  this decorator is used for injecting dolphjs service handlers into a class, it takes a parameter or type `DolphServicemapping` which looks like this: 

  ```typescript
  type DolphServiceMapping<T> = {
    serviceName: keyof T;
    serviceHandler: DolphConstructor<T>;
  };
  ```

  this is how it is being used:

  ```typescript
  @InjectServiceHandler([{ serviceHandler: AppService, serviceName: 'appservice' }])
  class Service {
    appservice!: AppService;
  }
  ```

  

where `AppService` is a class which extends `DolphServiceHandler`.

- MediaParser - this is a very useful decorator which is used for processing files, it uses the **multer** library behind the scene to handle file processing. It accepts a parameter of type `IMediaParserOptions`. Here is an example of it's use case:

  ```typescript
   @TryCatchAsyncDec
    @JWTAuthVerifyDec('random_secret')
    @MediaParser({ fieldname: 'upload', type: 'single', extensions: ['.png'] })
    public async createUser(req: DRequest, res: DResponse) {
      const { body, file } = req;
      if (body.height < 1.7) throw new BadRequestException('sorry, you are too short for this program');
      const data = await controllerServices.appservice.createUser(body);
      SuccessResponse({ res, body: { data, file: file, payload: req.payload } });
    }
  ```



## Interfaces & Types

There are a several interfaces and types which would be needful when writing code with dolphjs.

- DolphConfig - 

  ```typescript
   interface DolphConfig {
    database?: DolphConfigDbOption;
    middlewares?: DolphConfigMiddlewares;
    port?: dolphPort;
    routing?: DolphConfigRouting;
    env?: dolphEnv;
    jsonLimit?: string;
  }
  ```

  this is the interface for the `dolph_config` file. Where `jsonLimit` takes the limit for json request in this form: "5mb"

- DolphConfigDbOption - 

  ```typescript
   interface DolphConfigDbOption {
    mongo: MongooseConfig;
    mysql: MySqlConfig;
  }
  ```

- MySqlConfig - 

  ```typescript
  interface MySqlConfig {
    host: string;
    database: string;
    user: string;
    pass?: string | null;
  }
  ```

- DolphConfigMiddleware - 

  ```typescript
  interface DolphConfigMiddlewares {
    cors?: DolphMiddlewareOption;
  }
  ```

- IPayload -

  ```typescript
  interface IPayload {
    sub: string | object | Buffer;
    iat: number;
    exp: number;
    info?: string | object | Array<any>;
  }
  ```

- IMediaParserOptions -

  ```typescript
  interface IMediaParserOptions {
    extensions?: string[];
    type: mediaType;
    storage?: multer.DiskStorageOptions;
    fieldname: string;
    limit?: number;
  }
  ```

- MongooseConfig - 

  ```typescript
  interface MongooseConfig {
    url: string;
    options?: mongoose.ConnectOptions;
  }
  ```

- DolphMiddlewareOption - 

  ```typescript
  type DolphMiddlewareOption = {
    activate?: boolean | undefined;
    origin?: string | undefined;
    allowedHeaders?: string[] | undefined | null;
    maxAge?: number | undefined;
    exposedHeaders?: string[] | null | undefined;
    credentials?: boolean | undefined;
    preflightContinue?: boolean | undefined;
    optionsSuccessStatus: number | undefined;
  };
  ```

- DolphServiceMapping - 

  ```typescript
  type DolphServiceMapping<T> = {
    serviceName: keyof T;
    serviceHandler: DolphConstructor<T>;
  };
  ```

- argonHashParam -

  ```typescript
  type argonHahsParam = {
    pureString: string;
    timeCost?: number;
    memoryCost?: number;
    parallelism?: number;
    type?: 0 | 1 | 2;
    version?: number;
    salt?: Buffer;
    saltLength?: number;
    raw?: true;
    secret?: Buffer;
  };
  ```

- ResponseType - 

  ```typescript
  type ResponseType<T = any> = {
    res: DResponse;
    status?: number;
    msg?: string;
    body?: T;
  };
  ```

## Logger

Dolphjs has a custom built logger which has three levels:

- error - this is used to log an error to the console

- warn - this is used to log a warning to the console

- info - this is used to log an info to the console

- debug - this is used to log a debug message to the console

  ```typescript
  logger.info();
  logger.error();
  logger.warn();
  logger.debug();
  ```

## Validation

Dolphjs offers out of the box support for request valions.

* Request Validation: dolphjs provides a middleware function which can be used with Joi [https://github.com/joi] to perform request validation. This function is the `reqValidatorMiddleware` function which can be used i this way to check a request param, body or query satisfies the requirements before it passes to the controller:

  ```typescript
  this.router.post(`${this.path}/user`, reqValidatorMiddleware(createUser), this.controller.createUser);
  ```

  and to setup the Joi object which is passed as a param to `reqValidatorMiddleware` as seen above, we have:

  ```typescript
  import Joi from 'joi';
  
  const createUser = {
    body: Joi.object().keys({
      name: Joi.string().required(),
      age: Joi.number().required().min(15),
      work: Joi.string().required(),
      height: Joi.number().required(),
    }),
  };
  ```

  as we can see, the request validation is checking for the json body that's why body is the key. If it were query then we would have:

  ```typescript
  import Joi from 'joi';
  
  const createUser = {
    query: Joi.object().keys({
      name: Joi.string().required(),
      age: Joi.number().required().min(15),
      work: Joi.string().required(),
      height: Joi.number().required(),
    }),
  };
  ```

  and for param:

  ```typescript
  import Joi from 'joi';
  
  const createUser = {
    param: Joi.object().keys({
      name: Joi.string().required(),
      age: Joi.number().required().min(15),
      work: Joi.string().required(),
      height: Joi.number().required(),
    }),
  };
  ```

## Exceptions

Exceptions are thrown when there is an error. The dolphjs engine handles exceptions in two ways and this depends on the environment. When application is in development environment, dolphjs add the stack to the error sent to the client and logs the stack alongside error messages to the console but when in production environment, dolphjs omits the stack and only send error message, code and any other relevant info needed and logs only the error message to console.

There are pre-defined exception classes for each major http status code and a general exception for errors.

- **ErrorException** - accepts two parameters: message and status code
- **BadGatewayException** - accepts only the message and sends a 502 status code
- **BadRequestException** - accepts only the message and sends a 400 status code
- **ConflictException** - accepts only the message and sends a 409 status code
- **ForbiddenException** - accepts only the message and sends a 403 status code
- **GoneException** - accepts only the message and sends a 410 status code
- **HttpVersionUnSupportedException** - accepts only the message and sends a 505 status code
- **ImTeaPotException** - accepts only the message and sends a 418 status code
- **InternalServerErrorException** - accepts only the message and sends a 500 status code
- **MethodNotAllowedException** - accepts only the message and sends a 405 status code
- **MisDirectedException** - accepts only the message and sends a 421 status code
- **NotAcceptableException** - accepts the message and sends a 406 status code
- **NotFoundException** - accepts the message and sends a 404 status code
- **NotImplementedException** - accepts the message and sends a 501 status code
- **NotModifiedException** - accepts the message and sends a 304 status code
- **PaymentRequiredException** - accepts the message and sends a 402 status code
- **ServiceUnavaliableException** -  accepts the message and sends a 503 status code
- **TimeOutException** -  accepts the message and sends a 504 status code
- **UnauthorizedException** - accepts the message and sends a 401 status code
- **UnSupportedMediaException** - accepts the message and sends a 415 status code

## Responses

In dolphjs, a response is just a function which executes something similar to `res.status().send()`. However, there are two types of responses: the **ErrorResponse** and **SuccessResponse**.

* **ErrorResponse** - takes a parameter of type `ResponseType`
* **SuccessResponse** - takes a parameter of type `ResponseType`

## Utilities

- **pick** -  the pick util is used for creating objects from choosing fields in another object. 

  ```typescript
  const filter = pick(req.query, ['limit', 'page']);
  ```

  The code snippet above creates a filter object by pciking the `limit` and `page` fields of the `req.query` object.

- hashWithBcrypt - used for hashing strings (mostly passwords) using bcryptjs. It takes a parameter of `bcryptHashParam`.

  ```typescript
  const hashedPassword = await hashWithBcrypt({pureString: "password", salt: 10});
  ```

- compareWithBcryptHash - compares a hashed string against a pure string. Accepts a parameter of type `bcryptCompareParam`. It returns a boolean.

  ```typescript
  const isSame = compareWithBcryptHash({pureString: "password", hashString: "xxxx"});
  ```

- hashWithArgon - used for hashing strings (mostly passwords) using argon2. It takes a parameter of type `argonHahsParam`.

- verifyArgonHash -  compares a hashed string against a pure string. Accepts a parameter of type `bcryptCompareParam`. It returns a boolean.

- uniqueFiveDigitsCode - a function which implements the `generateRandomCode` function and returns 5 random digits code. Can be used for otp generation.

- uniqueSixDigitsCode - a function which implements the `generateRandomCode` function and returns 6 random digits code. Can be used for otp generation.

- uniqueSevenDigitsCode - a function which implements the `generateRandomCode` function and returns 7 random digits code. Can be used for otp generation.

- generateJWTwithHMAC - a function that accepts the payload of type `IPayload` and secret of type `string` . It generates and returns a  JWT token using the **HMAC** algorithm.

- verifyJWTwithHMAC - a function that accepts the token of type `string` and secret of type `string` . It verifies a JWT token and returns an error or the payload using the **HMAC** algorithm.

- generateJWTwithRSA -  a function that accepts the  private key path of type **string** and payload of type **IPayload** . It  generates and returns a JWT token using the **RSA** algorithm.

- verifyJWTwithRSA - a function that accepts the public key path of type **string** and token of type **string**. It verifies a JWT token and returns an error or the payload using the **RSA** algorithm.

- toJSON - a function that transforms all mongoose documents a collection. It replaces the **_id** field with **id** and removes the **__v** field when returning to user. Pass it as a plugin to your mongoose schema in order to use:

  ```typescript
  const userSchema = new Schema({
    name: String,
    email: String,
    age: Number,
    work: String,
    height: String,
  });
  
  userSchema.plugin(toJSON)
  ```

## How To Configure A JWT Payload

In dolphjs, JWT payloads of type `IPayload` can be generated only by using **moment**. Here is an example:

```typescript
const token = generateJWTwithHMAC({
   payload: {
     exp: moment().add(30000, 'seconds').unix(),
     iat: moment().unix(),
     sub: username,
   },
   secret: 'random_secret',
});
```



