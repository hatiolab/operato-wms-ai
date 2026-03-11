
import { ObjectType, Field, InputType, Int, ID } from 'type-graphql'
import { ObjectRef } from '@things-factory/shell'
import { TemplateFile } from './template-file'
import type { FileUpload } from 'graphql-upload/GraphQLUpload.js'
import GraphQLUpload from 'graphql-upload/GraphQLUpload.js'
import { Attachment } from '@things-factory/attachment-base'


@InputType()
export class NewTemplateFile {
  @Field({ nullable: false })
  name: string

  @Field({ nullable: true })
  description: string

  @Field({ nullable: true })
  attachment?: ObjectRef

  @Field(type => GraphQLUpload, { nullable: true })
  attachmentFile?: FileUpload
}

@InputType()
export class TemplateFilePatch {
  @Field(type => ID, { nullable: true })
  id?: string

  @Field({ nullable: true })
  name?: string

  @Field({ nullable: true })
  description?: string

  @Field({ nullable: true })
  attachment?: ObjectRef

  @Field(type => GraphQLUpload, { nullable: true })
  attachmentFile?: FileUpload

  @Field()
  cuFlag: string
}

@ObjectType()
export class TemplateFileList {
  @Field(type => [TemplateFile])
  items: TemplateFile[]

  @Field(type => Int)
  total: number
}
