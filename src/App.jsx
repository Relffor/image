import { useCallback, useEffect, useMemo, useState } from 'react'

const STYLE_PRESETS = [
  'RAW photo', 'realistic photograph', 'DSLR photo',
  'high detail', '8k', 'cinematic lighting',
]

const MODELS = [
  { id: 'Juggernaut XL', label: 'Juggernaut XL ⭐' },
  { id: 'AlbedoBase XL (SDXL)', label: 'AlbedoBase XL' },
  { id: 'DreamShaper XL', label: 'DreamShaper XL' },
  { id: 'Pony Diffusion XL', label: 'Pony Diffusion XL' },
  { id: 'ICBINP XL', label: 'ICBINP XL' },
]

const SIZES = [
  { label: '512 × 512', width: 512, height: 512 },
  { label: '768 × 512', width: 768, height: 512 },
  { label: '512 × 768', width: 512, height: 768 },
  { label: '1024 × 1024', width: 1024, height: 1024 },
  { label: '1024 × 768', width: 1024, height: 768 },
  { label: '768 × 1024', width: 768, height: 1024 },
]

const API_URL = 'https://relffor.pythonanywhere.com/api'

async function fetchJson(url, options) {
  const res = await fetch(url, options)
  let data = null
  try { data = await res.json() } catch { data = null }
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `HTTP ${res.status} ${res.statusText}`
    throw new Error(msg)
  }
  return data
}

