package operato.wms.base.entity;

import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Table;

@Table(name = "locations", idStrategy = GenerationRule.UUID, uniqueFields="locCd,domainId", indexes = {
	@Index(name = "ix_locations_0", columnList = "loc_cd,domain_id", unique = true),
	@Index(name = "ix_locations_1", columnList = "wh_cd,zone_cd,domain_id"),
	@Index(name = "ix_locations_2", columnList = "del_flag,domain_id"),
	@Index(name = "ix_locations_3", columnList = "wh_cd,loc_type,domain_id"),
	@Index(name = "ix_locations_4", columnList = "wh_cd,temp_type,domain_id"),
	@Index(name = "ix_locations_5", columnList = "wh_cd,restrict_type,domain_id"),
	@Index(name = "ix_locations_6", columnList = "wh_cd,mixable_flag,domain_id")
})
public class Location extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 708402214490950313L;

	/**
	 * 로케이션 고유 ID (UUID)
	 */
	@PrimaryKey
	@Column (name = "id", nullable = false, length = 40)
	private String id;

	/**
	 * 창고 코드 - 이 로케이션이 속한 창고
	 */
	@Column (name = "wh_cd", nullable = false, length = 20)
	private String whCd;

	/**
	 * 로케이션 코드 - 창고 내 고유 위치 식별 코드 (예: A-01-01-01). 도메인 내 유일
	 */
	@Column (name = "loc_cd", nullable = false, length = 20)
	private String locCd;

	/**
	 * 로케이션 유형 - 위치의 용도/기능 분류 코드
	 * (예: STORAGE-일반보관, RCV-WAIT-입고대기, DEFECT-불량, SHIP-출고대기, VIRTUAL-가상)
	 */
	@Column (name = "loc_type", length = 20)
	private String locType;

	/**
	 * 로케이션 그룹 - 로케이션을 묶어서 관리하는 그룹 코드 (예: 작업 구역, 동선 단위 그룹핑)
	 */
	@Column (name = "loc_group", length = 20)
	private String locGroup;

	/**
	 * 존 코드 - 이 로케이션이 속한 창고 내 구역(Zone)
	 */
	@Column (name = "zone_cd", nullable = false, length = 20)
	private String zoneCd;

	/**
	 * 화주사 전용 코드 - 특정 화주사 전용으로 운영하는 로케이션의 화주사 코드.
	 * 값이 있으면 해당 화주사 재고만 적치 가능 (3PL 멀티 화주 구역 분리)
	 */
	@Column (name = "com_cd", length = 30)
	private String comCd;

	/**
	 * 고정 SKU 코드 - 특정 상품 전용으로 운영하는 고정 로케이션(Fixed Location)의 상품 코드.
	 * 값이 있으면 해당 SKU 재고만 적치 가능
	 */
	@Column (name = "sku_cd", length = 30)
	private String skuCd;

	/**
	 * 행(Row) - 랙 기준 가로 위치 번호 (예: A, B, 01, 02)
	 */
	@Column (name = "loc_row", length = 10)
	private String locRow;

	/**
	 * 열(Column) - 랙 기준 세로 위치 번호 (예: 01, 02, 03)
	 */
	@Column (name = "loc_col", length = 10)
	private String locCol;

	/**
	 * 단(Level) - 랙 기준 높이 단수 (예: 01-하단, 02-중단, 03-상단)
	 */
	@Column (name = "loc_dan", length = 10)
	private String locDan;

	/**
	 * 피킹 동선 순서 - 피킹 작업 시 최적 경로를 위한 로케이션 방문 순서 번호.
	 * locRow/Col/Dan 좌표와 별개로 실제 동선(뱀 순서 등)을 반영하여 설정
	 */
	@Column (name = "sort_no")
	private Integer sortNo;

	/**
	 * 로케이션 가로 폭 (mm)
	 */
	@Column (name = "loc_wdt")
	private Float locWdt;

	/**
	 * 로케이션 세로 깊이 (mm)
	 */
	@Column (name = "loc_vtc")
	private Float locVtc;

	/**
	 * 로케이션 높이 (mm)
	 */
	@Column (name = "loc_hgt")
	private Float locHgt;

	/**
	 * 로케이션 최대 적재 부피 (CBM) - 해당 로케이션에 보관 가능한 최대 부피
	 */
	@Column (name = "loc_cbm")
	private Float locCbm;

	/**
	 * 최대 적재 중량 (kg) - 해당 로케이션에 보관 가능한 최대 총 중량.
	 * 랙 내하중 초과 방지를 위해 입고/이동 시 검증에 활용
	 */
	@Column (name = "max_weight")
	private Float maxWeight;

	/**
	 * 최대 적재 수량 (EA) - 해당 로케이션에 보관 가능한 최대 낱개 수량.
	 * 부피/중량보다 단순한 수량 기반 제약이 필요한 소형 상품 로케이션에 활용
	 */
	@Column (name = "max_qty")
	private Integer maxQty;

	/**
	 * 온도 유형 - 로케이션 보관 온도 조건 코드 (예: ROOM-상온, COLD-냉장, FROZEN-냉동).
	 * SKU의 tempType과 매칭하여 적치 가능 여부 판단에 활용
	 */
	@Column (name = "temp_type", length = 20)
	private String tempType;

	/**
	 * 랙 유형 - 랙 설비 구조 유형 코드 (예: FLOOR-평치, SHELF-선반, DRIVE-드라이브인, FLOW-흐름랙)
	 */
	@Column (name = "rack_type", length = 20)
	private String rackType;

	/**
	 * 제한 유형 - 해당 로케이션에 금지된 작업 유형 코드
	 * (예: IN-입고제한, OUT-출고제한, MOVE-이동제한). InventoryTransactionService에서 체크
	 */
	@Column (name = "restrict_type", length = 20)
	private String restrictType;

	/**
	 * 혼적 허용 여부 - true이면 서로 다른 상품(SKU)을 같은 로케이션에 보관 가능.
	 * false이면 단일 SKU만 보관 가능하며 입고/이동 시 혼적 체크 수행
	 */
	@Column (name = "mixable_flag")
	private Boolean mixableFlag;

	/**
	 * 삭제 여부 - true이면 사용 중지된 로케이션. 입고/이동 대상에서 제외됨
	 */
	@Column (name = "del_flag")
	private Boolean delFlag = false;

	/**
	 * 비고
	 */
	@Column (name = "remarks", length = 255)
	private String remarks;

	/**
	 * 사용자 정의 속성 1 - 창고/운영사별 커스텀 속성 값
	 */
	@Column (name = "attr01", length = 100)
	private String attr01;

	/**
	 * 사용자 정의 속성 2 - 창고/운영사별 커스텀 속성 값
	 */
	@Column (name = "attr02", length = 100)
	private String attr02;

	/**
	 * 사용자 정의 속성 3 - 창고/운영사별 커스텀 속성 값
	 */
	@Column (name = "attr03", length = 100)
	private String attr03;

	/**
	 * 사용자 정의 속성 4 - 창고/운영사별 커스텀 속성 값
	 */
	@Column (name = "attr04", length = 100)
	private String attr04;

	/**
	 * 사용자 정의 속성 5 - 창고/운영사별 커스텀 속성 값
	 */
	@Column (name = "attr05", length = 100)
	private String attr05;
  
	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}

	public String getWhCd() {
		return whCd;
	}

	public void setWhCd(String whCd) {
		this.whCd = whCd;
	}

	public String getLocCd() {
		return locCd;
	}

	public void setLocCd(String locCd) {
		this.locCd = locCd;
	}

	public String getLocType() {
		return locType;
	}

	public void setLocType(String locType) {
		this.locType = locType;
	}

	public String getLocGroup() {
		return locGroup;
	}

	public void setLocGroup(String locGroup) {
		this.locGroup = locGroup;
	}

	public String getZoneCd() {
		return zoneCd;
	}

	public void setZoneCd(String zoneCd) {
		this.zoneCd = zoneCd;
	}

	public String getComCd() {
		return comCd;
	}

	public void setComCd(String comCd) {
		this.comCd = comCd;
	}

	public String getSkuCd() {
		return skuCd;
	}

	public void setSkuCd(String skuCd) {
		this.skuCd = skuCd;
	}

	public String getLocRow() {
		return locRow;
	}

	public void setLocRow(String locRow) {
		this.locRow = locRow;
	}

	public String getLocCol() {
		return locCol;
	}

	public void setLocCol(String locCol) {
		this.locCol = locCol;
	}

	public String getLocDan() {
		return locDan;
	}

	public void setLocDan(String locDan) {
		this.locDan = locDan;
	}

	public Integer getSortNo() {
		return sortNo;
	}

	public void setSortNo(Integer sortNo) {
		this.sortNo = sortNo;
	}

	public Float getLocWdt() {
		return locWdt;
	}

	public void setLocWdt(Float locWdt) {
		this.locWdt = locWdt;
	}

	public Float getLocVtc() {
		return locVtc;
	}

	public void setLocVtc(Float locVtc) {
		this.locVtc = locVtc;
	}

	public Float getLocHgt() {
		return locHgt;
	}

	public void setLocHgt(Float locHgt) {
		this.locHgt = locHgt;
	}

	public Float getLocCbm() {
		return locCbm;
	}

	public void setLocCbm(Float locCbm) {
		this.locCbm = locCbm;
	}

	public Float getMaxWeight() {
		return maxWeight;
	}

	public void setMaxWeight(Float maxWeight) {
		this.maxWeight = maxWeight;
	}

	public Integer getMaxQty() {
		return maxQty;
	}

	public void setMaxQty(Integer maxQty) {
		this.maxQty = maxQty;
	}

	public String getTempType() {
		return tempType;
	}

	public void setTempType(String tempType) {
		this.tempType = tempType;
	}

	public String getRackType() {
		return rackType;
	}

	public void setRackType(String rackType) {
		this.rackType = rackType;
	}

	public String getRestrictType() {
		return restrictType;
	}

	public void setRestrictType(String restrictType) {
		this.restrictType = restrictType;
	}

	public Boolean getMixableFlag() {
		return mixableFlag;
	}

	public void setMixableFlag(Boolean mixableFlag) {
		this.mixableFlag = mixableFlag;
	}

	public Boolean getDelFlag() {
		return delFlag;
	}

	public void setDelFlag(Boolean delFlag) {
		this.delFlag = delFlag;
	}

	public String getRemarks() {
		return remarks;
	}

	public void setRemarks(String remarks) {
		this.remarks = remarks;
	}

	public String getAttr01() {
		return attr01;
	}

	public void setAttr01(String attr01) {
		this.attr01 = attr01;
	}

	public String getAttr02() {
		return attr02;
	}

	public void setAttr02(String attr02) {
		this.attr02 = attr02;
	}

	public String getAttr03() {
		return attr03;
	}

	public void setAttr03(String attr03) {
		this.attr03 = attr03;
	}

	public String getAttr04() {
		return attr04;
	}

	public void setAttr04(String attr04) {
		this.attr04 = attr04;
	}

	public String getAttr05() {
		return attr05;
	}

	public void setAttr05(String attr05) {
		this.attr05 = attr05;
	}	
}
