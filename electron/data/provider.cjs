const { getOrCreateKnex, getDataProvider, getSupabaseConfig, isSupabaseConfigured } = require('../db/connection.cjs')
const { getSupabaseRestClient } = require('./supabaseClient.cjs')

/**
 * Unified data access for IPC handlers and services.
 * @param {import('electron-store')} store
 */
function getProvider(store) {
  const type = getDataProvider(store)
  const knex = getOrCreateKnex(store)
  const supabaseConfig = getSupabaseConfig(store)
  const supabase = type === 'supabase' ? getSupabaseRestClient(store) : null

  return {
    type,
    knex,
    supabase,
    supabaseConfig,
    isSupabase: type === 'supabase',
    isConfigured: type === 'supabase' ? isSupabaseConfigured(supabaseConfig) : true,
  }
}

module.exports = { getProvider }
