import { useEffect, useState } from 'react';
import axios from 'axios';

// Module-level cache: leaderboard answers only carry the player's name (no
// ID), so this maps name -> headshot URL once per page load and is shared
// across the desktop/mobile award tables instead of double-fetching.
let cachedHeadshotsByName = null;
let inFlightRequest = null;

const fetchHeadshotsByName = async () => {
  if (cachedHeadshotsByName) return cachedHeadshotsByName;
  if (!inFlightRequest) {
    inFlightRequest = axios.get('/api/v2/players/').then(({ data }) => {
      const map = {};
      (data?.players || []).forEach((player) => {
        if (player.headshot_url) map[player.name] = player.headshot_url;
      });
      cachedHeadshotsByName = map;
      return map;
    }).catch((error) => {
      console.error('Failed to fetch player headshots', error);
      return {};
    }).finally(() => {
      inFlightRequest = null;
    });
  }
  return inFlightRequest;
};

/**
 * Returns a { [playerName]: headshotUrl } map, fetched lazily and only when
 * `enabled` (i.e. the Player Awards section is actually being rendered).
 */
const usePlayerHeadshots = (enabled) => {
  const [headshotsByName, setHeadshotsByName] = useState(cachedHeadshotsByName || {});

  useEffect(() => {
    if (!enabled || cachedHeadshotsByName) return undefined;
    let cancelled = false;
    fetchHeadshotsByName().then((map) => {
      if (!cancelled) setHeadshotsByName(map);
    });
    return () => { cancelled = true; };
  }, [enabled]);

  return headshotsByName;
};

export default usePlayerHeadshots;
