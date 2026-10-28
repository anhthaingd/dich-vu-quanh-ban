// B00-10 approved presentation; keep the product palette and bundled fonts.
export const theme = {
  colors: {
    primary: '#2457D6', primarySoft: '#EFF3FB', text: '#16233B', muted: '#52617A', background: '#F4F7FC',
    surface: '#FFFFFF', border: '#DEE5F0', success: '#24634D', warning: '#925700', error: '#B42318',
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, panel: 20, xl: 24, xxl: 32, xxxl: 48 },
  radius: { control: 13, panel: 18 },
  typography: {
    body: { fontSize: 16, lineHeight: 24 }, caption: { fontSize: 14, lineHeight: 20 },
    title: { fontSize: 26, lineHeight: 34, fontWeight: '700' },
    section: { fontSize: 20, lineHeight: 28, fontWeight: '700' },
    card: { fontSize: 18, lineHeight: 26, fontWeight: '600' },
    brand: { fontSize: 12, lineHeight: 18, fontWeight: '700', letterSpacing: 1.4 },
  },
} as const;
