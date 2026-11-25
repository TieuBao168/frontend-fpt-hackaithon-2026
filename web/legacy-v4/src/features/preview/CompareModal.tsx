import { useEffect, useMemo, useState } from 'react';
import { ActionIcon, Group, Modal, Select, SimpleGrid, Slider, Stack, Text } from '@mantine/core';
import { IconPlayerPauseFilled, IconPlayerPlayFilled } from '@tabler/icons-react';
import { phaseLabel, styleLabel } from '../../lib/labels';
import type { Project, Revision, Variant } from '../../types/domain';
import { createClock, useClock } from './clock';
import { PreviewStage } from './PreviewStage';
import { buildTimeline } from './timeline';
import { useViewPrefs } from './stores';

interface Props {
  opened: boolean;
  onClose: () => void;
  project: Project;
  initialA: string;
}

type Item = { variant: Variant; rev: Revision; vi: number };

/** So sánh A/B hai phiên bản (hoặc hai phương án) với đồng hồ chung. */
export function CompareModal({ opened, onClose, project, initialA }: Props) {
  const items: Item[] = useMemo(
    () => project.variants.flatMap((variant, vi) => variant.revisions.map((rev) => ({ variant, rev, vi }))),
    [project],
  );
  const label = (it: Item) =>
    `${project.variants.length > 1 ? `PA${it.vi + 1} ${styleLabel[it.variant.style]} · ` : ''}v${it.rev.no} · ${phaseLabel[it.rev.phase]}`;
  const options = items.map((it) => ({ value: it.rev.id, label: label(it) }));
  const [a, setA] = useState(initialA);
  const [b, setB] = useState(() => items.find((it) => it.rev.id !== initialA)?.rev.id ?? initialA);

  const A = items.find((it) => it.rev.id === a) ?? items[0];
  const B = items.find((it) => it.rev.id === b) ?? items[0];
  const tlA = useMemo(() => buildTimeline(A.rev.segments, A.rev.visual), [A]);
  const tlB = useMemo(() => buildTimeline(B.rev.segments, B.rev.visual), [B]);
  const clock = useMemo(() => createClock(1), []);
  const total = Math.max(tlA.totalMs, tlB.totalMs);
  useEffect(() => clock.getState().setDuration(total), [clock, total]);
  useEffect(() => {
    if (!opened) clock.getState().pause();
  }, [opened, clock]);

  const playing = useClock(clock, (s) => s.playing);
  const t = useClock(clock, (s) => Math.floor(s.timeMs / 100) * 100);
  const { platformFrame, safeZone } = useViewPrefs();

  const stage = (it: Item, tl: typeof tlA, badge: string) => (
    <PreviewStage
      clock={clock}
      timeline={tl}
      ratio={it.variant.ratio}
      visual={it.rev.visual}
      subtitle={it.rev.audio?.subtitle}
      cues={it.rev.audio?.subtitleCues}
      vodTitle={project.vodTitle}
      platformFrame={platformFrame}
      safeZone={safeZone}
      badge={badge}
      maxWidth={it.variant.ratio === '9:16' ? 300 : undefined}
    />
  );

  return (
    <Modal opened={opened} onClose={onClose} size="90%" title={<Text fw={600}>So sánh A/B</Text>}>
      <Stack gap="md">
        <SimpleGrid cols={2}>
          <Select label="Bản A" data={options} value={a} onChange={(v) => v && setA(v)} allowDeselect={false} />
          <Select label="Bản B" data={options} value={b} onChange={(v) => v && setB(v)} allowDeselect={false} />
        </SimpleGrid>
        <SimpleGrid cols={2}>
          <Stack gap={4}>
            {stage(A, tlA, 'A')}
            <Text fz="xs" c="gray.6" ta="center">
              {A.rev.segments.length} đoạn · {A.rev.changeSummary ?? 'Bản đầu tiên'}
            </Text>
          </Stack>
          <Stack gap={4}>
            {stage(B, tlB, 'B')}
            <Text fz="xs" c="gray.6" ta="center">
              {B.rev.segments.length} đoạn · {B.rev.changeSummary ?? 'Bản đầu tiên'}
            </Text>
          </Stack>
        </SimpleGrid>
        <Group wrap="nowrap">
          <ActionIcon radius="xl" size="lg" onClick={() => clock.getState().toggle()} aria-label={playing ? 'Tạm dừng' : 'Phát'}>
            {playing ? <IconPlayerPauseFilled size={18} /> : <IconPlayerPlayFilled size={18} />}
          </ActionIcon>
          <Slider
            style={{ flex: 1 }}
            min={0}
            max={total}
            step={100}
            value={t}
            onChange={(v) => clock.getState().seek(v)}
            label={(v) => `${(v / 1000).toFixed(1)}s`}
          />
        </Group>
      </Stack>
    </Modal>
  );
}