function App() {
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState(
    'low quality, blurry, watermark, text, extra fingers, deformed hands'
  )
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedStyles, setSelectedStyles] = useState([])
  const [steps, setSteps] = useState(28)
  const [cfgScale, setCfgScale] = useState(7)
  const [seedMode, setSeedMode] = useState('random')
  const [seed, setSeed] = useState(123456)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [modelId, setModelId] = useState(MODELS[0].id)
  const [size, setSize] = useState(SIZES[0])
  const [lightbox, setLightbox] = useState(null)

  const stylePrefix = useMemo(() =>
    selectedStyles.length > 0 ? selectedStyles.join(', ') + ', ' : ''
  , [selectedStyles])

  const finalPrompt = useMemo(() =>
    stylePrefix + prompt.trim()
  , [stylePrefix, prompt])

  const toggleStyle = (style) =>
    setSelectedStyles(c => c.includes(style) ? c.filter(s => s !== style) : [...c, style])

  const fetchJobs = useCallback(async (signal) => {
    const data = await fetchJson(`${API_URL}/jobs`, { signal })
    const next = Array.isArray(data) ? data : data?.jobs
    if (!Array.isArray(next)) throw new Error('Hibás /jobs válasz')
    setJobs(next)
  }, [])

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    setError('')
    try {
      await fetchJson(`${API_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          negative_prompt: negativePrompt.trim(),
          steps: Number(steps),
          cfg_scale: Number(cfgScale),
          seed: seedMode === 'fixed' ? Number(seed) : null,
          model_id: modelId,
          width: size.width,
          height: size.height,
        }),
      })
      setPrompt('')
      const c = new AbortController()
      await fetchJobs(c.signal)
    } catch (err) {
      setError(err?.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (jobId) => {
    try {
      await fetchJson(`${API_URL}/jobs/${jobId}`, { method: 'DELETE' })
      setJobs(prev => prev.filter(j => j.id !== jobId))
    } catch (err) {
      setError(err?.message || String(err))
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    fetchJobs(controller.signal).catch(err => {
      if (err?.name === 'AbortError') return
      setError(err?.message || String(err))
    })
    let intervalId = null
    if (autoRefresh) {
      intervalId = setInterval(() => {
        fetchJobs(controller.signal).catch(() => {})
      }, 3000)
    }
    return () => { controller.abort(); if (intervalId) clearInterval(intervalId) }
  }, [autoRefresh, fetchJobs])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setLightbox(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>🎨 AI Képgenerátor</h1>

      <div style={{ background: '#1e293b', padding: '2rem', borderRadius: '12px', marginBottom: '2rem' }}>

        {/* AUTO REFRESH + HIBA */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <label style={{ color: '#e2e8f0', fontSize: '0.9rem' }}>
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} style={{ marginRight: '0.5rem' }} />
            Auto frissítés (3 mp)
          </label>
          {!!error && (
            <div style={{ padding: '0.6rem 0.8rem', background: '#7f1d1d', borderRadius: '8px', color: '#fecaca', fontSize: '0.9rem' }}>
              ❌ {error}
            </div>
          )}
        </div>

        {/* STÍLUS GOMBOK */}
        <div style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {STYLE_PRESETS.map(style => {
            const active = selectedStyles.includes(style)
            return (
              <button key={style} type="button" onClick={() => toggleStyle(style)} style={{
                padding: '0.35rem 0.8rem', borderRadius: '999px',
                border: active ? '1px solid #22c55e' : '1px solid #64748b',
                background: active ? 'rgba(34,197,94,0.18)' : 'rgba(15,23,42,0.9)',
                color: active ? '#bbf7d0' : '#e2e8f0', fontSize: '0.8rem', cursor: 'pointer',
              }}>{style}</button>
            )
          })}
          {selectedStyles.length > 0 && (
            <button type="button" onClick={() => setSelectedStyles([])} style={{
              padding: '0.35rem 0.8rem', borderRadius: '999px',
              border: '1px solid #ef4444', background: 'rgba(239,68,68,0.12)',
              color: '#fecaca', fontSize: '0.8rem', cursor: 'pointer',
            }}>Stílusok törlése</button>
          )}
        </div>

        {/* MODEL + MÉRET */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <div style={{ color: '#e2e8f0', fontSize: '0.9rem', marginBottom: '0.4rem' }}>Model</div>
            <select value={modelId} onChange={e => setModelId(e.target.value)} style={{
              width: '100%', padding: '0.6rem', background: '#0f172a',
              border: '1px solid #64748b', borderRadius: '8px', color: '#f1f5f9', fontSize: '0.95rem',
            }}>
              {MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <div style={{ color: '#e2e8f0', fontSize: '0.9rem', marginBottom: '0.4rem' }}>Képméret</div>
            <select
              value={`${size.width}x${size.height}`}
              onChange={e => {
                const found = SIZES.find(s => `${s.width}x${s.height}` === e.target.value)
                if (found) setSize(found)
              }}
              style={{
                width: '100%', padding: '0.6rem', background: '#0f172a',
                border: '1px solid #64748b', borderRadius: '8px', color: '#f1f5f9', fontSize: '0.95rem',
              }}
            >
              {SIZES.map(s => (
                <option key={`${s.width}x${s.height}`} value={`${s.width}x${s.height}`}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* POSITIVE PROMPT */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ color: '#e2e8f0', fontSize: '0.9rem', marginBottom: '0.4rem' }}>Positive prompt</div>
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
            placeholder="Írj be egy prompt-ot angolul (pl: beautiful sunset over mountains, dramatic lighting)"
            style={{ width: '100%', minHeight: '90px', padding: '1rem', background: '#0f172a', border: '1px solid #38bdf8', borderRadius: '8px', color: '#f1f5f9', fontSize: '1rem' }}
          />
        </div>

        {/* NEGATIVE PROMPT */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ color: '#e2e8f0', fontSize: '0.9rem', marginBottom: '0.4rem' }}>Negative prompt</div>
          <textarea value={negativePrompt} onChange={e => setNegativePrompt(e.target.value)}
            placeholder="Mit NE tartalmazzon..."
            style={{ width: '100%', minHeight: '70px', padding: '1rem', background: '#0f172a', border: '1px solid #64748b', borderRadius: '8px', color: '#f1f5f9', fontSize: '0.95rem' }}
          />
        </div>

        {/* SLIDERS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid #334155', borderRadius: '10px', padding: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e2e8f0' }}>
              <div>Steps</div><div style={{ color: '#93c5fd' }}>{steps}</div>
            </div>
            <input type="range" min="5" max="60" step="1" value={steps} onChange={e => setSteps(Number(e.target.value))} style={{ width: '100%' }} />
            <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Több step lassabb, néha részletesebb.</div>
          </div>

          <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid #334155', borderRadius: '10px', padding: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e2e8f0' }}>
              <div>CFG / Guidance</div><div style={{ color: '#93c5fd' }}>{cfgScale}</div>
            </div>
            <input type="range" min="1" max="20" step="0.5" value={cfgScale} onChange={e => setCfgScale(Number(e.target.value))} style={{ width: '100%' }} />
            <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Magasabb érték jobban „ragaszkodik" a prompt-hoz.</div>
          </div>

          <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid #334155', borderRadius: '10px', padding: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e2e8f0' }}>
              <div>Seed</div><div style={{ color: '#93c5fd' }}>{seedMode === 'random' ? 'Random' : seed}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', margin: '0.5rem 0' }}>
              <label style={{ color: '#e2e8f0', fontSize: '0.9rem' }}>
                <input type="radio" name="seedMode" checked={seedMode === 'random'} onChange={() => setSeedMode('random')} style={{ marginRight: '0.4rem' }} />Random
              </label>
              <label style={{ color: '#e2e8f0', fontSize: '0.9rem' }}>
                <input type="radio" name="seedMode" checked={seedMode === 'fixed'} onChange={() => setSeedMode('fixed')} style={{ marginRight: '0.4rem' }} />Fix
              </label>
              {seedMode === 'fixed' && (
                <input type="number" value={seed} min="0" onChange={e => setSeed(Number(e.target.value))}
                  style={{ flex: 1, padding: '0.4rem 0.6rem', background: '#0f172a', border: '1px solid #64748b', borderRadius: '8px', color: '#f1f5f9' }}
                />
              )}
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Fix seed = reprodukálható eredmény.</div>
          </div>
        </div>

        {/* PREVIEW */}
        <div style={{ marginBottom: '1rem', color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.4 }}>
          <strong>Előnézet:</strong> {finalPrompt || '(üres prompt)'}<br />
          <strong>Negative:</strong> {negativePrompt.trim() || '(üres)'}<br />
          <strong>Params:</strong> steps={steps}, cfg={cfgScale}, seed={seedMode === 'random' ? 'random' : seed}, {size.label}, {MODELS.find(m => m.id === modelId)?.label}
        </div>

        {/* GENERATE BUTTON */}
        <button onClick={handleGenerate} disabled={loading || !prompt.trim()} style={{
          width: '100%', padding: '1rem',
          background: loading ? '#64748b' : 'linear-gradient(135deg, #38bdf8, #818cf8)',
          color: '#0f172a', border: 'none', borderRadius: '8px',
          fontSize: '1.1rem', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer',
        }}>
          {loading ? 'Feldolgozás...' : '🚀 Képgenerálás indítása'}
        </button>
      </div>

      {/* JOB KÁRTYÁK */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {jobs.map(job => (
          <div key={job.id} style={{ background: '#1e293b', padding: '1rem', borderRadius: '12px', border: '1px solid #334155', position: 'relative' }}>
            <button onClick={() => handleDelete(job.id)} title="Törlés" style={{
              position: 'absolute', top: '0.6rem', right: '0.6rem',
              background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444',
              color: '#fca5a5', borderRadius: '6px', padding: '0.2rem 0.5rem',
              fontSize: '0.8rem', cursor: 'pointer',
            }}>✕</button>

            <div style={{ marginBottom: '0.4rem', fontSize: '0.85rem', color: '#cbd5e1', wordBreak: 'break-word', paddingRight: '2rem' }}>
              <strong>Prompt:</strong> {job.prompt}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.5rem' }}>
              {job.model_id} · {job.width}×{job.height} · steps={job.num_inference_steps} · cfg={job.guidance_scale}
              {job.duration_seconds != null && <span> · ⏱ {job.duration_seconds}s</span>}
            </div>

            {job.status === 'completed' && job.image_url && (
              <img src={job.image_url} alt={job.prompt}
                onClick={() => setLightbox({ url: job.image_url, prompt: job.prompt })}
                style={{ width: '100%', borderRadius: '8px', marginBottom: '0.5rem', cursor: 'zoom-in', display: 'block' }}
              />
            )}
            {job.status === 'processing' && (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#38bdf8' }}>⏳ Generálás folyamatban...</div>
            )}
            {job.status === 'queued' && (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#f59e0b' }}>⏱️ Várakozik...</div>
            )}
            {job.status === 'failed' && (
              <div style={{ padding: '1rem', background: '#7f1d1d', borderRadius: '8px', color: '#fca5a5' }}>
                ❌ Hiba: {job.error_message || 'Ismeretlen hiba'}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* LIGHTBOX */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, cursor: 'zoom-out', padding: '1.5rem',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            maxWidth: '90vw', maxHeight: '90vh',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
          }}>
            <img src={lightbox.url} alt={lightbox.prompt} style={{
              maxWidth: '100%', maxHeight: '80vh', borderRadius: '10px',
              boxShadow: '0 0 60px rgba(0,0,0,0.8)',
            }} />
            <div style={{ color: '#cbd5e1', fontSize: '0.9rem', textAlign: 'center', maxWidth: '600px' }}>
              {lightbox.prompt}
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <a href={lightbox.url} download="generated.png" style={{
                padding: '0.6rem 1.2rem', background: '#38bdf8', color: '#0f172a',
                borderRadius: '8px', fontWeight: '600', textDecoration: 'none', fontSize: '0.9rem',
              }}>⬇ Letöltés</a>
              <button onClick={() => setLightbox(null)} style={{
                padding: '0.6rem 1.2rem', background: '#334155', color: '#e2e8f0',
                border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem',
              }}>Bezárás</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
