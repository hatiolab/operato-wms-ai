package operato.wms.base.cache;

import java.lang.reflect.Method;

import org.springframework.cache.interceptor.KeyGenerator;
import org.springframework.stereotype.Component;

import xyz.elidom.exception.server.ElidomRuntimeException;
import xyz.elidom.sys.SysConstants;
import xyz.elidom.sys.entity.Domain;

/**
 * RuntimeEnvItem을 조회하는 (FindItem(Long domainId, String comCd, String whCd))에 해당하는 API에서 Cache 키를 생성하는 CacheKeyGenerator
 * {domainId}-{comCd}-{whCd}로 캐쉬 키를 생성한다.
 * 
 * @author shortstop
 */
@Component
public class RuntimeEnvFindApiKeyGenerator implements KeyGenerator {

    @Override
    public Object generate(Object target, Method method, Object... params) {
        Domain domain = null;
        try {
            domain = Domain.currentDomain();
        } catch (Exception e) {
            throw new ElidomRuntimeException("Can not find current domain!");
        }
        
        return domain.getId() + SysConstants.DASH + params[1].toString() + SysConstants.DASH + params[2].toString();
    }
}
