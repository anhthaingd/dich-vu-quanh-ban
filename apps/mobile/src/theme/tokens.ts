// Native values from ui-ux/specs/design-system.md. Use the platform system
// font until product fonts are bundled; never fetch fonts at startup.
export const theme = {
  colors: {
    primary: '#2457D6', primarySoft: '#EFF3FB', text: '#16233B', muted: '#52617A', background: '#F4F7FC',
    surface: '#FFFFFF', border: '#DEE5F0', success: '#24634D', warning: '#925700', error: '#B42318',
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, panel: 20, xl: 24, xxl: 32, xxxl: 48 },
  radius: { control: 12, panel: 16 },
  typography: {
    body: { fontSize: 16, lineHeight: 24 }, caption: { fontSize: 14, lineHeight: 20 },
    title: { fontSize: 30, lineHeight: 40, fontWeight: '700' },
    section: { fontSize: 22, lineHeight: 30, fontWeight: '700' },
    card: { fontSize: 18, lineHeight: 26, fontWeight: '600' },
    brand: { fontSize: 12, lineHeight: 18, fontWeight: '700', letterSpacing: 1.4 },
  },
} as const;
