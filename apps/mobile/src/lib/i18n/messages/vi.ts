export const vi = {
  common: { back: 'Quay lại', backButton: '← Quay lại', retry: 'Thử lại', account: 'Tài khoản', language: 'Ngôn ngữ' },
  catalog: {
    viewServices: 'Xem dịch vụ →',
    title: 'Bạn cần dịch vụ gì?', subtitle: 'Khám phá các ngành dịch vụ tại Hà Nội.',
    categorySubtitle: 'Khám phá nhóm dịch vụ và kỹ năng phù hợp.', loading: 'Đang tải danh mục…',
    empty: 'Chưa có dịch vụ đang hoạt động.', error: 'Không tải được danh mục. Kiểm tra kết nối và thử lại.',
    skills: { one: '%{count} kỹ năng', other: '%{count} kỹ năng' },
    translationNotice: 'Tên ngành, nhóm và kỹ năng hiện chỉ có tiếng Việt.',
  },
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
