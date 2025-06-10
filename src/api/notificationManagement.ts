import type {
  NotificationResponse,
  NotificationSearchParams,
  StandardError,
  Fetch,
} from '../types'

interface NotificationContext {
  fetch: Fetch
}

export async function getNotifications(
  context: NotificationContext,
  params: NotificationSearchParams,
): Promise<NotificationResponse | StandardError> {
  const { fetch } = context
  const { dateFrom, dateTo, type, language, status, pageNo, pageSize } = params

  const queryParams = new URLSearchParams()
  if (dateFrom) queryParams.set('dateFrom', dateFrom)
  if (dateTo) queryParams.set('dateTo', dateTo)
  if (type) queryParams.set('type', type.toString())
  if (language) queryParams.set('language', language)
  if (status) queryParams.set('status', status.toString())
  if (pageNo) queryParams.set('pageNo', pageNo.toString())
  if (pageSize) queryParams.set('pageSize', pageSize.toString())

  const response = await fetch(
    `/api/v1.0/notifications/taxpayer?${queryParams.toString()}`,
  )

  const data = (await response.json()) as NotificationResponse

  return data
}
