// GUITARVERSE AI Song Finder — Cloudflare Worker
// Configure GEMINI_API_KEY as a Worker secret. Deploy this Worker separately from GitHub Pages.
const MODEL = "gemini-2.5-flash";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8"
};
function reply(data, status=200) {
  return new Response(JSON.stringify(data), {status, headers:cors});
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null,{headers:cors});
    if (url.pathname !== "/search") return reply({error:"Use POST /search."},404);
    if (request.method !== "POST") return reply({error:"POST required."},405);
    if (!env.GEMINI_API_KEY) return reply({error:"Worker is missing GEMINI_API_KEY secret."},500);
    let body;
    try { body = await request.json(); } catch { return reply({error:"Invalid JSON body."},400); }
    const query = String(body.query || "").trim().slice(0,180);
    if (!query) return reply({error:"Enter a song title and artist."},400);

    const prompt = `Find guitar chord information for the song: "${query}".
Use Google Search grounding. Prefer reliable, identifiable chord-reference sources and official/authorized sources.
Return ONLY one JSON object, no markdown fences, with this schema:
{
 "results":[
  {
   "title":"song title",
   "artist":"recording artist",
   "key":"original key if supported by a source, otherwise empty",
   "capo":null,
   "bpm":null,
   "strumming":"only if a source supports it, otherwise empty",
   "chords":"concise chord progression / section labels, not a copied proprietary page",
   "chordSheet":"a short original section-by-section chord guide; do not reproduce a site's complete proprietary arrangement",
   "lyrics":"",
   "lyricsStatus":"not_provided|public_domain|licensed",
   "sources":[{"title":"source title","url":"https://..."}],
   "confidence":"high|medium|low",
   "notes":"what is confirmed and what needs checking"
  }
 ],
 "message":"brief note"
}
Important:
- Do NOT invent a source, URL, key, capo, BPM, strumming pattern, or chord progression.
- Include only source URLs actually found through search grounding.
- Do NOT reproduce full copyrighted lyrics. Set lyrics to an empty string unless the lyrics are clearly public domain or the source explicitly grants reuse / provides an authorized API or license. If not permitted, explain in notes that the user should open the linked source for lyrics.
- Chords can differ by arrangement and tuning. Say when the source is user-submitted/community-provided and needs verification.
- If no reliable chord result is found, return results: [] and explain in message.
- Do not claim a result is verified merely because a search result exists.`;

    try {
      const api = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;
      const upstream = await fetch(api, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          contents:[{parts:[{text:prompt}]}],
          tools:[{google_search:{}}],
          generationConfig:{temperature:0.2}
        })
      });
      const data = await upstream.json();
      if (!upstream.ok) return reply({error:data.error?.message || "Gemini search request failed."},upstream.status);
      const text = data.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("") || "";
      let parsed;
      try {
        const clean=text.replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"");
        parsed=JSON.parse(clean);
      } catch {
        return reply({error:"AI returned an unreadable result. Try a more specific song title and artist.",debugText:text.slice(0,500)},502);
      }
      const chunks=data.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const grounded=chunks.map(c=>c.web).filter(w=>w?.uri).map(w=>({title:w.title||"Web source",url:w.uri}));
      for (const r of (parsed.results||[])) {
        r.sources=Array.isArray(r.sources)?r.sources:[];
        const existing=new Set(r.sources.map(s=>s.url));
        for (const s of grounded) if (!existing.has(s.url)) { r.sources.push(s); existing.add(s.url); }
        r.sources=(r.sources||[]).filter(s=>typeof s.url==="string" && /^https:\/\//i.test(s.url));
      }
      return reply(parsed);
    } catch (e) {
      return reply({error:"Could not reach the AI search service. Check the Worker logs and try again."},502);
    }
  }
};
