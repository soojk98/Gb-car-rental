// =====================================================================
// Supabase client initialization
// =====================================================================
// Loaded by every page that needs to talk to Supabase.
// Requires the Supabase JS library to be loaded first via CDN:
//   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
//
// Note: the anon key is *intended* to be public — it's safe to commit
// and ship to the browser. Database access is protected by Row-Level
// Security policies defined in sql/schema.sql.
// =====================================================================

const SUPABASE_URL = 'https://qcjnxetljzwgjupzvumc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjam54ZXRsanp3Z2p1cHp2dW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3OTEyOTYsImV4cCI6MjA5MTM2NzI5Nn0.ylS63LWUAHI1FNnfrVoz6kUFIRQcyqcwe0V98DDs2A4';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
