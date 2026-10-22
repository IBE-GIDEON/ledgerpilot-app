import Constants, { ExecutionEnvironment } from 'expo-constants';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Session, SupabaseClient } from '@supabase/supabase-js';

import { Database } from '@/types/database';

WebBrowser.maybeCompleteAuthSession();

function readParam(source: URLSearchParams, key: string) {
  return source.get(key) ?? undefined;
}

export function isExpoGoAuthSession() {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

export function getAuthRedirectUrl() {
  return makeRedirectUri({
    scheme: 'ledgerpilot',
    path: 'auth/callback',
  });
}

export async function createSessionFromUrl(
  supabase: SupabaseClient<Database>,
  url: string
): Promise<Session | null> {
  const parsedUrl = new URL(url);
  const queryParams = new URLSearchParams(parsedUrl.search);
  const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ''));

  const errorDescription =
    readParam(queryParams, 'error_description') ?? readParam(hashParams, 'error_description');
  const errorCode = readParam(queryParams, 'error_code') ?? readParam(hashParams, 'error_code');

  if (errorCode) {
    throw new Error(errorDescription ?? errorCode);
  }

  const accessToken =
    readParam(queryParams, 'access_token') ?? readParam(hashParams, 'access_token');
  const refreshToken =
    readParam(queryParams, 'refresh_token') ?? readParam(hashParams, 'refresh_token');
  const authCode = readParam(queryParams, 'code') ?? readParam(hashParams, 'code');

  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data.session;
  }

  if (authCode) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(authCode);

    if (error) {
      throw new Error(error.message);
    }

    return data.session;
  }

  return null;
}
