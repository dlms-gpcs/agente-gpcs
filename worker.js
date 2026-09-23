const SUPABASE_URL = 'https://lnmjwmljlukllvsbezbk.supabase.co';

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    if (url.pathname === '/documentos') {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/documentos?select=nome_arquivo&limit=500`, {
        headers: {
          'apikey': env.SUPABASE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_KEY}`
        }
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/buscar') {
      const body = await request.json();
      const palavras = body.palavras || [];
      const filtros = palavras.map(p => `conteudo.ilike.*${p}*`).join(',');
      const res = await fetch(`${SUPABASE_URL}/rest/v1/documentos?or=(${filtros})&select=conteudo,nome_arquivo&limit=5`, {
        headers: {
          'apikey': env.SUPABASE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_KEY}`
        }
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/upload') {
      const body = await request.json();
      const nome = (body.nome_arquivo || '').trim();
      const chunks = Array.isArray(body.chunks) ? body.chunks : [];

      if (!nome || chunks.length === 0) {
        return new Response(JSON.stringify({ error: 'Informe nome_arquivo e chunks.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const registros = chunks.map(c => ({ nome_arquivo: nome, conteudo: String(c) }));
      let inseridos = 0;

      for (let i = 0; i < registros.length; i += 50) {
        const lote = registros.slice(i, i + 50);
        const res = await fetch(`${SUPABASE_URL}/rest/v1/documentos`, {
          method: 'POST',
          headers: {
            'apikey': env.SUPABASE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(lote)
        });
        if (!res.ok) {
          const detalhe = await res.text();
          return new Response(JSON.stringify({ error: 'Falha ao gravar no Supabase: ' + detalhe.slice(0, 200), inseridos }), {
            status: 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        inseridos += lote.length;
      }

      return new Response(JSON.stringify({ ok: true, inseridos }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (request.method === 'POST') {
      const body = await request.json();
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.GROQ_KEY}`
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response('OK', { headers: corsHeaders });
  }
};
