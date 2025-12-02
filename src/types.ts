export type HealthData = any

export type Usuario = {
  id: string
  nome: string
  email: string
  nivel: 'ADM' | 'N0' | 'N1' | 'N2' | 'N3' | 'N99'
  departamento_id: number | null
  setor_id: number | null
  regional_id: number | null
}
