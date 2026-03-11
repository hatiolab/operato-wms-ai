/* Copyright © HatioLab Inc. All rights reserved. */
package operato.wms.base.web.controller;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * SPA (Single Page Application) 라우팅 지원 컨트롤러
 *
 * 프론트엔드(operato-wms-app)의 클라이언트 사이드 라우팅을 지원하기 위해
 * REST API가 아닌 모든 경로를 index.html로 포워딩합니다.
 *
 * 개발 모드(spring.profiles.active=dev)에서는 비활성화되며,
 * 프론트엔드는 별도 포트(3000)에서 실행됩니다.
 *
 * @author operato
 */
@Controller
@ConditionalOnProperty(
    name = "operato.wms.spa.enabled",
    havingValue = "true",
    matchIfMissing = true  // 기본값: 활성화
)
public class SpaController {

    /**
     * SPA 라우팅 처리
     *
     * REST API 경로(/rest/**, /graphql 등)가 아닌 모든 경로를
     * index.html로 포워딩하여 프론트엔드 라우터가 처리하도록 합니다.
     *
     * 예시:
     * - / → index.html
     * - /inbound → index.html (프론트엔드 라우터가 처리)
     * - /inbound/receive-list → index.html (프론트엔드 라우터가 처리)
     * - /rest/... → REST API 처리 (이 메서드에서 제외됨)
     */
    @GetMapping(value = {
        "/",
        "/{path:[^\\.]*}",              // 확장자 없는 단일 경로
        "/{path:[^\\.]*}/{subpath:.*}"  // 확장자 없는 중첩 경로
    })
    public String forward() {
        return "forward:/index.html";
    }
}
