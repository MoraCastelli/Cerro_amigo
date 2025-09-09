import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tukiqmaidurdncutswwf.supabase.co';   // pega el tuyo
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1a2lxbWFpZHVyZG5jdXRzd3dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjQyMzMsImV4cCI6MjA3MzAwMDIzM30.uQOcdYOW8rC5gWIFi7sJWxPlv-X2FkAli76YgPWBuis';                       // pega el tuyo

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
