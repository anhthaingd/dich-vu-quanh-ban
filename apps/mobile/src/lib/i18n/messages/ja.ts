import type { MessageDictionary } from './vi';
export const ja = {
  profile: {
    title: '表示名を変更', loading: 'プロフィールを読み込み中…', current: '保存済みの名前：%{name}',
    hint: '1〜100文字で入力してください。', save: '名前を保存', saved: '表示名を保存しました。',
    reload: 'プロフィールを再読み込み', signedOut: 'セッションが終了しました。再度ログインしてプロフィールを編集してください。',
    conflict: 'プロフィールが変更されたか、リクエストが一致しません。再読み込みして最新の名前を確認してから保存してください。入力中の名前は保持されます。',
    validation: '空白だけでなく、1〜100文字の名前を入力してください。',
    error: '完了できませんでした。接続を確認して再試行してください。', busy: 'セッションを確認中です。しばらくしてから再試行してください。',
    pending: '保存結果を確認できていません。同じ名前で再試行して結果を確認してください。',
  },
  shell: { groups: 'サービスの分類', findServices: 'サービスを探す', openAccount: 'アカウントと言語設定を開く', discover: 'ハノイのサービス', categories: 'サービスの分類を選ぶ', accountIntro: 'ログインと言語を管理できます。', preferences: '表示設定' },
  common: { back: '戻る', backButton: '← 戻る', retry: '再試行', account: 'アカウント', language: '言語' },
  catalog: {
    viewServices: 'サービスを見る →',
    title: 'どんなサービスをお探しですか？', subtitle: 'ハノイのサービスを探しましょう。',
    categorySubtitle: 'サービスの分類とスキルを探しましょう。', loading: 'サービスを読み込み中…',
    empty: '利用可能なサービスはまだありません。', error: 'サービスを読み込めません。接続を確認して再試行してください。',
    skills: { one: '%{count}件のスキル', other: '%{count}件のスキル' },
    translationNotice: '未翻訳の項目はベトナム語で表示しています。',
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
