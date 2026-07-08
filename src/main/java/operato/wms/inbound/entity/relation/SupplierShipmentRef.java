package operato.wms.inbound.entity.relation;

import java.io.Serializable;
import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Table;

@Table(name = "supplier_shipments", idStrategy = GenerationRule.UUID, isRef=true)
public class SupplierShipmentRef implements Serializable {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 645375192586831449L;
	
	@PrimaryKey
	private String id;
  
	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}	
}

