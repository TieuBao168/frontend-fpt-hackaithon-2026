import { Card, Group, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconCheck, IconX } from '@tabler/icons-react';
import type { Check } from '../../types/domain';

export function ChecksCard({ checks }: { checks: Check[] }) {
  const passed = checks.filter((c) => c.passed).length;
  return (
    <Card>
      <Group justify="space-between" mb="xs">
        <Text fw={600}>Kiểm tra tự động</Text>
        <Text fz="sm" c={passed === checks.length ? 'green.7' : 'orange.7'} fw={600}>
          {passed}/{checks.length} đạt
        </Text>
      </Group>
      <Stack gap={6}>
        {checks.map((c) => (
          <Group key={c.name} gap="xs" wrap="nowrap" align="flex-start">
            <ThemeIcon size={18} radius="xl" color={c.passed ? 'green' : 'red'} variant="light">
              {c.passed ? <IconCheck size={12} /> : <IconX size={12} />}
            </ThemeIcon>
            <div>
              <Text fz="sm">{c.name}</Text>
              {c.detail && (
                <Text fz="xs" c="gray.6">
                  {c.detail}
                </Text>
              )}
            </div>
          </Group>
        ))}
      </Stack>
    </Card>
  );
}
