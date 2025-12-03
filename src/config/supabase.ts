import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

const supabaseUrl = env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_KEY; // Use service key for backend

export const supabase = createClient(supabaseUrl, supabaseKey);

// For operations on behalf of users, create client with their token
export const createUserClient = (userToken: string) => {
  return createClient(supabaseUrl, env.SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    },
  });
};
