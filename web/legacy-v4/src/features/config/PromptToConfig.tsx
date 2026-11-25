import { useState } from 'react';
import { Button, Checkbox, Group, Modal, Stack, Table, Text, Textarea } from '@mantine/core';
import { useParsePrompt } from '../../lib/queries';
import { goalLabel, pacingLabel, styleLabel } from '../../lib/labels';
import { formatDuration } from '../../lib/time';
import type { GenerationConfig } from '../../types/domain';

type Key = keyof GenerationConfig;

const fieldName: Partial<Record<Key, string>> = {
  goal: 'Mục tiêu',
  outputType: 'Loại đầu ra',
  durationSec: 'Thời lượng',
  ratio: 'Tỉ lệ',
  style: 'Phong cách',
  pacing: 'Nhịp cắt',
  spoilerGuard: 'Tránh spoil',
  music: 'Mood nhạc',
};

function show(key: Key, v: unknown): string {
  if (v === undefined || v === null || v === '') return '—';
  switch (key) {
    case 'durationSec':
      return formatDuration(v as number);
    case 'outputType':
      return v === 'short' ? 'Video ngắn' : 'Video dài';
    case 'goal':
      return goalLabel[v as GenerationConfig['goal']];
    case 'style':
      return styleLabel[v as NonNullable<GenerationConfig['style']>];
    case 'pacing':
      return pacingLabel[v as NonNullable<GenerationConfig['pacing']>];
    case 'spoilerGuard':
      return v ? 'Bật' : 'Tắt';
    case 'music':
      return (v as GenerationConfig['music'])?.mood || '—';
    default:
      return String(v);
  }
}

interface Props {
  current: GenerationConfig;
  onApply: (patch: Partial<GenerationConfig>) => void;
  prompt: string;
  onPromptChange: (v: string) => void;
}

/** UC-B.3: prompt → AI tách tham số → người dùng xem từng thay đổi và chọn áp dụng. */
export function PromptToConfig({ current, onApply, prompt, onPromptChange }: Props) {
  const parse = useParsePrompt();
  const [parsed, setParsed] = useState<Partial<GenerationConfig> | null>(null);
  const [picked, setPicked] = useState<Set<Key>>(new Set());

  const changes = parsed
    ? (Object.keys(parsed) as Key[]).filter((k) => show(k, parsed[k]) !== show(k, current[k]))
    : [];

  const run = () =>
    parse.mutate(prompt, {
      onSuccess: (res) => {
        setParsed(res);
        setPicked(new Set(Object.keys(res) as Key[]));
      },
    });

  const apply = () => {
    if (!parsed) return;
    const patch: Partial<GenerationConfig> = {};
    for (const k of changes) if (picked.has(k)) Object.assign(patch, { [k]: parsed[k] });
    onApply(patch);
    setParsed(null);
  };

  return (
    <>
      <Stack gap="xs">
        <Textarea
          placeholder='vd: "Trailer 60 giây tập trung vào cặp đôi chính, nhịp nhanh, không spoil cái kết, nhạc buồn"'
          autosize
          minRows={2}
          maxRows={5}
          value={prompt}
          onChange={(e) => onPromptChange(e.currentTarget.value)}
        />
        <Group justify="flex-end">
          <Button variant="light" color="blue" onClick={run} loading={parse.isPending} disabled={!prompt.trim()}>
            Áp vào cấu hình
          </Button>
        </Group>
      </Stack>

      <Modal opened={!!parsed} onClose={() => setParsed(null)} title="AI đọc được các tham số sau" size="lg">
        {changes.length === 0 ? (
          <Text c="gray.6" fz="sm">
            Cấu hình hiện tại đã khớp với mô tả, không có gì cần đổi.
          </Text>
        ) : (
          <Table verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={40} />
                <Table.Th>Trường</Table.Th>
                <Table.Th>Hiện tại</Table.Th>
                <Table.Th>Theo prompt</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {changes.map((k) => (
                <Table.Tr key={k}>
                  <Table.Td>
                    <Checkbox
                      checked={picked.has(k)}
                      onChange={(e) => {
                        const next = new Set(picked);
                        if (e.currentTarget.checked) next.add(k);
                        else next.delete(k);
                        setPicked(next);
                      }}
                    />
                  </Table.Td>
                  <Table.Td>{fieldName[k] ?? k}</Table.Td>
                  <Table.Td c="gray.6">{show(k, current[k])}</Table.Td>
                  <Table.Td fw={600}>{show(k, parsed?.[k])}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={() => setParsed(null)}>
            Bỏ qua
          </Button>
          <Button onClick={apply} disabled={changes.length === 0}>
            Áp dụng mục đã chọn
          </Button>
        </Group>
      </Modal>
    </>
  );
}
