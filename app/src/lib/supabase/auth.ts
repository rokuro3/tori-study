'use client'

import { createClient } from './client'

export async function signUp(email: string, password: string, username?: string) {
  const supabase = createClient()
  
  // メール確認をスキップするオプションを追加
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: username || email.split('@')[0],
      },
      // メール確認をスキップ（Supabaseダッシュボードでも設定が必要）
      emailRedirectTo: undefined,
    },
  })
  
  // サインアップ成功後、プロフィールテーブルにユーザー情報を作成
  if (!error && data.user) {
    const finalUsername = username || email.split('@')[0]
    
    // プロフィールテーブルにデータを挿入
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: data.user.id,
        email: email,
        username: finalUsername,
        display_name: finalUsername,
      })
    
    if (profileError) {
      console.error('Profile creation error:', profileError)
    }
    
    // サインアップ成功後、自動的にログインを試みる
    const signInResult = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (!signInResult.error) {
      return { data: signInResult.data, error: null, autoLoggedIn: true }
    }
  }
  
  return { data, error, autoLoggedIn: false }
}

export async function signIn(email: string, password: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  return { data, error }
}

export async function signInWithIdentifier(identifier: string, password: string) {
  const supabase = createClient()
  
  // 入力が@を含む場合はメールアドレス、そうでない場合はユーザー名と判定
  const isEmail = identifier.includes('@')
  
  if (isEmail) {
    // メールアドレスでログイン
    const { data, error } = await supabase.auth.signInWithPassword({
      email: identifier,
      password,
    })
    
    // ログイン成功時、プロフィールが存在しない場合は作成
    if (!error && data.user) {
      await ensureUserProfile(data.user)
    }
    
    return { data, error }
  } else {
    // ユーザー名の場合、プロフィールテーブルから対応するメールアドレスを取得
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('username', identifier)
      .single()
    
    if (profileError || !profileData) {
      return { 
        data: null, 
        error: { message: 'ユーザー名が見つかりません。メールアドレスでログインしてください。' } 
      }
    }
    
    // 取得したメールアドレスでログイン
    const { data, error } = await supabase.auth.signInWithPassword({
      email: profileData.email,
      password,
    })
    
    return { data, error }
  }
}

// ユーザープロフィール自動作成関数
async function ensureUserProfile(user: any) {
  const supabase = createClient()
  
  console.log('Checking profile for user:', user.id, user.email)
  
  // プロフィールが既に存在するか確認
  const { data: existingProfile, error: checkError } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()
  
  if (checkError) {
    console.error('Error checking existing profile:', checkError)
    return
  }
  
  if (existingProfile) {
    console.log('Profile already exists')
    return
  }
  
  console.log('Profile does not exist, creating...')
  
  // ユーザーメタデータからユーザー名を取得、なければメールアドレスの前半
  let username = user.user_metadata?.username || user.email.split('@')[0]
  console.log('Using username from metadata:', username)
  
  // ユーザー名が既に存在するか確認
  const { data: existingUsername } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle()
  
  if (existingUsername) {
    // ユーザー名が重複している場合は、ユーザーIDを追加
    username = `${username}_${user.id.substring(0, 8)}`
    console.log('Username conflict, using:', username)
  }
  
  const { error } = await supabase
    .from('user_profiles')
    .insert({
      id: user.id,
      email: user.email,
      username: username,
      display_name: username,
    })
  
  if (error) {
    console.error('Profile auto-creation error:', error)
  } else {
    console.log('Profile created successfully:', username)
  }
}

export async function signOut() {
  const supabase = createClient()
  
  const { error } = await supabase.auth.signOut()
  
  return { error }
}

export async function getUser() {
  const supabase = createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  return { user, error }
}

export async function resetPasswordRequest(email: string) {
  const supabase = createClient()
  
  // リセットパスワードのリンクを送信
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  
  return { data, error }
}

export async function updatePassword(newPassword: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  })
  
  return { data, error }
}
