import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import PublicNavbar from '../../components/layout/PublicNavbar';
import PublicFooter from '../../components/layout/PublicFooter';

export default function ForClientsPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      <section className="py-40 border-b border-gray-100">
        <div className="max-w-[1280px] mx-auto px-8">
          <p className="text-xs font-semibold text-gray-400 tracking-widest mb-4">FOR CLIENTS</p>
          <h1 className="text-5xl font-bold text-gray-900 mb-6">Find Artisans You Can Trust</h1>
          <p className="text-lg text-gray-400 max-w-lg">Quality work at fair prices with verified professionals</p>
        </div>
      </section>

      <section className="py-32">
        <div className="max-w-[1280px] mx-auto px-8">
          <div className="grid grid-cols-3 gap-12">
            {[
              { t: 'Verified Fundis', d: 'Every fundi is identity-checked and skill-verified.' },
              { t: 'Real Reviews', d: 'Read genuine reviews from other clients.' },
              { t: 'Fair Estimates', d: 'Professional quantity surveyors ensure transparent pricing.' },
              { t: 'Real-Time Tracking', d: 'Know exactly when your fundi arrives.' },
              { t: 'Secure Payments', d: 'Pay safely through Mobile Money.' },
              { t: 'Nearby Artisans', d: 'Find skilled workers in your neighborhood.' },
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
          <Link to="/signup?role=client" className="inline-flex items-center gap-3 bg-primary text-gray-900 font-semibold px-10 py-4 rounded-full text-sm hover:bg-primary-dark transition-all">
            Sign Up as Client <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
