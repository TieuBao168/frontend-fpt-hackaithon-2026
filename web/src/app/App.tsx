import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import { theme } from './theme';
import { router } from './router';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5_000, retry: 1, refetchOnWindowFocus: false } },
});

export function App() {
  return (
    // Chỉ giao diện sáng, nền trắng (plan v7 mục V7.6)
    <MantineProvider theme={theme} defaultColorScheme="light" forceColorScheme="light">
      {/* Thông báo góc trên phải, tự tắt sau 2,8 giây */}
      <Notifications position="top-right" autoClose={2800} limit={3} />
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </MantineProvider>
  );
}
