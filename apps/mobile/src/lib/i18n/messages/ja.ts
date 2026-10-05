import type { MessageDictionary } from './vi';
export const ja = {
  shell: { groups: 'サービスの分類', findServices: 'サービスを探す', openAccount: 'アカウントと言語設定を開く', discover: 'ハノイのサービス', categories: 'サービスの分類を選ぶ', accountIntro: 'ログインと言語を管理できます。', preferences: '表示設定' },
  common: { back: '戻る', backButton: '← 戻る', retry: '再試行', account: 'アカウント', language: '言語' },
  catalog: {
    viewServices: 'サービスを見る →',
    title: 'どんなサービスをお探しですか？', subtitle: 'ハノイのサービスを探しましょう。',
    categorySubtitle: 'サービスの分類とスキルを探しましょう。', loading: 'サービスを読み込み中…',
    empty: '利用可能なサービスはまだありません。', error: 'サービスを読み込めません。接続を確認して再試行してください。',
    skills: { one: '%{count}件のスキル', other: '%{count}件のスキル' },
    translationNotice: '業種・分類・スキルの名称は現在ベトナム語のみです。',
  },
  auth: {
    restoring: 'セッションを復元中…', verified: 'メールアドレスは確認済みです', unverified: 'メールアドレスは未確認です',
    logout: 'ログアウト', createAccount: 'アカウントを作成', login: 'ログイン', register: '登録',
    name: '表示名', email: 'メールアドレス', password: 'パスワード',
    passwordHint: '%{min}〜%{max}文字で入力してください。覚えやすいフレーズも使用できます。',
    switchToLogin: 'アカウントをお持ちですか？ログイン', switchToRegister: 'アカウントをお持ちでない方はこちら',
  },
  errors: {
    authentication: '認証できません。入力内容を確認するか、再度ログインしてください。',
    rateLimited: '操作回数が多すぎます。1分待ってから再試行してください。',
    validation: 'この情報では処理できません。内容を確認するか、ログインしてください。',
    session: '接続またはセッションの安全な保存ができません。再試行してください。',
    localeRead: '保存した言語を読み込めません。言語を選び直してください。',
    localeWrite: '言語を保存できません。もう一度選んで再試行してください。',
  },
} satisfies MessageDictionary;
