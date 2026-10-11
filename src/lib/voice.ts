import { Platform } from 'react-native';

import type { Message } from './database.types';
import { supabase } from './supabase';

const BUCKET = 'voice-messages';
export const MAX_VOICE_NOTE_MS = 2 * 60_000;

const CONTENT_TYPES: Record<string, string> = {
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
  aac: 'audio/aac',
  mp3: 'audio/mpeg',
  webm: 'audio/webm',
  ogg: 'audio/ogg',
};

/** File extension of a recording URI ("blob:" URIs on web have none). */
export function recordingExtension(uri: string, platform: string = Platform.OS): string {
  const match = /\.([a-z0-9]+)(?:\?|#|$)/i.exec(uri.startsWith('blob:') ? '' : uri);
  const ext = match?.[1]?.toLowerCase();
  if (ext && CONTENT_TYPES[ext]) return ext;
  return platform === 'web' ? 'webm' : 'm4a';
}

/** Upload a recording to my folder in the private bucket; returns its path. */
export async function uploadVoiceNote(uri: string, myId: string): Promise<string> {
  const ext = recordingExtension(uri);
  const path = `${myId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const file = await (await fetch(uri)).arrayBuffer();
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: CONTENT_TYPES[ext],
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function sendVoiceMessage(recipientId: string, path: string, durationMs: number): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      recipient_id: recipientId,
      body: '🎤 Voice message',
      kind: 'voice',
      attachment_path: path,
      duration_ms: Math.round(durationMs),
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

const signedUrls = new Map<string, { url: string; expires: number }>();

/** Short-lived playback URL (storage RLS checks I'm the sender or recipient). */
export async function voiceNoteUrl(path: string): Promise<string> {
  const cached = signedUrls.get(path);
  if (cached && cached.expires > Date.now() + 60_000) return cached.url;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error) throw error;
  signedUrls.set(path, { url: data.signedUrl, expires: Date.now() + 3600_000 });
  return data.signedUrl;
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
