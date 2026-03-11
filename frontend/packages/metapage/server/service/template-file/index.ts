
import { TemplateFile } from './template-file'
import { TemplateFileQuery } from './template-file-query'
import { TemplateFileMutation } from './template-file-mutation'

export const entities = [TemplateFile]
export const resolvers = [TemplateFileQuery, TemplateFileMutation]
