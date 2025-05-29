// src/components/PredictionsTable.js

import React, { useState, useEffect, useCallback } from 'react';
import useUserAnswers from '../hooks/useUserAnswers';

export default function PredictionsTable() {
  // Helpers to read your existing mount point
  const getSeasonSlug = useCallback(() => {
    const container = document.getElementById('display-user-predictions-root');
    return container?.getAttribute('data-season-slug') || 'current';
  }, []);

  const detectLoggedInUser = useCallback(() => {
    const container = document.getElementById('display-user-predictions-root');
    return container?.getAttribute('data-logged-in-username') || '';
  }, []);

  const seasonSlug = getSeasonSlug();
  const loggedInUsername = detectLoggedInUser();

  // Fetch primary user’s data
  const { data: primary, loading, error } = useUserAnswers(
    loggedInUsername,
    seasonSlug
  );

  // Comparators state
  const [comparators, setComparators] = useState([]); // [{ username, data, loading }...]

  // Which categories are expanded
  const [expandedCats, setExpandedCats] = useState(new Set());

  const toggleCat = (cat) => {
    setExpandedCats((prev) => {
      const s = new Set(prev);
      s.has(cat) ? s.delete(cat) : s.add(cat);
      return s;
    });
  };

  const addComparator = (username) => {
    if (
      !username ||
      username === loggedInUsername ||
      comparators.some((c) => c.username === username) ||
      comparators.length >= 3
    ) {
      return;
    }
    setComparators((prev) => [
      ...prev,
      { username, data: null, loading: true },
    ]);
  };

  // Lazy–load each comparator
  useEffect(() => {
    comparators.forEach((c, idx) => {
      if (c.data === null) {
        useUserAnswers(c.username, seasonSlug)
          .reload()
          .then((res) => {
            setComparators((prev) =>
              prev.map((x, i) =>
                i === idx
                  ? { username: x.username, data: res.data, loading: false }
                  : x
              )
            );
          })
          .catch(() => {
            setComparators((prev) =>
              prev.map((x, i) =>
                i === idx ? { ...x, loading: false } : x
              )
            );
          });
      }
    });
  }, [comparators, seasonSlug]);

  if (loading) return <div>Loading your predictions…</div>;
  if (error) return <div>Error loading data.</div>;

  const cats = Object.keys(primary.categories);

  return (
    <div className="space-y-4">
      {/* Comparator input */}
      <div className="flex items-center space-x-2">
        <input
          type="text"
          placeholder="Add username…"
          id="comp-username"
          className="border rounded px-2 py-1"
        />
        <button
          onClick={() => {
            const u = document.getElementById('comp-username').value.trim();
            addComparator(u);
          }}
          className="bg-blue-600 text-white px-3 py-1 rounded"
        >
          Add Comparator
        </button>
      </div>

      {/* Table */}
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2 text-left">Category</th>
            <th className="border p-2 text-right">
              {loggedInUsername} ({primary.categories[cats[0]].total})
            </th>
            {comparators.map((c) => (
              <th key={c.username} className="border p-2 text-right">
                {c.username}{' '}
                {c.data?.categories[cats[0]]?.total ??
                  (c.loading ? '…' : '0')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cats.map((cat) => (
            <React.Fragment key={cat}>
              {/* Summary row */}
              <tr
                className="cursor-pointer bg-white hover:bg-gray-50"
                onClick={() => toggleCat(cat)}
              >
                <td className="border p-2 font-medium">{cat}</td>
                <td className="border p-2 text-right">
                  {primary.categories[cat].total}
                </td>
                {comparators.map((c) => (
                  <td
                    key={c.username}
                    className="border p-2 text-right"
                  >
                    {c.data?.categories[cat]?.total ??
                      (c.loading ? '…' : '0')}
                  </td>
                ))}
              </tr>

              {/* Detail rows */}
              {expandedCats.has(cat) &&
                primary.categories[cat].items.map((item, idx) => (
                  <tr key={`${cat}-item-${idx}`} className="bg-gray-50">
                    <td className="border p-2 pl-8">
                      {item.question_text}
                    </td>
                    <td className="border p-2 text-right">
                      {item.points_earned}
                    </td>
                    {comparators.map((c) => {
                      const compItem =
                        c.data?.categories[cat]?.items[idx];
                      return (
                        <td
                          key={`${c.username}-${idx}`}
                          className="border p-2 text-right"
                        >
                          {compItem?.points_earned ??
                            (c.loading ? '…' : '0')}
                        </td>
                      );
                    })}
                  </tr>
                ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}