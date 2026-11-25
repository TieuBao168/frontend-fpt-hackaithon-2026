import { useState } from 'react';
import { Box, Button, Card, Checkbox, Select, Slider, Stack, Text, Title } from '@mantine/core';
import { IconSparkles } from '@tabler/icons-react';
import { Phase2Gate } from '../components/Gate';
import { VariantTabs } from '../components/inputs';
import { WaveformCard } from '../components/media';
import { Notice, ScreenHeader } from '../components/ui';
import { api } from '../lib/api';
import { useProjectAction } from '../lib/queries';
import { useApp } from '../store/app';
import type { Project } from '../types/domain';

const MOODS = ['Hùng tráng, sâu lắng', 'Căng thẳng, kịch tính', 'Buồn, da diết', 'Vui tươi, tinh nghịch', 'Dồn dập, mạnh mẽ', 'Bí ẩn, rùng rợn'];
const INSTRUMENTS = ['Dàn dây, piano', 'Dàn dây, trống trầm', 'Piano solo', 'Ukulele, bộ gõ', 'Trống điện tử, synth', 'Guitar mộc'];

/** Màn 5. Nhạc AI (UC-D.2) */
export function MusicScreen() {
  return <Phase2Gate header={<ScreenHeader title="Nhạc AI" />}>{(p) => <MusicBody p={p} />}</Phase2Gate>;
}

function MusicBody({ p }: { p: Project }) {
  const { activeVariant, setActiveVariant } = useApp();
  const v = p.variants.find((x) => x.key === activeVariant) ?? p.variants[0];
  const selected = v.music?.find((t) => t.id === v.selectedMusicId) ?? v.music?.[0];
  const [mood, setMood] = useState<string | null>(selected?.mood ?? MOODS[0]);
  const [bpm, setBpm] = useState(selected?.bpm ?? 96);
  const [inst, setInst] = useState<string | null>(selected?.instruments ?? INSTRUMENTS[0]);
  const [vol, setVol] = useState(p.musicVolumePct);
  const patch = useProjectAction((b: Parameters<typeof api.patchProject>[1]) => api.patchProject(p.id, b));
  const gen = useProjectAction(() => api.newMusic(p.id, v.key, { mood: mood ?? undefined, bpm, instruments: inst ?? undefined }), 'Đã tạo bản nhạc mới.');

  return (
    <>
      <VariantTabs project={p} active={v.key} onChange={setActiveVariant} />
      <div className="grid-2">
        <Stack gap="sm" role="radiogroup" aria-label="Bản nhạc">
          {v.music?.map((t) => (
            <WaveformCard key={t.id} track={t} selected={t.id === selected?.id} onSelect={() => patch.mutate({ selectedMusic: { variant: v.key, id: t.id } })} />
          ))}
          <Text fz={14} c="dimmed">
            Prompt, tham số và mã bản tạo được lưu làm bằng chứng nhạc do AI tạo
            {selected && ` (bản đang dùng: ${selected.tool} · ${selected.model} · seed ${selected.seed})`}. Vạch đỏ trên dạng sóng là điểm cao trào.
          </Text>
        </Stack>
        <Card padding={14} className="sticky-col">
          <Title order={3} fz={17} mb="sm">
            Chỉnh và tạo lại
          </Title>
          <Stack gap="md">
            <Select label="Cảm xúc" data={MOODS} value={mood} onChange={setMood} allowDeselect={false} />
            <Box>
              <Text fz={15} fw={600}>
                Tempo: {bpm} BPM
              </Text>
              <Slider min={60} max={160} step={2} value={bpm} onChange={setBpm} aria-label="Tempo" marks={[{ value: 60, label: '60' }, { value: 160, label: '160' }]} mb="md" />
            </Box>
            <Select label="Nhạc cụ" data={INSTRUMENTS} value={inst} onChange={setInst} allowDeselect={false} />
            <Button leftSection={<IconSparkles size={18} />} onClick={() => gen.mutate()} loading={gen.isPending}>
              Tạo bản mới
            </Button>
            <Box pt="sm" style={{ borderTop: '1px solid var(--line)' }}>
              <Text fz={15} fw={600}>
                Âm lượng nhạc so với tiếng phim: {vol}%
              </Text>
              <Slider min={0} max={100} value={vol} onChange={setVol} onChangeEnd={(x) => patch.mutate({ musicVolumePct: x })} aria-label="Âm lượng nhạc" mb="sm" />
            </Box>
            <Checkbox label="Tự hạ nhạc khi có thoại hoặc lời dẫn (ducking)" checked={p.ducking} onChange={(e) => patch.mutate({ ducking: e.currentTarget.checked })} />
            <Notice>Không có nút tải nhạc lên: đề yêu cầu nhạc do AI tạo mới, không dùng nhạc trending hay nhạc có sẵn.</Notice>
          </Stack>
        </Card>
      </div>
    </>
  );
}
