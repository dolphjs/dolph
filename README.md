Looking for the `dolphjs/core` repo? here it is: https://github.com/dolphjs/core 
Note: docs has not yet been updated to fit newest version, docs is only correct for version o.o.2-beta

# dolph.js

dolphjs is a typescript backend framework built to ease development time and shorten code while retaining simplicity.

dolphjs is built on the express.js framework and offers a wide range of classes, methods, functions and utility tools, from error handling middlewares to the best utiity loggers.

Initialize your databases, middlewares and more with ease.

The most important file in your dolph project is the `dolph_config.yaml` file which gives you an easy way to initialize database, specify port and add middlewares like `cors`.

An example of a `dolph_config.yaml` file is:

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

Where databases takes an object of databases with their specific key value pairs.

_Note: current dolph_config file only supports mongodb databases_

## Exported Packages

dolph.js exports this packages from the `@dolphjs/dolph/package` directory:

- mongoose
- mysql2 as mysql
- sequelize
- moment
- eventemitter3
- joi

This means that you don't need to install them again. For shared packages like that above mentioned, using this exported packages ensures that your project dependencies are in sync with dolph's.
