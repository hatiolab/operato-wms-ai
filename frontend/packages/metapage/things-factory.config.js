import route from './dist-client/route'
import bootstrap from './dist-client/bootstrap'

export default {
  route,
  routes: [
    { tagname: 'operato-home', page: 'operato-home' },
    { tagname: 'template-file-list', page: 'template-files' }
  ],
  bootstrap
}
