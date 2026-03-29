package operato.wms.fulfillment.entity.relation;

import java.io.Serializable;
import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Table;

@Table(name = "picking_tasks", idStrategy = GenerationRule.UUID, isRef=true)
public class PickingTaskRef implements Serializable {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 498403877530356982L;
	
	
  
		
}

