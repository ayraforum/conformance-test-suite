import { client } from "@/lib/api";
import { useTableQuery } from "@/hooks/use-table-query";

export function useProfileConfigurations(systemId: string) {
  return useTableQuery(
    ({ queryKey, queryData }) => client.getProfileConfigurations.useQuery({
      queryKey,
      queryData: {
        ...queryData,
        params: { systemId }
      }
    }),
    ['profileConfigurations', systemId]
  );
}