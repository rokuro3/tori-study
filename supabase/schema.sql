-- Supabase用のテーブル設計
-- このSQLをSupabaseのSQL Editorで実行してください

-- =============================================
-- ユーザープロフィールテーブル
-- =============================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ユーザープロフィールのインデックス
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- ユーザープロフィールのRLS設定
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view any profile" ON user_profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- =============================================
-- 音声ファイル管理テーブル
-- =============================================
CREATE TABLE IF NOT EXISTS audio_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bird_name TEXT NOT NULL,
    scientific_name TEXT,
    family TEXT,
    family_jp TEXT,
    order_name TEXT,
    order_jp TEXT,
    genus TEXT,
    genus_jp TEXT,
    file_path TEXT NOT NULL,
    storage_url TEXT NOT NULL,
    original_filename TEXT,
    description TEXT,
    recordist TEXT,          -- 録音者
    source_url TEXT,         -- ソースURL（元データへのリンク）
    license TEXT,            -- ライセンス情報
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 問題集テーブル
-- =============================================
CREATE TABLE IF NOT EXISTS question_sets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    difficulty_level INTEGER DEFAULT 1, -- 1: 初級, 2: 中級, 3: 上級
    is_public BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 問題集と音声ファイルの中間テーブル
-- =============================================
CREATE TABLE IF NOT EXISTS question_set_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    question_set_id UUID REFERENCES question_sets(id) ON DELETE CASCADE,
    audio_file_id UUID REFERENCES audio_files(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(question_set_id, audio_file_id)
);

-- =============================================
-- 管理者テーブル
-- =============================================
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 1. スコア履歴テーブル（既存の場合はスキップ）
-- =============================================
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
    audio_file_id UUID REFERENCES audio_files(id) ON DELETE CASCADE,
    is_correct BOOLEAN NOT NULL,
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ユーザーバッジテーブル
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_type TEXT NOT NULL, -- 'bronze', 'silver', 'gold', 'platinum'
    question_set_id UUID REFERENCES question_sets(id) ON DELETE CASCADE, -- NULL = 全体バッジ
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, badge_type, question_set_id)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_scores_user_id ON scores(user_id);
CREATE INDEX IF NOT EXISTS idx_species_answers_user_id ON species_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_species_answers_species ON species_answers(species_name);
CREATE INDEX IF NOT EXISTS idx_species_answers_audio_file ON species_answers(audio_file_id);
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

-- =============================================
-- 新規テーブルのインデックス
-- =============================================
CREATE INDEX IF NOT EXISTS idx_audio_files_bird_name ON audio_files(bird_name);
CREATE INDEX IF NOT EXISTS idx_audio_files_is_active ON audio_files(is_active);
CREATE INDEX IF NOT EXISTS idx_question_sets_is_public ON question_sets(is_public);
CREATE INDEX IF NOT EXISTS idx_question_set_items_set_id ON question_set_items(question_set_id);

-- =============================================
-- 新規テーブルのRLSポリシー
-- =============================================

-- audio_files テーブル（誰でも読める、管理者のみ編集可能）
ALTER TABLE audio_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active audio files" ON audio_files
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can view all audio files" ON audio_files
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
    );

CREATE POLICY "Admins can insert audio files" ON audio_files
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
    );

CREATE POLICY "Admins can update audio files" ON audio_files
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
    );

CREATE POLICY "Admins can delete audio files" ON audio_files
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
    );

-- question_sets テーブル（公開問題集は誰でも閲覧可能）
ALTER TABLE question_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public question sets" ON question_sets
    FOR SELECT USING (is_public = true);

CREATE POLICY "Admins can view all question sets" ON question_sets
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
    );

CREATE POLICY "Admins can insert question sets" ON question_sets
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
    );

CREATE POLICY "Admins can update question sets" ON question_sets
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
    );

CREATE POLICY "Admins can delete question sets" ON question_sets
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
    );

-- question_set_items テーブル
ALTER TABLE question_set_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view items of public question sets" ON question_set_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM question_sets 
            WHERE question_sets.id = question_set_items.question_set_id 
            AND question_sets.is_public = true
        )
    );

CREATE POLICY "Admins can manage question set items" ON question_set_items
    FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
    );

-- admin_users テーブル（自分自身の確認のみ可能）
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can check if they are admin" ON admin_users
    FOR SELECT USING (user_id = auth.uid());

-- 種ごとの正答率を計算するビュー
-- SECURITY DEFINER 警告を避けるため、呼び出しユーザー権限で実行
CREATE OR REPLACE VIEW species_accuracy WITH (security_invoker = true) AS
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

-- =============================================
-- 鳥の種類一覧を取得するビュー
-- =============================================
CREATE OR REPLACE VIEW bird_species_list AS
SELECT DISTINCT
    bird_name,
    scientific_name,
    family_jp,
    order_jp,
    COUNT(*) as audio_count
FROM audio_files
WHERE is_active = true
GROUP BY bird_name, scientific_name, family_jp, order_jp
ORDER BY bird_name;
