package operato.wms.base.entity.relation;

import java.io.Serializable;

import xyz.elidom.dbist.annotation.Column;
import xyz.elidom.dbist.annotation.GenerationRule;
import xyz.elidom.dbist.annotation.PrimaryKey;
import xyz.elidom.dbist.annotation.Table;

@Table(name = "companies", idStrategy = GenerationRule.UUID, isRef = true)
public class CompanyRef implements Serializable {
    /**
     * SerialVersion UID
     */
    private static final long serialVersionUID = 491490733301332732L;

    @PrimaryKey
    @Column (name = "id", nullable = false, length = 40)
    private String id;

    @Column (name = "com_cd", nullable = false, length = 20)
    private String comCd;

    @Column (name = "com_nm", nullable = false, length = 100)
    private String comNm;

    @Column (name = "com_alias", length = 100)
    private String comAlias;

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

    public String getComNm() {
        return comNm;
    }

    public void setComNm(String comNm) {
        this.comNm = comNm;
    }

    public String getComAlias() {
        return comAlias;
    }

    public void setComAlias(String comAlias) {
        this.comAlias = comAlias;
    }
}
