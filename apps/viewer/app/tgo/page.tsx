'use client';
import React from 'react';
import { TGOApp } from "../../components/tgo/TGOApp";

export default function Page() {
  return (
    <main className="min-h-screen bg-[#0a0a12] text-[#e9e9f0]">
      <div className="max-w-6xl mx-auto p-6">
        <TGOApp />
      </div>
    </main>
  );
}
