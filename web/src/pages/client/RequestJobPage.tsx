import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ArrowLeft } from 'lucide-react';
import { CATEGORY_LABELS } from '../../lib/categories';

export default function RequestJobPage() {
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [service, setService] = useState('');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [urgency, setUrgency] = useState('normal');

  return (
    <div className="max-w-[600px] mx-auto">
      <button onClick={() => nav(-1)} className="text-sm text-gray-400 hover:text-gray-900 transition-colors mb-10 inline-flex items-center gap-1"><ArrowLeft size={14} /> Back</button>

      <h1 className="text-4xl font-bold text-gray-900 mb-3">Request a Job</h1>
      <p className="text-sm text-gray-400 mb-14">Tell us what you need</p>

      {/* Progress */}
      <div className="flex gap-2 mb-14">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400'}`}>{s}</div>
            {s < 3 && <div className={`flex-1 h-1 rounded-full ${step > s ? 'bg-gray-900' : 'bg-gray-100'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="space-y-8">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-4 uppercase tracking-wide">Service Type</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORY_LABELS.map(s => (
                <button key={s} onClick={() => setService(s)} className={`p-3 rounded-xl border-2 text-sm font-medium transition-all text-left ${service === s ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-100 text-gray-500 hover:border-gray-200'}`}>{s}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">Job Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Fix leaking faucet" className="w-full px-5 py-4 text-sm bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-gray-300" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={4} placeholder="Describe the issue..." className="w-full px-5 py-4 text-sm bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-gray-300 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">Photos</label>
            <button className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 text-gray-300 hover:border-primary hover:text-primary transition-all">
              <Camera size={18} /><span className="text-[10px]">Add</span>
            </button>
          </div>
          <button onClick={() => setStep(2)} disabled={!service || !title} className="w-full py-4 bg-gray-900 text-white font-semibold text-sm rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed">Continue</button>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="space-y-8">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">Location</label>
            <select value={location} onChange={e => setLocation(e.target.value)} className="w-full px-5 py-4 text-sm bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">Select area</option>
              {['Kampala Central', 'Nakawa', 'Kawempe', 'Makindye', 'Rubaga', 'Entebbe', 'Mukono'].map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">Preferred Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-5 py-4 text-sm bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">Urgency</label>
            <div className="flex gap-3">
              {[['normal', 'Normal'], ['urgent', 'Urgent'], ['emergency', 'ASAP']].map(([v, l]) => (
                <button key={v} onClick={() => setUrgency(v)} className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${urgency === v ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-100 text-gray-500'}`}>{l}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setStep(1)} className="flex-1 py-4 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors">Back</button>
            <button onClick={() => setStep(3)} disabled={!location} className="flex-[2] py-4 bg-gray-900 text-white font-semibold text-sm rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed">Review</button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="space-y-8">
          <h2 className="text-xl font-bold text-gray-900">Review</h2>
          <div className="space-y-4">
            {[
              ['Service', service],
              ['Title', title],
              ['Description', desc],
              ['Location', location],
              ['Date', date || 'Flexible'],
              ['Urgency', urgency],
            ].map(([l, v]) => v ? (
              <div key={l} className="flex justify-between py-3 border-b border-gray-50">
                <span className="text-sm text-gray-400">{l}</span>
                <span className="text-sm font-semibold text-gray-900">{v}</span>
              </div>
            ) : null)}
          </div>
          <div className="flex gap-4">
            <button onClick={() => setStep(2)} className="flex-1 py-4 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors">Back</button>
            <button
              onClick={() => {
                const qs = new URLSearchParams({
                  category: service,
                  title,
                  description: desc,
                  area: location,
                  date,
                  urgency,
                }).toString();
                nav(`/client/request-processing?${qs}`);
              }}
              className="flex-[2] py-4 bg-primary hover:bg-primary-dark text-gray-900 font-semibold text-sm rounded-2xl transition-all"
            >
              Submit Request
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
