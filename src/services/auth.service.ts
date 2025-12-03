import { supabase } from '../config/supabase.js';

export const signup = async (email: string, password: string, name: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
    },
  });

  if (error) throw error;

  return {
    user: {
      id: data.user!.id,
      email: data.user!.email!,
      name: data.user!.user_metadata.name,
      avatar: data.user!.user_metadata.avatar_url,
    },
    accessToken: data.session!.access_token,
    refreshToken: data.session!.refresh_token,
  };
};

export const login = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  return {
    user: {
      id: data.user!.id,
      email: data.user!.email!,
      name: data.user!.user_metadata.name,
      avatar: data.user!.user_metadata.avatar_url,
    },
    accessToken: data.session!.access_token,
    refreshToken: data.session!.refresh_token,
  };
};

export const googleAuth = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.FRONTEND_URL}/auth/callback`,
    },
  });

  if (error) throw error;
  return data;
};
