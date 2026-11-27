export async function demoGet<T>(path: 'overview'|'members'|'coaches'|'plans'|'appointments'|'products'|'athlete'): Promise<T|null> {
  try {
    const r = await fetch((process.env.FTA_API_URL ?? 'http://127.0.0.1:4000') + '/api/v1/demo/' + path,{cache:'no-store',signal:AbortSignal.timeout(3000)});
    return r.ok ? await r.json() as T : null;
  } catch { return null; }
}
