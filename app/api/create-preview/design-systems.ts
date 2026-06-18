export type DesignSystemId = "gds" | "gds-vero";

export type DesignSystemConfig = {
  id: DesignSystemId;
  label: string;
  providerPackage: string;
  dependencies: Record<string, string>;
  forbiddenImportPattern: RegExp;
};

const SHARED_DEPS: Record<string, string> = {
  react: "^18.3.1",
  "react-dom": "^18.3.1",
  "@chakra-ui/react": "^3.0.0",
  "@emotion/react": "^11.0.0",
};

export const DESIGN_SYSTEMS: Record<DesignSystemId, DesignSystemConfig> = {
  gds: {
    id: "gds",
    label: "Gofore GDS",
    providerPackage: "@gdesignsystem/react",
    dependencies: {
      ...SHARED_DEPS,
      "@gdesignsystem/react": "^0.1.8",
      "@gdesignsystem/theme": "^0.1.8",
      "@gdesignsystem/icons": "^0.1.1",
      "@gdesignsystem/tokens": "^0.1.3",
    },
    forbiddenImportPattern: /@gds-vero\//,
  },
  "gds-vero": {
    id: "gds-vero",
    label: "GDS-VERO (vero.fi)",
    providerPackage: "@gds-vero/react",
    dependencies: {
      ...SHARED_DEPS,
      "@gds-vero/react": "^0.1.12",
      "@gds-vero/theme": "^0.1.17",
      "@gds-vero/icons": "^0.1.1",
    },
    forbiddenImportPattern: /@gdesignsystem\//,
  },
};

export const DEFAULT_DESIGN_SYSTEM: DesignSystemId = "gds";

export function resolveDesignSystem(value: unknown): DesignSystemId | null {
  if (value === undefined || value === null || value === "") {
    return DEFAULT_DESIGN_SYSTEM;
  }
  if (value === "gds" || value === "gds-vero") {
    return value;
  }
  return null;
}
