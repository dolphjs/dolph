import { buildSchema } from 'type-graphql';
import { DolphFactory } from '../../../../core';
import { UserResolver } from './resolvers/user.resolver';
import { UserComponent } from './components/user/user.component';
// import { UserComponent } from './components/user/user.component';

const schema = async function createSchema() {
  return await buildSchema({
    resolvers: [UserResolver],
  });
};

const context = async ({ req }) => ({ token: req.headers.token });

const dolph = new DolphFactory([UserComponent]);
// const dolph = new DolphFactory({ graphql: true, schema: schema(), context });
dolph.start();
