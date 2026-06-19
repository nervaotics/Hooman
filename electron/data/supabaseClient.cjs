const { createClient } = require('@supabase/supabase-js')
const { getSupabaseConfig } = require('../db/supabaseConfig.cjs')

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let restClient = null
/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let realtimeClient = null
let clientSignature = ''

/**
 * REST client for Realtime (main process only).
 * @param {import('electron-store')} store
 */
function getSupabaseRestClient(store) {
  const cfg = getSupabaseConfig(store)
  if (!cfg?.url) return null
  const key = cfg.serviceRoleKey || cfg.anonKey
  if (!key) return null
  const sig = `${cfg.url}:${key.slice(0, 8)}`
  if (restClient && sig === clientSignature) return restClient
  restClient = createClient(cfg.url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 10 } },
  })
  clientSignature = sig
  return restClient
}

module.exports = { getSupabaseRestClient }
