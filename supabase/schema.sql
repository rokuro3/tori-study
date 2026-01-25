-- Supabase用のテーブル設計
-- このSQLをSupabaseのSQL Editorで実行してください

-- 1. スコア履歴テーブル（既存の場合はスキップ）
CREATE TABLE IF NOT EXISTS scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL DEFAULT 5,
    correct_answers INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 種ごとの回答履歴テーブル（バッジ計算用）
CREATE TABLE IF NOT EXISTS species_answers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    species_name TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ユーザーバッジテーブル
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_type TEXT NOT NULL, -- 'bronze', 'silver', 'gold', 'platinum'
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, badge_type)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_scores_user_id ON scores(user_id);
CREATE INDEX IF NOT EXISTS idx_species_answers_user_id ON species_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_species_answers_species ON species_answers(species_name);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);

-- RLS（Row Level Security）ポリシーの設定
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE species_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- scores テーブルのポリシー
CREATE POLICY "Users can view their own scores" ON scores
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scores" ON scores
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- species_answers テーブルのポリシー
CREATE POLICY "Users can view their own species answers" ON species_answers
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own species answers" ON species_answers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- user_badges テーブルのポリシー
CREATE POLICY "Users can view their own badges" ON user_badges
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own badges" ON user_badges
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 種ごとの正答率を計算するビュー
CREATE OR REPLACE VIEW species_accuracy AS
SELECT 
    user_id,
    species_name,
    COUNT(*) as total_answers,
    SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct_answers,
    ROUND(
        (SUM(CASE WHEN is_correct THEN 1 ELSE 0 END)::DECIMAL / COUNT(*)) * 100, 
        1
    ) as accuracy_percent
FROM species_answers
GROUP BY user_id, species_name;
