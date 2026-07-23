import './pages/operato-home'
import './components/popup/dynamic-excel-import-popup'
import './components/popup/dynamic-shipment-order-import-popup'

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
      import('./components/popup/dynamic-excel-import-popup')
      return page
  }
}
