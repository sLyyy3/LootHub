import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env. https://ckppopxhbijnxqcjqyvi.supabase.co
const supabaseAnonKey = process.env. eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrcHBvcHhoYmlqbnhxY2pxeXZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNTE1MTEsImV4cCI6MjA3ODYyNzUxMX0.q5ytDoql_uWwaIjoVpHt2MzRFbYzushGtC5M7w6eNzM
const supabaseServiceKey = process.env. eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrcHBvcHhoYmlqbnhxY2pxeXZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA1MTUxMSwiZXhwIjoyMDc4NjI3NTExfQ.rmZnwomZUf-nYZB37wr26mOtszMdfE5pOw9eTdihi10

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})