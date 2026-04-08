/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as registrationReceived } from './registration-received.tsx'
import { template as accountApproved } from './account-approved.tsx'
import { template as signalNotification } from './signal-notification.tsx'
import { template as signalStatusUpdate } from './signal-status-update.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'registration-received': registrationReceived,
  'account-approved': accountApproved,
  'signal-notification': signalNotification,
  'signal-status-update': signalStatusUpdate,
}
