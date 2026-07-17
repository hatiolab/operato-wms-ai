import './pages/operato-home'

export default function route(page, module) {
  switch (page) {
    case '':
      return 'operato-home'
    case 'template-files':
      import('./pages/template-file/template-file-list')
      return page
    case 'excel-templates':
      import('./pages/excel-template-list')
      import('./pages/excel-template-detail')
      import('./pages/dynamic-excel-import-popup')
      return page
  }
}
