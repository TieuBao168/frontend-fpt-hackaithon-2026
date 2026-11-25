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
    // Sáng/tối theo prefers-color-scheme (UI spec mục 2)
    <MantineProvider theme={theme} defaultColorScheme="auto">
      {/* Toast nổi ở đáy màn, tự tắt sau 2,8 giây */}
      <Notifications position="bottom-center" autoClose={2800} limit={3} />
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </MantineProvider>
  );
}
