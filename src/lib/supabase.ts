import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  'https://ynidumrinncdqdukvpfa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluaWR1bXJpbm5jZHFkdWt2cGZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMDc3NTksImV4cCI6MjA5NDg4Mzc1OX0.hiCG7BARS5Gw5aoVWS8oMpi6nJcjbdTvlW0_ga116uM'
)
