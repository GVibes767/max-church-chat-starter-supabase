window.GVBS_CONFIG = Object.freeze({
  supabaseUrl: 'https://gbtmdwknkepuqbsefhto.supabase.co',
  supabasePublishableKey: 'sb_publishable_4BB1LRShAX8uRQXACVN5rg_CaPtiiHz',
  pushBackendUrl: 'https://max-church-chat-starter-supabase.onrender.com'
});

localStorage.setItem('gvbs_supabase_key', window.GVBS_CONFIG.supabasePublishableKey);
localStorage.setItem('gvbs_push_backend_url', window.GVBS_CONFIG.pushBackendUrl);
