import type { ReactNode } from 'react';
import { Alert, Badge, Center, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { projectStatusColor, projectStatusLabel } from '../lib/labels';
import { formatTimecode } from '../lib/time';
import type { ProjectStatus } from '../types/domain';

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge color={projectStatusColor[status]}>{projectStatusLabel[status]}</Badge>;
}

/** Nhãn nhỏ đánh dấu nội dung do AI tạo – xanh dương, chữ, không icon "phép thuật". */
export function AiTag() {
  return (
    <Badge color="blue" variant="light" size="xs" radius="xs" fw={700}>
      AI
    </Badge>
  );
}

export function Timecode({ ms, c = 'gray.7' }: { ms: number; c?: string }) {
  return (
    <Text span className="mono" c={c}>
      {formatTimecode(ms)}
    </Text>
  );
}

export function ScorePill({ score }: { score: number }) {
  const color = score >= 0.85 ? 'green' : score >= 0.7 ? 'blue' : 'gray';
  return (
    <Badge color={color} variant="outline" size="sm" className="mono">
      {score.toFixed(2)}
    </Badge>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <Group justify="space-between" align="flex-end" mb="lg" wrap="wrap">
      <Stack gap={2}>
        <Title order={2} fz={22}>
          {title}
        </Title>
        {subtitle && (
          <Text c="gray.6" fz="sm">
            {subtitle}
          </Text>
        )}
      </Stack>
      {actions && <Group gap="sm">{actions}</Group>}
    </Group>
  );
}

export function LoadingBlock({ label = 'Đang tải…' }: { label?: string }) {
  return (
    <Center py={80}>
      <Group gap="sm">
        <Loader size="sm" color="blue" />
        <Text c="gray.6">{label}</Text>
      </Group>
    </Center>
  );
}

export function ErrorBlock({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <Alert color="red" icon={<IconAlertTriangle size={18} />} title="Không tải được dữ liệu">
      <Text fz="sm">{error.message}</Text>
      {onRetry && (
        <Text fz="sm" c="red.7" td="underline" style={{ cursor: 'pointer' }} onClick={onRetry} mt={4}>
          Thử lại
        </Text>
      )}
    </Alert>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <Center py={64}>
      <Stack align="center" gap={6} maw={420} ta="center">
        <Text fw={600}>{title}</Text>
        {description && (
          <Text c="gray.6" fz="sm">
            {description}
          </Text>
        )}
        {action}
      </Stack>
    </Center>
  );
}
