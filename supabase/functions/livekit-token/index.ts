// Issues LiveKit room tokens for Snow Buddies calls.
//
// Deploy:  npx supabase functions deploy livekit-token
// Secrets: npx supabase secrets set LIVEKIT_URL=wss://<project>.livekit.cloud \
//            LIVEKIT_API_KEY=... LIVEKIT_API_SECRET=...
//
// The caller's JWT is forwarded to Postgres, so row level security decides
// whether they may see the call; only participants of a live call get a token.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { AccessToken } from 'npm:livekit-server-sdk@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const livekitUrl = Deno.env.get('LIVEKIT_URL');
  const apiKey = Deno.env.get('LIVEKIT_API_KEY');
  const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');
  if (!livekitUrl || !apiKey || !apiSecret) {
    return json({ error: 'Calling is not configured' }, 500);
  }

  const authorization = req.headers.get('Authorization');
  if (!authorization) return json({ error: 'Not signed in' }, 401);

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: 'Not signed in' }, 401);

  let callId: unknown;
  try {
    ({ callId } = await req.json());
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }
  if (typeof callId !== 'string') return json({ error: 'callId is required' }, 400);

  // RLS: returns the row only if this user is the caller or callee.
  const { data: call } = await supabase
    .from('calls')
    .select('id, caller_id, callee_id, status')
    .eq('id', callId)
    .maybeSingle();
  if (!call) return json({ error: 'Call not found' }, 404);

  const isCaller = call.caller_id === user.id;
  const allowed = call.status === 'active' || (call.status === 'ringing' && isCaller);
  if (!allowed) return json({ error: 'This call is not active' }, 409);

  const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single();

  const token = new AccessToken(apiKey, apiSecret, {
    identity: user.id,
    name: profile?.display_name ?? 'Rider',
    ttl: '2h',
  });
  token.addGrant({
    room: `call-${call.id}`,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: false,
  });

  return json({ token: await token.toJwt(), url: livekitUrl });
});
