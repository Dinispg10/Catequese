import { useQuery } from '@tanstack/react-query';
import { fetchAnoAtivo } from './api';

/**
 * O ano catequético em que se está a trabalhar. Matrículas e Presenças mostram só
 * este ano; os anteriores ficam em "Anos anteriores".
 */
export function useAnoAtivo() {
  const { data, isLoading, error } = useQuery({ queryKey: ['configuracao'], queryFn: fetchAnoAtivo, staleTime: Infinity });
  return { anoAtivo: data, loading: isLoading, error };
}
