import { ActionIcon, Badge, Box, Card, Group, HoverCard, Progress, Stack, Text, Tooltip } from '@mantine/core';
import { IconZoomScan } from '@tabler/icons-react';
import { AiTag, ScorePill, Timecode } from '../../components/common';
import { actLabel } from '../../lib/labels';
import { formatDuration } from '../../lib/time';
import type { Segment } from '../../types/domain';

interface Props {
  segments: Segment[];
  currentIndex: number;
  onSelect: (index: number) => void;
  onContext?: (index: number) => void;
}

/** Danh sách đoạn AI chọn – chỉ đọc. Bấm để xem đoạn trên preview. */
export function Storyboard({ segments, currentIndex, onSelect, onContext }: Props) {
  return (
    <Stack gap="xs">
      {segments.map((s, i) => {
        const selected = i === currentIndex;
        return (
          <Card
            key={s.id}
            padding="sm"
            onClick={() => onSelect(i)}
            style={{
              cursor: 'pointer',
              borderColor: selected ? 'var(--mantine-color-orange-6)' : undefined,
              boxShadow: selected ? '0 0 0 1px var(--mantine-color-orange-6)' : undefined,
            }}
          >
            <Group gap="sm" wrap="nowrap" align="flex-start">
              <Stack w={64} h={44} bg="var(--player-bg)" justify="center" align="center" style={{ borderRadius: 4, flexShrink: 0 }}>
                <Text c="gray.4" fw={600} className="mono">
                  {String(i + 1).padStart(2, '0')}
                </Text>
              </Stack>
              <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                <Group gap={6} justify="space-between" wrap="nowrap">
                  <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
                    <AiTag />
                    <Badge color="gray" size="xs" variant="outline">
                      {actLabel[s.act]}
                    </Badge>
                    <Text fz="xs" truncate>
                      <Timecode ms={s.startMs} /> → <Timecode ms={s.endMs} />
                    </Text>
                  </Group>
                  <Group gap={4} wrap="nowrap">
                    {onContext && (
                      <Tooltip label="Xem trong ngữ cảnh gốc">
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color="blue"
                          aria-label="Xem trong ngữ cảnh gốc"
                          onClick={(e) => {
                            e.stopPropagation();
                            onContext(i);
                          }}
                        >
                          <IconZoomScan size={14} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                    <HoverCard width={220} position="left" withArrow shadow="sm">
                      <HoverCard.Target>
                        <Box>
                          <ScorePill score={s.score} />
                        </Box>
                      </HoverCard.Target>
                      <HoverCard.Dropdown>
                        <Text fz="xs" fw={600} mb={6}>
                          Điểm theo tín hiệu
                        </Text>
                        <Stack gap={6}>
                          {(s.signals ?? []).map((sig) => (
                            <div key={sig.name}>
                              <Group justify="space-between">
                                <Text fz="xs">{sig.name}</Text>
                                <Text fz="xs" className="mono">
                                  {sig.score.toFixed(2)}
                                </Text>
                              </Group>
                              <Progress value={sig.score * 100} size="xs" color="blue" />
                            </div>
                          ))}
                        </Stack>
                      </HoverCard.Dropdown>
                    </HoverCard>
                  </Group>
                </Group>
                <Text fz="sm" lineClamp={2}>
                  {s.reason}
                </Text>
                <Group gap={4}>
                  {s.labels.map((l) => (
                    <Badge key={l} color="orange" size="xs">
                      {l}
                    </Badge>
                  ))}
                  <Text fz="xs" c="gray.6" ml="auto" className="mono">
                    {formatDuration((s.endMs - s.startMs) / 1000)}
                  </Text>
                </Group>
              </Stack>
            </Group>
          </Card>
        );
      })}
    </Stack>
  );
}
