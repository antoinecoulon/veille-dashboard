interface ApiPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface PaginatedApiResponse<T> {
  data: T
  pagination: ApiPagination
}

interface ApiResponse<T> {
  data: T
}

export type { PaginatedApiResponse, ApiResponse }