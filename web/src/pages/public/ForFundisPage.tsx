import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import PublicNavbar from '../../components/layout/PublicNavbar';
import PublicFooter from '../../components/layout/PublicFooter';

export default function ForFundisPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      <section className="py-40 border-b border-gray-100">
        <div className="max-w-[1280px] mx-auto px-8">
          <p className="text-xs font-semibold text-gray-400 tracking-widest mb-4">FOR FUNDIS</p>
          <h1 className="text-5xl font-bold text-gray-900 mb-6">Grow Your Business</h1>
          <p className="text-lg text-gray-400 max-w-lg">More clients, fair pay, and a reputation that works for you</p>
        </div>
      </section>

      <section className="py-32">
        <div className="max-w-[1280px] mx-auto px-8">
          <div className="grid grid-cols-3 gap-12">
            {[
              { t: 'Find Nearby Jobs', d: 'Get matched with jobs in your area. Less travel, more earnings.' },
              { t: 'Fair Pay', d: 'Professional estimates ensure you get paid fairly.' },
              { t: 'Build Reputation', d: 'Collect reviews. Stand out from the competition.' },
              { t: 'More Clients', d: 'Access a growing network across Uganda.' },
              { t: 'Flexible Schedule', d: 'Accept jobs that fit your calendar.' },
              { t: 'Verified Profile', d: 'Build trust with potential clients.' },
            ].map(f => (
              <div key={f.t}>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{f.t}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-40 bg-gray-950">
        <div className="max-w-[1280px] mx-auto px-8 text-center">
          <Link to="/signup?role=fundi" className="inline-flex items-center gap-3 bg-primary text-gray-900 font-semibold px-10 py-4 rounded-full text-sm hover:bg-primary-dark transition-all">
            Sign Up as Fundi <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
