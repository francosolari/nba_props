import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

/**
 * Read the NBA schedule for a season.
 *
 * Backed by `/api/v2/nba/schedule`, which proxies a slow upstream feed, so
 * results are held for half an hour and a failure resolves to `unavailable`
 * rather than throwing. Callers should drop their section when there are no
 * games instead of rendering an empty shell.
 *
 * @param {string}  seasonSlug          Season to read, or "current".
 * @param {object}  options
 * @param {string}  options.mode        upcoming | recent | live | range
 * @param {number}  options.limit       Maximum games to return.
 * @param {string}  options.startDate   ISO date, range mode only.
 * @param {string}  options.endDate     ISO date, range mode only.
 * @param {number}  options.offset      Paging offset, range mode only.
 * @param {boolean} options.enabled     Skip the request entirely when false.
 * @param {number}  options.refetchInterval Poll interval, for live scores.
 */
export default function useNbaSchedule(seasonSlug, {
  mode = 'upcoming',
  limit = 6,
  startDate,
  endDate,
  offset = 0,
  enabled = true,
  refetchInterval,
} = {}) {
  const params = { season_slug: seasonSlug, mode, limit, offset };
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;

  const query = useQuery({
    queryKey: ['nba-schedule', seasonSlug, mode, limit, startDate, endDate, offset],
    queryFn: async () => (await axios.get('/api/v2/nba/schedule', { params })).data || {},
    enabled: Boolean(seasonSlug) && enabled,
    staleTime: mode === 'live' ? 30 * 1000 : 30 * 60 * 1000,
    refetchInterval,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return {
    games: query.data?.games || [],
    unavailable: Boolean(query.data?.unavailable),
    isLoading: query.isLoading,
    error: query.error,
  };
}
