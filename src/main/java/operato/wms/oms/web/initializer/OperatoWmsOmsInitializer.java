package operato.wms.oms.web.initializer;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import operato.wms.oms.config.ModuleProperties;
import operato.wms.oms.query.store.OmsQueryStore;
import xyz.elidom.orm.IQueryManager;
import xyz.elidom.sys.config.ModuleConfigSet;
import xyz.elidom.sys.system.service.api.IEntityFieldCache;
import xyz.elidom.sys.system.service.api.IServiceFinder;
import xyz.elidom.util.ValueUtil;

/**
 * Operato WMS Oms Startup시 Framework 초기화 클래스
 *
 * @author HatioLab
 */
@Component
public class OperatoWmsOmsInitializer {
	/**
	 * Logger
	 */
	private Logger logger = LoggerFactory.getLogger(OperatoWmsOmsInitializer.class);

	@Autowired
	@Qualifier("rest")
	private IServiceFinder restFinder;

	@Autowired
	private IEntityFieldCache entityFieldCache;

	@Autowired
	private IQueryManager queryManager;

	@Autowired
	private OmsQueryStore omsQueryStore;

	@Autowired
	private ModuleProperties module;

	@Autowired
	private ModuleConfigSet configSet;

	@EventListener({ ContextRefreshedEvent.class })
	public void refresh(ContextRefreshedEvent event) {
		this.logger.info("Operato WMS Oms module refreshing...");

		this.configSet.addConfig(this.module.getName(), this.module);
		this.scanServices();

		this.logger.info("Operato WMS Oms module refreshed!");
	}

	@EventListener({ApplicationReadyEvent.class})
	void ready(ApplicationReadyEvent event) {
		this.logger.info("Operato WMS Oms module initializing...");

		this.initQueryStores();
		this.initShipmentOrderBulkImportButton();

		this.logger.info("Operato WMS Oms module initialized!");
	}

	/**
	 * 모듈 서비스 스캔
	 */
	private void scanServices() {
		this.entityFieldCache.scanEntityFieldsByBasePackage(this.module.getBasePackage());
		this.restFinder.scanServicesByPackage(this.module.getName(), this.module.getBasePackage());
	}

	/**
	 * 쿼리 스토어 초기화
	 */
	private void initQueryStores() {
		String dbType = this.queryManager.getDbType();
		this.omsQueryStore.initQueryStore(dbType);
	}

	/**
	 * 출하주문 현황 동적 메뉴에 대량 엑셀 등록 버튼과 화면 용어를 등록한다.
	 */
	@SuppressWarnings("unchecked")
	private void initShipmentOrderBulkImportButton() {
		try {
			List<Long> domainIds = this.queryManager.selectListBySql(
					"SELECT id FROM domains",
					Map.of(),
					Long.class,
					0,
					0);
			String menuSql = "SELECT id FROM menus "
					+ "WHERE domain_id = :domainId AND routing = :routing";

			for (Long domainId : domainIds) {
				List<Map<String, Object>> menus = (List<Map<String, Object>>) (List<?>) this.queryManager.selectListBySql(
						menuSql,
						ValueUtil.newMap("domainId,routing", domainId, "shipment-order-status"),
						Map.class,
						0,
						0);
				for (Map<String, Object> menu : menus) {
					String menuId = ValueUtil.toString(menu.get("id"));
					this.insertBulkImportButton(domainId, menuId);
					this.insertBulkImportTerminologies(domainId);
				}
			}
		} catch (Exception e) {
			this.logger.warn("출하주문 대량 엑셀 등록 버튼 초기화 실패: {}", e.getMessage());
		}
	}

	/**
	 * 도메인별 출하주문 현황 메뉴에 팝업 버튼을 중복 없이 추가한다.
	 *
	 * @param domainId 도메인 ID
	 * @param menuId   메뉴 ID
	 */
	private void insertBulkImportButton(Long domainId, String menuId) {
		String countSql = "SELECT COUNT(*) FROM menu_buttons "
				+ "WHERE domain_id = :domainId AND menu_id = :menuId AND text = :text";
		Map<String, Object> params = ValueUtil.newMap(
				"domainId,menuId,text",
				domainId,
				menuId,
				"shipment_bulk_import");
		Integer count = this.queryManager.selectBySql(countSql, params, Integer.class);
		if (count != null && count > 0) {
			return;
		}

		String logic = "{\"module\":\"operato-wes\","
				+ "\"import\":\"./pages/oms/shipment-order-bulk-import-popup.js\","
				+ "\"tagname\":\"shipment-order-bulk-import-popup\","
				+ "\"menu\":\"ShipmentOrderBulkImportPopup\","
				+ "\"size\":\"large\","
				+ "\"title\":\"text.shipment_bulk_import_title\","
				+ "\"close_handler\":\"parent.fetch\"}";
		String insertSql = "INSERT INTO menu_buttons "
				+ "(id, menu_id, rank, style, icon, text, auth, logic, button_type, domain_id, confirm_flag) "
				+ "VALUES (:id, :menuId, :rank, :style, :icon, :text, :auth, :logic, :buttonType, :domainId, :confirmFlag)";
		Map<String, Object> insertParams = ValueUtil.newMap(
				"id,menuId,rank,style,icon,text,auth,logic,buttonType,domainId,confirmFlag",
				UUID.randomUUID().toString(),
				menuId,
				90,
				"upload",
				"",
				"shipment_bulk_import",
				"show",
				logic,
				"popup-link-search-form",
				domainId,
				false);
		this.queryManager.executeBySql(insertSql, insertParams);
	}

