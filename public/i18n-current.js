(() => {
  'use strict';

  const LANG_KEY = 'uniq-language-v1';
  const SUPPORTED = ['ru','vi','en','ko','zh'];
  const INDEX = { vi:0, en:1, ko:2, zh:3 };
  const originalText = new WeakMap();
  const originalAttrs = new WeakMap();

  // Current React screens added after the original prototype dictionary.
  // Values: [Vietnamese, English, Korean, Simplified Chinese]. Russian is source.
  const T = {
    'Техника для Нячанга — бронь за пару минут.':['Xe cho Nha Trang — đặt trong vài phút.','Nha Trang rentals — book in minutes.','나트랑 렌탈 — 몇 분이면 예약 완료.','芽庄租车——几分钟即可预订。'],
    'Выберите модель и даты, оплатите бронь, продлевайте аренду и управляйте поездкой прямо в Telegram.':['Chọn mẫu xe và ngày thuê, thanh toán đặt chỗ, gia hạn và quản lý chuyến đi ngay trong Telegram.','Choose a model and dates, pay for the booking, extend the rental and manage your trip right in Telegram.','모델과 날짜를 선택하고 예약 결제, 연장, 이용 관리를 Telegram에서 바로 하세요.','选择车型和日期、支付预订、续租，并直接在 Telegram 中管理行程。'],
    'Открыть заявку →':['Mở yêu cầu →','Open request →','요청 열기 →','打开申请 →'],
    'Источник':['Nguồn','Source','유입 경로','来源'],
    'Продлить аренду':['Gia hạn thuê','Extend rental','대여 연장','续租'],
    'Выдать технику':['Giao xe','Hand over vehicle','차량 인도','交付车辆'],
    'Начать аренду':['Bắt đầu thuê','Start rental','대여 시작','开始租赁'],
    'Продлить':['Gia hạn','Extend','연장','延长'],
    'Принять возврат':['Nhận xe trả','Accept return','반납 접수','接收归还'],
    'Завершить аренду':['Hoàn tất thuê','Complete rental','대여 완료','完成租赁'],

    'КАРТОЧКА ЗАЯВКИ':['THẺ YÊU CẦU','REQUEST DETAILS','요청 카드','申请详情'],
    'КАРТОЧКА КЛИЕНТА':['THẺ KHÁCH HÀNG','CUSTOMER PROFILE','고객 카드','客户资料'],
    '← К заявке':['← Về yêu cầu','← Back to request','← 요청으로','← 返回申请'],
    'Контакт не указан':['Chưa có liên hệ','No contact provided','연락처 없음','未提供联系方式'],
    'Заявки клиента':['Yêu cầu của khách','Customer requests','고객 요청','客户申请'],
    'Заявка':['Yêu cầu','Request','요청','申请'],
    'Период':['Thời gian','Period','기간','周期'],
    'Точка':['Điểm','Location','지점','门店'],
    'Создана':['Đã tạo','Created','생성됨','创建时间'],
    'Открыть карточку →':['Mở hồ sơ →','Open profile →','고객 카드 열기 →','打开资料 →'],
    'Закрыть':['Đóng','Close','닫기','关闭'],
    'Закрыть карточку клиента':['Đóng hồ sơ khách hàng','Close customer profile','고객 카드 닫기','关闭客户资料'],
    'Северный филиал':['Chi nhánh phía Bắc','North branch','북부 지점','北部分店'],
    'Центр города':['Trung tâm thành phố','City center','도심 지점','市中心'],
    'Точка уточняется':['Đang xác nhận điểm','Location to be confirmed','지점 확인 중','门店待确认'],

    'ОПЛАТА БРОНИ':['THANH TOÁN ĐẶT XE','BOOKING PAYMENT','예약 결제','预订付款'],
    'ОСТАТОК ПО БРОНИ':['SỐ DƯ ĐẶT XE','BOOKING BALANCE','예약 잔액','预订尾款'],
    'ДОПЛАТА ЗА ПРОДЛЕНИЕ':['THANH TOÁN GIA HẠN','EXTENSION PAYMENT','연장 추가 결제','续租补款'],
    'Стоимость':['Tổng giá','Total','총액','总价'],
    'Внесено':['Đã thanh toán','Paid','결제됨','已支付'],
    'Остаток':['Còn lại','Balance','잔액','剩余'],
    '1. Выберите сумму':['1. Chọn số tiền','1. Choose amount','1. 금액 선택','1. 选择金额'],
    'Предоплата':['Đặt cọc','Prepayment','선결제','预付款'],
    'Полная оплата':['Thanh toán toàn bộ','Full payment','전액 결제','全额支付'],
    'Продление подтверждается после доплаты':['Gia hạn được xác nhận sau khi thanh toán phần còn lại','Extension is confirmed after payment','추가 결제 후 연장이 확정됩니다','补款后确认续租'],
    'Закройте остаток одним платежом':['Thanh toán số dư trong một lần','Pay the remaining balance in one payment','남은 금액을 한 번에 결제하세요','一次付清剩余金额'],
    'Способ оплаты':['Phương thức thanh toán','Payment method','결제 수단','支付方式'],
    'Тест':['Thử nghiệm','Test','테스트','测试'],
    'Подключено':['Đã kết nối','Connected','연결됨','已连接'],
    'Создаём…':['Đang tạo…','Creating…','생성 중…','创建中…'],
    'Получить QR / ссылку':['Nhận QR / liên kết','Get QR / link','QR / 링크 받기','获取二维码 / 链接'],
    'Назначение:':['Nội dung:','Reference:','결제 참조:','付款备注：'],
    'Тестовый платёж. После подтверждения сумма будет зачислена в заявку так же, как после ответа платёжного провайдера.':['Thanh toán thử. Sau khi xác nhận, số tiền sẽ được ghi nhận vào đơn như phản hồi thực từ nhà cung cấp thanh toán.','Test payment. After confirmation, the amount is credited to the booking exactly like a payment-provider response.','테스트 결제입니다. 확인 후 실제 결제사 응답과 동일하게 예약에 금액이 반영됩니다.','测试付款。确认后，金额会像真实支付服务商回调一样计入预订。'],
    'Провайдер настроен для боевого подключения.':['Nhà cung cấp đã sẵn sàng để kết nối thực tế.','Provider is configured for live connection.','실결제 연결 준비가 완료되었습니다.','支付服务商已配置，可接入正式环境。'],
    'Открыть ссылку оплаты ↗':['Mở liên kết thanh toán ↗','Open payment link ↗','결제 링크 열기 ↗','打开支付链接 ↗'],
    'Проверяем…':['Đang kiểm tra…','Checking…','확인 중…','检查中…'],
    'Тестовая оплата: подтвердить':['Thanh toán thử: xác nhận','Test payment: confirm','테스트 결제: 확인','测试付款：确认'],
    'Оплата завершена':['Thanh toán hoàn tất','Payment complete','결제 완료','支付完成'],
    'Предоплата зачислена':['Đã ghi nhận tiền đặt cọc','Prepayment credited','선결제 반영 완료','预付款已入账'],
    'Готово':['Xong','Done','완료','完成'],
    'Оплатить остаток':['Thanh toán số dư','Pay balance','잔액 결제','支付尾款'],
    'По этой брони уже всё оплачено.':['Đơn này đã được thanh toán đầy đủ.','This booking is already fully paid.','이 예약은 이미 전액 결제되었습니다.','该预订已全部付款。'],
    'Не удалось создать платёж.':['Không thể tạo thanh toán.','Could not create payment.','결제를 생성하지 못했습니다.','无法创建付款。'],
    'Аренда оплачена полностью.':['Đã thanh toán đầy đủ tiền thuê.','Rental paid in full.','대여료 전액 결제 완료.','租金已全部支付。'],
    'Предоплата успешно зачислена.':['Đã ghi nhận tiền đặt cọc.','Prepayment credited successfully.','선결제가 정상 반영되었습니다.','预付款已成功入账。'],
    'Не удалось подтвердить платёж.':['Không thể xác nhận thanh toán.','Could not confirm payment.','결제를 확인하지 못했습니다.','无法确认付款。'],

    'CRM · КЛИЕНТЫ':['CRM · KHÁCH HÀNG','CRM · CUSTOMERS','CRM · 고객','CRM · 客户'],
    'Клиентская база UNIQ.':['Cơ sở khách hàng UNIQ.','UNIQ customer base.','UNIQ 고객 데이터베이스.','UNIQ 客户库。'],
    'История обращений и аренд, сегменты и ценность клиента — в одном мобильном экране владельца.':['Lịch sử liên hệ và thuê xe, phân khúc và giá trị khách hàng — trong một màn hình di động của chủ sở hữu.','Contact and rental history, segments and customer value — in one mobile owner screen.','문의·대여 이력, 고객 세그먼트와 가치를 하나의 모바일 소유자 화면에서 확인합니다.','联系与租赁历史、客户分层和客户价值集中在一个移动端负责人界面。'],
    'База клиентов':['Cơ sở khách hàng','Customer base','고객 기반','客户库'],
    'актуальных контактов':['liên hệ hiện có','current contacts','현재 연락처','有效联系人'],
    'Клиенты':['Khách hàng','Customers','고객','客户'],
    'единая база':['một cơ sở chung','unified database','통합 데이터베이스','统一客户库'],
    'Повторные':['Quay lại','Repeat','재방문','复购客户'],
    'вернулись снова':['đã quay lại','returned again','재방문 고객','再次回购'],
    'высокая ценность':['giá trị cao','high value','고가치','高价值'],
    'Неактивные':['Không hoạt động','Inactive','비활성','不活跃'],
    'для реактивации':['để tái kích hoạt','for reactivation','재활성화 대상','可唤回'],
    'LTV базы':['LTV cơ sở','Base LTV','고객 LTV','客户库 LTV'],
    'накопленная выручка':['doanh thu tích lũy','lifetime revenue','누적 매출','累计收入'],
    'Поиск клиентов':['Tìm khách hàng','Search customers','고객 검색','搜索客户'],
    'Имя, телефон, Telegram, страна…':['Tên, điện thoại, Telegram, quốc gia…','Name, phone, Telegram, country…','이름, 전화, Telegram, 국가…','姓名、电话、Telegram、国家…'],
    'Сегменты клиентов':['Phân khúc khách hàng','Customer segments','고객 세그먼트','客户分层'],
    'Все языки':['Tất cả ngôn ngữ','All languages','모든 언어','所有语言'],
    'Аренд':['Lượt thuê','Rentals','대여','租赁次数'],
    'Выручка':['Doanh thu','Revenue','매출','收入'],
    'Последняя':['Gần nhất','Last rental','최근 대여','最近一次'],
    'Телефон':['Điện thoại','Phone','전화','电话'],
    'Канал':['Kênh','Channel','채널','渠道'],
    'Интерес':['Quan tâm','Interest','관심','偏好'],
    'Сегмент':['Phân khúc','Segment','세그먼트','分层'],
    'Заметка':['Ghi chú','Note','메모','备注'],
    'Комментарий владельца или менеджера':['Ghi chú của chủ sở hữu hoặc quản lý','Owner or manager note','소유자 또는 매니저 메모','负责人或经理备注'],
    'ИСТОРИЯ':['LỊCH SỬ','HISTORY','이력','历史'],
    'Контакты и аренды':['Liên hệ và lượt thuê','Contacts and rentals','연락 및 대여','联系与租赁'],
    'Выберите клиента':['Chọn khách hàng','Select a customer','고객을 선택하세요','选择客户'],
    'Откроется карточка с контактами, сегментом, выручкой и историей.':['Hồ sơ sẽ hiển thị liên hệ, phân khúc, doanh thu và lịch sử.','The profile will show contacts, segment, revenue and history.','연락처, 세그먼트, 매출 및 이력이 포함된 고객 카드가 열립니다.','将打开包含联系方式、分层、收入和历史记录的客户资料。'],
    'Новый':['Mới','New','신규','新客户'],
    'Повторный':['Quay lại','Repeat','재방문','复购'],
    'Неактивный':['Không hoạt động','Inactive','비활성','不活跃'],
    'Заявка создана':['Đã tạo yêu cầu','Request created','요청 생성','申请已创建'],
    'Оплата получена':['Đã nhận thanh toán','Payment received','결제 수신','已收到付款'],
    'Платёж создан':['Đã tạo thanh toán','Payment created','결제 생성','付款已创建'],
    'Онлайн-оплата':['Thanh toán online','Online payment','온라인 결제','在线支付'],
    'Аренда завершена':['Đã hoàn tất thuê','Rental completed','대여 완료','租赁已完成'],
    'Статус аренды обновлён':['Đã cập nhật trạng thái thuê','Rental status updated','대여 상태 업데이트','租赁状态已更新'],
    'Первый контакт':['Liên hệ đầu tiên','First contact','첫 연락','首次联系'],

    'КАЛЕНДАРЬ ЗАНЯТОСТИ':['LỊCH SỬ DỤNG XE','AVAILABILITY CALENDAR','차량 일정','车辆占用日历'],
    'Весь парк по дням.':['Toàn bộ đội xe theo ngày.','The whole fleet by day.','일자별 전체 차량.','按天查看全部车队。'],
    'Брони, активные аренды, возвраты и сервис видны на одном экране.':['Xem đặt xe, thuê đang hoạt động, trả xe và bảo dưỡng trên một màn hình.','Bookings, active rentals, returns and service are visible on one screen.','예약, 대여 중, 반납, 정비를 한 화면에서 확인합니다.','预订、在租、归还和维修状态一屏可见。'],
    '← 7 дней':['← 7 ngày','← 7 days','← 7일','← 7 天'],
    '7 дней →':['7 ngày →','7 days →','7일 →','7 天 →'],
    'Все типы':['Tất cả loại','All types','모든 유형','所有类型'],
    'Все точки':['Tất cả điểm','All locations','모든 지점','所有门店'],
    'Аренда / возврат сегодня':['Thuê / trả hôm nay','Rental / return today','대여 / 오늘 반납','租赁 / 今日归还'],
    'Свободна':['Trống','Available','이용 가능','空闲'],
    'Техника':['Xe','Vehicle','차량','车辆'],
    'БРОНИРОВАНИЕ':['ĐẶT XE','BOOKING','예약','预订'],

    'ФИНАНСЫ':['TÀI CHÍNH','FINANCE','재무','财务'],
    'Деньги бизнеса — в одном экране.':['Tài chính doanh nghiệp — trên một màn hình.','Business money — on one screen.','사업 자금을 한 화면에서.','业务资金一屏掌握。'],
    'Выручка, онлайн и наличные оплаты, депозиты, возвраты и ожидающие платежи по двум точкам UNIQ.':['Doanh thu, thanh toán online và tiền mặt, tiền cọc, hoàn tiền và khoản chờ thanh toán của hai điểm UNIQ.','Revenue, online and cash payments, deposits, refunds and pending payments across both UNIQ locations.','두 UNIQ 지점의 매출, 온라인·현금 결제, 보증금, 환불, 대기 결제를 확인합니다.','查看 UNIQ 两个门店的收入、线上与现金付款、押金、退款和待付款。'],
    'Чистая выручка':['Doanh thu thuần','Net revenue','순매출','净收入'],
    'Сегодня':['Hôm nay','Today','오늘','今天'],
    '7 дней':['7 ngày','7 days','7일','7 天'],
    '30 дней':['30 ngày','30 days','30일','30 天'],
    'Всё':['Tất cả','All','전체','全部'],
    'Вернуть депозит':['Trả tiền cọc','Return deposit','보증금 반환','退还押金'],
    '+ Принять депозит':['+ Nhận tiền cọc','+ Receive deposit','+ 보증금 받기','+ 收取押金'],
    'Онлайн':['Online','Online','온라인','线上'],
    'Наличные':['Tiền mặt','Cash','현금','现金'],
    'Ожидают оплаты':['Chờ thanh toán','Pending payments','결제 대기','待付款'],
    'Депозиты на руках':['Tiền cọc đang giữ','Deposits held','보유 보증금','持有押金'],
    'Возвраты':['Hoàn tiền','Refunds','환불','退款'],
    'Валовые оплаты':['Tổng thanh toán','Gross payments','총 결제액','总付款'],
    'Возвращено депозитов':['Tiền cọc đã trả','Deposits returned','반환된 보증금','已退押金'],
    'Скидки':['Giảm giá','Discounts','할인','折扣'],
    'Расходы сервиса':['Chi phí bảo dưỡng','Service expenses','정비 비용','维修支出'],
    'ЖУРНАЛ':['NHẬT KÝ','LEDGER','내역','流水'],
    'Все движения денег':['Mọi dòng tiền','All money movements','모든 자금 흐름','全部资金流水'],
    'Поиск по операции':['Tìm giao dịch','Search transactions','거래 검색','搜索交易'],
    'Все операции':['Tất cả giao dịch','All transactions','모든 거래','所有交易'],
    'Оплаты':['Thanh toán','Payments','결제','付款'],
    'Депозиты приняты':['Đã nhận tiền cọc','Deposits received','보증금 수령','已收押金'],
    'Депозиты возвращены':['Đã trả tiền cọc','Deposits returned','보증금 반환','已退押金'],
    'Расходы':['Chi phí','Expenses','비용','支出'],
    'Загрузка финансов…':['Đang tải tài chính…','Loading finance…','재무 로딩 중…','正在加载财务…'],
    'Вернуть':['Hoàn lại','Refund','환불','退款'],
    'Проведено':['Đã xử lý','Completed','처리 완료','已处理'],
    'Операций за период нет':['Không có giao dịch trong kỳ','No transactions for this period','해당 기간 거래 없음','该期间无交易'],
    'Измените период или филиал.':['Đổi kỳ hoặc chi nhánh.','Change the period or branch.','기간 또는 지점을 변경하세요.','请更改周期或门店。'],
    'Сумма':['Số tiền','Amount','금액','金额'],
    'Метод':['Phương thức','Method','방식','方式'],
    'Комментарий':['Ghi chú','Comment','메모','备注'],
    'Заказ / клиент':['Đơn / khách hàng','Order / customer','주문 / 고객','订单 / 客户'],
    'Проводим…':['Đang xử lý…','Processing…','처리 중…','处理中…'],
    'Депозит учитывается отдельно от выручки.':['Tiền cọc được tính riêng với doanh thu.','Deposits are tracked separately from revenue.','보증금은 매출과 별도로 집계됩니다.','押金与收入分开统计。'],
    'ВОЗВРАТ':['HOÀN TIỀN','REFUND','환불','退款'],
    'Вернуть оплату':['Hoàn thanh toán','Refund payment','결제 환불','退款付款'],
    'Сумма возврата':['Số tiền hoàn','Refund amount','환불 금액','退款金额'],
    'Причина':['Lý do','Reason','사유','原因'],
    'Провести возврат':['Xử lý hoàn tiền','Process refund','환불 처리','执行退款'],

    'СЕРВИС И СОСТОЯНИЕ ПАРКА':['BẢO DƯỠNG VÀ TÌNH TRẠNG XE','SERVICE & FLEET CONDITION','정비 및 차량 상태','维修与车队状态'],
    'ТО, ремонт и осмотры.':['Bảo dưỡng, sửa chữa và kiểm tra.','Maintenance, repairs and inspections.','정기점검, 수리 및 검사.','保养、维修和检查。'],
    'Пробег, расходы и готовность техники к аренде — в одной системе владельца.':['Quãng đường, chi phí và mức sẵn sàng cho thuê — trong một hệ thống của chủ sở hữu.','Mileage, expenses and rental readiness — in one owner system.','주행거리, 비용, 대여 준비 상태를 하나의 소유자 시스템에서 관리합니다.','里程、费用和出租准备状态集中在负责人系统中。'],
    'сейчас в сервисе':['đang bảo dưỡng','in service now','현재 정비 중','当前维修中'],
    'Расходы 30 дней':['Chi phí 30 ngày','30-day expenses','30일 비용','30 天支出'],
    'Сервисные работы':['Công việc bảo dưỡng','Service work','정비 작업','维修作业'],
    '+ Новая запись':['+ Bản ghi mới','+ New record','+ 새 기록','+ 新记录'],
    'Поиск по технике, работе, сервису':['Tìm theo xe, công việc, dịch vụ','Search vehicle, work or service','차량, 작업, 정비소 검색','搜索车辆、作业或维修'],
    'Все статусы':['Tất cả trạng thái','All statuses','모든 상태','所有状态'],
    'Все работы':['Tất cả công việc','All work types','모든 작업','所有作业'],
    'Ремонт':['Sửa chữa','Repair','수리','维修'],
    'Осмотр':['Kiểm tra','Inspection','점검','检查'],
    'Подготовка':['Chuẩn bị','Preparation','준비','整备'],
    'Другое':['Khác','Other','기타','其他'],
    'Загружаем сервис…':['Đang tải bảo dưỡng…','Loading service…','정비 내역 로딩 중…','正在加载维修…'],
    'Без комментария':['Không có ghi chú','No comment','메모 없음','无备注'],
    'Расход':['Chi phí','Expense','비용','费用'],
    'В сервис':['Đưa vào bảo dưỡng','Send to service','정비 입고','送修'],
    'Вернуть в парк':['Trả về đội xe','Return to fleet','차량 복귀','返回车队'],
    'Отменить':['Hủy','Cancel','취소','取消'],
    'НОВАЯ СЕРВИСНАЯ ЗАПИСЬ':['BẢN GHI BẢO DƯỠNG MỚI','NEW SERVICE RECORD','새 정비 기록','新维修记录'],
    'Поставить технику на контроль':['Đưa xe vào theo dõi','Put vehicle under service control','차량 정비 관리 등록','将车辆纳入维修管理'],
    'Выберите технику':['Chọn xe','Select vehicle','차량 선택','选择车辆'],
    'Тип работы':['Loại công việc','Work type','작업 유형','作业类型'],
    'Пробег, км':['Số km','Mileage, km','주행거리, km','里程，公里'],
    'Следующее ТО, км':['Bảo dưỡng tiếp theo, km','Next service, km','다음 정비, km','下次保养，公里'],
    'Стоимость, ₫':['Chi phí, ₫','Cost, ₫','비용, ₫','费用，₫'],
    'Сервис / исполнитель':['Dịch vụ / đơn vị thực hiện','Service / provider','정비소 / 작업자','维修点 / 执行方'],
    'Что проверяем или ремонтируем':['Nội dung kiểm tra hoặc sửa chữa','What is being checked or repaired','점검 또는 수리 내용','检查或维修内容'],
    'Кузов / пластик':['Thân xe / nhựa','Body / plastics','차체 / 플라스틱','车身 / 塑料件'],
    'Тормоза':['Phanh','Brakes','브레이크','刹车'],
    'Шины / колёса':['Lốp / bánh xe','Tires / wheels','타이어 / 휠','轮胎 / 车轮'],
    'Сохраняем…':['Đang lưu…','Saving…','저장 중…','保存中…'],
    'Создать запись':['Tạo bản ghi','Create record','기록 생성','创建记录'],

    'МАРКЕТИНГ':['MARKETING','MARKETING','마케팅','营销'],
    'Возвращайте клиентов и заполняйте свободный парк.':['Đưa khách quay lại và lấp đầy xe đang trống.','Bring customers back and fill idle fleet.','고객을 다시 유치하고 유휴 차량을 채우세요.','召回客户并提高闲置车辆利用率。'],
    'Акции, промокоды и сегментированные кампании по клиентской базе UNIQ. Отправка каналов сейчас работает в демонстрационном режиме.':['Khuyến mãi, mã giảm giá và chiến dịch phân khúc trên cơ sở khách hàng UNIQ. Kênh gửi hiện ở chế độ demo.','Promotions, promo codes and segmented campaigns across the UNIQ customer base. Delivery channels currently run in demo mode.','UNIQ 고객 기반의 프로모션, 쿠폰, 세그먼트 캠페인입니다. 발송 채널은 현재 데모 모드입니다.','基于 UNIQ 客户库的促销、优惠码和分群营销活动。发送渠道当前为演示模式。'],
    'Активные акции':['Khuyến mãi đang chạy','Active promotions','활성 프로모션','进行中的活动'],
    'Получатели':['Người nhận','Recipients','수신자','收件人'],
    'Переходы':['Lượt nhấp','Clicks','클릭','点击'],
    'Конверсии':['Chuyển đổi','Conversions','전환','转化'],
    'АКЦИИ И ПРОМОКОДЫ':['KHUYẾN MÃI & MÃ GIẢM GIÁ','PROMOTIONS & PROMO CODES','프로모션 & 쿠폰','促销与优惠码'],
    'Управление предложениями':['Quản lý ưu đãi','Offer management','혜택 관리','优惠管理'],
    '+ Акция':['+ Khuyến mãi','+ Promotion','+ 프로모션','+ 活动'],
    'Без кода':['Không mã','No code','코드 없음','无代码'],
    'Персональное предложение UNIQ.':['Ưu đãi cá nhân UNIQ.','Personal UNIQ offer.','UNIQ 맞춤 혜택.','UNIQ 个性化优惠。'],
    'Весь парк':['Toàn bộ đội xe','Entire fleet','전체 차량','全部车队'],
    'Редактировать':['Chỉnh sửa','Edit','편집','编辑'],
    'РАССЫЛКИ':['CHIẾN DỊCH','CAMPAIGNS','캠페인','群发'],
    'Кампании по CRM-сегментам':['Chiến dịch theo phân khúc CRM','Campaigns by CRM segment','CRM 세그먼트 캠페인','按 CRM 分群的营销活动'],
    '+ Кампания':['+ Chiến dịch','+ Campaign','+ 캠페인','+ 活动'],
    'Черновик':['Bản nháp','Draft','초안','草稿'],
    'Активна':['Đang hoạt động','Active','활성','进行中'],
    'Пауза':['Tạm dừng','Paused','일시중지','暂停'],
    'Архив':['Lưu trữ','Archive','보관','归档'],
    'Запланирована':['Đã lên lịch','Scheduled','예약됨','已计划'],
    'Отправлена':['Đã gửi','Sent','발송됨','已发送'],
    'получили':['đã nhận','received','수신','已收到'],
    'открыли':['đã mở','opened','열람','已打开'],
    'перешли':['đã nhấp','clicked','클릭','已点击'],
    'купили':['đã mua','purchased','구매','已购买'],
    'DEMO отправить':['DEMO gửi','DEMO send','DEMO 발송','DEMO 发送'],
    'АКЦИЯ':['KHUYẾN MÃI','PROMOTION','프로모션','促销'],
    'Настройка промокода':['Cài đặt mã giảm giá','Promo code setup','쿠폰 설정','优惠码设置'],
    'Название':['Tên','Name','이름','名称'],
    'Промокод':['Mã giảm giá','Promo code','쿠폰 코드','优惠码'],
    'Скидка':['Giảm giá','Discount','할인','折扣'],
    'Процент':['Phần trăm','Percent','퍼센트','百分比'],
    'Сумма VND':['Số tiền VND','VND amount','VND 금액','VND 金额'],
    'Значение':['Giá trị','Value','값','数值'],
    'Лимит':['Giới hạn','Limit','한도','上限'],
    'Статус':['Trạng thái','Status','상태','状态'],
    'Описание':['Mô tả','Description','설명','描述'],
    'Север':['Bắc','North','북부','北部'],
    'Центр':['Trung tâm','Center','중심','中心'],
    'Сохранить акцию':['Lưu khuyến mãi','Save promotion','프로모션 저장','保存活动'],
    'РАССЫЛКА':['CHIẾN DỊCH','CAMPAIGN','캠페인','群发'],
    'Новая кампания':['Chiến dịch mới','New campaign','새 캠페인','新活动'],
    'Аудитория':['Đối tượng','Audience','대상','受众'],
    'Акция':['Khuyến mãi','Promotion','프로모션','促销'],
    'Без акции':['Không khuyến mãi','No promotion','프로모션 없음','无活动'],
    'Сообщение':['Tin nhắn','Message','메시지','消息'],
    'Текст предложения для клиента':['Nội dung ưu đãi cho khách hàng','Offer text for the customer','고객용 혜택 문구','给客户的优惠文案'],
    'Предпросмотр':['Xem trước','Preview','미리보기','预览'],
    'Здесь появится сообщение для клиента.':['Tin nhắn cho khách hàng sẽ xuất hiện ở đây.','The customer message will appear here.','고객 메시지가 여기에 표시됩니다.','客户消息会显示在这里。'],
    'Сохранить черновик':['Lưu bản nháp','Save draft','초안 저장','保存草稿'],

    'АНАЛИТИКА':['PHÂN TÍCH','ANALYTICS','분석','分析'],
    'Что приносит деньги — видно сразу.':['Thấy ngay điều gì tạo ra doanh thu.','See what makes money at a glance.','무엇이 매출을 만드는지 바로 확인하세요.','一眼看出什么在赚钱。'],
    'Продажи, загрузка парка, источники заявок, воронка и прибыльность каждой модели в одном экране владельца.':['Doanh số, mức sử dụng đội xe, nguồn yêu cầu, phễu và lợi nhuận từng mẫu xe trong một màn hình chủ sở hữu.','Sales, fleet utilization, request sources, funnel and profitability of each model in one owner screen.','매출, 차량 가동률, 요청 유입, 퍼널, 모델별 수익성을 한 화면에서 확인합니다.','销售、车队利用率、申请来源、漏斗和各车型盈利能力集中在一个负责人界面。'],
    'Выручка за период':['Doanh thu kỳ này','Period revenue','기간 매출','期间收入'],
    'Филиал':['Chi nhánh','Branch','지점','门店'],
    'Средний чек':['Giá trị trung bình','Average ticket','평균 결제액','平均客单价'],
    'Загрузка парка':['Mức sử dụng đội xe','Fleet utilization','차량 가동률','车队利用率'],
    'Повторные клиенты':['Khách quay lại','Repeat customers','재방문 고객','复购客户'],
    'Конверсия в оплату':['Chuyển đổi thanh toán','Payment conversion','결제 전환율','付款转化率'],
    'ДИНАМИКА':['XU HƯỚNG','TREND','추이','趋势'],
    'Выручка и заявки':['Doanh thu và yêu cầu','Revenue and requests','매출 및 요청','收入与申请'],
    'Последние 7 дней':['7 ngày gần nhất','Last 7 days','최근 7일','最近 7 天'],
    'Последние 30 дней':['30 ngày gần nhất','Last 30 days','최근 30일','最近 30 天'],
    'ВОРОНКА':['PHỄU','FUNNEL','퍼널','漏斗'],
    'От просмотра до оплаты':['Từ xem đến thanh toán','From view to payment','조회부터 결제까지','从浏览到付款'],
    'СТАТУСЫ':['TRẠNG THÁI','STATUSES','상태','状态'],
    'Заявки в работе':['Yêu cầu đang xử lý','Requests in progress','처리 중 요청','处理中申请'],
    'ИСТОЧНИКИ':['NGUỒN','SOURCES','유입 경로','来源'],
    'Откуда приходят бронирования':['Nguồn đặt xe','Where bookings come from','예약 유입 경로','预订来自哪里'],
    'ДВЕ ТОЧКИ UNIQ':['HAI ĐIỂM UNIQ','TWO UNIQ LOCATIONS','UNIQ 두 지점','UNIQ 两个门店'],
    'Сравнение филиалов':['So sánh chi nhánh','Branch comparison','지점 비교','门店对比'],
    'ПРИБЫЛЬНОСТЬ ПАРКА':['LỢI NHUẬN ĐỘI XE','FLEET PROFITABILITY','차량 수익성','车队盈利能力'],
    'Какая техника зарабатывает':['Xe nào tạo doanh thu','Which vehicles make money','어떤 차량이 수익을 내는지','哪些车辆在赚钱'],

    'КОМАНДА И ФИЛИАЛЫ':['ĐỘI NGŨ VÀ CHI NHÁNH','TEAM & BRANCHES','팀 및 지점','团队与门店'],
    'Все точки — одна система.':['Mọi điểm — một hệ thống.','All locations — one system.','모든 지점을 하나의 시스템으로.','所有门店，一个系统。'],
    'Добавляйте филиалы, назначайте сотрудников и перемещайте технику между точками UNIQ прямо из панели владельца.':['Thêm chi nhánh, phân công nhân viên và chuyển xe giữa các điểm UNIQ ngay trong bảng điều khiển chủ sở hữu.','Add branches, assign employees and move vehicles between UNIQ locations right from the owner dashboard.','소유자 패널에서 지점을 추가하고 직원을 배정하며 UNIQ 지점 간 차량을 이동하세요.','直接在负责人面板中添加门店、分配员工并在 UNIQ 门店之间调动车辆。'],
    'Филиалы':['Chi nhánh','Branches','지점','门店'],
    'активные точки':['điểm đang hoạt động','active locations','활성 지점','活跃门店'],
    'Команда':['Đội ngũ','Team','팀','团队'],
    'активные профили':['hồ sơ đang hoạt động','active profiles','활성 프로필','活跃账号'],
    'Перемещения':['Điều chuyển','Transfers','이동','调拨'],
    'в работе':['đang xử lý','in progress','진행 중','处理中'],
    'ФИЛИАЛЫ':['CHI NHÁNH','BRANCHES','지점','门店'],
    'Точки UNIQ':['Các điểm UNIQ','UNIQ locations','UNIQ 지점','UNIQ 门店'],
    '+ Добавить филиал':['+ Thêm chi nhánh','+ Add branch','+ 지점 추가','+ 添加门店'],
    'СОТРУДНИКИ':['NHÂN VIÊN','EMPLOYEES','직원','员工'],
    'Роли и права доступа':['Vai trò và quyền truy cập','Roles and permissions','역할 및 권한','角色与权限'],
    '+ Сотрудник':['+ Nhân viên','+ Employee','+ 직원','+ 员工'],
    'Поиск сотрудника':['Tìm nhân viên','Search employee','직원 검색','搜索员工'],
    'Активен':['Hoạt động','Active','활성','启用'],
    'Отключён':['Đã tắt','Disabled','비활성화','已停用'],
    'Настроить':['Cài đặt','Configure','설정','设置'],
    'ЛОГИСТИКА':['HẬU CẦN','LOGISTICS','물류','调度'],
    'Перемещение техники':['Điều chuyển xe','Vehicle transfer','차량 이동','车辆调拨'],
    'Откуда':['Từ đâu','From','출발 지점','从'],
    'Куда':['Đến đâu','To','도착 지점','到'],
    'Например: к выдаче 11:00':['Ví dụ: giao lúc 11:00','For example: handover at 11:00','예: 11:00 인도','例如：11:00 交车'],
    'Создать перемещение':['Tạo điều chuyển','Create transfer','이동 생성','创建调拨'],
    'В путь':['Bắt đầu chuyển','Start transfer','이동 시작','开始调拨'],
    'Завершить':['Hoàn tất','Complete','완료','完成'],
    'Перемещений пока нет':['Chưa có điều chuyển','No transfers yet','아직 이동 내역 없음','暂无调拨'],
    'Выберите технику и точку назначения.':['Chọn xe và điểm đến.','Select a vehicle and destination.','차량과 목적지를 선택하세요.','请选择车辆和目标门店。']
  };

  function currentLanguage() {
    const stored = localStorage.getItem(LANG_KEY);
    return SUPPORTED.includes(stored) ? stored : 'ru';
  }

  function direct(text, lang) {
    if (lang === 'ru') return text;
    const row = T[text];
    return row ? row[INDEX[lang]] : null;
  }

  function pattern(text, lang) {
    if (lang === 'ru') return text;
    const i = INDEX[lang];
    let m;
    m = text.match(/^(\d+)\s+клиентов$/);
    if (m) return [`${m[1]} khách hàng`,`${m[1]} customers`,`${m[1]}명 고객`,`${m[1]} 位客户`][i];
    m = text.match(/^(\d+)\s+операций$/);
    if (m) return [`${m[1]} giao dịch`,`${m[1]} transactions`,`${m[1]}건 거래`,`${m[1]} 笔交易`][i];
    m = text.match(/^(\d+)\s+единиц$/);
    if (m) return [`${m[1]} xe`,`${m[1]} vehicles`,`${m[1]}대`,`${m[1]} 辆`][i];
    m = text.match(/^(\d+)\s+(?:аренда|аренд)$/);
    if (m) return [`${m[1]} lượt thuê`,`${m[1]} rentals`,`${m[1]}건 대여`,`${m[1]} 次租赁`][i];
    m = text.match(/^(\d+)\s+заявок$/);
    if (m) return [`${m[1]} yêu cầu`,`${m[1]} requests`,`${m[1]}건 요청`,`${m[1]} 个申请`][i];
    m = text.match(/^(\d+)\s+платежей$/);
    if (m) return [`${m[1]} khoản thanh toán`,`${m[1]} payments`,`${m[1]}건 결제`,`${m[1]} 笔付款`][i];
    m = text.match(/^(\d+)\s+активных аренд$/);
    if (m) return [`${m[1]} lượt thuê đang hoạt động`,`${m[1]} active rentals`,`${m[1]}건 대여 중`,`${m[1]} 个在租订单`][i];
    m = text.match(/^(\d+)\s+новых за период$/);
    if (m) return [`${m[1]} khách mới trong kỳ`,`${m[1]} new in period`,`${m[1]}명 신규`,`${m[1]} 位期间新客`][i];
    m = text.match(/^(\d+)\s+сотрудников$/);
    if (m) return [`${m[1]} nhân viên`,`${m[1]} employees`,`${m[1]}명 직원`,`${m[1]} 名员工`][i];
    m = text.match(/^(\d+)\s+прав$/);
    if (m) return [`${m[1]} quyền`,`${m[1]} permissions`,`${m[1]}개 권한`,`${m[1]} 项权限`][i];
    m = text.match(/^К оплате осталось\s+(.+)$/);
    if (m) return [`Còn phải trả ${m[1]}`,`Remaining to pay ${m[1]}`,`남은 결제액 ${m[1]}`,`剩余应付 ${m[1]}`][i];
    m = text.match(/^Зачислено\s+(.+)\s+·\s+всего внесено\s+(.+)$/);
    if (m) return [`Đã ghi nhận ${m[1]} · tổng đã trả ${m[2]}`,`Credited ${m[1]} · total paid ${m[2]}`,`${m[1]} 반영 · 총 결제 ${m[2]}`,`已入账 ${m[1]} · 累计支付 ${m[2]}`][i];
    m = text.match(/^Внесено\s+(.+)\s+·\s+остаток\s+(.+)$/i);
    if (m) return [`Đã trả ${m[1]} · còn lại ${m[2]}`,`Paid ${m[1]} · balance ${m[2]}`,`결제 ${m[1]} · 잔액 ${m[2]}`,`已支付 ${m[1]} · 剩余 ${m[2]}`][i];
    m = text.match(/^След\. ТО:\s*(.+)$/);
    if (m) return [`Bảo dưỡng tiếp: ${m[1]}`,`Next service: ${m[1]}`,`다음 정비: ${m[1]}`,`下次保养：${m[1]}`][i];
    m = text.match(/^Оплачено:\s*(.+)$/);
    if (m) return [`Đã thanh toán: ${m[1]}`,`Paid: ${m[1]}`,`결제됨: ${m[1]}`,`已支付：${m[1]}`][i];
    return null;
  }

  function translateCore(text, lang) {
    return direct(text, lang) ?? pattern(text, lang) ?? text;
  }

  function translatePreservingWhitespace(raw, lang) {
    if (!raw || !raw.trim()) return raw;
    const lead = raw.match(/^\s*/)?.[0] || '';
    const trail = raw.match(/\s*$/)?.[0] || '';
    const core = raw.slice(lead.length, raw.length - trail.length);
    return lead + translateCore(core, lang) + trail;
  }

  function translateTextNode(node, lang) {
    const parent = node.parentElement;
    if (!parent || parent.closest('script,style')) return;
    if (!originalText.has(node)) originalText.set(node, node.nodeValue || '');
    const source = originalText.get(node);
    const next = translatePreservingWhitespace(source, lang);
    if (node.nodeValue !== next) node.nodeValue = next;
  }

  function translateAttributes(el, lang) {
    if (!(el instanceof Element)) return;
    const attrs = ['placeholder','aria-label','title'];
    let saved = originalAttrs.get(el);
    if (!saved) { saved = {}; originalAttrs.set(el, saved); }
    for (const attr of attrs) {
      if (!el.hasAttribute(attr)) continue;
      if (!(attr in saved)) saved[attr] = el.getAttribute(attr) || '';
      const source = saved[attr];
      const next = translateCore(source, lang);
      if (el.getAttribute(attr) !== next) el.setAttribute(attr, next);
    }
  }

  function apply(scope = document.body) {
    if (!scope) return;
    const lang = currentLanguage();
    if (scope.nodeType === Node.TEXT_NODE) translateTextNode(scope, lang);
    if (scope.nodeType === Node.ELEMENT_NODE) translateAttributes(scope, lang);
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) translateTextNode(node, lang);
    if (scope.querySelectorAll) scope.querySelectorAll('*').forEach((el) => translateAttributes(el, lang));
  }

  function init() {
    apply(document.body);
    const observer = new MutationObserver((records) => {
      for (const record of records) for (const added of record.addedNodes) {
        if (added.nodeType === Node.TEXT_NODE || added.nodeType === Node.ELEMENT_NODE) apply(added);
      }
    });
    observer.observe(document.body, { childList:true, subtree:true });
    document.addEventListener('change', (event) => {
      if (event.target?.id === 'uniqLanguageSelect') queueMicrotask(() => apply(document.body));
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
