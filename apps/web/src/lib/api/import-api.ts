import { API_BASE_URL, handleResponse } from '../api'
import { apiRequest } from '../api'
import type { ImportPreview, ConfirmRow, ConfirmResult } from '@cuentas-claras/shared'

export const importApi = {
  async parse(file: File, defaultType: string): Promise<ImportPreview> {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('defaultType', defaultType)

    const response = await fetch(`${API_BASE_URL}/import/parse`, {
      method: 'POST',
      credentials: 'include',
      body: fd,
    })
    return handleResponse<ImportPreview>(response)
  },

  async confirm(rows: ConfirmRow[]): Promise<ConfirmResult> {
    return apiRequest<ConfirmResult>('/import/confirm', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    })
  },
}
