import { AppShell, Badge, Box, Container, Divider, Group, Image, Text, UnstyledButton } from '@mantine/core';
import { NavLink, Outlet } from 'react-router';
import { BRAND } from './brand';

const nav = [
  { to: '/', label: 'Thư viện VOD', end: true },
  { to: '/projects', label: 'Dự án', end: false },
];

export function Layout() {
  return (
    <AppShell header={{ height: 56 }} padding={0}>
      <AppShell.Header withBorder>
        <Container size="xl" h="100%">
          <Group h="100%" justify="space-between" wrap="nowrap">
            <Group gap="lg" wrap="nowrap">
              <NavLink to="/" style={{ textDecoration: 'none', color: 'inherit' }} aria-label="Về trang chủ">
                <Group gap={10} wrap="nowrap">
                  <Image src={BRAND.logoUrl} alt={BRAND.logoAlt} h={18} w={18 * BRAND.logoAspect} fit="contain" />
                  <Divider orientation="vertical" h={20} style={{ alignSelf: 'center' }} />
                  <Box lh={1.1}>
                    <Text fw={700} fz="md" c="orange.7">
                      {BRAND.team}
                    </Text>
                    <Text fz={11} c="gray.6" fw={500}>
                      {BRAND.product}
                    </Text>
                  </Box>
                </Group>
              </NavLink>
              <Group gap={4} wrap="nowrap">
                {nav.map((item) => (
                  <NavLink key={item.to} to={item.to} end={item.end} style={{ textDecoration: 'none' }}>
                    {({ isActive }) => (
                      <UnstyledButton
                        px="sm"
                        py={6}
                        fz="sm"
                        fw={isActive ? 600 : 500}
                        c={isActive ? 'orange.7' : 'gray.7'}
                        bg={isActive ? 'orange.0' : undefined}
                        style={{ borderRadius: 6 }}
                      >
                        {item.label}
                      </UnstyledButton>
                    )}
                  </NavLink>
                ))}
              </Group>
            </Group>
            <Group gap="sm" wrap="nowrap" visibleFrom="sm">
              {import.meta.env.VITE_USE_MOCK !== 'false' && (
                <Badge color="gray" variant="outline">
                  Dữ liệu giả lập
                </Badge>
              )}
              <Text fz="xs" c="gray.6">
                Hackaithon FPT Play 2026
              </Text>
            </Group>
          </Group>
        </Container>
      </AppShell.Header>
      <AppShell.Main>
        <Container size="xl" py="lg">
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
