import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const VITE_SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.*)/)[1];
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pbXFkdHhyb290cHdka3FqdnVuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY4MjIyMiwiZXhwIjoyMDkwMjU4MjIyfQ.v_lDssMPavCBGEyLbS-0WF-6Hy_8wAWFAaqNfV1XwUI';

const supabase = createClient(VITE_SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkTable(tableName) {
  const { count, error } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true });
    
  if (error) {
    console.log(`❌ Error checking ${tableName}:`, error.message);
  } else {
    console.log(`✅ Table '${tableName}' - Số lượng Record: ${count}`);
  }
}

async function run() {
  console.log("Checking Supabase Database Tables (Bypass RLS)...");
  await checkTable('campuses');
  await checkTable('departments');
  await checkTable('user_profiles');
  await checkTable('profiles');
  await checkTable('contracts');
  await checkTable('templates');
}

run();