	/**
	 * 대량 엑셀 등록 팝업에서 사용하는 다국어 용어를 도메인에 등록한다.
	 *
	 * @param domainId 도메인 ID
	 */
	private void insertBulkImportTerminologies(Long domainId) {
		String[][] terms = {
				{ "button", "shipment_bulk_import", "ko", "대량 엑셀 등록" },
				{ "button", "shipment_bulk_import", "en", "Bulk Excel Import" },
				{ "button", "shipment_bulk_import", "ja", "Excel一括登録" },
				{ "button", "shipment_bulk_import", "zh", "批量Excel导入" },
				{ "button", "template", "ko", "템플릿 다운로드" },
				{ "button", "template", "en", "Download Template" },
				{ "button", "template", "ja", "テンプレートをダウンロード" },
				{ "button", "template", "zh", "下载模板" },
				{ "button", "validate", "ko", "검증" },
				{ "button", "validate", "en", "Validate" },
				{ "button", "validate", "ja", "検証" },
				{ "button", "validate", "zh", "验证" },
				{ "text", "shipment_bulk_import_title", "ko", "출하주문 대량 엑셀 등록" },
				{ "text", "shipment_bulk_import_title", "en", "Bulk Shipment Order Import" },
				{ "text", "shipment_bulk_import_title", "ja", "出荷注文Excel一括登録" },
				{ "text", "shipment_bulk_import_title", "zh", "批量导入出库订单" },
				{ "text", "shipment_bulk_import_description", "ko", "전체 파일을 먼저 검증한 뒤 주문 단위 묶음으로 등록합니다. 최대 20,000행을 지원합니다." },
				{ "text", "shipment_bulk_import_description", "en", "The whole file is validated first and then imported in order groups. Up to 20,000 rows are supported." },
				{ "text", "shipment_bulk_import_description", "ja", "ファイル全体を検証した後、注文単位で登録します。最大20,000行に対応します。" },
				{ "text", "shipment_bulk_import_description", "zh", "先验证整个文件，再按订单分组导入。最多支持20,000行。" },
				{ "text", "shipment_bulk_import_b2c", "ko", "B2C 출하주문" },
				{ "text", "shipment_bulk_import_b2c", "en", "B2C Shipment Orders" },
				{ "text", "shipment_bulk_import_b2c", "ja", "B2C出荷注文" },
				{ "text", "shipment_bulk_import_b2c", "zh", "B2C出库订单" },
				{ "text", "shipment_bulk_import_b2b", "ko", "B2B 출하주문" },
				{ "text", "shipment_bulk_import_b2b", "en", "B2B Shipment Orders" },
				{ "text", "shipment_bulk_import_b2b", "ja", "B2B出荷注文" },
				{ "text", "shipment_bulk_import_b2b", "zh", "B2B出库订单" },
				{ "text", "shipment_bulk_import_chunk_size", "ko", "처리 단위(행)" },
				{ "text", "shipment_bulk_import_chunk_size", "en", "Chunk size (rows)" },
				{ "text", "shipment_bulk_import_chunk_size", "ja", "処理単位（行）" },
				{ "text", "shipment_bulk_import_chunk_size", "zh", "处理单位（行）" },
				{ "text", "shipment_bulk_import_chunk_size_hint", "ko", "20~2,000행 사이에서 설정할 수 있으며 동일 주문은 분리하지 않습니다." },
				{ "text", "shipment_bulk_import_chunk_size_hint", "en", "Set between 20 and 2,000 rows. Rows in the same order are not split." },
				{ "text", "shipment_bulk_import_chunk_size_hint", "ja", "20～2,000行で設定できます。同一注文は分割しません。" },
				{ "text", "shipment_bulk_import_chunk_size_hint", "zh", "可设置为20至2,000行，同一订单不会拆分。" },
				{ "text", "shipment_bulk_import_elapsed_time", "ko", "경과 시간" },
				{ "text", "shipment_bulk_import_elapsed_time", "en", "Elapsed" },
				{ "text", "shipment_bulk_import_elapsed_time", "ja", "経過時間" },
				{ "text", "shipment_bulk_import_elapsed_time", "zh", "耗时" },
				{ "text", "shipment_bulk_import_file_guide", "ko", "xlsx 파일을 여기에 놓거나 클릭하여 선택하세요." },
				{ "text", "shipment_bulk_import_file_guide", "en", "Drop an xlsx file here or click to select it." },
				{ "text", "shipment_bulk_import_file_guide", "ja", "xlsxファイルをここにドロップするか、クリックして選択してください。" },
				{ "text", "shipment_bulk_import_file_guide", "zh", "将xlsx文件拖到此处或点击选择。" },
				{ "text", "shipment_bulk_import_xlsx_only", "ko", "xlsx 파일만 등록할 수 있습니다." },
				{ "text", "shipment_bulk_import_xlsx_only", "en", "Only xlsx files can be imported." },
				{ "text", "shipment_bulk_import_xlsx_only", "ja", "xlsxファイルのみ登録できます。" },
				{ "text", "shipment_bulk_import_xlsx_only", "zh", "只能导入xlsx文件。" },
				{ "text", "shipment_bulk_import_parsing", "ko", "엑셀 파일을 읽고 있습니다." },
				{ "text", "shipment_bulk_import_parsing", "en", "Reading the Excel file." },
				{ "text", "shipment_bulk_import_parsing", "ja", "Excelファイルを読み込んでいます。" },
				{ "text", "shipment_bulk_import_parsing", "zh", "正在读取Excel文件。" },
				{ "text", "shipment_bulk_import_empty_file", "ko", "등록할 데이터가 없습니다." },
				{ "text", "shipment_bulk_import_empty_file", "en", "There is no data to import." },
				{ "text", "shipment_bulk_import_empty_file", "ja", "登録するデータがありません。" },
				{ "text", "shipment_bulk_import_empty_file", "zh", "没有可导入的数据。" },
				{ "text", "shipment_bulk_import_row_limit", "ko", "최대 {0}행까지 등록할 수 있습니다." },
				{ "text", "shipment_bulk_import_row_limit", "en", "Up to {0} rows can be imported." },
				{ "text", "shipment_bulk_import_row_limit", "ja", "最大{0}行まで登録できます。" },
				{ "text", "shipment_bulk_import_row_limit", "zh", "最多可导入{0}行。" },
				{ "text", "shipment_bulk_import_validating", "ko", "전체 데이터를 검증하고 있습니다." },
				{ "text", "shipment_bulk_import_validating", "en", "Validating all rows." },
				{ "text", "shipment_bulk_import_validating", "ja", "全データを検証しています。" },
				{ "text", "shipment_bulk_import_validating", "zh", "正在验证全部数据。" },
				{ "text", "shipment_bulk_import_validation_failed", "ko", "오류 행이 있습니다. 오류를 수정한 파일로 다시 검증하세요." },
				{ "text", "shipment_bulk_import_validation_failed", "en", "Some rows have errors. Fix the file and validate it again." },
				{ "text", "shipment_bulk_import_validation_failed", "ja", "エラー行があります。ファイルを修正して再検証してください。" },
				{ "text", "shipment_bulk_import_validation_failed", "zh", "存在错误行。请修正文件后重新验证。" },
				{ "text", "shipment_bulk_import_validation_complete", "ko", "전체 검증이 완료되었습니다. 등록을 시작할 수 있습니다." },
				{ "text", "shipment_bulk_import_validation_complete", "en", "Validation is complete. The import can now be started." },
				{ "text", "shipment_bulk_import_validation_complete", "ja", "検証が完了しました。登録を開始できます。" },
				{ "text", "shipment_bulk_import_validation_complete", "zh", "验证完成，可以开始导入。" },
				{ "text", "shipment_bulk_import_importing", "ko", "검증된 출하주문을 등록하고 있습니다." },
				{ "text", "shipment_bulk_import_importing", "en", "Importing validated shipment orders." },
				{ "text", "shipment_bulk_import_importing", "ja", "検証済みの出荷注文を登録しています。" },
				{ "text", "shipment_bulk_import_importing", "zh", "正在导入已验证的出库订单。" },
				{ "text", "shipment_bulk_import_partial_failed", "ko", "일부 묶음 등록에 실패했습니다. 오류 내역을 확인하세요." },
				{ "text", "shipment_bulk_import_partial_failed", "en", "Some import chunks failed. Review the errors." },
				{ "text", "shipment_bulk_import_partial_failed", "ja", "一部の登録に失敗しました。エラー内容を確認してください。" },
				{ "text", "shipment_bulk_import_partial_failed", "zh", "部分批次导入失败，请检查错误。" },
				{ "text", "shipment_bulk_import_complete", "ko", "출하주문 대량 등록이 완료되었습니다." },
				{ "text", "shipment_bulk_import_complete", "en", "Bulk shipment order import is complete." },
				{ "text", "shipment_bulk_import_complete", "ja", "出荷注文の一括登録が完了しました。" },
				{ "text", "shipment_bulk_import_complete", "zh", "出库订单批量导入完成。" },
				{ "text", "shipment_bulk_import_unknown_error", "ko", "처리 중 알 수 없는 오류가 발생했습니다." },
				{ "text", "shipment_bulk_import_unknown_error", "en", "An unknown error occurred while processing." },
				{ "text", "shipment_bulk_import_unknown_error", "ja", "処理中に不明なエラーが発生しました。" },
				{ "text", "shipment_bulk_import_unknown_error", "zh", "处理过程中发生未知错误。" },
				{ "text", "shipment_bulk_import_template_missing", "ko", "등록된 출하주문 템플릿이 없습니다." },
				{ "text", "shipment_bulk_import_template_missing", "en", "No shipment-order template is configured." },
				{ "text", "shipment_bulk_import_template_missing", "ja", "出荷注文テンプレートが登録されていません。" },
				{ "text", "shipment_bulk_import_template_missing", "zh", "未配置出库订单模板。" },
				{ "text", "shipment_bulk_import_total_rows", "ko", "전체 행" },
				{ "text", "shipment_bulk_import_total_rows", "en", "Total rows" },
				{ "text", "shipment_bulk_import_total_rows", "ja", "全行" },
				{ "text", "shipment_bulk_import_total_rows", "zh", "总行数" },
				{ "text", "shipment_bulk_import_total_orders", "ko", "전체 주문" },
				{ "text", "shipment_bulk_import_total_orders", "en", "Total orders" },
				{ "text", "shipment_bulk_import_total_orders", "ja", "全注文" },
				{ "text", "shipment_bulk_import_total_orders", "zh", "总订单数" },
				{ "text", "shipment_bulk_import_valid_rows", "ko", "검증 성공" },
				{ "text", "shipment_bulk_import_valid_rows", "en", "Valid rows" },
				{ "text", "shipment_bulk_import_valid_rows", "ja", "検証成功" },
				{ "text", "shipment_bulk_import_valid_rows", "zh", "验证成功" },
				{ "text", "shipment_bulk_import_error_rows", "ko", "오류 행" },
				{ "text", "shipment_bulk_import_error_rows", "en", "Error rows" },
				{ "text", "shipment_bulk_import_error_rows", "ja", "エラー行" },
				{ "text", "shipment_bulk_import_error_rows", "zh", "错误行" },
				{ "text", "shipment_bulk_import_registered_rows", "ko", "등록 완료" },
				{ "text", "shipment_bulk_import_registered_rows", "en", "Imported rows" },
				{ "text", "shipment_bulk_import_registered_rows", "ja", "登録完了" },
				{ "text", "shipment_bulk_import_registered_rows", "zh", "已导入行" },
				{ "text", "shipment_bulk_import_progress", "ko", "처리 진행률" },
				{ "text", "shipment_bulk_import_progress", "en", "Progress" },
				{ "text", "shipment_bulk_import_progress", "ja", "処理進捗" },
				{ "text", "shipment_bulk_import_progress", "zh", "处理进度" }
		};

		String countSql = "SELECT COUNT(*) FROM terminologies "
				+ "WHERE domain_id = :domainId AND category = :category AND name = :name AND locale = :locale";
		String insertSql = "INSERT INTO terminologies "
				+ "(name, description, locale, category, display, domain_id, created_at, updated_at) "
				+ "VALUES (:name, :description, :locale, :category, :display, :domainId, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)";

		for (String[] term : terms) {
			Map<String, Object> params = ValueUtil.newMap(
					"category,name,locale,display,domainId,description",
					term[0],
					term[1],
					term[2],
					term[3],
					domainId,
					"Shipment order bulk import pilot");
			Integer count = this.queryManager.selectBySql(countSql, params, Integer.class);
			if (count == null || count == 0) {
				this.queryManager.executeBySql(insertSql, params);
			}
		}
	}
}
