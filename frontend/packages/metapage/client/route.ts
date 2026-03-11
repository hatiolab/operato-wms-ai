import './pages/operato-home'

export default function route(page, module) {
  switch (page) {
    case '':
      return 'operato-home'
    case 'template-files':
      import('./pages/template-file/template-file-list')
      return page
  }
}
