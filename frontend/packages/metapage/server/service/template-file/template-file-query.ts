
import { Resolver, Query, FieldResolver, Root, Args, Arg, Ctx, Directive } from 'type-graphql'
import { ListParam, getRepository, getQueryBuilderFromListParams } from '@things-factory/shell'
import { TemplateFile } from './template-file'
import { TemplateFileList } from './template-file-type'

import { User } from '@things-factory/auth-base'
import { Domain } from '@things-factory/shell'
import { Attachment } from '@things-factory/attachment-base'

@Resolver(TemplateFile)
export class TemplateFileQuery {
  @Query(returns => TemplateFile, { description: 'To fetch a TemplateFile' })
  async templateFile(@Arg('id') id: string, @Ctx() context: any): Promise<TemplateFile> {
    const { domain } = context.state
    return await getRepository(TemplateFile).findOne({
      where: { domain: { id: domain.id }, id }
    })
  }

  @Query(returns => TemplateFileList, { description: 'To fetch multiple TemplateFiles' })
  async templateFiles(@Args() params: ListParam, @Ctx() context: any): Promise<TemplateFileList> {
    const { domain } = context.state

    const queryBuilder = getQueryBuilderFromListParams({
      domain,
      params,
      repository: await getRepository(TemplateFile),
      searchables: ['name', 'description']
    })

    const [items, total] = await queryBuilder.getManyAndCount()
    return { items, total }
  }

  @FieldResolver(type => Attachment)
  async attachment(@Root() templateFile: TemplateFile): Promise<Attachment> {
    return await getRepository(Attachment).findOne({
      where: {
        domain: { id: templateFile.domainId },
        refBy: templateFile.id
      }
    })
  }

  @FieldResolver(type => Domain)
  async domain(@Root() templateFile: TemplateFile): Promise<Domain> {
    return await getRepository(Domain).findOneBy({id:templateFile.domainId})
  }

  @FieldResolver(type => User)
  async creator(@Root()  templateFile: TemplateFile): Promise<User> {
    return await getRepository(User).findOneBy({id:templateFile.creatorId})
  }

  @FieldResolver(type => User)
  async updater(@Root()  templateFile: TemplateFile): Promise<User> {
    return await getRepository(User).findOneBy({id:templateFile.updaterId})
  }
}
