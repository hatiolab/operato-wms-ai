package operato.wms.base.entity;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;

@Table(name = "box_types", idStrategy = GenerationRule.UUID, uniqueFields = "boxTypeCd,domainId", indexes = {
		@Index(name = "ix_box_types_0", columnList = "box_type_cd,domain_id", unique = true),
		@Index(name = "ix_box_types_1", columnList = "com_cd,wh_cd,domain_id")
})
public class BoxType extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 474556978854928499L;

	/**
	 * 박스 유형 고유 ID (UUID)
	 */
	@PrimaryKey
	@Column(name = "id", nullable = false, length = 40)
	private String id;

	/**
	 * 화주사 코드 - 이 박스 유형을 사용하는 화주사 코드.
	 * 화주사별로 별도 박스 규격을 관리할 수 있음
	 */
	@Column(name = "com_cd", nullable = false, length = 30)
	private String comCd;

	/**
	 * 창고 코드 - 이 박스 유형이 사용되는 창고 코드.
	 * 창고별로 다른 박스 규격을 운영할 수 있음
	 */
	@Column(name = "wh_cd", nullable = false, length = 30)
	private String whCd;

	/**
	 * 박스 유형 코드 - 도메인 내 고유 박스 규격 식별 코드 (예: BOX-S, BOX-M, BOX-L)
	 */
	@Column(name = "box_type_cd", nullable = false, length = 30)
	private String boxTypeCd;

	/**
	 * 박스 유형 명칭 - 박스 규격의 공식 명칭 (예: 소형박스, 중형박스)
	 */
	@Column(name = "box_type_nm", nullable = false, length = 40)
	private String boxTypeNm;

	/**
	 * 박스 길이 (mm) - 박스 외부 치수 기준 가로 길이
	 */
	@Column(name = "box_len")
	private Float boxLen;

	/**
	 * 박스 너비 (mm) - 박스 외부 치수 기준 세로 너비
	 */
	@Column(name = "box_wd")
	private Float boxWd;

	/**
	 * 박스 높이 (mm) - 박스 외부 치수 기준 높이
	 */
	@Column(name = "box_ht")
	private Float boxHt;

	/**
	 * 박스 부피 (cm³) - boxLen × boxWd × boxHt 의 사전 계산값.
	 * 조회 성능을 위해 저장하며 치수 변경 시 함께 갱신 필요
	 */
	@Column(name = "box_vol")
	private Float boxVol;

	/**
	 * 최대 적재 중량 (kg) - 이 박스에 담을 수 있는 최대 상품 중량.
	 * 포장 시 상품 합산 중량이 이 값을 초과하면 더 큰 박스로 전환
	 */
	@Column(name = "max_weight")
	private Float maxWeight;

	/**
	 * 박스 자체 무게 (g) - 빈 박스의 무게 (tare weight).
	 * 배송 총 중량 = 상품 중량 합계 + emptyWeight. 운임 정확 계산에 활용
	 */
	@Column(name = "empty_weight")
	private Float emptyWeight;

	/**
	 * 박스 단가 (원) - 박스 1개당 구매/사용 단가.
	 * 포장 원가 계산 및 화주사별 포장비 청구에 활용
	 */
	@Column(name = "cost_per_box")
	private Float costPerBox;

	/**
	 * 정렬 순서 - 박스 자동 선택 시 우선순위.
	 * 동일 조건(부피·중량 모두 충족)에서 sortNo가 낮은 박스를 우선 선택
	 */
	@Column(name = "sort_no")
	private Integer sortNo;

	/**
	 * 삭제 여부 - true이면 단종/폐기된 박스 유형. 포장 대상에서 제외됨
	 */
	@Column(name = "del_flag")
	private Boolean delFlag = false;

	/**
	 * 비고
	 */
	@Column(name = "remarks", length = 255)
	private String remarks;

	/**
	 * 사용자 정의 속성 1 - 운영사별 커스텀 속성 값
	 */
	@Column(name = "attr01", length = 100)
	private String attr01;

	/**
	 * 사용자 정의 속성 2 - 운영사별 커스텀 속성 값
	 */
	@Column(name = "attr02", length = 100)
	private String attr02;

	/**
	 * 사용자 정의 속성 3 - 운영사별 커스텀 속성 값
	 */
	@Column(name = "attr03", length = 100)
	private String attr03;

	/**
	 * 사용자 정의 속성 4 - 운영사별 커스텀 속성 값
	 */
	@Column(name = "attr04", length = 100)
	private String attr04;

	/**
	 * 사용자 정의 속성 5 - 운영사별 커스텀 속성 값
	 */
	@Column(name = "attr05", length = 100)
	private String attr05;

	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}

	public String getComCd() {
		return comCd;
	}

	public void setComCd(String comCd) {
		this.comCd = comCd;
	}

	public String getWhCd() {
		return whCd;
	}

	public void setWhCd(String whCd) {
		this.whCd = whCd;
	}

	public String getBoxTypeCd() {
		return boxTypeCd;
	}

	public void setBoxTypeCd(String boxTypeCd) {
		this.boxTypeCd = boxTypeCd;
	}

	public String getBoxTypeNm() {
		return boxTypeNm;
	}

	public void setBoxTypeNm(String boxTypeNm) {
		this.boxTypeNm = boxTypeNm;
	}

	public Float getBoxLen() {
		return boxLen;
	}

	public void setBoxLen(Float boxLen) {
		this.boxLen = boxLen;
	}

	public Float getBoxWd() {
		return boxWd;
	}

	public void setBoxWd(Float boxWd) {
		this.boxWd = boxWd;
	}

	public Float getBoxHt() {
		return boxHt;
	}

	public void setBoxHt(Float boxHt) {
		this.boxHt = boxHt;
	}

	public Float getBoxVol() {
		return boxVol;
	}

	public void setBoxVol(Float boxVol) {
		this.boxVol = boxVol;
	}

	public Float getMaxWeight() {
		return maxWeight;
	}

	public void setMaxWeight(Float maxWeight) {
		this.maxWeight = maxWeight;
	}

	public Float getEmptyWeight() {
		return emptyWeight;
	}

	public void setEmptyWeight(Float emptyWeight) {
		this.emptyWeight = emptyWeight;
	}

	public Float getCostPerBox() {
		return costPerBox;
	}

	public void setCostPerBox(Float costPerBox) {
		this.costPerBox = costPerBox;
	}

	public Integer getSortNo() {
		return sortNo;
	}

	public void setSortNo(Integer sortNo) {
		this.sortNo = sortNo;
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
