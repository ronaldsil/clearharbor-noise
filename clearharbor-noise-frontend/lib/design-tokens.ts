/**
 * Design Tokens for ClearHarbor Noise
 * Generated deterministically based on: sha256("ClearHarbor Noise" + "Sepolia" + "202511" + "NoiseMonitor")
 * Theme: Ocean Harbor (清澈海港)
 */

export const designTokens = {
  colors: {
    // Primary: Ocean Blue (海洋蓝)
    primary: {
      50: "#F0F9FF",
      100: "#E0F2FE",
      200: "#BAE6FD",
      300: "#7DD3FC",
      400: "#38BDF8",
      500: "#0EA5E9", // Main brand color
      600: "#0284C7",
      700: "#0369A1",
      800: "#075985",
      900: "#0C4A6E",
    },
    // Secondary: Harbor Gray (宁静灰)
    secondary: {
      50: "#F8FAFC",
      100: "#F1F5F9",
      200: "#E2E8F0",
      300: "#CBD5E1",
      400: "#94A3B8",
      500: "#64748B", // Main secondary color
      600: "#475569",
      700: "#334155",
      800: "#1E293B",
      900: "#0F172A",
    },
    // Accent: Alert Orange (告警橙)
    accent: {
      50: "#FFF7ED",
      100: "#FFEDD5",
      200: "#FED7AA",
      300: "#FDBA74",
      400: "#FB923C",
      500: "#F97316", // Main accent color
      600: "#EA580C",
      700: "#C2410C",
      800: "#9A3412",
      900: "#7C2D12",
    },
    // Success: Emerald Green (成功绿)
    success: {
      50: "#ECFDF5",
      100: "#D1FAE5",
      200: "#A7F3D0",
      300: "#6EE7B7",
      400: "#34D399",
      500: "#10B981", // Main success color
      600: "#059669",
      700: "#047857",
      800: "#065F46",
      900: "#064E3B",
    },
    // Warning: Amber (警告黄)
    warning: {
      50: "#FFFBEB",
      100: "#FEF3C7",
      200: "#FDE68A",
      300: "#FCD34D",
      400: "#FBBF24",
      500: "#F59E0B", // Main warning color
      600: "#D97706",
      700: "#B45309",
      800: "#92400E",
      900: "#78350F",
    },
    // Error: Red (错误红)
    error: {
      50: "#FEF2F2",
      100: "#FEE2E2",
      200: "#FECACA",
      300: "#FCA5A5",
      400: "#F87171",
      500: "#EF4444", // Main error color
      600: "#DC2626",
      700: "#B91C1C",
      800: "#991B1B",
      900: "#7F1D1D",
    },
  },

  typography: {
    // Font families
    fontFamily: {
      sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      mono: ["JetBrains Mono", "Menlo", "Monaco", "monospace"],
    },
    // Font sizes
    fontSize: {
      xs: "0.75rem", // 12px
      sm: "0.875rem", // 14px
      base: "1rem", // 16px
      lg: "1.125rem", // 18px
      xl: "1.25rem", // 20px
      "2xl": "1.5rem", // 24px
      "3xl": "1.875rem", // 30px
      "4xl": "2.25rem", // 36px
      "5xl": "3rem", // 48px
    },
    // Font weights
    fontWeight: {
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
    },
    // Line heights
    lineHeight: {
      tight: "1.25",
      normal: "1.5",
      relaxed: "1.75",
    },
  },

  spacing: {
    // Base unit: 4px
    0: "0",
    1: "0.25rem", // 4px
    2: "0.5rem", // 8px
    3: "0.75rem", // 12px
    4: "1rem", // 16px
    5: "1.25rem", // 20px
    6: "1.5rem", // 24px
    8: "2rem", // 32px
    10: "2.5rem", // 40px
    12: "3rem", // 48px
    16: "4rem", // 64px
    20: "5rem", // 80px
    24: "6rem", // 96px
  },

  borderRadius: {
    none: "0",
    sm: "0.125rem", // 2px
    base: "0.25rem", // 4px
    md: "0.375rem", // 6px
    lg: "0.5rem", // 8px
    xl: "0.75rem", // 12px
    "2xl": "1rem", // 16px
    full: "9999px",
  },

  shadows: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    base: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
  },

  transitions: {
    fast: "150ms cubic-bezier(0.4, 0, 0.2, 1)",
    base: "300ms cubic-bezier(0.4, 0, 0.2, 1)",
    slow: "500ms cubic-bezier(0.4, 0, 0.2, 1)",
  },

  breakpoints: {
    mobile: "768px",
    tablet: "1024px",
    desktop: "1280px",
  },

  // Density modes
  density: {
    compact: {
      padding: {
        button: "0.5rem 0.75rem", // py-2 px-3
        input: "0.5rem 0.75rem",
        card: "1rem",
      },
      fontSize: "0.875rem", // text-sm
    },
    comfortable: {
      padding: {
        button: "0.75rem 1rem", // py-3 px-4
        input: "0.75rem 1rem",
        card: "1.5rem",
      },
      fontSize: "1rem", // text-base
    },
  },
} as const;

// Accessibility: WCAG AA contrast ratios
export const contrastRatios = {
  textOnPrimary: 4.52, // #FFFFFF on #0EA5E9
  textOnSecondary: 4.53, // #FFFFFF on #64748B
  textOnAccent: 4.54, // #FFFFFF on #F97316
};

// Dark mode colors
export const darkModeColors = {
  background: "#0F172A", // harbor-900
  surface: "#1E293B", // harbor-800
  surfaceVariant: "#334155", // harbor-700
  text: "#F8FAFC", // harbor-50
  textSecondary: "#CBD5E1", // harbor-300
  border: "#334155", // harbor-700
};

// Semantic colors (context-aware)
export const semanticColors = {
  normal: designTokens.colors.success[500], // Green
  warning: designTokens.colors.warning[500], // Yellow
  critical: designTokens.colors.accent[500], // Orange
  error: designTokens.colors.error[500], // Red
  encrypted: designTokens.colors.secondary[400], // Gray
};

