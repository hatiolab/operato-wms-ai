import './pages/base/storage-browser'
import './pages/base/domain-storage-browser'

import './pages/oms/oms-home'
import './pages/oms/shipment-order-import'
import './pages/oms/shipment-wave-list'
import './pages/oms/shipment-order-detail'  // 팝업으로 사용
import './pages/oms/shipment-wave-detail'  // 팝업으로 사용
import './pages/oms/stock-allocation-list'

import './pages/inbound/inbound-home'

import './pages/fulfillment/fulfillment-home'
import './pages/fulfillment/fulfillment-progress'
import './pages/fulfillment/picking-task-list'
import './pages/fulfillment/picking-task-detail'  // 팝업으로 사용
import './pages/fulfillment/packing-order-list'
import './pages/fulfillment/packing-order-detail'  // 팝업으로 사용
import './pages/fulfillment/fulfillment-picking-pc'
import './pages/fulfillment/fulfillment-packing-pc'
import './pages/fulfillment/shipment-tracking'

import './pages/outbound/outbound-home'
import './pages/outbound/outbound-inspection'
import './pages/outbound/outbound-picking-pc'

import './pages/inventory/inventory-home'
import './pages/inventory/inventory-form-element'
import './pages/inventory/inventory-lock'
import './pages/inventory/inventory-releases'
import './pages/inventory/inventory-product-change'

import './pages/rwa/rwa-home'
import './pages/rwa/rwa-order-new'  // 팝업으로 사용
import './pages/rwa/rwa-order-detail'  // 팝업으로 사용
import './pages/rwa/rwa-receive-list'
import './pages/rwa/rwa-inspection-list'
import './pages/rwa/rwa-disposition-list'
import './pages/rwa/rwa-result-dashboard'
import './pages/rwa/rwa-quality-analysis'

import './pages/vas/vas-home'
import './pages/vas/vas-work-monitor'
import './pages/vas/vas-order-detail'  // 팝업으로 사용
import './pages/vas/vas-material-preparation'
import './pages/vas/vas-result-analysis'

import './pages/work/vas-work-page'
import './pages/work/vas-pda-pick'
import './pages/work/vas-pda-result'
import './pages/work/rwa-receive-work'
import './pages/work/rwa-inspection-work'
import './pages/work/rwa-disposition-work'
import './pages/work/outbound-picking-work'
import './pages/work/outbound-release-work'
import './pages/work/rcv-work-page'
import './pages/work/rcv-work-item-element'
import './pages/work/rls-work-page'
import './pages/work/rls-work-item-element'
import './pages/work/putaway-work-page'
import './pages/work/putaway-work-item-element'
import './pages/work/inv-work-page'

import './pages/pda/pda-list-template1'
import './pages/pda/pda-form-template1'
import './pages/pda/pda-wms-shipment-barcode'
import './pages/pda/pda-wms-shipment-quantity'
import './pages/pda/pda-wms-transfer-out-barcode'
import './pages/pda/pda-wms-transfer-in-barcode'
import './pages/pda/pda-stocktake-page'
import './pages/pda/pda-wms-peer-to-peer'
import './pages/pda/pda-wms-peer-to-peer-popup'
import './pages/pda/pda-wms-shipment-barcode-manually'
import './pages/pda/pda-fulfillment-shipping'
import './pages/pda/pda-fulfillment-packing'
import './pages/pda/pda-fulfillment-picking'

export default function route(page, module) {
  let route = module.routes?.find(mapping => mapping.page == page)
  if (route) {
    return page
  } else {
  }
}
