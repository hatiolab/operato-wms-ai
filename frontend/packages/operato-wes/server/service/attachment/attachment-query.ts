import { In } from 'typeorm'
import { Arg, Args, Ctx, FieldResolver, Query, Resolver, Root } from 'type-graphql'

import { User } from '@things-factory/auth-base'
import { Domain, getQueryBuilderFromListParams, getRepository, ListParam } from '@things-factory/shell'

import { AttachmentList } from '@things-factory/attachment-base'
import { Attachment } from '@things-factory/attachment-base'

@Resolver(Attachment)
export class AttachmentQuery {
  @Query(returns => AttachmentList)
  async attachments(
    @Ctx() context: ResolverContext,
    @Args(type => ListParam) params: ListParam
  ): Promise<AttachmentList> {
    const { domain } = context.state

    const queryBuilder = getQueryBuilderFromListParams({
      repository: await getRepository(Attachment),
      params,
      domain,
      alias: 'attachment',
      searchables: ['name', 'description']
    }).addSelect([
      'attachment.domain',
      'attachment.id',
      'attachment.name',
      'attachment.path',
      'attachment.size',
      'attachment.mimetype',
      'attachment.encoding',
      'attachment.category',
      'attachment.updatedAt',
      'attachment.updater',
      'attachment.createdAt',
      'attachment.creator'
    ])

    const [items, total] = await queryBuilder.getManyAndCount()

    return { items, total }
  }

  @Query(returns => Attachment)
  async attachment(@Arg('id') id: string, @Ctx() context: ResolverContext): Promise<Attachment> {
    const { domain } = context.state

    return await getRepository(Attachment).findOne({
      select: [
        'domain',
        'id',
        'name',
        'path',
        'size',
        'mimetype',
        'encoding',
        'category',
        'updatedAt',
        'updater',
        'createdAt',
        'creator'
      ],
      where: { domain: { id: In([domain.id, domain.parentId].filter(Boolean)) }, id },
      relations: ['domain', 'creator', 'updater']
    })
  }

  @FieldResolver(type => Domain)
  async domain(@Root() attachment: Attachment) {
    return await getRepository(Domain).findOneBy({
      id: attachment.domainId
    })
  }

  @FieldResolver(type => User)
  async updater(@Root() attachment: Attachment): Promise<User> {
    return await getRepository(User).findOneBy({
      id: attachment.updaterId
    })
  }

  @FieldResolver(type => User)
  async creator(@Root() attachment: Attachment): Promise<User> {
    return await getRepository(User).findOneBy({
      id: attachment.creatorId
    })
  }
}
