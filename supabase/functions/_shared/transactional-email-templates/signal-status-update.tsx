import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'EasyProp'

const STATUS_LABELS: Record<string, string> = {
  active: 'Attivo',
  triggered: 'Aperto',
  won: 'Vinto ✅',
  lost: 'Perso ❌',
  expired: 'Scaduto',
  withdrawn: 'Ritirato',
}

interface Props {
  asset: string
  direction: string
  oldStatus: string
  newStatus: string
  entryPrice: number
  stopLoss: number
  takeProfit: number
}

const SignalStatusUpdateEmail = ({
  asset,
  direction,
  oldStatus,
  newStatus,
  entryPrice,
  stopLoss,
  takeProfit,
}: Props) => {
  const oldLabel = STATUS_LABELS[oldStatus] || oldStatus
  const newLabel = STATUS_LABELS[newStatus] || newStatus
  const isWon = newStatus === 'won'
  const isLost = newStatus === 'lost'

  return (
    <Html lang="it" dir="ltr">
      <Head />
      <Preview>Segnale {asset}: {newLabel}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Aggiornamento segnale</Heading>
          <Text style={text}>
            Lo stato del segnale su <strong>{asset}</strong> è cambiato.
          </Text>
          <Text style={highlight}>
            {asset} • {direction} • {oldLabel} → <span style={isWon ? wonStyle : isLost ? lostStyle : {}}>{newLabel}</span>
          </Text>
          <Hr style={hr} />
          <Text style={metric}><strong>Entry:</strong> {entryPrice}</Text>
          <Text style={metric}><strong>Stop Loss:</strong> {stopLoss}</Text>
          <Text style={metric}><strong>Take Profit:</strong> {takeProfit}</Text>
          <Hr style={hr} />
          <Text style={footer}>Team {SITE_NAME}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: SignalStatusUpdateEmail,
  subject: ({ asset, newStatus }: Props) =>
    `Segnale ${asset}: ${STATUS_LABELS[newStatus] || newStatus}`,
  displayName: 'Aggiornamento stato segnale',
  previewData: {
    asset: 'XAU/USD',
    direction: 'Buy',
    oldStatus: 'active',
    newStatus: 'won',
    entryPrice: 2320.5,
    stopLoss: 2312.1,
    takeProfit: 2334.8,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 24px', maxWidth: '520px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#1a1a1a', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#4a4a4a', lineHeight: '1.6', margin: '0 0 16px' }
const highlight = {
  fontSize: '15px',
  color: '#1a1a1a',
  lineHeight: '1.6',
  margin: '0 0 16px',
  fontWeight: '600' as const,
}
const metric = { fontSize: '14px', color: '#4a4a4a', lineHeight: '1.6', margin: '0 0 8px' }
const hr = { borderColor: '#e5e5e5', margin: '24px 0' }
const footer = { fontSize: '13px', color: '#999999', margin: '24px 0 0' }
const wonStyle = { color: '#16a34a', fontWeight: '700' as const }
const lostStyle = { color: '#dc2626', fontWeight: '700' as const }
