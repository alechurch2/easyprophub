import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
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
const APP_URL = 'https://easyprophub.lovable.app/dashboard'

interface Props {
  asset: string
  direction: string
  orderType: string
  signalStrength: number
  entryPrice: number
  stopLoss: number
  takeProfit: number
  dashboardUrl?: string
}

const SignalNotificationEmail = ({
  asset,
  direction,
  orderType,
  signalStrength,
  entryPrice,
  stopLoss,
  takeProfit,
  dashboardUrl,
}: Props) => (
  <Html lang="it" dir="ltr">
    <Head />
    <Preview>Nuovo segnale pubblicato: {asset} {direction}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Nuovo segnale globale disponibile</Heading>
        <Text style={text}>
          È stato pubblicato un nuovo segnale su <strong>{SITE_NAME}</strong>.
        </Text>
        <Text style={highlight}>
          {asset} • {direction} • {orderType} • Forza {signalStrength}/5
        </Text>
        <Hr style={hr} />
        <Text style={metric}><strong>Entry:</strong> {entryPrice}</Text>
        <Text style={metric}><strong>Stop Loss:</strong> {stopLoss}</Text>
        <Text style={metric}><strong>Take Profit:</strong> {takeProfit}</Text>
        <Button style={button} href={dashboardUrl || APP_URL}>
          Vai alla dashboard →
        </Button>
        <Hr style={hr} />
        <Text style={footer}>Team {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SignalNotificationEmail,
  subject: ({ asset, direction }: Props) => `Nuovo Segnale: ${asset} ${direction}`,
  displayName: 'Notifica segnale',
  previewData: {
    asset: 'XAU/USD',
    direction: 'Buy',
    orderType: 'market',
    signalStrength: 4,
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
const button = {
  backgroundColor: '#c8922a',
  color: '#1a1a1a',
  padding: '12px 24px',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block' as const,
  margin: '16px 0 24px',
}
const hr = { borderColor: '#e5e5e5', margin: '24px 0' }
const footer = { fontSize: '13px', color: '#999999', margin: '24px 0 0' }