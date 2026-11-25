import { useState } from 'react';
import { Box, Group, Image, Slider, Stack, Text, TextInput, UnstyledButton } from '@mantine/core';
import { BRAND } from '../app/brand';
import { mmss, parseTime } from '../lib/format';
import { LIMITS, RESOLUTION, budget } from '../lib/rules';
import { styleLabel } from '../lib/labels';
import type { Project, Ratio, Template, VariantKey } from '../types/domain';

// ---------------------------------------------------------------- RatioPicker
export function RatioPicker({ value, onChange, disabled }: { value: Ratio; onChange: (r: Ratio) => void; disabled?: boolean }) {
  return (
    <Group gap="sm" grow role="radiogroup" aria-label="Tỉ lệ khung hình">
      {(['9:16', '16:9'] as Ratio[]).map((r) => {
        const on = r === value;
        const res = RESOLUTION[r];
        const { min, max } = LIMITS[r];
        return (
          <UnstyledButton
            key={r}
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(r)}
            p={14}
            style={{
              borderRadius: 12,
              border: `1.5px solid ${on ? 'var(--accent)' : 'var(--line)'}`,
              background: on ? 'var(--accent-soft)' : 'var(--bg)',
            }}
          >
            <Group gap="md" wrap="nowrap">
              <Box
                w={r === '9:16' ? 27 : 48}
                h={r === '9:16' ? 48 : 27}
                style={{ border: `2px solid ${on ? 'var(--accent)' : 'var(--muted)'}`, borderRadius: 4, flex: 'none' }}
              />
              <div>
                <Text fw={700} fz={17}>
                  {r} {r === '9:16' ? 'dọc' : 'ngang'}
                </Text>
                <Text fz={13} c="dimmed">
                  {res.w}×{res.h} · {mmss(min)} đến {mmss(max)}
                </Text>
              </div>
            </Group>
          </UnstyledButton>
        );
      })}
    </Group>
  );
}

// ---------------------------------------------------------------- DurationInput
export function DurationInput({
  min,
  max,
  value,
  error,
  onChange,
  disabled,
}: {
  min: number;
  max: number;
  value: number;
  error?: string;
  onChange: (sec: number | null) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? mmss(value);
  return (
    <Stack gap={6}>
      <Group gap="md" wrap="nowrap" align="center">
        <Slider
          style={{ flex: 1 }}
          min={min}
          max={max}
          step={max > 120 ? 15 : 5}
          value={Math.min(max, Math.max(min, value))}
          onChange={(v) => {
            setText(null);
            onChange(v);
          }}
          label={(v) => mmss(v)}
          disabled={disabled}
          aria-label="Thanh trượt thời lượng"
        />
        <TextInput
          w={110}
          value={shown}
          disabled={disabled}
          aria-label="Thời lượng (phút:giây)"
          error={!!error}
          onChange={(e) => {
            setText(e.currentTarget.value);
            onChange(parseTime(e.currentTarget.value));
          }}
          onBlur={() => {
            if (parseTime(shown) !== null) setText(null);
          }}
        />
      </Group>
      {error && (
        <Text fz={14} c="var(--bad)" role="alert">
          {error}
        </Text>
      )}
    </Stack>
  );
}

// ---------------------------------------------------------------- VariantTabs
export function VariantTabs({ project, active, onChange }: { project: Project; active: VariantKey; onChange: (k: VariantKey) => void }) {
  if (project.variants.length < 2) return null;
  return (
    <Group gap={8} role="tablist" aria-label="Phương án" mb="sm" wrap="wrap">
      {project.variants.map((v) => {
        const on = v.key === active;
        const b = budget(project, v);
        return (
          <UnstyledButton
            key={v.key}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(v.key)}
            px={14}
            py={8}
            style={{
              minHeight: 44,
              borderRadius: 9,
              border: `1.5px solid ${on ? 'var(--accent)' : 'var(--line)'}`,
              background: on ? 'var(--accent-soft)' : 'var(--bg)',
            }}
          >
            <Text fw={700} fz={15} c={on ? 'var(--accent)' : undefined}>
              Phương án {v.key}: {styleLabel[v.style]}
              {v.isPrimary ? ' ★' : ''}
            </Text>
            <Text fz={13} c="dimmed" className="num">
              {v.order.length} đoạn · {mmss(b.filmSec)}
            </Text>
          </UnstyledButton>
        );
      })}
    </Group>
  );
}

// ---------------------------------------------------------------- TemplateThumb
export function TemplateThumb({ template, large }: { template: Pick<Template, 'name' | 'type' | 'durationSec' | 'thumbnailUrl'>; large?: boolean }) {
  return (
    <Box
      pos="relative"
      w="100%"
      style={{
        aspectRatio: '16 / 9',
        borderRadius: large ? 12 : 8,
        overflow: 'hidden',
        background: template.thumbnailUrl ? `center/cover url(${template.thumbnailUrl})` : '#0b0d12',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: large ? 10 : 4,
      }}
    >
      {!template.thumbnailUrl && (
        <>
          <Image src={BRAND.logoUrl} alt="" w={large ? 150 : 56} fit="contain" />
          {large && (
            <Text c="#fff" fw={700} fz={17} ta="center" px="md">
              {template.type === 'outro' ? template.name : BRAND.product}
            </Text>
          )}
        </>
      )}
      <Text pos="absolute" bottom={6} right={8} c="#fff" fz={12} fw={700} px={6} style={{ background: 'var(--manual)', borderRadius: 4 }}>
        {template.type === 'intro' ? 'Đầu' : 'Cuối'} · {template.durationSec}s
      </Text>
    </Box>
  );
}
