// src/auth/supabase.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { SupabaseClient, createClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseGuard implements CanActivate {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split('Bearer ')[1];

    if (!token) return false;

    const { data, error } = await this.supabase.auth.getUser(token);
    if (error || !data?.user) return false;

    // user情報をrequestに付与してControllerで使えるように
    request.user = data.user;
    return true;
  }
}
