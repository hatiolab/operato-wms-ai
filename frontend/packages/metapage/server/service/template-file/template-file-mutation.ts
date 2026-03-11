
import { Resolver, Mutation, Arg, Ctx, Directive } from 'type-graphql'
import { TemplateFile } from './template-file'
import { NewTemplateFile, TemplateFilePatch } from './template-file-type'
import { createAttachment, deleteAttachmentsByRef } from '@things-factory/attachment-base'
import { In } from 'typeorm'

@Resolver(TemplateFile)
export class TemplateFileMutation {
  @Directive('@transaction')
  @Mutation(returns => TemplateFile, { description: 'To create new TemplateFile' })
  async createTemplateFile(@Arg('templateFile') templateFile: NewTemplateFile, @Ctx() context: any): Promise<TemplateFile> {
    const { domain, user, tx } = context.state

    const result = await tx.getRepository(TemplateFile).save({
      ...templateFile,
      domain,
      creator: user,
      updater: user,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    await this._manageAttachment(context, templateFile.attachmentFile, { ref: result, cuFlag: '+' })

    return result
  }

  @Directive('@transaction')
  @Mutation(returns => TemplateFile, { description: 'To modify TemplateFile information' })
  async updateTemplateFile(
    @Arg('id') id: string,
    @Arg('patch') patch: TemplateFilePatch,
    @Ctx() context: any
  ): Promise<TemplateFile> {
    const { domain, user, tx } = context.state

    const repository = tx.getRepository(TemplateFile)
    const templateFile = await repository.findOne(
      {
        where: { domain: { id: domain.id }, id },
        relations: ['domain','updater','creator']
      }
    )

    const result = await repository.save({
      ...templateFile,
      ...patch,
      updater: user,
      updatedAt: new Date()
    })

    await this._manageAttachment(context, patch.attachmentFile, { ref: result, cuFlag: 'M' })

    return result
  }

  @Directive('@transaction')
  @Mutation(returns => [TemplateFile], { description: "To modify multiple TemplateFiles' information" })
  async updateMultipleTemplateFile(
    @Arg('patches', type => [TemplateFilePatch]) patches: TemplateFilePatch[],
    @Ctx() context: any
  ): Promise<TemplateFile[]> {
    const { domain, user, tx } = context.state

    let results = []
    const _createRecords = patches.filter((patch: any) => patch.cuFlag.toUpperCase() === '+')
    const _updateRecords = patches.filter((patch: any) => patch.cuFlag.toUpperCase() === 'M')
    const templateFileRepo = tx.getRepository(TemplateFile)

    if (_createRecords.length > 0) {
      for (let i = 0; i < _createRecords.length; i++) {
        const newRecord = _createRecords[i]

        const result = await templateFileRepo.save({
          ...newRecord,
          domain,
          creator: user,
          updater: user,
          createdAt: new Date(),
          updatedAt: new Date()
        })

        await this._manageAttachment(context, newRecord.attachmentFile, { ref: result, cuFlag: '+' })
        results.push({ ...result, cuFlag: '+' })
      }
    }

    if (_updateRecords.length > 0) {
      for (let i = 0; i < _updateRecords.length; i++) {
        const updRecord = _updateRecords[i]
        const templateFile = await templateFileRepo.findOne({
          where: { domain: { id: domain.id }, id:updRecord.id },
          relations: ['domain','updater','creator']
        })
        
        const result = await templateFileRepo.save({
          ...templateFile,
          ...updRecord,
          updater: user,
          updatedAt: new Date()
        })

        await this._manageAttachment(context, updRecord.attachmentFile, { ref: result, cuFlag: 'M' }, templateFile)
        results.push({ ...result, cuFlag: 'M' })
      }
    }

    return results
  }

  @Directive('@transaction')
  @Mutation(returns => Boolean, { description: 'To delete TemplateFile' })
  async deleteTemplateFile(@Arg('id') id: string, @Ctx() context: any): Promise<boolean> {
    const { domain, tx, user } = context.state
    await tx.getRepository(TemplateFile).remove({ domain, id, updater:user })

    await this._manageAttachment(context, null, { ref: {id}, cuFlag: 'D' })
    return true
  }

  @Directive('@transaction')
  @Mutation(returns => Boolean, { description: 'To delete multiple templateFiles' })
  async deleteTemplateFiles(
    @Arg('ids', type => [String]) ids: string[],
    @Ctx() context: any
  ): Promise<boolean> {
    const { domain, tx, user } = context.state

    await tx.getRepository(TemplateFile).delete({
      domain: { id: domain.id },
      id: In(ids)
    })

    for(let idx = 0 ; idx < ids.length ;idx++){
      const id = ids[idx];
      await this._manageAttachment(context, null, { ref: {id}, cuFlag: 'D' })
    }
  
    return true
  }

  async _manageAttachment(context, attachment, { ref, cuFlag }, org?) {
    if(cuFlag == 'D'){
      await deleteAttachmentsByRef(null, { refBys: [ref.id] }, context)
    } else if(cuFlag == 'M'){
      if (org && attachment) {
        await deleteAttachmentsByRef(null, { refBys: [ref.id] }, context)
      }
    }

    if (attachment) {
      await createAttachment(
        null,
        {
          attachment: {
            file: attachment,
            refType: `template-file`,
            refBy: ref.id
          }
        },
        context
      )
    }
  }
}
