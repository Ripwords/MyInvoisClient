export type NotificationType = 3 | 6 | 7 | 8 | 10 | 11 | 15 | 26 | 33 | 34 | 35

export type NotificationStatus = 1 | 2 | 3 | 4 | 5

export type NotificationDeliveryAttempt = {
  attemptDateTime: string
  status: string
  statusDetails: string
}

export type NotificationMetadata = {
  hasNext: boolean
}

export type Notification = {
  notificationId: string
  receiverNName: string
  notificationDeliveryId: string
  creationDateTime: string
  receivedDateTime: string
  notificationSubject: string
  deliveredDateTime: string
  typeId: string
  typeName: string
  finalMessage: string
  address: string
  language: string
  status: string
  deliveryAttempts: NotificationDeliveryAttempt[]
}

export type NotificationResponse = {
  notifications: Notification[]
  metadata: NotificationMetadata
}

export type NotificationSearchParams = {
  dateFrom?: string
  dateTo?: string
  type?: NotificationType
  language?: string
  status?: NotificationStatus
  pageNo?: number
  pageSize?: number
}
