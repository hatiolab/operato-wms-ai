/* EXPORT ENTITY TYPES */
export * from './template-file/template-file'

/* IMPORT ENTITIES AND RESOLVERS */
import { entities as TemplateFileEntities, resolvers as TemplateFileResolvers } from './template-file'

export const entities = [
  /* ENTITIES */
	...TemplateFileEntities
]

export const schema = {
  resolverClasses: [
    /* RESOLVER CLASSES */
		...TemplateFileResolvers
  ]
}

export const subscribers = [
  /* SUBSCRIBERS */
]
