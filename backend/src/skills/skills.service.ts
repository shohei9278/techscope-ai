import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class SkillsService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(userId: string, skill_name: string, level: number) {
    const { data, error } = await this.supabase.client
      .from('user_skills')
      .insert({ user_id: userId, skill_name, level });

    if (error) throw new Error(error.message);
    return data;
  }

  async findAll(userId: string) {
    const { data, error } = await this.supabase.client
      .from('user_skills')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }

  async remove(id: number) {
    const { error } = await this.supabase.client
      .from('user_skills')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    return { success: true };
  }
}
