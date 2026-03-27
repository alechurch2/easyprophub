import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "EasyProp"
const APP_URL = "https://easyprophub.lovable.app"

interface Props {
  name?: string
}

const AccountApprovedEmail = ({ name }: Props) => (
  <Html lang="it" dir="ltr">
    <Head />
    <Preview>Account approvato — Benvenuto in {SITE_NAME}!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {name ? `Benvenuto, ${name}!` : 'Benvenuto!'}
        </Heading>
        <Text style={text}>
          Il tuo account su <strong>{SITE_NAME}</strong> è stato approvato. Puoi ora accedere a tutte le funzionalità del portale.
        </Text>
        <Button style={button} href={`${APP_URL}/login`}>
          Accedi al portale →
        </Button>
        <Hr style={hr} />
        <Text style={text}>
          Ecco cosa ti consigliamo di fare per iniziare:
        </Text>
        <Text style={listItem}>1. Completa la formazione iniziale</Text>
        <Text style={listItem}>2. Prova la tua prima AI Chart Review</Text>
        <Text style={listItem}>3. Esplora l'AI Assistant</Text>
        <Text style={listItem}>4. Collega il tuo conto di trading</Text>
        <Hr style={hr} />
        <Text style={footer}>
          Buon trading,<br />Il team {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AccountApprovedEmail,
  subject: `Account approvato — Benvenuto in ${SITE_NAME}!`,
  displayName: 'Account approvato',
  previewData: { name: 'Marco' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 24px', maxWidth: '520px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#1a1a1a', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#4a4a4a', lineHeight: '1.6', margin: '0 0 16px' }
const listItem = { fontSize: '14px', color: '#4a4a4a', lineHeight: '1.6', margin: '0 0 6px', paddingLeft: '8px' }
const button = {
  backgroundColor: '#c8922a', color: '#1a1a1a', padding: '12px 24px',
  borderRadius: '8px', fontSize: '14px', fontWeight: '600' as const,
  textDecoration: 'none', display: 'inline-block' as const, margin: '8px 0 24px',
}
const hr = { borderColor: '#e5e5e5', margin: '24px 0' }
const footer = { fontSize: '13px', color: '#999999', margin: '24px 0 0' }
