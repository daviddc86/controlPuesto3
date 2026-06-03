import { createClient } from '@supabase/supabase-js'

// Reemplaza esto con tus datos reales de Supabase
const supabaseUrl = 'https://yidlijflttmrlqtoxfqb.supabase.co'
const supabaseAnonKey = 'sb_publishable_e4g6arh3nyrv0xSVEvTs6g_pYryT_1L'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)