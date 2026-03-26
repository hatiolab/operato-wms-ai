import route from './dist-client/route'
import bootstrap from './dist-client/bootstrap'

export default {
  route,
  routes: [
    { tagname: 'oms-home', page: 'oms-home' },
    { tagname: 'inbound-home', page: 'inbound-home' },
    { tagname: 'outbound-home', page: 'outbound-home' },
    { tagname: 'outbound-inspection', page: 'outbound-inspection' },
    { tagname: 'inventory-home', page: 'inventory-home' },
    { tagname: 'rwa-home', page: 'rwa-home' },
    { tagname: 'rwa-receive-list', page: 'rwa-receive-list' },
    { tagname: 'rwa-receive-work', page: 'rwa-receive-work' },
    { tagname: 'rwa-inspection-list', page: 'rwa-inspection-list' },
    { tagname: 'rwa-inspection-work', page: 'rwa-inspection-work' },
    { tagname: 'rwa-disposition-list', page: 'rwa-disposition-list' },
    { tagname: 'rwa-disposition-work', page: 'rwa-disposition-work' },
    { tagname: 'rwa-result-dashboard', page: 'rwa-result-dashboard' },
    { tagname: 'rwa-quality-analysis', page: 'rwa-quality-analysis' },
    { tagname: 'vas-home', page: 'vas-home' },
    { tagname: 'vas-work-monitor', page: 'vas-work-monitor' },
    { tagname: 'vas-material-preparation', page: 'vas-material-preparation' },
    { tagname: 'vas-result-analysis', page: 'vas-result-analysis' },
    { tagname: 'vas-work-page', page: 'vas-work' },
    { tagname: 'vas-pda-pick', page: 'vas-pda-pick' },
    { tagname: 'vas-pda-result', page: 'vas-pda-result' },
    { tagname: 'outbound-picking-pc', page: 'outbound-picking-pc' },
    { tagname: 'outbound-picking-work', page: 'outbound-picking-work' },
    { tagname: 'outbound-release-work', page: 'outbound-release-work' },
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
