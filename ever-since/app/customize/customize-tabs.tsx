'use client';

import { useState } from 'react';

interface CustomizeTabsProps {
  generalSettings: React.ReactNode;
  mediaLibrary: React.ReactNode;
  memoriesTimeline: React.ReactNode;
}

type TabKey = 'general' | 'media' | 'memories';

export default function CustomizeTabs({
  generalSettings,
  mediaLibrary,
  memoriesTimeline,
}: CustomizeTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('general');

  return (
    <div className="flex flex-col gap-6">
      {/* Tab Navigation */}
      <nav aria-label="Customize settings tabs" className="flex items-center gap-2 border-b border-[#F1E8EC] pb-4">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
            activeTab === 'general'
              ? 'bg-gradient-to-r from-[#F472B6] to-[#FB7185] text-white shadow-[0_4px_14px_rgba(244,114,182,0.35)]'
              : 'text-muted hover:bg-[#FAF7F8] hover:text-foreground'
          }`}
          aria-current={activeTab === 'general' ? 'page' : undefined}
        >
          General Settings
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('media')}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
            activeTab === 'media'
              ? 'bg-gradient-to-r from-[#F472B6] to-[#FB7185] text-white shadow-[0_4px_14px_rgba(244,114,182,0.35)]'
              : 'text-muted hover:bg-[#FAF7F8] hover:text-foreground'
          }`}
          aria-current={activeTab === 'media' ? 'page' : undefined}
        >
          Media Library
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('memories')}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
            activeTab === 'memories'
              ? 'bg-gradient-to-r from-[#F472B6] to-[#FB7185] text-white shadow-[0_4px_14px_rgba(244,114,182,0.35)]'
              : 'text-muted hover:bg-[#FAF7F8] hover:text-foreground'
          }`}
          aria-current={activeTab === 'memories' ? 'page' : undefined}
        >
          Memories & Timeline
        </button>
      </nav>

      {/* Tab Content */}
      <div className="pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
        {activeTab === 'general' && <div key="general">{generalSettings}</div>}
        {activeTab === 'media' && <div key="media">{mediaLibrary}</div>}
        {activeTab === 'memories' && <div key="memories">{memoriesTimeline}</div>}
      </div>
    </div>
  );
}
