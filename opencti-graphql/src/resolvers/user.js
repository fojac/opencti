import { sign } from 'jsonwebtoken';
import conf, { BUS_TOPICS } from '../config/conf';
import {
  userAdd,
  userDelete,
  findAll,
  findById,
  groups,
  userEditContext,
  userEditField,
  userAddRelation,
  userDeleteRelation,
  userCleanContext,
  login,
  setAuthenticationCookie
} from '../domain/user';
import { fetchEditContext, pubsub } from '../database/redis';
import { admin, auth, anonymous, withCancel } from './wrapper';

const userResolvers = {
  Query: {
    user: auth((_, { id }) => findById(id)),
    users: auth((_, args) => findAll(args)),
    me: auth((_, args, { user }) => findById(user.id))
  },
  User: {
    groups: (user, args) => groups(user.id, args),
    editContext: admin(user => fetchEditContext(user.id))
  },
  Mutation: {
    token: anonymous((_, { input }, context) =>
      login(input.email, input.password).then(token => {
        setAuthenticationCookie(token, context.res);
        return sign(token, conf.get('jwt:secret'));
      })
    ),
    userEdit: auth((_, { id }, { user }) => ({
      delete: () => userDelete(id),
      fieldPatch: ({ input }) => userEditField(user, id, input),
      contextPatch: ({ input }) => userEditContext(user, id, input),
      relationAdd: ({ input }) => userAddRelation(user, id, input),
      relationDelete: ({ relationId }) => userDeleteRelation(relationId)
    })),
    userAdd: auth((_, { input }, { user }) => userAdd(user, input))
  },
  Subscription: {
    user: {
      resolve: payload => payload.instance,
      subscribe: admin((_, { id }, { user }) => {
        userEditContext(user, id);
        return withCancel(
          pubsub.asyncIterator(BUS_TOPICS.User.EDIT_TOPIC),
          () => {
            userCleanContext(user, id);
          }
        );
      })
    }
  }
};

export default userResolvers;
