// Archivo: js/supabase-config.js

// 1. Aquí pegas la URL que copiaste (mantén las comillas simples)
const SUPABASE_URL = 'https://lvuhzjdfbytshvpgbxox.supabase.co';

// 2. Aquí pegas la llave anon que copiaste (mantén las comillas simples)
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2dWh6amRmYnl0c2h2cGdieG94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1NDMwODMsImV4cCI6MjEwODExOTA4M30.uaiDMtWN7ivUyHK2FyzIAonChvPsJpieEnRGbFi59jk';

// 3. Esta línea conecta tu página con Supabase usando los datos de arriba
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);