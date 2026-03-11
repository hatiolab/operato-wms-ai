import { Arg, Ctx, Directive, Mutation, Resolver } from 'type-graphql'
import { In } from 'typeorm'
import axios, { AxiosRequestConfig } from 'axios';
import { config } from '@things-factory/env'

import {
  Terminology,
  NewTerminology,
  TerminologyPatch,
  clearTranslationCacheForCertainDomain
} from '@things-factory/i18n-base'

const operatoBaseUrl = config.get('operato/baseUrl')

async function clearCache(subdomain: string, context:any) {
  /** multiple update/delete시 모든 엔티티에 대해서 subscription 이 걸리므로, EventSubscriber를 사용하지 않음. */
  try {
    clearTranslationCacheForCertainDomain(subdomain)
    await redisClearCache(context)
  } catch (err) {
    console.error('Failed to delete the translations cache directory:', err)
  }
}

async function redisClearCache(context) {
  const { request } = context

  let restUrl: string = operatoBaseUrl + '/terminologies/clear_cache' 

  // HTTP Request Options
  const options  = {
    method: "PUT",
    url: restUrl,
    headers: request.headers
  }

  // 에러 처리 포맷에 맟추기 위해 수정
  await axios(options)
    .then(response => {
      context.status = response.status
      context.body = response.data
    })
    .catch(error => {
      // throw error
    })
}

@Resolver(Terminology)
export class TerminologyMutation {
  @Directive('@transaction')
  @Mutation(returns => Terminology, { description: 'To create new Terminology' })
  async createTerminology(
    @Arg('terminology', type => NewTerminology) terminology: NewTerminology,
    @Ctx() context: any
  ): Promise<Terminology> {
    const { domain, user, tx } = context.state

    const result = await tx.getRepository(Terminology).save({
      ...terminology,
      domain,
      creator: user,
      updater: user
    })

    await clearCache(domain.subdomain, context)

    return result
  }

  @Directive('@transaction')
  @Mutation(returns => Terminology, { description: 'To modify Terminology information' })
  async updateTerminology(
    @Arg('id') id: string,
    @Arg('patch', type => TerminologyPatch) patch: TerminologyPatch,
    @Ctx() context: any
  ): Promise<Terminology> {
    const { domain, user, tx } = context.state

    const repository = tx.getRepository(Terminology)
    const terminology = await repository.findOne({
      where: { domain: { id: domain.id }, id }
    })

    const result = await repository.save({
      ...terminology,
      ...patch,
      updater: user
    })

    await clearCache(domain.subdomain, context)

    return result
  }

  @Directive('@transaction')
  @Mutation(returns => [Terminology], { description: "To modify multiple Terminologies' information" })
  async updateMultipleTerminologies(
    @Arg('patches', type => [TerminologyPatch]) patches: TerminologyPatch[],
    @Ctx() context: any
  ): Promise<Terminology[]> {
    const { domain, user, tx } = context.state

    let results = []
    const _createRecords = patches.filter((patch: any) => patch.cuFlag.toUpperCase() === '+')
    const _updateRecords = patches.filter((patch: any) => patch.cuFlag.toUpperCase() === 'M')
    const terminologyRepo = tx.getRepository(Terminology)

    if (_createRecords.length > 0) {
      for (let i = 0; i < _createRecords.length; i++) {
        const newRecord = _createRecords[i]

        const result = await terminologyRepo.save({
          ...newRecord,
          domain,
          creator: user,
          updater: user
        })

        results.push({ ...result, cuFlag: '+' })
      }
    }

    if (_updateRecords.length > 0) {
      for (let i = 0; i < _updateRecords.length; i++) {
        const newRecord = _updateRecords[i]
        const terminology = await terminologyRepo.findOneBy({ id: newRecord.id })

        const result = await terminologyRepo.save({
          ...terminology,
          ...newRecord,
          updater: user
        })

        results.push({ ...result, cuFlag: 'M' })
      }
    }

    await clearCache(domain.subdomain, context)

    return results
  }

  @Directive('@transaction')
  @Mutation(returns => Boolean, { description: 'To clear translations cache' })
  async clearTranslationsCache(@Ctx() context: any): Promise<boolean> {
    const { domain, tx } = context.state

    await clearCache(domain.subdomain, context)

    return true
  }

  @Directive('@transaction')
  @Mutation(returns => Boolean, { description: 'To delete Terminology' })
  async deleteTerminology(@Arg('id') id: string, @Ctx() context: any): Promise<boolean> {
    const { domain, tx } = context.state

    await tx.getRepository(Terminology).delete({ domain: { id: domain.id }, id })

    await clearCache(domain.subdomain, context)

    return true
  }

  @Directive('@transaction')
  @Mutation(returns => Boolean, { description: 'To delete multiple Terminologies' })
  async deleteTerminologies(@Arg('ids', type => [String]) ids: string[], @Ctx() context: any): Promise<boolean> {
    const { domain, tx } = context.state

    await tx.getRepository(Terminology).delete({
      domain: { id: domain.id },
      id: In(ids)
    })

    await clearCache(domain.subdomain, context)

    return true
  }

  @Directive('@transaction')
  @Mutation(returns => Boolean, { description: 'To import multiple Terminologies' })
  async importTerminologies(
    @Arg('terminologies', type => [TerminologyPatch]) terminologies: TerminologyPatch[],
    @Ctx() context: any
  ): Promise<boolean> {
    const { domain, tx } = context.state

    await Promise.all(
      terminologies.map(async (terminology: TerminologyPatch) => {
        const createdTerminology: Terminology = await tx.getRepository(Terminology).save({ domain, ...terminology })
      })
    )

    await clearCache(domain.subdomain, context)

    return true
  }
}
