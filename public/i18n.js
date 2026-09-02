(() => {
  'use strict';

  const LANG_KEY = 'uniq-language-v1';
  const SUPPORTED = ['ru', 'vi', 'en', 'ko', 'zh'];
  const INDEX = { vi: 0, en: 1, ko: 2, zh: 3 };
  let current = SUPPORTED.includes(localStorage.getItem(LANG_KEY)) ? localStorage.getItem(LANG_KEY) : 'ru';

  // Values: [Vietnamese, English, Korean, Chinese]. Russian is the source text.
  const T = {
    'Язык интерфейса':['Ngôn ngữ giao diện','Interface language','인터페이스 언어','界面语言'],
    'Клиент':['Khách hàng','Client','고객','客户'],
    'Сотрудник':['Nhân viên','Employee','직원','员工'],
    'Владелец':['Chủ sở hữu','Owner','소유자','负责人'],
    'Главная':['Trang chủ','Home','홈','首页'],
    'Каталог':['Danh mục','Catalog','카탈로그','目录'],
    'Контакты':['Liên hệ','Contacts','연락처','联系方式'],
    'Рабочий стол':['Bàn làm việc','Workspace','업무 화면','工作台'],
    'Заявки':['Yêu cầu','Requests','요청','申请'],
    'Парк':['Đội xe','Fleet','차량','车队'],
    'Выдачи':['Giao / nhận xe','Handover','인수인계','交车'],
    'Обзор':['Tổng quan','Overview','개요','概览'],
    'уточнить':['liên hệ','contact us','문의','咨询'],
    'Авто':['Ô tô','Car','자동차','汽车'],
    'Скутер':['Xe tay ga','Scooter','스쿠터','踏板车'],
    'Мотоцикл':['Xe mô tô','Motorcycle','모터사이클','摩托车'],
    'Подтверждает менеджер':['Quản lý xác nhận','Manager confirmation','매니저 확인','经理确认'],
    'Готов к выдаче':['Sẵn sàng giao','Ready for handover','인도 준비 완료','可交付'],
    'В сервисе':['Đang bảo dưỡng','In service','정비 중','维修中'],
    'Резерв':['Đã giữ chỗ','Reserved','예약됨','已预留'],
    '/день':['/ngày','/day','/일','/天'],
    'Выбрать':['Chọn','Select','선택','选择'],
    'Весь парк UNIQ — прямо в Telegram.':['Toàn bộ đội xe UNIQ — ngay trong Telegram.','The entire UNIQ fleet — right in Telegram.','UNIQ 전체 차량을 Telegram에서 바로.','UNIQ 全部车队，直接在 Telegram 中使用。'],
    'Выбор техники, реальные фотографии, опубликованные цены и заявка менеджеру в одном Mini App.':['Chọn xe, ảnh thực tế, giá công khai và gửi yêu cầu cho quản lý trong một Mini App.','Choose a vehicle, see real photos and published prices, and send a request to the manager in one Mini App.','차량 선택, 실제 사진, 공개 요금, 매니저 요청을 하나의 Mini App에서 이용하세요.','在一个 Mini App 中选车、查看实拍照片和公开价格，并向经理提交申请。'],
    'единиц техники':['xe','vehicles','대','辆车'],
    'Северный филиал · Google Maps ↗':['Chi nhánh phía Bắc · Google Maps ↗','North branch · Google Maps ↗','북부 지점 · Google Maps ↗','北部分店 · Google Maps ↗'],
    'Центр города · Google Maps ↗':['Trung tâm thành phố · Google Maps ↗','City center · Google Maps ↗','도심 지점 · Google Maps ↗','市中心 · Google Maps ↗'],
    'Получение':['Nhận xe','Pickup','수령','取车'],
    'Возврат':['Trả xe','Return','반납','还车'],
    'Подобрать технику':['Chọn xe phù hợp','Find a vehicle','차량 찾기','选择车辆'],
    'ПАРК':['ĐỘI XE','FLEET','차량','车队'],
    'Популярная техника':['Xe phổ biến','Popular vehicles','인기 차량','热门车辆'],
    'Весь каталог →':['Xem toàn bộ danh mục →','Full catalog →','전체 카탈로그 →','全部目录 →'],
    'Актуальный парк UNIQ':['Đội xe UNIQ hiện tại','Current UNIQ fleet','현재 UNIQ 차량','当前 UNIQ 车队'],
    'Наличие конкретной единицы и выбранные даты подтверждает менеджер.':['Quản lý xác nhận xe cụ thể và ngày thuê đã chọn.','The manager confirms the specific vehicle and selected dates.','매니저가 해당 차량과 선택한 날짜의 이용 가능 여부를 확인합니다.','经理确认具体车辆及所选日期的可用情况。'],
    'КАТАЛОГ UNIQ':['DANH MỤC UNIQ','UNIQ CATALOG','UNIQ 카탈로그','UNIQ 目录'],
    'Выберите технику.':['Chọn xe.','Choose a vehicle.','차량을 선택하세요.','选择车辆。'],
    'Все позиции из публичного парка клиента с реальными фотографиями и опубликованной дневной ставкой.':['Toàn bộ xe trong danh mục công khai của UNIQ với ảnh thực tế và giá thuê theo ngày đã công bố.','All vehicles in the public UNIQ fleet with real photos and published daily rates.','UNIQ 공개 차량 전체를 실제 사진과 공개 일일 요금으로 확인하세요.','查看 UNIQ 公开车队中的全部车辆、实拍照片和公开日租价格。'],
    'Поиск: Yamaha, Rebel, 50cc…':['Tìm kiếm: Yamaha, Rebel, 50cc…','Search: Yamaha, Rebel, 50cc…','검색: Yamaha, Rebel, 50cc…','搜索：Yamaha、Rebel、50cc…'],
    'Вся техника':['Tất cả xe','All vehicles','전체 차량','全部车辆'],
    'Мотоциклы':['Xe mô tô','Motorcycles','모터사이클','摩托车'],
    'Скутеры':['Xe tay ga','Scooters','스쿠터','踏板车'],
    '← Каталог':['← Danh mục','← Catalog','← 카탈로그','← 目录'],
    'День':['Ngày','Day','일','日'],
    'Неделя':['Tuần','Week','주','周'],
    'Месяц':['Tháng','Month','월','月'],
    'Депозит':['Tiền cọc','Deposit','보증금','押金'],
    'Наличие техники и выбранные даты подтверждает менеджер UNIQ.':['Quản lý UNIQ xác nhận xe và ngày thuê đã chọn.','The UNIQ manager confirms vehicle availability and selected dates.','UNIQ 매니저가 차량과 선택한 날짜의 이용 가능 여부를 확인합니다.','UNIQ 经理确认车辆及所选日期的可用情况。'],
    'Запросить бронь':['Gửi yêu cầu đặt xe','Request booking','예약 요청','申请预订'],
    'Подробнее о модели ↗':['Chi tiết mẫu xe ↗','Model details ↗','모델 자세히 보기 ↗','车型详情 ↗'],
    'Мои заявки':['Yêu cầu của tôi','My requests','내 요청','我的申请'],
    'Заявки клиентов':['Yêu cầu khách hàng','Customer requests','고객 요청','客户申请'],
    'Все заявки':['Tất cả yêu cầu','All requests','전체 요청','全部申请'],
    'ЗАЯВКИ':['YÊU CẦU','REQUESTS','요청','申请'],
    'Ваши заявки на аренду.':['Các yêu cầu thuê xe của bạn.','Your rental requests.','내 렌탈 요청입니다.','您的租车申请。'],
    'Заявки клиентов и их текущие статусы.':['Yêu cầu của khách hàng và trạng thái hiện tại.','Customer requests and their current statuses.','고객 요청과 현재 상태입니다.','客户申请及其当前状态。'],
    'Заявок пока нет':['Chưa có yêu cầu','No requests yet','아직 요청이 없습니다','暂无申请'],
    'Создайте заявку из карточки техники в режиме клиента.':['Tạo yêu cầu từ thẻ xe ở chế độ khách hàng.','Create a request from a vehicle card in Client mode.','고객 모드의 차량 카드에서 요청을 생성하세요.','请在客户模式的车辆卡片中创建申请。'],
    'Новая':['Mới','New','신규','新申请'],
    'Связались':['Đã liên hệ','Contacted','연락 완료','已联系'],
    'Подтверждена':['Đã xác nhận','Confirmed','확정','已确认'],
    'Выдана':['Đã giao','Handed over','인도 완료','已交车'],
    'В аренде':['Đang thuê','Active rental','대여 중','租用中'],
    'Возвращена':['Đã trả','Returned','반납 완료','已归还'],
    'Завершена':['Hoàn tất','Completed','완료','已完成'],
    'Отменена':['Đã hủy','Cancelled','취소','已取消'],
    'Контакты и выдача.':['Liên hệ và nhận xe.','Contacts and pickup.','연락처 및 차량 수령.','联系方式与取车。'],
    'Связь с менеджером и две точки UNIQ в Нячанге.':['Liên hệ quản lý và hai địa điểm UNIQ tại Nha Trang.','Contact the manager and find both UNIQ locations in Nha Trang.','매니저 연락처와 나트랑의 UNIQ 두 지점을 확인하세요.','联系经理并查看芽庄的两个 UNIQ 门店。'],
    'Связь с менеджером':['Liên hệ quản lý','Contact the manager','매니저 연락','联系经理'],
    'Северный филиал':['Chi nhánh phía Bắc','North branch','북부 지점','北部分店'],
    'Центр города':['Trung tâm thành phố','City center','도심 지점','市中心'],
    'Открыть в Google Maps ↗':['Mở trong Google Maps ↗','Open in Google Maps ↗','Google Maps에서 열기 ↗','在 Google Maps 中打开 ↗'],
    'UNIQ Moto в Нячанге':['UNIQ Moto tại Nha Trang','UNIQ Moto in Nha Trang','나트랑 UNIQ Moto','芽庄 UNIQ Moto'],
    'СОТРУДНИК':['NHÂN VIÊN','EMPLOYEE','직원','员工'],
    'Рабочий стол сотрудника.':['Bàn làm việc của nhân viên.','Employee workspace.','직원 업무 화면.','员工工作台。'],
    'Заявки, парк и выдачи в одном мобильном интерфейсе.':['Yêu cầu, đội xe và giao nhận trong một giao diện di động.','Requests, fleet and handovers in one mobile interface.','요청, 차량, 인수인계를 하나의 모바일 화면에서 관리합니다.','在一个移动界面中管理申请、车队和交车。'],
    'Открытые заявки':['Yêu cầu đang mở','Open requests','진행 중 요청','待处理申请'],
    'Готовы к выдаче':['Sẵn sàng giao','Ready for handover','인도 준비','可交付'],
    'ОЧЕРЕДЬ':['HÀNG ĐỢI','QUEUE','대기열','队列'],
    'Новые заявки':['Yêu cầu mới','New requests','신규 요청','新申请'],
    'Все →':['Tất cả →','All →','전체 →','全部 →'],
    'Новых заявок нет':['Không có yêu cầu mới','No new requests','새 요청이 없습니다','暂无新申请'],
    'ПАРК СОТРУДНИКА':['ĐỘI XE NHÂN VIÊN','EMPLOYEE FLEET','직원 차량 관리','员工车队'],
    'Парк техники.':['Đội xe.','Vehicle fleet.','차량 목록.','车队。'],
    'Сотрудник видит весь каталог. Сотрудник видит весь парк и может быстро обновлять рабочий статус техники.':['Nhân viên xem toàn bộ danh mục và đội xe, đồng thời cập nhật nhanh trạng thái hoạt động của từng xe.','Employees can view the full catalog and fleet and quickly update each vehicle’s operational status.','직원은 전체 카탈로그와 차량을 확인하고 각 차량의 운영 상태를 빠르게 변경할 수 있습니다.','员工可查看完整目录和车队，并快速更新每辆车的运营状态。'],
    'ВЫДАЧИ':['GIAO / NHẬN XE','HANDOVER','인수인계','交车'],
    'Выдачи и возвраты.':['Giao và nhận lại xe.','Handovers and returns.','차량 인도 및 반납.','交车与还车。'],
    'Здесь отображаются только заявки, дошедшие до подтверждения.':['Chỉ hiển thị các yêu cầu đã được xác nhận.','Only confirmed requests are shown here.','확정 단계에 도달한 요청만 표시됩니다.','这里只显示已确认的申请。'],
    'Подтверждённых выдач пока нет':['Chưa có lượt giao xe đã xác nhận','No confirmed handovers yet','확정된 인도 건이 없습니다','暂无已确认的交车'],
    'Статус заявки можно изменить в разделе «Заявки».':['Có thể thay đổi trạng thái trong mục “Yêu cầu”.','You can change the request status in “Requests”.','“요청”에서 상태를 변경할 수 있습니다.','可在“申请”中更改状态。'],
    'ВЛАДЕЛЕЦ':['CHỦ SỞ HỮU','OWNER','소유자','负责人'],
    'Пульс бизнеса — со смартфона.':['Tình hình kinh doanh — ngay trên điện thoại.','Your business pulse — on your phone.','비즈니스 현황을 스마트폰에서.','用手机掌握业务动态。'],
    'Ключевые показатели по парку и заявкам в одном экране.':['Các chỉ số chính về đội xe và yêu cầu trên một màn hình.','Key fleet and request metrics on one screen.','차량과 요청의 핵심 지표를 한 화면에서 확인하세요.','在一个屏幕查看车队和申请的关键指标。'],
    'Подтверждены':['Đã xác nhận','Confirmed','확정','已确认'],
    'Потенциал заявок':['Giá trị yêu cầu tiềm năng','Request potential','요청 예상 금액','申请潜在金额'],
    'по текущим тарифам':['theo giá hiện tại','at current rates','현재 요금 기준','按当前价格'],
    'Статусы заявок':['Trạng thái yêu cầu','Request statuses','요청 상태','申请状态'],
    'ПАРК ВЛАДЕЛЬЦА':['ĐỘI XE CHỦ SỞ HỮU','OWNER FLEET','소유자 차량','负责人车队'],
    'Парк и состояние.':['Đội xe và trạng thái.','Fleet and status.','차량 및 상태.','车队与状态。'],
    'Сводка по состоянию парка и готовности техники к выдаче.':['Tổng quan trạng thái đội xe và mức sẵn sàng giao xe.','Summary of fleet status and readiness for handover.','차량 상태와 인도 준비 현황 요약입니다.','车队状态及交付准备情况汇总。'],
    'Всего':['Tổng','Total','전체','总计'],
    'Менеджер':['Quản lý','Manager','매니저','经理'],
    'Владелец видит общий срез по парку и текущим статусам техники.':['Chủ sở hữu xem tổng quan đội xe và trạng thái hiện tại của từng xe.','The owner sees an overview of the fleet and current vehicle statuses.','소유자는 차량 전체와 현재 상태를 한눈에 확인할 수 있습니다.','负责人可查看车队整体情况和车辆当前状态。'],
    'БРОНИРОВАНИЕ':['ĐẶT XE','BOOKING','예약','预订'],
    'Имя':['Tên','Name','이름','姓名'],
    'Контакт':['Liên hệ','Contact','연락처','联系方式'],
    'Ваше имя':['Tên của bạn','Your name','이름','您的姓名'],
    'Телефон / @username':['Điện thoại / @username','Phone / @username','전화번호 / @username','电话 / @username'],
    'Отправить заявку':['Gửi yêu cầu','Send request','요청 보내기','提交申请'],
    'После отправки заявка появится в разделе «Мои заявки» и будет доступна сотруднику и владельцу.':['Sau khi gửi, yêu cầu sẽ xuất hiện trong “Yêu cầu của tôi” và sẽ được nhân viên cùng chủ sở hữu xem.','After submission, the request will appear in “My requests” and will be available to the employee and owner.','전송 후 요청은 “내 요청”에 표시되며 직원과 소유자가 확인할 수 있습니다.','提交后，申请会显示在“我的申请”中，员工和负责人均可查看。'],
    'Каталог временно недоступен.':['Danh mục tạm thời không khả dụng.','The catalog is temporarily unavailable.','카탈로그를 일시적으로 사용할 수 없습니다.','目录暂时不可用。'],
    'Обновите страницу или свяжитесь с менеджером UNIQ.':['Hãy tải lại trang hoặc liên hệ quản lý UNIQ.','Refresh the page or contact the UNIQ manager.','페이지를 새로고침하거나 UNIQ 매니저에게 문의하세요.','请刷新页面或联系 UNIQ 经理。'],
    'UNIQ Moto, 312 Đ. 2/4 — открыть в Google Maps':['UNIQ Moto, 312 Đ. 2/4 — mở trong Google Maps','UNIQ Moto, 312 Đ. 2/4 — open in Google Maps','UNIQ Moto, 312 Đ. 2/4 — Google Maps에서 열기','UNIQ Moto, 312 Đ. 2/4 — 在 Google Maps 中打开'],
    'UNIQ Moto, 254 Nguyễn Thị Minh Khai — открыть в Google Maps':['UNIQ Moto, 254 Nguyễn Thị Minh Khai — mở trong Google Maps','UNIQ Moto, 254 Nguyễn Thị Minh Khai — open in Google Maps','UNIQ Moto, 254 Nguyễn Thị Minh Khai — Google Maps에서 열기','UNIQ Moto, 254 Nguyễn Thị Minh Khai — 在 Google Maps 中打开']
  };

  const originalText = new WeakMap();
  const originalAttrs = new WeakMap();

  function direct(text, lang) {
    if (lang === 'ru') return text;
    const row = T[text];
    return row ? row[INDEX[lang]] : null;
  }

  function pattern(text, lang) {
    if (lang === 'ru') return text;
    const i = INDEX[lang];
    let m = text.match(/^(\d+)\s+из\s+(\d+)$/);
    if (m) return [m[1] + ' / ' + m[2], m[1] + ' of ' + m[2], m[1] + ' / ' + m[2], m[1] + ' / ' + m[2]][i];

    m = text.match(/^(.+?)\s*\/\s*день\s*·\s*финальная доступность подтверждается менеджером\.$/);
    if (m) return [
      `${m[1]} / ngày · quản lý xác nhận tình trạng sẵn có cuối cùng.`,
      `${m[1]} / day · final availability is confirmed by the manager.`,
      `${m[1]} /일 · 최종 이용 가능 여부는 매니저가 확인합니다.`,
      `${m[1]} /天 · 最终可用情况由经理确认。`
    ][i];

    if (text.endsWith(' · Клиент')) {
      const client = T['Клиент'][i];
      return text.slice(0, -'Клиент'.length) + client;
    }
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

  function translateTextNode(node) {
    const parent = node.parentElement;
    if (!parent || parent.closest('script,style')) return;
    if (!originalText.has(node)) originalText.set(node, node.nodeValue || '');
    const source = originalText.get(node);
    const next = translatePreservingWhitespace(source, current);
    if (node.nodeValue !== next) node.nodeValue = next;
  }

  function translateAttributes(el) {
    if (!(el instanceof Element)) return;
    const attrs = ['placeholder', 'aria-label', 'title'];
    let saved = originalAttrs.get(el);
    if (!saved) { saved = {}; originalAttrs.set(el, saved); }
    for (const attr of attrs) {
      if (!el.hasAttribute(attr)) continue;
      if (!(attr in saved)) saved[attr] = el.getAttribute(attr) || '';
      const source = saved[attr];
      const next = translateCore(source, current);
      if (el.getAttribute(attr) !== next) el.setAttribute(attr, next);
    }
  }

  function applyAll(scope = document.body) {
    if (!scope) return;
    if (scope.nodeType === Node.TEXT_NODE) translateTextNode(scope);
    if (scope.nodeType === Node.ELEMENT_NODE) translateAttributes(scope);

    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) translateTextNode(node);
    if (scope.querySelectorAll) scope.querySelectorAll('*').forEach(translateAttributes);
    document.documentElement.lang = current === 'zh' ? 'zh-CN' : current;
  }

  function createSwitcher() {
    if (document.querySelector('.language-switcher')) return;
    const wrap = document.createElement('div');
    wrap.className = 'language-switcher';
    wrap.innerHTML = `<span aria-hidden="true">文</span><select id="uniqLanguageSelect" aria-label="Язык интерфейса"><option value="ru">RU</option><option value="vi">VI</option><option value="en">EN</option><option value="ko">KO</option><option value="zh">中文</option></select>`;
    document.body.append(wrap);
    const select = wrap.querySelector('select');
    select.value = current;
    select.addEventListener('change', () => {
      current = SUPPORTED.includes(select.value) ? select.value : 'ru';
      localStorage.setItem(LANG_KEY, current);
      applyAll(document.body);
    });
  }

  function init() {
    createSwitcher();
    applyAll(document.body);
    const observer = new MutationObserver(records => {
      for (const record of records) {
        for (const added of record.addedNodes) {
          if (added.nodeType === Node.TEXT_NODE || added.nodeType === Node.ELEMENT_NODE) applyAll(added);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
