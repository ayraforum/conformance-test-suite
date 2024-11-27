import { client } from "@/lib/api";
import { useTableQuery } from "@/hooks/use-table-query";

export function useProfileConfigurations(systemId: string) {
  return useTableQuery(
    (args) => client.getProfileConfigurations.useQuery({
      ...args,
      queryData: { params: { systemId } }
    }),
    ['profileConfigurations', systemId]
  );
}