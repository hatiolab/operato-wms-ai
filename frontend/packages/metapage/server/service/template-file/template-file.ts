
import {
  CreateDateColumn,
  UpdateDateColumn,
  Entity,
  Index,
  Column,
  RelationId,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { ObjectType, Field, ID } from 'type-graphql'

import { User } from '@things-factory/auth-base'
import { Domain } from '@things-factory/shell'
import { Attachment } from '@things-factory/attachment-base'

@Entity('template_files')
@Index('ix_template_file_0', (templateFile: TemplateFile) => [templateFile.domain,templateFile.name], { unique: true })
@ObjectType({ description: 'Entity for TemplateFile' })
export class TemplateFile {
  @PrimaryGeneratedColumn('uuid')
  @Field(type => ID)
  readonly id: string

  @Column({ name:'name', nullable:false })
  @Field({ nullable:false })
  name: string

  @Column({ name:'description', nullable:true })
  @Field({ nullable:true })
  description: string

  @Field({ nullable: true})
  attachment?: Attachment

  @ManyToOne(type => Domain, {createForeignKeyConstraints: false, nullable: false})
  @Field({ nullable: false })
  domain: Domain

  @RelationId((templateFile: TemplateFile) => templateFile.domain)
  domainId: string

  @ManyToOne(type => User, {createForeignKeyConstraints: false, nullable: true})
  @Field({ nullable: true })
  creator?: User

  @RelationId((templateFile: TemplateFile) => templateFile.creator)
  creatorId?: string

  @ManyToOne(type => User, {createForeignKeyConstraints: false, nullable: true})
  @Field({ nullable: true })
  updater?: User

  @RelationId((templateFile: TemplateFile) => templateFile.updater)
  updaterId?: string

  @CreateDateColumn()
  @Field({ nullable: true })
  createdAt?: Date

  @UpdateDateColumn()
  @Field({ nullable: true })
  updatedAt?: Date
}
