import { createTheme, type MantineColorsTuple } from '@mantine/core';

// Design tokens theo UI spec mục 2. Màu nghĩa: cam = AI, xanh lam = thủ công/template,
// xanh lá = xong, đỏ = lỗi. Giá trị sáng/tối khai báo thành CSS variable ở global.css.
const orange: MantineColorsTuple = [
  '#fff0e6', '#ffe0cc', '#ffc199', '#ffa066', '#ff8540',
  '#f87529', '#f26a21', '#d85a17', '#b64a12', '#8f390d',
];
const blue: MantineColorsTuple = [
  '#e8f0ff', '#d2e1ff', '#a5c2fb', '#76a2f6', '#5089f1',
  '#3a7aee', '#2f6fdb', '#255cba', '#1d4a97', '#163874',
];
const green: MantineColorsTuple = [
  '#e5f5ec', '#cdebd9', '#9ad6b3', '#64c08b', '#3aac6a',
  '#1f9858', '#11804a', '#0d6b3d', '#0a5631', '#074125',
];
const red: MantineColorsTuple = [
  '#fdecea', '#fbd7d3', '#f5aaa3', '#ee7b70', '#e65446',
  '#d83a2c', '#c0261a', '#a01f15', '#801911', '#61120c',
];
// Thang "dark" của Mantine khớp token nền tối (bg #0e0f13, panel #171a20, line #2a2e37, ink #eceef2)
const dark: MantineColorsTuple = [
  '#eceef2', '#c4c8d0', '#9aa1ad', '#6f7684', '#2a2e37',
  '#22262e', '#171a20', '#0e0f13', '#0b0c10', '#08090c',
];

export const theme = createTheme({
  primaryColor: 'orange',
  primaryShade: 6,
  colors: { orange, blue, green, red, dark },
  fontFamily: '"Be Vietnam Pro", system-ui, sans-serif',
  fontFamilyMonospace: '"Be Vietnam Pro", system-ui, sans-serif',
  headings: {
    fontFamily: '"Be Vietnam Pro", system-ui, sans-serif',
    fontWeight: '700',
    sizes: { h1: { fontSize: '32px', fontWeight: '800' }, h2: { fontSize: '21px' }, h3: { fontSize: '17px' } },
  },
  fontSizes: { xs: '12px', sm: '13px', md: '16px', lg: '17px', xl: '21px' },
  spacing: { xs: '8px', sm: '12px', md: '16px', lg: '20px', xl: '26px' },
  radius: { xs: '4px', sm: '8px', md: '9px', lg: '12px', xl: '16px' },
  defaultRadius: 'md',
  cursorType: 'pointer',
  focusRing: 'never', // dùng outline riêng ở global.css (2px cam, offset 2px)
  components: {
    Button: {
      defaultProps: { size: 'md', radius: 9 },
      styles: { root: { minHeight: 44, fontWeight: 600 } },
    },
    ActionIcon: { defaultProps: { size: 40, radius: 9, variant: 'default' } },
    TextInput: { defaultProps: { size: 'md', radius: 8 }, styles: { input: { minHeight: 44, fontSize: 16 } } },
    Textarea: { defaultProps: { size: 'md', radius: 8 }, styles: { input: { fontSize: 16 } } },
    Select: { defaultProps: { size: 'md', radius: 8 }, styles: { input: { minHeight: 44, fontSize: 16 } } },
    NumberInput: { defaultProps: { size: 'md', radius: 8 }, styles: { input: { minHeight: 44, fontSize: 16 } } },
    TagsInput: { defaultProps: { size: 'md', radius: 8 }, styles: { input: { minHeight: 44, fontSize: 16 } } },
    Checkbox: { defaultProps: { size: 'md', radius: 4 } },
    Radio: { defaultProps: { size: 'md' } },
    Card: { defaultProps: { withBorder: true, padding: 14, radius: 12 } },
    Paper: { defaultProps: { withBorder: true, radius: 12 } },
    Progress: { defaultProps: { radius: 4, transitionDuration: 400 } },
    Modal: { defaultProps: { radius: 12 } },
  },
});
