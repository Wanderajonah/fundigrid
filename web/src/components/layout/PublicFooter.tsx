import FundiGridLogo from '../FundiGridLogo';

export default function PublicFooter() {
  return (
    <footer className="bg-gray-950 text-white">
      <div className="max-w-[1280px] mx-auto px-8 py-24">
        <div className="grid grid-cols-4 gap-16">
          <div className="col-span-2">
            <FundiGridLogo size="md" variant="light" />
            <p className="text-sm text-gray-500 mt-6 max-w-sm leading-relaxed">Connecting skilled artisans with clients across Uganda.</p>
          </div>
          {[
            { title: 'Platform', links: ['How It Works', 'For Clients', 'For Fundis'] },
            { title: 'Company', links: ['About', 'Careers', 'Contact'] },
            { title: 'Legal', links: ['Terms', 'Privacy', 'Cookies'] },
          ].map(col => (
            <div key={col.title}>
              <h4 className="font-semibold text-sm text-white mb-6">{col.title}</h4>
              <ul className="space-y-4">
                {col.links.map(l => <li key={l}><a href="#" className="text-sm text-gray-500 hover:text-white transition-colors">{l}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-800/50 mt-16 pt-8 text-xs text-gray-600">&copy; 2024 FundiGrid. All rights reserved.</div>
      </div>
    </footer>
  );
}
