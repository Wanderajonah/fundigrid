import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Star, Shield, MessageSquare, ArrowLeft } from 'lucide-react';
import { getFundi, getReviews, type Fundi, type Review } from '../../lib/api';

export default function FundiProfilePage() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const [fundi, setFundi] = useState<Fundi | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const carried = {
    ...(params.get('category') ? { category: params.get('category')! } : {}),
    ...(params.get('title') ? { title: params.get('title')! } : {}),
    ...(params.get('description') ? { description: params.get('description')! } : {}),
    ...(params.get('area') ? { area: params.get('area')! } : {}),
    ...(params.get('date') ? { date: params.get('date')! } : {}),
  };

  useEffect(() => {
    let alive = true;
    if (!id) { setLoading(false); return; }
    setLoading(true);
    getFundi(id)
      .then(res => { if (alive) setFundi(res.fundi); })
      .catch(err => { if (alive) setError(err instanceof Error ? err.message : 'Could not load this fundi'); })
      .finally(() => { if (alive) setLoading(false); });
    getReviews(id)
      .then(res => { if (alive) setReviews(res.reviews || []); })
      .catch(() => { /* reviews are optional */ });
    return () => { alive = false; };
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-[800px] mx-auto">
        <Link to="/client/fundis" className="text-sm text-gray-400 hover:text-gray-900 transition-colors mb-10 inline-block"><ArrowLeft size={14} className="inline" /> Back</Link>
        <p className="text-sm text-gray-400">Loading fundi…</p>
      </div>
    );
  }

  if (error || !fundi) {
    return (
      <div className="max-w-[800px] mx-auto text-center py-20">
        <p className="font-semibold text-gray-900">{error || 'Fundi not found'}</p>
        <Link to="/client/fundis" className="inline-block mt-4 text-sm font-semibold text-primary hover:text-primary-dark">← Back to Find Fundis</Link>
      </div>
    );
  }

  const trade = fundi.skills?.[0] || 'Fundi';
  const place = fundi.locationLabel || fundi.district || fundi.address || 'Location not shared';
  const initials = (fundi.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const experience = fundi.experience ? `${fundi.experience} ${fundi.experience === 1 ? 'year' : 'years'} experience` : null;
  const bookHref = `/client/booking?fundi=${encodeURIComponent(fundi.id)}&${new URLSearchParams(carried).toString()}`;

  return (
    <div className="max-w-[800px] mx-auto">
      <Link to="/client/fundis" className="text-sm text-gray-400 hover:text-gray-900 transition-colors mb-10 inline-block"><ArrowLeft size={14} className="inline" /> Back</Link>

      <div className="flex items-start gap-8 mb-16">
        <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl font-bold text-gray-300 flex-shrink-0">{initials}</div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">{fundi.name || 'Unnamed fundi'}</h1>
            {fundi.verified && <Shield size={18} className="text-emerald-500" />}
          </div>
          <p className="text-sm text-gray-400 mt-1">{trade} · {place}</p>
          <div className="flex items-center gap-3 mt-4">
            <div className="flex items-center gap-1">
              <Star size={14} className="text-primary fill-primary" />
              <span className="font-bold">{Number(fundi.rating ?? 0).toFixed(1)}</span>
              <span className="text-xs text-gray-400">({fundi.reviewCount ?? 0})</span>
            </div>
            {experience && <><span className="text-gray-200">·</span><span className="text-sm text-gray-500">{experience}</span></>}
            <span className="text-gray-200">·</span>
            <span className={`text-sm ${fundi.isAvailable ? 'text-emerald-600' : 'text-gray-400'}`}>{fundi.isAvailable ? 'Available' : 'Busy'}</span>
          </div>
        </div>
        <Link to="/client/messages" className="px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-black transition-all inline-flex items-center gap-2">
          <MessageSquare size={14} /> Message
        </Link>
      </div>

      <div className="mb-16">
        <h2 className="text-lg font-bold text-gray-900 mb-4">About</h2>
        <p className="text-sm text-gray-500 leading-relaxed">{fundi.bio?.trim() || 'No bio yet.'}</p>
      </div>

      <div className="mb-16">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Skills</h2>
        {fundi.skills?.length ? (
          <div className="flex flex-wrap gap-2">
            {fundi.skills.map(s => <span key={s} className="px-3 py-1.5 bg-gray-50 text-xs font-medium text-gray-600 rounded-lg">{s}</span>)}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No skills listed yet.</p>
        )}
      </div>

      <div className="mb-16">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Reviews</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-gray-400">No reviews yet.</p>
        ) : (
          <div className="space-y-8">
            {reviews.map((r, i) => {
              const name = r.clientName?.trim() || 'Client';
              const rating = Number(r.rating ?? 0);
              const date = r.createdAt ? new Date(r.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
              return (
                <div key={r.id || i}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">{name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</div>
                      <span className="font-semibold text-gray-900 text-sm">{name}</span>
                    </div>
                    <span className="text-xs text-gray-400">{date}</span>
                  </div>
                  <div className="flex gap-0.5 mb-2">{Array.from({ length: 5 }).map((_, j) => <Star key={j} size={12} className={j < rating ? 'text-primary fill-primary' : 'text-gray-200'} />)}</div>
                  {r.comment && <p className="text-sm text-gray-500 leading-relaxed">{r.comment}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-gray-50 rounded-2xl p-8 text-center">
        <p className="text-sm text-gray-500 mb-6">{fundi.isAvailable ? 'Taking new jobs' : 'Currently busy'}</p>
        <Link to={bookHref} className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-gray-900 font-semibold px-8 py-3.5 rounded-full text-sm transition-all">
          Book Now
        </Link>
      </div>
    </div>
  );
}
