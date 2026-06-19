# GDS-VERO reference (upload to Custom GPT Knowledge)

## Example App.tsx

```tsx
import { Box, Card, SimpleGrid, VStack } from "@chakra-ui/react";
import { GDSButton, GDSHeading, GDSText } from "@gds-vero/react";
import { CheckIcon } from "@gds-vero/icons";

export default function App() {
  return (
    <Box bg="bg.subtle" color="fg" minH="100vh" p="8">
      <Box as="main" maxW="4xl" mx="auto">
        <GDSHeading size="2xl" as="h1" mb="6">
          Team directory
        </GDSHeading>
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap="6">
          <Card.Root variant="outline">
            <Card.Body>
              <VStack align="stretch" gap="3">
                <GDSHeading size="lg" as="h2">
                  Alex Example
                </GDSHeading>
                <GDSText textStyle="body" color="fg.muted">
                  Product designer
                </GDSText>
                <GDSButton colorPalette="brand" w="full">
                  <CheckIcon aria-hidden /> Connect
                </GDSButton>
              </VStack>
            </Card.Body>
          </Card.Root>
        </SimpleGrid>
      </Box>
    </Box>
  );
}
```

## Chakra v2 → v3 mapping

| Avoid (v2) | Use (v3) |
|------------|----------|
| Divider | Separator |
| Card, CardHeader, CardBody | Card.Root, Card.Header, Card.Body |
| FormControl, FormLabel | Field.Root, Field.Label |
| Table, Thead, Tbody, Tr, Th, Td | Table.Root, Table.Header, Table.Body, Table.Row, Table.ColumnHeader, Table.Cell |
| Modal* | Dialog.* |
| Tab, TabList, TabPanels | Tabs.Root, Tabs.List, Tabs.Trigger, Tabs.Content |
| Alert, AlertIcon | Alert.Root, Alert.Indicator |
| colorScheme | colorPalette |

## Vero surface tokens

| Surface | Pattern |
|---------|---------|
| Page background | `bg="bg.subtle"` |
| Cards | `Card.Root variant="outline"` |
| Card borders | `border.emphasized` via outline variant |
| Body text | `color="fg"` |
| Muted text | `color="fg.muted"` |
| Primary CTA | `GDSButton colorPalette="brand"` |

## GPT setup (for humans, not the model)

1. Actions schema: `https://gds-preview-app-muxj.vercel.app/openapi.json`
2. Authentication: API Key, Bearer, value = Vercel `API_SECRET` only
3. Health check: `https://gds-preview-app-muxj.vercel.app/api/health` → both true
4. Re-enter API Key after every schema re-import
