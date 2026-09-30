import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import PublicNavbar from '../../components/layout/PublicNavbar';
import PublicFooter from '../../components/layout/PublicFooter';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      <section className="py-40 border-b border-gray-100">
        <div className="max-w-[1280px] mx-auto px-8">
          <p className="text-xs font-semibold text-gray-400 tracking-widest mb-4">ABOUT US</p>
          <h1 className="text-5xl font-bold text-gray-900 mb-6">Connecting Uganda's Finest Artisans</h1>
          <p className="text-lg text-gray-400 max-w-xl leading-relaxed">
            FundiGrid connects skilled artisans with clients. We make it easy to find, book, and pay for quality services.
          </p>
        </div>
      </section>

      <section className="py-32">
        <div className="max-w-[1280px] mx-auto px-8">
          <div className="grid grid-cols-3 gap-16">
            {[
              { t: 'Our Mission', d: 'Create a trusted marketplace where artisans grow businesses and clients find reliable services.' },
              { t: 'Our Vision', d: 'A Uganda where every home and business has access to verified, skilled artisans.' },
              { t: 'Our Values', d: 'Trust, transparency, quality, and community. Empowering local artisans with integrity.' },
            ].map(v => (
              <div key={v.t}>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{v.t}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{v.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-32 bg-gray-50">
        <div className="max-w-[1280px] mx-auto px-8">
          <div className="grid grid-cols-4 gap-12 text-center">
            {[
              { n: '245+', l: 'Verified Fundis' },
              { n: '3,400+', l: 'Jobs Completed' },
              { n: '1,200+', l: 'Happy Clients' },
              { n: '4.7', l: 'Average Rating' },
            ].map(s => (
              <div key={s.l}>
                <div className="text-3xl font-bold text-gray-900">{s.n}</div>
                <div className="text-sm text-gray-400 mt-2">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-40 bg-gray-950">
        <div className="max-w-[1280px] mx-auto px-8 text-center">
          <Link to="/signup" className="inline-flex items-center gap-3 bg-primary text-gray-900 font-semibold px-10 py-4 rounded-full text-sm hover:bg-primary-dark transition-all">
            Join FundiGrid <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
