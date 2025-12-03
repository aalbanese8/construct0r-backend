import { supabase } from '../config/supabase.js';

export const getProjects = async (userId: string) => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const getProject = async (projectId: string, userId: string) => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Project not found');

  return data;
};

export const createProject = async (userId: string, name: string) => {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      name,
      nodes: [],
      edges: [],
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateProject = async (
  projectId: string,
  userId: string,
  updates: { name?: string; nodes?: any; edges?: any }
) => {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Project not found');

  return data;
};

export const deleteProject = async (projectId: string, userId: string) => {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
    .eq('user_id', userId);

  if (error) throw error;
};
