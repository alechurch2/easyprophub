import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "EasyProp"

interface Props {
  name?: string
}

const RegistrationReceivedEmail = ({ name }: Props) => (
  <Html lang="it" dir="ltr">
    <Head />
    <Preview>Registrazione ricevuta — {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {name ? `Ciao ${name},` : 'Ciao,'}
        </Heading>
        <Text style={text}>
          La tua registrazione su <strong>{SITE_NAME}</strong> è stata ricevuta con successo.
        </Text>
        <Text style={text}>
          Il tuo account è ora in fase di revisione. Riceverai una notifica non appena verrà approvato dal team.
        </Text>
        <Hr style={hr} />
        <Text style={text}>
          Nel frattempo, preparati a scoprire le funzionalità del portale:
        </Text>
        <Text style={listItem}>✦ Formazione strutturata sul trading</Text>
        <Text style={listItem}>✦ AI Chart Review per analisi dei grafici</Text>
        <Text style={listItem}>✦ AI Assistant per supporto operativo</Text>
        <Text style={listItem}>✦ Collegamento conti e copy trading</Text>
        <Hr style={hr} />
        <Text style={footer}>
          A presto,<br />Il team {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: RegistrationReceivedEmail,
  subject: `Registrazione ricevuta — ${SITE_NAME}`,
  displayName: 'Registrazione ricevuta',
  previewData: { name: 'Marco' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 24px', maxWidth: '520px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#1a1a1a', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#4a4a4a', lineHeight: '1.6', margin: '0 0 16px' }
const listItem = { fontSize: '14px', color: '#4a4a4a', lineHeight: '1.6', margin: '0 0 6px', paddingLeft: '8px' }
const hr = { borderColor: '#e5e5e5', margin: '24px 0' }
const footer = { fontSize: '13px', color: '#999999', margin: '24px 0 0' }
