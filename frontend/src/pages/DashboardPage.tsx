import React from "react";
import { ProcessedDataTable } from "components/ProcessedDataTable"; // Assuming this path

export default function DashboardPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Processed PDF Data</h1>
        <p className="text-gray-600 mt-1">
          View and manage the information extracted from your PDF documents.
        </p>
      </header>
      <ProcessedDataTable />
    </div>
  );
}
