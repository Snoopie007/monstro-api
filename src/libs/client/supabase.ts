import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    'https://igkxvndqseedkrmebeih.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlna3h2bmRxc2VlZGtybWViZWloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjg1Njc4MDQsImV4cCI6MjA0NDE0MzgwNH0.bXhPAY9Hgpg-UtMpF4Vb7QbeCdAae8BkhukGAZNoVDQ'
)

export default supabase;