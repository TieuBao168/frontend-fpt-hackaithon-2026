// Component dùng chung – UI spec mục 3.
import type { ReactNode } from 'react';
import { Badge, Box, Button, Group, Progress, Stack, Text, Title, UnstyledButton } from '@mantine/core';
import { IconAlertTriangle, IconCheck, IconInfoCircle, IconRefresh } from '@tabler/icons-react';
import type { Tone } from '../lib/status';
import { stageLabel } from '../lib/labels';
import type { Stage } from '../types/domain';

// ---------------------------------------------------------------- UseCaseChip / ScreenHeader
const MANDATORY = new Set(['A.1', 'A.2', 'B.1', 'C.1', 'C.2', 'C.4', 'D.1', 'F.1', 'F.3', 'F.4', 'G.1']);

export function UseCaseChip({ code, mandatory }: { code: string; mandatory?: boolean }) {
  const m = mandatory ?? MANDATORY.has(code);
  return (
    <Box
      component="span"
      px={8}
      py={2}
      title={m ? 'Bắt buộc' : 'Tùy chọn'}
      style={{
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        border: '1.5px solid var(--accent)',
        background: m ? 'var(--accent)' : 'transparent',
        color: m ? '#fff' : 'var(--accent)',
        whiteSpace: 'nowrap',
      }}
    >
      UC-{code}
    </Box>
  );
}

export function ScreenHeader({ title, useCases, right }: { title: string; useCases: string[]; right?: ReactNode }) {
  return (
    <Group justify="space-between" align="flex-start" mb="md" gap="sm">
      <Stack gap={6}>
        <Title order={2} fz={21} fw={700}>
          {title}
        </Title>
        <Group gap={6}>
          {useCases.map((c) => (
            <UseCaseChip key={c} code={c} />
          ))}
        </Group>
      </Stack>
      {right}
    </Group>
  );
}

// ---------------------------------------------------------------- StatusPill
const toneStyle: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: 'var(--panel)', fg: 'var(--muted)' },
  hot: { bg: 'var(--accent-soft)', fg: 'var(--accent)' },
  ok: { bg: 'var(--ok-soft)', fg: 'var(--ok)' },
  bad: { bg: 'var(--bad-soft)', fg: 'var(--bad)' },
};

export function StatusPill({ tone, label }: { tone: Tone; label: string }) {
  const s = toneStyle[tone];
  return (
    <Box
      component="span"
      px={10}
      py={3}
      style={{ borderRadius: 999, background: s.bg, color: s.fg, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', display: 'inline-block' }}
    >
      {label}
    </Box>
  );
}

// ---------------------------------------------------------------- Notice
type NoticeTone = 'info' | 'ok' | 'warn';
const noticeStyle: Record<NoticeTone, { bg: string; bar: string; icon: ReactNode }> = {
  info: { bg: 'var(--accent-soft)', bar: 'var(--accent)', icon: <IconInfoCircle size={18} color="var(--accent)" /> },
  ok: { bg: 'var(--ok-soft)', bar: 'var(--ok)', icon: <IconCheck size={18} color="var(--ok)" /> },
  warn: { bg: 'var(--bad-soft)', bar: 'var(--bad)', icon: <IconAlertTriangle size={18} color="var(--bad)" /> },
};

export function Notice({ tone = 'info', children, action }: { tone?: NoticeTone; children: ReactNode; action?: ReactNode }) {
  const s = noticeStyle[tone];
  return (
    <Group
      role={tone === 'warn' ? 'alert' : 'status'}
      wrap="nowrap"
      align="flex-start"
      gap="sm"
      p={12}
      style={{ background: s.bg, borderRadius: 9, borderLeft: `3px solid ${s.bar}` }}
    >
      <Box mt={2} style={{ flex: 'none' }}>
        {s.icon}
      </Box>
      <Box style={{ flex: 1, fontSize: 15 }}>{children}</Box>
      {action}
    </Group>
  );
}

// ---------------------------------------------------------------- EmptyState
export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <Stack align="center" justify="center" gap="md" py={72} px="md" ta="center">
      <Text fz={17} fw={600} maw={460}>
        {message}
      </Text>
      {action}
    </Stack>
  );
}

