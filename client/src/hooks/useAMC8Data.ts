import { useState, useEffect } from "react";
import type { AMC8Data } from "@/lib/amc8Types";

const AMC8_DATA_URL = "/amc8_categorized_600df9fc.json";

// Module-level cache so we don't re-fetch on every mount
let cachedData: AMC8Data | null = null;
let fetchPromise: Promise<AMC8Data> | null = null;

function loadAMC8Data(): Promise<AMC8Data> {
  if (cachedData) return Promise.resolve(cachedData);
  if (fetchPromise) return fetchPromise;
  fetchPromise = fetch(AMC8_DATA_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`Failed to load AMC8 data: ${r.status}`);
      return r.json() as Promise<AMC8Data>;
    })
    .then((data) => {
      cachedData = data;
      return data;
    });
  return fetchPromise;
}

export function useAMC8Data() {
  const [data, setData] = useState<AMC8Data | null>(cachedData);
  const [loading, setLoading] = useState(!cachedData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedData) {
      setData(cachedData);
      setLoading(false);
      return;
    }
    setLoading(true);
    loadAMC8Data()
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  return { data, loading, error };
}
