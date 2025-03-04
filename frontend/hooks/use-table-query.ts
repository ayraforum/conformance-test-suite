import { client } from '@/lib/api';
import { useState } from 'react';
import { QueryDef } from '@ts-rest/core';
import { UseQueryResult } from '@tanstack/react-query';

type ClientEndpoint = typeof client[keyof typeof client];

// Helper type to extract the response type from a ts-rest query
type QueryResponse<T> = T extends {
  useQuery: (...args: any[]) => UseQueryResult<infer R, any>;
} ? R : never;

export function useTableQuery<T extends ClientEndpoint>(
  queryFn: (args: { queryKey: any[], queryData?: any }) => UseQueryResult<QueryResponse<T>, unknown>,
  baseQueryKey: unknown[]
) {
  const [pagination, setPagination] = useState({
    offset: 0,
    limit: 10,
  });

  const queryKey = [...baseQueryKey, {
    offset: pagination.offset.toString(),
    limit: pagination.limit.toString(),
  }];

  const query = queryFn({
    queryKey: queryKey,
    queryData: { query: { offset: pagination.offset, limit: pagination.limit } }
  });

  const handlePaginationChange = (newPagination: { offset: number; limit: number }) => {
    setPagination(newPagination);
  };

  return {
    data: query.data?.body.contents ?? [],
    isLoading: query.isLoading,
    pagination,
    onPaginationChange: handlePaginationChange,
  };
}