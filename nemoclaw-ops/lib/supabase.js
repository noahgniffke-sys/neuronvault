// lib/supabase.js — Supabase client with service role key
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

let client = null;

function getClient() {
  if (!client) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error(
        'Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables'
      );
    }
    client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }
  return client;
}

module.exports = { getClient };
