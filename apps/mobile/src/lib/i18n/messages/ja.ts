import type {
 MessageDictionary } from './vi';
export const ja = {
  location: {"viewMap": "地図を見る","title": "場所を選択", "open": "地図から場所を選ぶ", "change": "場所を変更", "advanced": "座標を手入力", "privacy": "住所検索とピンの選択では、検索文または座標をGeoapifyに送信します。GPSは下のボタンを押したときだけ取得します。", "query": "別の住所を検索（3文字以上）", "search": "住所を検索", "approximate": "おおよその位置", "empty": "見つかりませんでした。通りや都市を追加するか、地図で選択してください。", "lookupError": "住所を取得できません。再検索するか、ピンを選んで住所を入力してください。", "gps": "現在地を使う", "gpsDenied": "位置情報が許可されていません。住所検索や地図からの選択は引き続き使えます。", "gpsFailed": "現在地を取得できません。再試行するか手動で選択してください。", "accuracy": "GPSの精度は約%{meters}mです。ピンを確認してください。", "mapHint": "地図をタップしてピンを置くか、地図を動かして中心を選択します。", "mapError": "地図を読み込めません。住所検索は利用できます。座標の手入力は前の画面にあります。", "checkPin": "おおよその位置です。確定する前にピンを確認してください。", "description": "住所の説明（階・部屋番号など）", "confirm": "この場所を使う"},
  partners: {"tabProfile": "基本情報", "tabSkills": "スキル・料金", "tabAreas": "対応エリア", "tabLocations": "店舗", "availabilityTitle": "仕事の受付状況", "draftAvailabilityHint": "仕事を受け付けるには、先にプロフィールを公開してください。下の項目でスキルと対応場所を保存できます。", "acceptingHint": "対応エリアのお客様が検索で見つけられます。下のボタンで受付を一時停止できます。", "pausedHint": "現在、検索結果には表示されません。対応できるときに受付を開始してください。", "editDetails": "サービス情報", "visibilityTitle": "公開プロフィール", "manage": "プロフィール・受付状況を管理", "title": "サービスを提供", "intro": "スキルと対応エリアを登録して、お客様に見つけてもらいましょう。", "create": "サービスプロフィールを作成", "empty": "サービスプロフィールはまだありません。", "verifyNeeded": "作成には電話番号の確認が必要です。確認機能は準備中です。", "solo": "個人事業者", "shop": "店舗", "company": "企業", "name": "サービス名", "bio": "紹介", "phone": "連絡先電話番号", "zalo": "Zalo", "profile": "紹介・連絡先", "skills": "スキル・参考料金", "areas": "対応エリア", "locations": "店舗所在地", "save": "この項目を保存", "saved": "保存しました。", "reload": "保存済み内容を再読込", "reloadHint": "再読込すると未保存の編集内容が保存済み内容に置き換わります。", "draft": "下書き", "published": "公開済み", "publish": "プロフィールを公開", "unpublish": "下書きに戻して受付を停止", "accepting": "受付中", "paused": "受付停止中", "enable": "受付を開始", "disable": "受付を停止", "unverified": "プロフィール未確認", "verified": "確認済みプロフィール", "publishHint": "公開前にスキルと対応場所を保存してください。公開条件を満たさなくなる変更は下書きに戻して行います。公開だけでは受付は開始されません。", "addArea": "対応エリアを追加", "addLocation": "店舗を追加", "remove": "削除", "label": "エリア名", "radius": "対応半径（m）", "public": "この住所を公開", "private": "非公開住所", "at_shop": "店舗で", "at_customer": "出張", "custom": "その他の場所", "labor": "参考作業料金（VND）", "inspection": "点検料（VND）", "travel": "出張料（VND）", "priceHint": "料金未公開の場合は空欄にします。0は無料です。", "chooseIndustry": "業種を選んでスキルを追加", "addSkill": "スキルを追加", "preview": "公開プロフィールを見る", "error": "操作できませんでした。権限と接続を確認して再試行してください。", "invalid": "名前、スキル、対応場所、座標を確認してください。公開するにはすべてのスキルの条件を満たす必要があります。", "pending": "保存結果を確認できません。同じ操作を再試行してから編集を続けてください。", "back": "自分のプロフィールに戻る"},
  search: {"title": "サービス提供者を探す", "intro": "サービスを受ける場所を指定してください。対応エリアと店舗の位置から距離を計算します。", "submit": "近くのサービスを検索", "radius": "検索半径（m）", "allModes": "すべての対応場所", "verified": "確認済みのみ", "allProfiles": "確認状態を問わない", "savedAddresses": "保存済み住所を使う", "empty": "条件に合う提供者が見つかりません。条件や検索半径を変更してください。", "loading": "サービスを検索中…", "error": "結果を読み込めませんでした。再試行してください。", "invalid": "有効な座標と正の整数の半径を入力してください。", "more": "もっと見る", "distanceShop": "店舗まで %{distance} km", "distanceArea": "対応エリアの中心まで %{distance} km", "price": "参考作業料金：%{price} VND", "noPrice": "作業料金未公開", "view": "プロフィールを見る", "profile": "サービスプロフィール", "loginContact": "連絡先を見るにはログインしてください", "noContact": "連絡先は未公開です。", "comingNext": "依頼とチャットは次の開発段階で追加します。", "notFound": "このプロフィールは未公開、または現在閲覧できません。", "chooseSkill": "このスキルの提供者を探す"},

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
  accountTools: {"loading": "読み込み中…", "reload": "一覧を再読み込み", "more": "もっと見る", "cancel": "キャンセル", "saved": "変更を保存しました。", "error": "操作を完了できませんでした。接続を確認して再試行してください。", "conflict": "別の端末で変更されています。再読み込みしてから保存してください。入力内容は保持されます。", "invalid": "名前、住所、有効な座標を確認してください。", "signedOut": "セッションが終了しました。再度ログインして続けてください。", "pending": "操作結果を確認できませんでした。同じ操作を再試行して結果を確認してください。"},
  sessions: {"title": "ログイン履歴", "intro": "各項目は1回のログインを表します。無効にすると、その端末のログインが終了します。", "current": "現在のセッション", "other": "別のログイン", "created": "ログイン日時：%{date}", "seen": "最終利用：%{date}", "unknown": "情報なし", "active": "有効", "expired": "期限切れ", "revoked": "無効", "revoke": "セッションを無効にする", "confirm": "このログインを無効にしますか？該当の端末では再ログインが必要です。", "confirmCurrent": "現在のセッションです。無効にすると、このアプリからログアウトします。", "empty": "ログイン履歴はありません。", "revokeOthers": "他のセッションをすべて終了", "preparing": "セッション一覧を読み込んでいます…", "confirmOthers": "確認した他の%{count}件のセッションを終了しますか？現在のログインは維持されます。確認後の新しいログインは対象外です。", "progress": "終了を確認済み：%{completed}/%{total}件。", "batchError": "完了していません。終了済みのセッションはそのままです。再試行して残りを続けてください。", "batchDone": "確認した一覧の%{count}件を終了しました。", "noOthers": "他に有効なセッションはありません。"},
  addresses: {"title": "保存した住所", "intro": "自分専用の住所を保存できます。最初の住所は既定になります。", "add": "住所を追加", "edit": "住所を編集", "label": "住所の名前", "text": "住所", "coordinates": "小数点を使って座標を手入力してください。地図からの選択にはまだ対応していません。", "lat": "緯度（−90〜90）", "lng": "経度（−180〜180）", "default": "既定の住所", "makeDefault": "既定に設定", "save": "住所を保存", "archive": "住所を削除", "confirmArchive": "「%{label}」を住所一覧から削除しますか？別の既定住所は後から選べます。", "empty": "保存した住所はありません。"},
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
