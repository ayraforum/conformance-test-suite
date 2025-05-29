import { client } from "@/lib/api";
import { useTableQuery } from "@/hooks/use-table-query";

export function useSystems() {
  return useTableQuery(
    ({ queryKey, queryData }) => client.getSystems.useQuery({
      queryKey,
      queryData: {
        ...queryData
      }
    }),
    ['systems']
  );
}