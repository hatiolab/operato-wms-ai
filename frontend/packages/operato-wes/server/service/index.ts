/* EXPORT ENTITY TYPES */

/* IMPORT ENTITIES AND RESOLVERS */
import { resolvers as TerminologyResolvers } from './terminology'
import { resolvers as AttachmentResolvers } from './attachment'

export const entities = [
  /* ENTITIES */
]

export const subscribers = [
  /* SUBSCRIBERS */
]

export const schema = {
  resolverClasses: [
    /* RESOLVER CLASSES */
    ...TerminologyResolvers,
    ...AttachmentResolvers
  ]
}
