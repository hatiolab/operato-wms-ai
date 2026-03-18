import route from './dist-client/route'
import bootstrap from './dist-client/bootstrap'

export default {
  route,
  routes: [
    { tagname: 'pda-wms-shipment-barcode', page: 'pda-wms-shipment-barcode' },
    { tagname: 'pda-wms-shipment-quantity', page: 'pda-wms-shipment-quantity' },
    { tagname: 'pda-wms-transfer-out-barcode', page: 'pda-wms-transfer-out-barcode' },
    { tagname: 'pda-wms-transfer-in-barcode', page: 'pda-wms-transfer-in-barcode' },
    { tagname: 'inv-work-page', page: 'inventory-work' },
    { tagname: 'rls-work-page', page: 'release-work' },
    { tagname: 'rcv-work-page', page: 'receiving-work' },
    { tagname: 'putaway-work-page', page: 'put-away-work' }
  ],
  bootstrap
}
