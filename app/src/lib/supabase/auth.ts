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
  
  // サインアップ成功後、自動的にログインを試みる
  if (!error && data.user) {
    // 少し待ってからログインを試みる
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
