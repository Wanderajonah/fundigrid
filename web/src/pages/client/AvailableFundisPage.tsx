import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapPin, Star, Shield, ArrowRight, Search } from 'lucide-react';
import { getFundis, type Fundi } from '../../lib/api';
import { CATEGORIES } from '../../lib/categories';

export default function AvailableFundisPage() {
  const [params] = useSearchParams();
  const requestCategory = params.get('category') || '';
  const requestArea = params.get('area') || '';
  const requestTitle = params.get('title') || '';
  const requestDescription = params.get('description') || '';
  const requestDate = params.get('date') || '';

  const [cat, setCat] = useState(requestCategory);
  const [area, setArea] = useState(requestArea);
  const [fundis, setFundis] = useState<Fundi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    getFundis({ category: cat, area })
      .then(res => { if (alive) setFundis(res.fundis || []); })
      .catch(err => { if (alive) setError(err instanceof Error ? err.message : 'Could not load fundis'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [cat, area]);

  return (
    <div className="max-w-[1100px] mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-3">Find Fundis</h1>
      <p className="text-sm text-gray-400 mb-10">Filter by trade and the area you need them in</p>

      {/* Location */}
      <div className="relative max-w-md mb-8">
        <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" />
        <input
          type="text"
          value={area}
          onChange={e => setArea(e.target.value)}
          placeholder="Area — e.g. Nakawa, Kireka, Mukono"
          className="w-full pl-13 pr-5 py-3.5 text-sm bg-white border border-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 placeholder:text-gray-300"
        />
      </div>

      {/* Trade filters */}
      <div className="flex flex-wrap gap-2 mb-12">
        <button
          onClick={() => setCat('')}
          className={`px-5 py-2 text-sm font-medium rounded-full transition-all ${cat === '' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
        >
          All
        </button>
        {CATEGORIES.map(c => (
          <button
            key={c.label}
            onClick={() => setCat(c.label)}
            className={`px-5 py-2 text-sm font-medium rounded-full transition-all ${cat === c.label ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-gray-400">Loading fundis…</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && !error && fundis.length === 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
          <p className="font-semibold text-gray-900">No fundis match those filters</p>
          <p className="text-sm text-gray-400 mt-1">Try another trade, or clear the area to widen the search.</p>
          <button
            onClick={() => { setCat(''); setArea(''); }}
            className="mt-5 px-6 py-2.5 text-sm font-semibold bg-gray-900 text-white rounded-full hover:bg-black transition-all"
          >
            Clear filters
          </button>
        </div>
      )}

      {!loading && !error && fundis.length > 0 && (
        <div className="grid grid-cols-3 gap-6">
          {fundis.map(f => {
            const trade = f.skills?.[0] || 'Fundi';
            const fundiArea = f.locationLabel || f.district || f.address || 'Location not shared';
            const dist = typeof f.distanceKm === 'number' ? `${f.distanceKm} km away` : null;
            const profileHref = `/client/fundi/${f.id}?${new URLSearchParams({
              ...(cat ? { category: cat } : {}),
              ...(area ? { area } : {}),
              ...(requestTitle ? { title: requestTitle } : {}),
              ...(requestDescription ? { description: requestDescription } : {}),
              ...(requestDate ? { date: requestDate } : {}),
            }).toString()}`;
            return (
              <Link key={f.id} to={profileHref} className="bg-white rounded-2xl border border-gray-100 p-7 hover:shadow-lg transition-all group">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-lg font-bold text-gray-400">
                    {(f.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors truncate">{f.name || 'Unnamed fundi'}</h3>
                    <p className="text-xs text-gray-400 truncate">{trade}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-1">
                    <Star size={12} className="text-primary fill-primary" />
                    <span className="text-sm font-bold">{Number(f.rating ?? 0).toFixed(1)}</span>
                  </div>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs text-gray-400">{f.reviewCount ?? 0} reviews</span>
                </div>
                <div className="flex items-center gap-2 mb-6">
                  <MapPin size={12} className="text-gray-400" />
                  <span className="text-xs text-gray-400 truncate">{dist ? `${fundiArea} · ${dist}` : fundiArea}</span>
                  {f.verified && <><span className="text-xs text-gray-300">·</span><Shield size={12} className="text-emerald-500" /><span className="text-xs text-emerald-500 font-medium">Verified</span></>}
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                  <span className="text-xs font-semibold text-gray-500">{f.isAvailable ? 'Available now' : 'Busy'}</span>
                  <span className="text-xs font-semibold text-primary group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">View <ArrowRight size={12} /></span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
