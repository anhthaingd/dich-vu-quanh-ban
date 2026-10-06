export const vi = {
  profile: {
    title: 'Sửa tên hiển thị', loading: 'Đang tải hồ sơ…', current: 'Tên đang lưu: %{name}',
    hint: 'Tên từ 1–100 ký tự.', save: 'Lưu tên', saved: 'Đã lưu tên hiển thị.',
    reload: 'Tải lại hồ sơ', signedOut: 'Phiên đã kết thúc. Hãy đăng nhập lại để sửa hồ sơ.',
    conflict: 'Hồ sơ đã thay đổi hoặc yêu cầu không còn khớp. Tải lại để xem tên mới nhất trước khi lưu. Tên bạn đang nhập được giữ lại.',
    validation: 'Nhập tên từ 1–100 ký tự, không chỉ có khoảng trắng.',
    error: 'Chưa thể hoàn tất. Kiểm tra kết nối và thử lại.', busy: 'Đang kiểm tra phiên. Vui lòng thử lại sau một lát.',
    pending: 'Chưa xác nhận được kết quả lưu. Bấm thử lại với cùng tên để kiểm tra kết quả.',
  },
  shell: { groups: 'Nhóm dịch vụ', findServices: 'Tìm dịch vụ', openAccount: 'Mở tài khoản và cài đặt ngôn ngữ', discover: 'DỊCH VỤ TẠI HÀ NỘI', categories: 'Chọn ngành dịch vụ', accountIntro: 'Quản lý đăng nhập và ngôn ngữ của bạn.', preferences: 'Tùy chọn hiển thị' },
  common: { back: 'Quay lại', backButton: '← Quay lại', retry: 'Thử lại', account: 'Tài khoản', language: 'Ngôn ngữ' },
  catalog: {
    viewServices: 'Xem dịch vụ →',
    title: 'Bạn cần dịch vụ gì?', subtitle: 'Khám phá các ngành dịch vụ tại Hà Nội.',
    categorySubtitle: 'Khám phá nhóm dịch vụ và kỹ năng phù hợp.', loading: 'Đang tải danh mục…',
    empty: 'Chưa có dịch vụ đang hoạt động.', error: 'Không tải được danh mục. Kiểm tra kết nối và thử lại.',
    skills: { one: '%{count} kỹ năng', other: '%{count} kỹ năng' },
    translationNotice: 'Một số mục chưa có bản dịch; tên tiếng Việt được hiển thị thay thế.',
  },
  accountTools: {"loading": "Đang tải…", "reload": "Tải lại danh sách", "more": "Xem thêm", "cancel": "Hủy", "saved": "Đã lưu thay đổi.", "error": "Chưa thể hoàn tất. Kiểm tra kết nối và thử lại.", "conflict": "Dữ liệu đã thay đổi trên thiết bị khác. Tải lại danh sách trước khi lưu tiếp; nội dung đang nhập được giữ lại.", "invalid": "Kiểm tra tên, địa chỉ và tọa độ hợp lệ."},
  sessions: {"title": "Phiên đăng nhập", "intro": "Mỗi mục là một lần đăng nhập. Thu hồi sẽ đăng xuất lần đăng nhập đó trên thiết bị tương ứng.", "current": "Phiên hiện tại", "other": "Lần đăng nhập khác", "created": "Đăng nhập: %{date}", "seen": "Hoạt động gần nhất: %{date}", "unknown": "Chưa có thông tin", "active": "Đang hoạt động", "expired": "Đã hết hạn", "revoked": "Đã thu hồi", "revoke": "Thu hồi phiên", "confirm": "Thu hồi lần đăng nhập này? Thiết bị đó phải đăng nhập lại.", "confirmCurrent": "Đây là phiên hiện tại. Thu hồi sẽ đăng xuất bạn khỏi app này.", "empty": "Chưa có phiên đăng nhập."},
  addresses: {"title": "Địa chỉ đã lưu", "intro": "Lưu địa chỉ riêng để dùng lại. Địa chỉ đầu tiên tự là mặc định.", "add": "Thêm địa chỉ", "edit": "Sửa địa chỉ", "label": "Tên gợi nhớ", "text": "Địa chỉ", "coordinates": "Nhập tọa độ thủ công bằng dấu chấm thập phân. Chưa hỗ trợ chọn trên bản đồ.", "lat": "Vĩ độ (−90 đến 90)", "lng": "Kinh độ (−180 đến 180)", "default": "Địa chỉ mặc định", "makeDefault": "Đặt làm mặc định", "save": "Lưu địa chỉ", "archive": "Gỡ địa chỉ", "confirmArchive": "Gỡ “%{label}” khỏi sổ địa chỉ? Nếu là mặc định, bạn có thể chọn mặc định khác sau.", "empty": "Bạn chưa lưu địa chỉ nào."},
  auth: {
    restoring: 'Đang khôi phục phiên…', verified: 'Email đã xác minh', unverified: 'Email chưa xác minh',
    logout: 'Đăng xuất', createAccount: 'Tạo tài khoản', login: 'Đăng nhập', register: 'Đăng ký',
    name: 'Tên hiển thị', email: 'Email', password: 'Mật khẩu',
    passwordHint: 'Từ %{min} đến %{max} ký tự. Có thể dùng một cụm từ dễ nhớ.',
    switchToLogin: 'Đã có tài khoản? Đăng nhập', switchToRegister: 'Chưa có tài khoản? Đăng ký',
  },
  errors: {
    authentication: 'Không thể xác thực. Kiểm tra thông tin hoặc đăng nhập lại.',
    rateLimited: 'Thao tác quá nhiều lần. Vui lòng chờ một phút rồi thử lại.',
    validation: 'Không thể thực hiện với thông tin này. Kiểm tra lại hoặc đăng nhập.',
    session: 'Không thể kết nối hoặc lưu phiên an toàn. Vui lòng thử lại.',
    localeRead: 'Chưa đọc được ngôn ngữ đã lưu. Bạn có thể chọn lại ngôn ngữ.',
    localeWrite: 'Chưa lưu được ngôn ngữ. Vui lòng chọn lại để thử lần nữa.',
  },
} as const;

// Keep the shape, while allowing translated text to differ from Vietnamese.
export type MessageDictionary = { [G in keyof typeof vi]: {
  [K in keyof typeof vi[G]]: typeof vi[G][K] extends string ? string : { one: string; other: string }
} };
