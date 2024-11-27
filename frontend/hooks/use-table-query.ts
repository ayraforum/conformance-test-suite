import { client } from '@/lib/api';
import { useState } from 'react';

export function useTableQuery<T>(
  queryFn: typeof client.getSystems,
  baseQueryKey: [string]
) {
  const [pagination, setPagination] = useState({
    offset: 0,
    limit: 10,
  });

  const queryKey = [...baseQueryKey, { offset: pagination.offset.toString(),
    limit: pagination.limit.toString(), }];

  const query = queryFn.useQuery(
    { queryKey: queryKey},
  );

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