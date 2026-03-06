package operato.wms.base.entity;

import operato.wms.base.entity.relation.CompanyRef;
import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.Index;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Relation;
import xyz.elidom.dbist.annotation.Table;

@Table(name = "box_types", idStrategy = GenerationRule.UUID, uniqueFields="boxTypeCd,domainId", indexes = {
	@Index(name = "ix_box_types_0", columnList = "box_type_cd,domain_id", unique = true),
	@Index(name = "ix_box_types_1", columnList = "com_cd,wh_cd,domain_id")
})
public class BoxType extends xyz.elidom.orm.entity.basic.ElidomStampHook {
	/**
	 * SerialVersion UID
	 */
	private static final long serialVersionUID = 474556978854928499L;

	@PrimaryKey
	@Column (name = "id", nullable = false, length = 40)
	private String id;
	
    @Column(name = "company_id", length = 40)
    private String companyId;
    
    @Relation(field = "companyId")
    private CompanyRef company;

	@Column (name = "com_cd", nullable = false, length = 30)
	private String comCd;

	@Column (name = "wh_cd", nullable = false, length = 30)
	private String whCd;

	@Column (name = "box_type_cd", nullable = false, length = 30)
	private String boxTypeCd;

	@Column (name = "box_type_nm", nullable = false, length = 40)
	private String boxTypeNm;

	@Column (name = "box_len")
	private Float boxLen;

	@Column (name = "box_wd")
	private Float boxWd;

	@Column (name = "box_ht")
	private Float boxHt;

	@Column (name = "box_vol")
	private Float boxVol;
	
	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}

	public String getCompanyId() {
        return companyId;
    }

    public void setCompanyId(String companyId) {
        this.companyId = companyId;
    }

    public CompanyRef getCompany() {
        return company;
    }

    public void setCompany(CompanyRef company) {
        this.company = company;
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
}
