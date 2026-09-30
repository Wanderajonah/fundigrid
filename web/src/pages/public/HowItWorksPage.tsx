import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import PublicNavbar from '../../components/layout/PublicNavbar';
import PublicFooter from '../../components/layout/PublicFooter';

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      <section className="py-40 border-b border-gray-100">
        <div className="max-w-[1280px] mx-auto px-8">
          <p className="text-xs font-semibold text-gray-400 tracking-widest mb-4">PROCESS</p>
          <h1 className="text-5xl font-bold text-gray-900 mb-6">How It Works</h1>
          <p className="text-lg text-gray-400 max-w-lg">Four steps from request to completion</p>
        </div>
      </section>

      <section className="py-32">
        <div className="max-w-[900px] mx-auto px-8 space-y-32">
          {[
            { n: '01', t: 'Submit Your Request', d: 'Tell us what you need. Choose from 11+ service categories, add photos, select your location, and set a preferred date.' },
            { n: '02', t: 'Get a Fair Estimate', d: 'Our quantity surveyors assess the work and provide a transparent cost estimate. No hidden fees.' },
            { n: '03', t: 'Choose Your Fundi', d: 'Browse verified, rated fundis in your area. Compare profiles, reviews, and rates.' },
            { n: '04', t: 'Track & Complete', d: 'Monitor your job in real-time. Communicate directly, pay securely, and leave a review.' },
          ].map(s => (
            <div key={s.n} className="flex gap-16 items-start">
              <div className="text-7xl font-extrabold text-gray-100 leading-none flex-shrink-0 w-24">{s.n}</div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">{s.t}</h2>
                <p className="text-gray-400 leading-relaxed max-w-md">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-40 bg-gray-950">
        <div className="max-w-[1280px] mx-auto px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-8">Ready to Start?</h2>
          <Link to="/signup" className="inline-flex items-center gap-3 bg-primary text-gray-900 font-semibold px-10 py-4 rounded-full text-sm hover:bg-primary-dark transition-all">
            Get Started <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
