"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { tsr } from "@/lib/api";

export default function SystemsPage() {
  const [pagination, setPagination] = useState({ offset: 0, limit: 10 });

  // Fetch systems using ts-rest and react-query
  const { data, isLoading, error } = tsr.getSystems.useQuery(["systems", pagination], {
    query: pagination,
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Systems</h1>
      <ul className="list-disc pl-6">
        {data?.body.contents.map((system) => (
          <li key={system.id}>
            <strong>{system.name}</strong> - {system.version}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex space-x-2">
        <button
          disabled={pagination.offset === 0}
          onClick={() =>
            setPagination((prev) => ({
              ...prev,
              offset: Math.max(prev.offset - prev.limit, 0),
            }))
          }
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
        >
          Previous
        </button>
        <button
          disabled={data?.body.contents.length < pagination.limit}
          onClick={() =>
            setPagination((prev) => ({
              ...prev,
              offset: prev.offset + prev.limit,
            }))
          }
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
