import route from './dist-client/route'
import bootstrap from './dist-client/bootstrap'

import { getRouteMappings } from './dist-client/operatofill'

export default {
  route,
  routes: new Promise(async resolve => {
    const mappings = await getRouteMappings()
    const routes = mappings.filter(mapping => mapping.parent == false && mapping.routing_type != 'STATIC')
    resolve(routes)
  }),
  bootstrap
}
