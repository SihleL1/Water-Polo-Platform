'use client';

import React from 'react';

export default function Header() {
  return (
    <header className="bg-white border-b" style={{ borderColor: '#E2E8F0' }}>
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logos/logo-icon.png" alt="Veldt" className="w-12 h-12 rounded" />
          <div>
            <div className="text-lg font-extrabold" style={{ color: '#234723' }}>
              VELDT ANALYTICS
            </div>
            <div className="text-xs text-gray-500">Official Tournament Operations • Est. 2026</div>
          </div>
        </div>
        <nav className="text-sm text-gray-600">
          <a href="/admin" className="mr-4">
            Admin
          </a>
          <a href="/scorekeeper">Scorekeeper</a>
        </nav>
      </div>
    </header>
  );
}
