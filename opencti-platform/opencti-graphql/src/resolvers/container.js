import { findAll, findById, objects, containersObjectsOfObject } from '../domain/container';
import {
  stixDomainObjectAddRelation,
  stixDomainObjectCleanContext,
  stixDomainObjectDelete,
  stixDomainObjectDeleteRelation,
  stixDomainObjectEditContext,
  stixDomainObjectEditField,
} from '../domain/stixDomainObject';
import {
  RELATION_CREATED_BY,
  RELATION_OBJECT,
  RELATION_OBJECT_LABEL,
  RELATION_OBJECT_MARKING,
} from '../schema/stixMetaRelationship';
import { REL_INDEX_PREFIX } from '../schema/general';
import { UPDATE_OPERATION_REPLACE } from '../database/utils';

const containerResolvers = {
  Query: {
    container: (_, { id }, { user }) => findById(user, id),
    containers: (_, args, { user }) => findAll(user, args),
    containersObjectsOfObject: (_, { id, types }, { user }) => containersObjectsOfObject(user, id, types),
  },
  Container: {
    __resolveType(obj) {
      if (obj.entity_type) {
        return obj.entity_type.replace(/(?:^|-)(\w)/g, (matches, letter) => letter.toUpperCase());
      }
      return 'Unknown';
    },
    objects: (container, args, { user }) => objects(user, container.id, args),
  },
  ContainersOrdering: {
    createdBy: `${REL_INDEX_PREFIX}${RELATION_CREATED_BY}.name`,
  },
  ContainersFilter: {
    createdBy: `${REL_INDEX_PREFIX}${RELATION_CREATED_BY}.internal_id`,
    markedBy: `${REL_INDEX_PREFIX}${RELATION_OBJECT_MARKING}.internal_id`,
    labelledBy: `${REL_INDEX_PREFIX}${RELATION_OBJECT_LABEL}.internal_id`,
    objectContains: `${REL_INDEX_PREFIX}${RELATION_OBJECT}.internal_id`,
  },
  Mutation: {
    containerEdit: (_, { id }, { user }) => ({
      delete: () => stixDomainObjectDelete(user, id),
      fieldPatch: ({ input, operation = UPDATE_OPERATION_REPLACE }) =>
        stixDomainObjectEditField(user, id, input, { operation }),
      contextPatch: ({ input }) => stixDomainObjectEditContext(user, id, input),
      contextClean: () => stixDomainObjectCleanContext(user, id),
      relationAdd: ({ input }) => stixDomainObjectAddRelation(user, id, input),
      relationDelete: ({ toId, relationship_type: relationshipType }) =>
        stixDomainObjectDeleteRelation(user, id, toId, relationshipType),
    }),
  },
};

export default containerResolvers;
