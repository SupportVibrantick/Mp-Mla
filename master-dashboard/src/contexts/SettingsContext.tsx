import React, { createContext, useContext } from "react";

const DEFAULT_BRANDING: Record<string, string> = {
  org_name: "MP-MLA Platform",
  org_short_name: "Platform",
  brand_primary_color: "#1e40af",
  brand_secondary_color: "#3b82f6",
};

interface SettingsContextType {
  settings: Record<string, string>;
  isLoading: boolean;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  return (
    <SettingsContext.Provider
      value={{
        settings: DEFAULT_BRANDING,
        isLoading: false,
        refreshSettings: async () => {},
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSystemSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSystemSettings must be used within a SettingsProvider");
  }
  return context;
}
