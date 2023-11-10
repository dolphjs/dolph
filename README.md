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

