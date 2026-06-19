# GDS-VERO reference (upload to Custom GPT Knowledge)

## Team directory page (canonical)

```tsx
import { Avatar, Box, Breadcrumb, Card, HStack, Link, SimpleGrid, Stack, VStack } from "@chakra-ui/react";
import { ChevronRightIcon, MailIcon, PhoneIcon } from "@gds-vero/icons";
import { GDSButton, GDSHeading, GDSText, VeroAppShell, VeroPageLayout } from "@gds-vero/react";

export default function App() {
  return (
    <VeroAppShell>
      <VeroPageLayout contentWidth="wide">
        <Breadcrumb.Root aria-label="Breadcrumb" mb="4">
          <Breadcrumb.List>
            <Breadcrumb.Item>
              <Breadcrumb.Link href="/">Etusivu</Breadcrumb.Link>
            </Breadcrumb.Item>
            <Breadcrumb.Separator>
              <ChevronRightIcon boxSize="4" color="fg.muted" aria-hidden />
            </Breadcrumb.Separator>
            <Breadcrumb.Item>
              <Breadcrumb.CurrentLink>Tiimihakemisto</Breadcrumb.CurrentLink>
            </Breadcrumb.Item>
          </Breadcrumb.List>
        </Breadcrumb.Root>

        <GDSHeading as="h1">Tiimihakemisto</GDSHeading>
        <GDSText textStyle="body" color="fg.muted" mt="4">
          Löydä oikea yhteyshenkilö asiakaspalvelusta.
        </GDSText>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap="6" mt="8">
          <Card.Root variant="outline">
            <Card.Header>
              <HStack gap="4" align="start">
                <Avatar.Root size="lg">
                  <Avatar.Image src="https://images.unsplash.com/photo-1494790108377-be9c29b29330" alt="" />
                  <Avatar.Fallback name="Aino Korhonen" />
                </Avatar.Root>
                <Stack gap="1">
                  <Card.Title>Aino Korhonen</Card.Title>
                  <Card.Description>Asiakaspalvelun tiiminvetäjä</Card.Description>
                </Stack>
              </HStack>
            </Card.Header>
            <Card.Body>
              <GDSText textStyle="body" color="fg.muted">
                Auttaa henkilöasiakkaiden veroasioissa ja ohjaa tiimiä sujuvaan palvelukokemukseen.
              </GDSText>
              <VStack align="stretch" gap="2" mt="4">
                <Link href="tel:+358295123001">
                  <PhoneIcon aria-hidden /> +358 29 512 3001
                </Link>
                <Link href="mailto:aino.korhonen@vero.fi">
                  <MailIcon aria-hidden /> aino.korhonen@vero.fi
                </Link>
              </VStack>
            </Card.Body>
            <Card.Footer>
              <GDSButton colorPalette="brand">Ota yhteyttä</GDSButton>
            </Card.Footer>
          </Card.Root>
        </SimpleGrid>
      </VeroPageLayout>
    </VeroAppShell>
  );
}
```

**Do not:** `Separator` inside cards; `Avatar` without `size="lg"`; `GDSButton w="full"` in directory cards; ad-hoc `maxW` / random `mb` on page title block.

## Chakra v2 → v3 mapping

| Avoid (v2) | Use (v3) |
|------------|----------|
| Divider | Separator (page sections + breadcrumb only — not inside cards) |
| Card, CardHeader, CardBody | Card.Root, Card.Header, Card.Body |
| FormControl, FormLabel | Field.Root, Field.Label |
| Table, Thead, Tbody, Tr, Th, Td | Table.Root, Table.Header, Table.Body, Table.Row, Table.ColumnHeader, Table.Cell |
| Modal* | Dialog.* |
| Tab, TabList, TabPanels | Tabs.Root, Tabs.List, Tabs.Trigger, Tabs.Content |
| Alert, AlertIcon | Alert.Root, Alert.Indicator |
| colorScheme | colorPalette |
| Avatar (flat props) | Avatar.Root, Avatar.Image, Avatar.Fallback |

## Vero surface tokens

| Surface | Pattern |
|---------|---------|
| Page background | `VeroAppShell` → `bg.subtle` |
| Cards | `Card.Root variant="outline"` |
| Card borders | `border.emphasized` via outline variant |
| Body text | `color="fg"` |
| Muted text | `color="fg.muted"` |
| Primary CTA | `GDSButton colorPalette="brand"` |

## Page spacing tokens (fixed — do not invent)

| Element | Spacing |
|---------|---------|
| Breadcrumb → h1 | `Breadcrumb.Root mb="4"` |
| h1 → lead text | `GDSText mt="4"` |
| lead → main content | `mt="8"` on grid / content wrapper |
| Card grid gap | `SimpleGrid gap="6"` |
| Directory card avatar | `Avatar.Root size="lg"` always |

## GPT setup (for humans, not the model)

1. Actions schema: `https://gds-preview-app-muxj.vercel.app/openapi.json`
2. Authentication: API Key, Bearer, value = Vercel `API_SECRET` only
3. Health check: `https://gds-preview-app-muxj.vercel.app/api/health` → both true
4. Re-enter API Key after every schema re-import
