import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import PublicNavbar from '../../components/layout/PublicNavbar';
import PublicFooter from '../../components/layout/PublicFooter';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      {/* Hero — massive whitespace */}
      <section className="min-h-[90vh] flex items-center">
        <div className="max-w-[1280px] mx-auto px-8 w-full">
          <div className="max-w-xl">
            <p className="text-sm font-medium text-gray-400 mb-6 tracking-wide">TRUSTED BY 1,200+ CLIENTS IN KAMPALA</p>
            <h1 className="text-[72px] leading-[1] font-extrabold text-gray-900 tracking-tight">
              Skilled<br />Artisans.<br />
              <span className="text-primary">Near You.</span>
            </h1>
            <p className="text-lg text-gray-400 mt-8 max-w-md leading-relaxed">
              Find verified plumbers, electricians, carpenters, and more.
              Fair estimates. Real-time tracking.
            </p>
            <div className="flex gap-4 mt-12">
              <Link to="/signup?role=client" className="inline-flex items-center gap-3 bg-gray-900 text-white font-semibold px-10 py-4 rounded-full text-sm hover:bg-black transition-all">
                Find a Fundi <ArrowRight size={16} />
              </Link>
              <Link to="/signup?role=fundi" className="inline-flex items-center gap-3 border border-gray-200 text-gray-600 font-semibold px-10 py-4 rounded-full text-sm hover:bg-gray-50 transition-all">
                Become a Fundi
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats — clean row */}
      <section className="py-32 border-t border-gray-100">
        <div className="max-w-[1280px] mx-auto px-8">
          <div className="grid grid-cols-3 gap-16 max-w-2xl">
            {[
              { n: '245+', l: 'Verified Fundis' },
              { n: '3,400+', l: 'Jobs Completed' },
              { n: '4.7', l: 'Average Rating' },
            ].map(s => (
              <div key={s.l}>
                <div className="text-4xl font-bold text-gray-900">{s.n}</div>
                <div className="text-sm text-gray-400 mt-2">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How — just 4 numbers */}
      <section className="py-32 bg-gray-50">
        <div className="max-w-[1280px] mx-auto px-8">
          <p className="text-xs font-semibold text-gray-400 tracking-widest mb-4">PROCESS</p>
          <h2 className="text-4xl font-bold text-gray-900 mb-20">How It Works</h2>
          <div className="grid grid-cols-4 gap-12">
            {[
              { n: '01', t: 'Request', d: 'Tell us what you need' },
              { n: '02', t: 'Estimate', d: 'Fair cost from our QS' },
              { n: '03', t: 'Choose', d: 'Pick your verified fundi' },
              { n: '04', t: 'Done', d: 'Track and pay securely' },
            ].map(s => (
              <div key={s.n}>
                <div className="text-6xl font-extrabold text-gray-100 mb-6">{s.n}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{s.t}</h3>
                <p className="text-sm text-gray-400">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why — 3 cards */}
      <section className="py-32">
        <div className="max-w-[1280px] mx-auto px-8">
          <p className="text-xs font-semibold text-gray-400 tracking-widest mb-4">WHY US</p>
          <h2 className="text-4xl font-bold text-gray-900 mb-20">Built for Trust</h2>
          <div className="grid grid-cols-3 gap-8">
            {[
              { t: 'Verified Fundis', d: 'Every fundi is identity-checked.' },
              { t: 'Location-Based', d: 'Find artisans in your neighborhood.' },
              { t: 'Rated & Reviewed', d: 'Real reviews from real clients.' },
            ].map(f => (
              <div key={f.t} className="p-10 rounded-3xl border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{f.t}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-40 bg-gray-950">
        <div className="max-w-[1280px] mx-auto px-8 text-center">
          <h2 className="text-5xl font-bold text-white mb-6">Ready?</h2>
          <div className="flex justify-center gap-4 mt-12">
            <Link to="/signup?role=client" className="inline-flex items-center gap-3 bg-primary text-gray-900 font-semibold px-10 py-4 rounded-full text-sm hover:bg-primary-dark transition-all">
              Find a Fundi <ArrowRight size={16} />
            </Link>
            <Link to="/signup?role=fundi" className="inline-flex items-center gap-3 border border-white/20 text-white font-semibold px-10 py-4 rounded-full text-sm hover:bg-white/10 transition-all">
              Join as Fundi
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
