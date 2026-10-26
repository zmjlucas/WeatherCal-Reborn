import { isRecord, record } from '../types/json';

export interface RainForecast {
  updateTime: number;
  points: { time: number; amount: number; type: 'rain' | 'snow' }[];
  sources: string[];
}
export interface RainOutlook {
  state: 'starts' | 'stops' | 'ongoing' | 'clear';
  time: number;
  kind: 'rain' | 'snow' | 'precipitation';
}

const interval = 5 * 60000;
function timestamp(value: unknown): number {
  return typeof value === 'string' && /^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(value) ? Date.parse(value) : NaN;
}

/** QWeather /v7/minutely/5m amounts are millimetres per five-minute bin,
 * not probabilities. Reject incomplete sequences rather than inventing dry bins. */
export function parseRainResponse(value: unknown): RainForecast | null {
  if (!isRecord(value) || value.code !== '200') return null;
  const updateTime = timestamp(value.updateTime);
  if (!Number.isFinite(updateTime) || !Array.isArray(value.minutely) || !value.minutely.length) return null;
  const points: RainForecast['points'] = [];
  for (const candidate of value.minutely) {
    const point = record(candidate);
    const time = timestamp(point.fxTime);
    const amount = typeof point.precip === 'string' && /^\d+(?:\.\d+)?$/.test(point.precip) ? Number(point.precip) : NaN;
    if (!Number.isFinite(time) || !Number.isFinite(amount) || (point.type !== 'rain' && point.type !== 'snow')) return null;
    const previous = points[points.length - 1];
    if (previous && time - previous.time !== interval) return null;
    points.push({ time, amount, type: point.type });
  }
  const sources = record(value.refer).sources;
  return { updateTime, points, sources: Array.isArray(sources) ? sources.filter((entry): entry is string => typeof entry === 'string') : [] };
}

/** Recompute from absolute timestamps on every render; a cached relative summary
 * must never be reused as a fresh countdown or a fresh two-hour forecast. */
export function assessRain(forecast: RainForecast, now: number): RainOutlook | null {
  if (forecast.updateTime > now || now - forecast.updateTime > 15 * 60000) return null;
  const last = forecast.points[forecast.points.length - 1];
  if (!last) return null;
  const end = Math.min(last.time + interval, forecast.updateTime + 2 * 3600000);
  const points = forecast.points.filter(point => point.time + interval > now && point.time < end);
  const current = points[0];
  if (!current || current.time > now || end <= now) return null;
  const kinds = new Set(points.filter(point => point.amount > 0).map(point => point.type));
  const kind = kinds.size > 1 ? 'precipitation' : kinds.has('snow') ? 'snow' : 'rain';
  if (current.amount > 0) {
    const dry = points.find(point => point.amount === 0);
    return { state: dry ? 'stops' : 'ongoing', time: dry?.time ?? end, kind };
  }
  const wet = points.find(point => point.amount > 0);
  return { state: wet ? 'starts' : 'clear', time: wet?.time ?? end, kind };
}
