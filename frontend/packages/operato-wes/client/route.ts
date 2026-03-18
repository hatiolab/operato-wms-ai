import './pages/pda/pda-list-template1'
import './pages/pda/pda-form-template1'
import './pages/pda/pda-wms-shipment-barcode'
import './pages/pda/pda-wms-shipment-quantity'
import './pages/pda/pda-wms-transfer-out-barcode'
import './pages/pda/pda-wms-transfer-in-barcode'
import './pages/pda/pda-stocktake-page'
import './pages/inventory/inventory-form-element'
import './pages/inventory/inventory-lock'
import './pages/inventory/inventory-releases'
import './pages/pda/pda-wms-peer-to-peer'
import './pages/pda/pda-wms-peer-to-peer-popup'

import './pages/inventory/inventory-product-change'
import './pages/pda/pda-wms-shipment-barcode-manually'

import './pages/work/rcv-work-page'
import './pages/work/rcv-work-item-element'
import './pages/work/rls-work-page'
import './pages/work/rls-work-item-element'
import './pages/work/putaway-work-page'
import './pages/work/putaway-work-item-element'
import './pages/work/inv-work-page'

export default function route(page, module) {
  let route = module.routes?.find(mapping => mapping.page == page)
  if (route) {
    return page
  } else {
  }
}
