const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://qfudwoevwaoxvbxlxlcu.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdWR3b2V2d2FveHZieGx4bGN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2ODQ5MzIsImV4cCI6MjA3ODI2MDkzMn0.1IOIj2-SZR6-YtByWvxIpuQE83dhDQQIyx6Wmzm1Bok';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test connection (async, but don't block)
(async () => {
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error && error.code !== 'PGRST116') { // PGRST116 = table not found, which is ok during initial setup
      console.error('Supabase database connection error:', error.message);
    } else {
      console.log('Supabase database connected successfully');
    }
  } catch (err) {
    console.error('Supabase database connection error:', err.message);
  }
})();

module.exports = supabase;

