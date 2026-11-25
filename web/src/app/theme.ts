import { createTheme, type MantineColorsTuple } from '@mantine/core';

// Giao diện theo UI/UX ban đầu (plan v7 mục V7.6): nền trắng, màu theo vai trò.
// Cam = hành động chính / bước đang chọn · Xanh dương = đang xử lý, nhãn "AI" · Xanh lá = xong · Đỏ = lỗi.
// Shade 6 = màu nền nút; shade 7 = chữ màu trên nền trắng (đủ tương phản).
const orange: MantineColorsTuple = [
  '#FFF3EB', '#FFE4D2', '#FFC8A5', '#FFA972', '#FF8D47',
  '#F97C2F', '#F26F21', '#D9590F', '#B8490A', '#943906',
];
const blue: MantineColorsTuple = [
  '#EBF3FF', '#D6E6FF', '#ADCBFA', '#80AEF5', '#5A95EF',
  '#3F83EA', '#1E6FD9', '#1659B3', '#114A94', '#0C3A75',
];
const green: MantineColorsTuple = [
  '#EAF7EF', '#D3EEDD', '#A8DDBB', '#7ACB97', '#52BB78',
  '#38B065', '#22A45D', '#1A8049', '#156B3D', '#0F5530',
];
const red: MantineColorsTuple = [
  '#FDEEEE', '#FAD9D9', '#F2B0B0', '#EA8686', '#E26262',
  '#DC4B4B', '#D63B3B', '#B92E2E', '#952424', '#721B1B',
];

export const theme = createTheme({
  primaryColor: 'orange',
  primaryShade: 6,
  colors: { orange, blue, green, red },
  fontFamily: '"Be Vietnam Pro", system-ui, sans-serif',
  headings: { fontFamily: '"Be Vietnam Pro", system-ui, sans-serif', fontWeight: '600' },
  fontSizes: { xs: '12px', sm: '13px', md: '14px', lg: '16px', xl: '20px' },
  defaultRadius: 'md',
  cursorType: 'pointer',
  components: {
    Button: { defaultProps: { fw: 600 } },
    ActionIcon: { defaultProps: { variant: 'default', size: 'lg' } },
    // Link = xanh dương (vai trò "link" trong V7.6)
    Anchor: { defaultProps: { c: 'blue.7' } },
    Card: { defaultProps: { withBorder: true, padding: 'md', radius: 'md' } },
    Paper: { defaultProps: { withBorder: true } },
    Badge: { defaultProps: { variant: 'light', radius: 'sm' } },
    Progress: { defaultProps: { transitionDuration: 400 } },
  },
});
