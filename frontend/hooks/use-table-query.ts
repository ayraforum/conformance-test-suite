import { client } from '@/lib/api';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

export function useTableQuery<T>(
  queryFn: typeof client.getSystems,
  baseQueryKey: [string]
) {
  const [pagination, setPagination] = useState({
    offset: 0,
    limit: 10,
  });

  const { data, isLoading } = useQuery({
    ...queryFn.useQuery({
      query: {
        offset: pagination.offset.toString(),
        limit: pagination.limit.toString(),
      },
      queryKey: [baseQueryKey, pagination.offset, pagination.limit],
    }),
  });

  const handlePaginationChange = (newPagination: { offset: number; limit: number }) => {
    setPagination(newPagination);
  };

  return {
    data: data?.body.contents ?? [],
    isLoading,
    pagination,
    onPaginationChange: handlePaginationChange,
  };
}