// ---------------------------------------------------------------- ChipGroup
export function ChipGroup<T extends string | number>({
  options,
  value,
  onChange,
  label,
  disabled,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <Group gap={8} role="radiogroup" aria-label={label}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <UnstyledButton
            key={String(o.value)}
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            px={14}
            style={{
              minHeight: 40,
              borderRadius: 8,
              fontSize: 15,
              fontWeight: on ? 700 : 500,
              border: `1.5px solid ${on ? 'var(--accent)' : 'var(--line)'}`,
              background: on ? 'var(--accent-soft)' : 'var(--bg)',
              color: on ? 'var(--accent)' : 'var(--ink)',
            }}
          >
            {o.label}
          </UnstyledButton>
        );
      })}
    </Group>
  );
}

// ---------------------------------------------------------------- MeterRow
const meterColor: Record<Tone | 'manual', string> = { neutral: 'gray', hot: 'orange', ok: 'green', bad: 'red', manual: 'blue' };

export function MeterRow({ label, pct, value, tone = 'hot' }: { label: string; pct: number; value: string; tone?: Tone | 'manual' }) {
  return (
    <Group gap="sm" wrap="nowrap">
      <Text fz={15} w={130} style={{ flex: 'none' }}>
        {label}
      </Text>
      <Progress value={pct} color={meterColor[tone]} style={{ flex: 1 }} size={8} />
      <Text fz={15} fw={700} w={72} ta="right" className="num">
        {value}
      </Text>
    </Group>
  );
}

// ---------------------------------------------------------------- StageList
export function StageList({ stages, onRetry, retrying }: { stages: Stage[]; onRetry?: (key: string) => void; retrying?: boolean }) {
  return (
    <Stack gap={12}>
      {stages.map((s) => (
        <Box key={s.key}>
          <Group justify="space-between" mb={4} wrap="nowrap" gap="xs">
            <Text fz={15} fw={600}>
              {stageLabel[s.key]}
              {s.reusedFromCache && (
                <Text span c="dimmed" fz={13} fw={400}>
                  {' '}
                  (dùng lại kết quả cũ)
                </Text>
              )}
            </Text>
            {s.status === 'done' ? (
              <StatusPill tone="ok" label="Xong" />
            ) : s.status === 'error' ? (
              <StatusPill tone="bad" label="Lỗi" />
            ) : s.status === 'running' ? (
              <Text fz={15} fw={700} c="var(--accent)" className="num">
                {s.pct}%
              </Text>
            ) : (
              <StatusPill tone="neutral" label="Chờ" />
            )}
          </Group>
          <Progress
            value={s.status === 'done' ? 100 : s.pct}
            color={s.status === 'error' ? 'red' : s.status === 'done' ? 'green' : 'orange'}
            size={8}
            aria-label={stageLabel[s.key]}
          />
          {s.status === 'error' && (
            <Group mt={8} gap="sm" wrap="wrap">
              <Text fz={14} c="var(--bad)">
                {s.error}
              </Text>
              {onRetry && (
                <Button size="sm" variant="light" color="red" leftSection={<IconRefresh size={16} />} loading={retrying} onClick={() => onRetry(s.key)}>
                  Chạy lại bước này
                </Button>
              )}
            </Group>
          )}
        </Box>
      ))}
    </Stack>
  );
}

// ---------------------------------------------------------------- Nhãn nguồn đoạn
export function SourceTag({ source, score }: { source: 'ai' | 'manual'; score?: number }) {
  return source === 'ai' ? (
    <Badge radius={999} variant="filled" color="orange" size="lg" tt="none" fw={700}>
      AI đề xuất{score !== undefined ? ` ${score}` : ''}
    </Badge>
  ) : (
    <Badge radius={999} variant="filled" color="blue" size="lg" tt="none" fw={700}>
      Thủ công
    </Badge>
  );
}
