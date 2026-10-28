import { resolveQWeatherCredentials, saveQWeatherCredentials } from '../data/qweather-state';
import { parseQWeatherPart } from '../data/qweather-response';
import { finiteNumber, record } from '../types/json';

/** An explicit setup probe bypasses cached weather and runtime cooldown without
 * changing either. Credentials are committed only after a usable API response. */
export async function verifyAndSaveQWeatherCredentials(widgetName: string, hostInput: string, keyInput: string): Promise<string | null> {
  const credentials = resolveQWeatherCredentials(hostInput, keyInput);
  if (credentials === 'host') return 'Enter the dedicated qweatherapi.com API Host from your QWeather console.';
  if (credentials === 'key') return 'Enter a valid QWeather API key, or leave it blank only if a key is already saved for this host.';

  // A fixed public location verifies access without requesting GPS permission.
  const request = new Request('https://' + credentials.host + '/weather/v1/current/39.92/116.41');
  request.headers = { 'X-QW-Api-Key': credentials.key, Accept: 'application/json' };
  request.timeoutInterval = 15;
  request.onRedirect = () => { throw new Error('Unexpected QWeather redirect'); };
  let status: number | undefined;
  try {
    const raw: unknown = await request.loadJSON();
    const body = record(raw);
    const httpStatus = request.response?.statusCode;
    const errorStatus = record(body.error).status;
    const legacyStatus = typeof body.code === 'string' && /^\d{3}$/.test(body.code) ? Number(body.code) : undefined;
    status = httpStatus !== undefined && httpStatus !== 200 ? httpStatus : finiteNumber(errorStatus) ? errorStatus : legacyStatus ?? httpStatus;
    if (status !== 200 || !parseQWeatherPart('current', raw, 'metric')) throw new Error('QWeather response unavailable');
  } catch {
    status ??= request.response?.statusCode;
    if (status === 401) return 'QWeather rejected these credentials. Check your API Host and API key, then try again.';
    if (status === 403) return 'QWeather denied access. Check your credential permissions and account settings, then try again.';
    if (status === 429) return 'QWeather rate limit or quota reached. Check your quota and try again later.';
    return 'Could not verify QWeather credentials. Check your API Host, key and connection, then try again.';
  }

  saveQWeatherCredentials(widgetName, credentials.host, credentials.key);
  return null;
}
