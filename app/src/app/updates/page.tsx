import Link from 'next/link'

type UpdateEntry = {
  date: string
  title: string
  description: string
}

const updateEntries: UpdateEntry[] = [
  {
    date: '2026-05-05',
    title: '更新履歴ページを追加',
    description:
      '更新履歴ページを新設し、機能追加時は日付と内容をこのページに追記する運用を開始しました。',
  },
  {
    date: '2026-05-03',
    title: '学習モードに公開問題集の音声横断検索機能を追加',
    description:
      '学習モードページに、公開問題集に登録されている音声を一覧から鳥名・学名・科名・ファイル名・説明で横断検索できる機能を追加しました。',
  },
]

export default function UpdatesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800">
      <header className="p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">更新履歴</h1>
          <Link
            href="/"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
          >
            ホームへ戻る
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pb-12">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8 mb-6">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            運用ルール: 機能追加を行ったときは、このページに日付と内容を追記してください。
          </p>
        </div>

        <div className="space-y-4">
          {updateEntries.map((entry) => (
            <article
              key={`${entry.date}-${entry.title}`}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6"
            >
              <p className="text-sm font-semibold text-green-700 dark:text-green-300 mb-2">
                {entry.date}
              </p>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">{entry.title}</h2>
              <p className="text-gray-600 dark:text-gray-300">{entry.description}</p>
            </article>
          ))}
        </div>
      </main>
    </div>
  )
}
