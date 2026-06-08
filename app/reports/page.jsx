"use client";

import Sidebar from "@/components/Sidebar";

export default function ReportsPage() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:ml-60 flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-100 px-4 sm:px-8 py-4 sticky top-0 z-10 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-400 mt-0.5">View analytics and performance charts.</p>
        </header>
        <main className="px-4 sm:px-8 py-6 max-w-screen-2xl mx-auto w-full">
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-gray-500">
            Reports pages are coming soon.
          </div>
        </main>
      </div>
    </div>
  );
}
