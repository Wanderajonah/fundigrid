interface Tab {
  key: string;
  label: string;
  count?: number;
}

interface Props {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
  variant?: 'pill' | 'underline';
}

export default function Tabs({ tabs, active, onChange, variant = 'pill' }: Props) {
  if (variant === 'underline') {
    return (
      <div className="border-b border-gray-100 flex gap-7 mb-8 overflow-x-auto">
        {tabs.map(tab => {
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={`pb-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                isActive ? 'border-primary text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`ml-2 text-[11px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-primary/15 text-primary-dark' : 'bg-gray-100 text-gray-400'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map(tab => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`px-5 py-2 text-sm font-medium rounded-full transition-all ${
              isActive ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && <span className="ml-1.5 opacity-60">{tab.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
