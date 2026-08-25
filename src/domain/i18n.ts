import type { Language, LocalizedText } from './types.js';

type Dictionary = Record<string, string>;
export const languages: { id: Language; label: string }[] = [
  { id: 'ru', label: 'RU' }, { id: 'en', label: 'EN' }, { id: 'vi', label: 'VI' }, { id: 'ko', label: 'KO' }
];

const dict: Record<Language, Dictionary> = {
  ru: {
    brandSub:'NHA TRANG · SMART RENT', home:'Главная', catalog:'Каталог', bookings:'MY UNIQ', profile:'Контакты',
    find:'Подобрать байк по датам', from:'Получение', to:'Возврат', search:'Показать варианты', featured:'Проверенный каталог',
    fleetVerified:'82 единицы в официальном каталоге', managerConfirmed:'Доступность подтверждает менеджер', priceEstimate:'Расчёт по опубликованным тарифам',
    all:'Все', scooter:'Скутеры', naked:'Naked', cruiser:'Круизеры', sport:'Спорт', details:'Подробнее', request:'Запросить бронь',
    daily:'День', weekly:'Неделя', monthly:'Месяц', deposit:'Депозит', included:'Включено', requirements:'Условия', specifications:'Характеристики',
    engine:'Двигатель', weight:'Вес', speed:'Крейсерская скорость', fuel:'Расход', capacity:'Вместимость', source:'Источник', verified:'Проверено',
    estimate:'Оценка стоимости', finalPrice:'Финальная цена и доступность подтверждаются менеджером UNIQ.', sendRequest:'Подготовить заявку',
    clientName:'Имя', contact:'Телефон / мессенджер', channel:'Канал связи', delivery:'Отель / место выдачи', note:'Комментарий', privacy:'Я согласен передать данные менеджеру UNIQ для обработки заявки.',
    total:'Ориентировочно', requestCreated:'Заявка подготовлена', sendManager:'Отправьте её менеджеру, чтобы получить финальное подтверждение.', whatsapp:'WhatsApp', telegram:'Telegram', call:'Позвонить', officialSite:'Официальный сайт',
    noBookings:'В этой сессии заявок пока нет.', currentRequests:'Заявки этой сессии', sessionOnly:'До подключения D1 заявки хранятся только в текущей сессии браузера.',
    status_new:'Новая', status_contacted:'Связались', status_awaiting_confirmation:'Ждёт подтверждения', status_confirmed:'Подтверждена', status_cancelled:'Отменена', status_vehicle_issued:'Выдано', status_active:'В аренде', status_return_due:'Пора возвращать', status_returned:'Возвращено', status_completed:'Завершено', status_draft:'Черновик',
    business:'UNIQ Moto в Нячанге', twoBranches:'Два пункта выдачи', publicRating:'Публичный рейтинг', publicFleet:'Парк в официальном каталоге', phone:'Телефон', location:'Адрес', directions:'Маршрут',
    realData:'Реальные публичные данные', realPhotos:'Фото из официального каталога UNIQ', publishedRates:'Опубликованные тарифы', updated:'Актуализировано',
    team:'Команда · demo', owner:'Owner · demo', client:'Клиент', mode:'Режим', privateDemo:'Служебные экраны пока демонстрационные: реальные CRM/D1-данные не подключены.',
    operations:'Операционный контур', newRequests:'Новые заявки', publishedFleet:'Опубликованный парк', liveUnavailable:'Live-статусы парка не подключены', noFakeMetrics:'Метрики не показываются, пока нет реального backend.',
    backendReady:'Backend-ready', backendText:'В репозитории подготовлены Worker API, D1 schema и lifecycle. До привязки D1 публичный booking-flow отправляет заявку менеджеру.',
    analytics:'Owner dashboard', analyticsPending:'Реальная аналитика появится после подключения bookings/rentals к D1. Demo-проценты удалены.',
    gallery:'Галерея', close:'Закрыть', back:'Назад', official:'Официальный UNIQ Moto', contactManager:'Связаться с менеджером',
    dateError:'Дата возврата должна быть не раньше даты получения.', sourceNote:'Тарифы, характеристики, фото и контакты взяты с официального сайта UNIQ Moto; наличие конкретной единицы всегда подтверждается менеджером.'
  },
  en: {
    brandSub:'NHA TRANG · SMART RENT', home:'Home', catalog:'Catalog', bookings:'MY UNIQ', profile:'Contacts',
    find:'Find a bike by dates', from:'Pick-up', to:'Return', search:'Show options', featured:'Verified catalog', fleetVerified:'82 vehicles in the official catalog', managerConfirmed:'Availability is manager-confirmed', priceEstimate:'Estimate from published rates',
    all:'All', scooter:'Scooters', naked:'Naked', cruiser:'Cruisers', sport:'Sport', details:'Details', request:'Request booking', daily:'Day', weekly:'Week', monthly:'Month', deposit:'Deposit', included:'Included', requirements:'Requirements', specifications:'Specifications',
    engine:'Engine', weight:'Weight', speed:'Cruise speed', fuel:'Fuel use', capacity:'Capacity', source:'Source', verified:'Verified', estimate:'Price estimate', finalPrice:'Final price and availability are confirmed by the UNIQ manager.', sendRequest:'Prepare request',
    clientName:'Name', contact:'Phone / messenger', channel:'Contact channel', delivery:'Hotel / handover point', note:'Note', privacy:'I agree to send these details to the UNIQ manager for booking processing.', total:'Estimate', requestCreated:'Request prepared', sendManager:'Send it to the manager for final confirmation.', whatsapp:'WhatsApp', telegram:'Telegram', call:'Call', officialSite:'Official website',
    noBookings:'No requests in this session yet.', currentRequests:'Requests in this session', sessionOnly:'Until D1 is connected, requests only live in the current browser session.', status_new:'New', status_contacted:'Contacted', status_awaiting_confirmation:'Awaiting confirmation', status_confirmed:'Confirmed', status_cancelled:'Cancelled', status_vehicle_issued:'Vehicle issued', status_active:'Active rental', status_return_due:'Return due', status_returned:'Returned', status_completed:'Completed', status_draft:'Draft',
    business:'UNIQ Moto in Nha Trang', twoBranches:'Two pickup points', publicRating:'Public rating', publicFleet:'Vehicles in official catalog', phone:'Phone', location:'Address', directions:'Directions', realData:'Verified public data', realPhotos:'Photos from the official UNIQ catalog', publishedRates:'Published rates', updated:'Verified',
    team:'Team · demo', owner:'Owner · demo', client:'Client', mode:'Mode', privateDemo:'Operations screens remain demo-only until real CRM/D1 data is connected.', operations:'Operations layer', newRequests:'New requests', publishedFleet:'Published fleet', liveUnavailable:'Live fleet statuses are not connected', noFakeMetrics:'Metrics are intentionally hidden until real backend data exists.',
    backendReady:'Backend-ready', backendText:'Worker API, D1 schema and lifecycle are prepared in the repository. Until D1 is bound, the public booking flow sends the request to a manager.', analytics:'Owner dashboard', analyticsPending:'Real analytics will appear after bookings/rentals are connected to D1. Fake demo percentages were removed.',
    gallery:'Gallery', close:'Close', back:'Back', official:'Official UNIQ Moto', contactManager:'Contact manager', dateError:'Return date must not be earlier than pickup date.', sourceNote:'Rates, specs, photos and contacts come from the official UNIQ Moto site; availability of a specific unit is always manager-confirmed.'
  },
  vi: {
    brandSub:'NHA TRANG · SMART RENT', home:'Trang chủ', catalog:'Danh mục', bookings:'MY UNIQ', profile:'Liên hệ', find:'Tìm xe theo ngày', from:'Nhận xe', to:'Trả xe', search:'Xem lựa chọn', featured:'Danh mục đã xác minh', fleetVerified:'82 xe trong danh mục chính thức', managerConfirmed:'Quản lý xác nhận tình trạng xe', priceEstimate:'Ước tính theo giá công bố',
    all:'Tất cả', scooter:'Xe ga', naked:'Naked', cruiser:'Cruiser', sport:'Sport', details:'Chi tiết', request:'Yêu cầu đặt xe', daily:'Ngày', weekly:'Tuần', monthly:'Tháng', deposit:'Đặt cọc', included:'Bao gồm', requirements:'Yêu cầu', specifications:'Thông số', engine:'Động cơ', weight:'Trọng lượng', speed:'Tốc độ hành trình', fuel:'Mức tiêu hao', capacity:'Sức chứa', source:'Nguồn', verified:'Đã xác minh', estimate:'Ước tính giá', finalPrice:'Giá cuối cùng và tình trạng xe do quản lý UNIQ xác nhận.', sendRequest:'Chuẩn bị yêu cầu',
    clientName:'Tên', contact:'Điện thoại / messenger', channel:'Kênh liên hệ', delivery:'Khách sạn / điểm giao xe', note:'Ghi chú', privacy:'Tôi đồng ý gửi thông tin cho quản lý UNIQ để xử lý yêu cầu.', total:'Ước tính', requestCreated:'Đã chuẩn bị yêu cầu', sendManager:'Gửi cho quản lý để xác nhận cuối cùng.', whatsapp:'WhatsApp', telegram:'Telegram', call:'Gọi điện', officialSite:'Trang chính thức', noBookings:'Chưa có yêu cầu trong phiên này.', currentRequests:'Yêu cầu trong phiên', sessionOnly:'Trước khi kết nối D1, yêu cầu chỉ tồn tại trong phiên trình duyệt hiện tại.',
    status_new:'Mới', status_contacted:'Đã liên hệ', status_awaiting_confirmation:'Chờ xác nhận', status_confirmed:'Đã xác nhận', status_cancelled:'Đã hủy', status_vehicle_issued:'Đã giao xe', status_active:'Đang thuê', status_return_due:'Đến hạn trả', status_returned:'Đã trả', status_completed:'Hoàn tất', status_draft:'Nháp',
    business:'UNIQ Moto tại Nha Trang', twoBranches:'Hai điểm nhận xe', publicRating:'Đánh giá công khai', publicFleet:'Xe trong danh mục chính thức', phone:'Điện thoại', location:'Địa chỉ', directions:'Chỉ đường', realData:'Dữ liệu công khai đã xác minh', realPhotos:'Ảnh từ danh mục chính thức UNIQ', publishedRates:'Giá công bố', updated:'Xác minh', team:'Đội ngũ · demo', owner:'Chủ sở hữu · demo', client:'Khách hàng', mode:'Chế độ', privateDemo:'Màn hình vận hành vẫn ở chế độ demo cho đến khi kết nối dữ liệu CRM/D1 thực.', operations:'Vận hành', newRequests:'Yêu cầu mới', publishedFleet:'Đội xe công bố', liveUnavailable:'Chưa kết nối trạng thái xe trực tiếp', noFakeMetrics:'Không hiển thị số liệu giả trước khi có backend thực.', backendReady:'Sẵn sàng backend', backendText:'Worker API, D1 schema và lifecycle đã được chuẩn bị trong repository. Trước khi bind D1, luồng đặt xe công khai sẽ gửi yêu cầu cho quản lý.', analytics:'Bảng điều khiển chủ', analyticsPending:'Phân tích thực sẽ xuất hiện sau khi bookings/rentals kết nối D1. Các tỷ lệ demo giả đã được xóa.', gallery:'Thư viện', close:'Đóng', back:'Quay lại', official:'UNIQ Moto chính thức', contactManager:'Liên hệ quản lý', dateError:'Ngày trả không được sớm hơn ngày nhận.', sourceNote:'Giá, thông số, ảnh và liên hệ lấy từ trang UNIQ Moto chính thức; tình trạng từng xe luôn được quản lý xác nhận.'
  },
  ko: {
    brandSub:'NHA TRANG · SMART RENT', home:'홈', catalog:'카탈로그', bookings:'MY UNIQ', profile:'연락처', find:'날짜로 바이크 찾기', from:'픽업', to:'반납', search:'차량 보기', featured:'검증된 카탈로그', fleetVerified:'공식 카탈로그 82대', managerConfirmed:'매니저가 최종 가능 여부 확인', priceEstimate:'공개 요금 기준 예상가',
    all:'전체', scooter:'스쿠터', naked:'네이키드', cruiser:'크루저', sport:'스포츠', details:'상세', request:'예약 요청', daily:'일', weekly:'주', monthly:'월', deposit:'보증금', included:'포함', requirements:'요건', specifications:'사양', engine:'엔진', weight:'무게', speed:'순항 속도', fuel:'연비', capacity:'정원', source:'출처', verified:'확인일', estimate:'예상 요금', finalPrice:'최종 가격과 차량 가능 여부는 UNIQ 매니저가 확인합니다.', sendRequest:'요청 준비',
    clientName:'이름', contact:'전화 / 메신저', channel:'연락 채널', delivery:'호텔 / 인도 장소', note:'메모', privacy:'예약 처리를 위해 정보를 UNIQ 매니저에게 전달하는 데 동의합니다.', total:'예상', requestCreated:'요청이 준비되었습니다', sendManager:'최종 확인을 위해 매니저에게 전송하세요.', whatsapp:'WhatsApp', telegram:'Telegram', call:'전화', officialSite:'공식 웹사이트', noBookings:'이 세션에는 아직 요청이 없습니다.', currentRequests:'현재 세션 요청', sessionOnly:'D1 연결 전에는 요청이 현재 브라우저 세션에만 유지됩니다.',
    status_new:'신규', status_contacted:'연락됨', status_awaiting_confirmation:'확인 대기', status_confirmed:'확정', status_cancelled:'취소', status_vehicle_issued:'차량 인도', status_active:'대여 중', status_return_due:'반납 예정', status_returned:'반납 완료', status_completed:'완료', status_draft:'초안',
    business:'나트랑 UNIQ Moto', twoBranches:'픽업 지점 2곳', publicRating:'공개 평점', publicFleet:'공식 카탈로그 차량 수', phone:'전화', location:'주소', directions:'길찾기', realData:'검증된 공개 데이터', realPhotos:'UNIQ 공식 카탈로그 사진', publishedRates:'공개 요금', updated:'확인', team:'팀 · demo', owner:'Owner · demo', client:'고객', mode:'모드', privateDemo:'실제 CRM/D1 데이터가 연결되기 전까지 운영 화면은 데모 전용입니다.', operations:'운영', newRequests:'신규 요청', publishedFleet:'공개 차량', liveUnavailable:'실시간 차량 상태 미연결', noFakeMetrics:'실제 백엔드 데이터 전에는 가짜 지표를 표시하지 않습니다.', backendReady:'Backend-ready', backendText:'Worker API, D1 schema, lifecycle이 저장소에 준비되어 있습니다. D1 연결 전에는 공개 예약 흐름이 매니저에게 요청을 전송합니다.', analytics:'Owner dashboard', analyticsPending:'bookings/rentals가 D1에 연결되면 실제 분석이 표시됩니다. 가짜 demo 퍼센트는 제거했습니다.', gallery:'갤러리', close:'닫기', back:'뒤로', official:'공식 UNIQ Moto', contactManager:'매니저 연락', dateError:'반납일은 픽업일보다 빠를 수 없습니다.', sourceNote:'요금, 사양, 사진, 연락처는 UNIQ Moto 공식 사이트 기준이며 특정 차량의 가능 여부는 항상 매니저가 확인합니다.'
  }
};

export function t(lang: Language, key: string): string { return dict[lang][key] ?? dict.en[key] ?? key; }
export function localize(lang: Language, text: LocalizedText): string { return text[lang] || text.en; }
export function detectBrowserLanguage(input: string | undefined): Language {
  const code = (input ?? '').toLowerCase();
  if (code.startsWith('ru')) return 'ru';
  if (code.startsWith('vi')) return 'vi';
  if (code.startsWith('ko')) return 'ko';
  return 'en';
}
