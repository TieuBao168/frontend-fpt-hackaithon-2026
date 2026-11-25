import { useState } from 'react';
import { Box, Button, Card, Group, Progress, Select, Stack, Text, TextInput, UnstyledButton } from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { IconMovie, IconPlus, IconSearch, IconUpload, IconX } from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ChipGroup, EmptyState, Notice, ScreenHeader, StatusPill } from '../components/ui';
import { mmss } from '../lib/format';
import { api } from '../lib/api';
import { toast, useProject, useVods } from '../lib/queries';
import { VOD_EXT, VOD_MAX_BYTES } from '../lib/rules';
import type { Tone } from '../lib/status';
import { useApp } from '../store/app';
import { GENRES, type Genre, type Vod } from '../types/domain';

/** Chip lọc ở màn 1 (theo mockup) */
const FILTERS: { value: '' | Genre; label: string }[] = [
  { value: '', label: 'Tất cả' },
  ...(['Tâm lý', 'Hành động', 'Hài', 'Kinh dị'] as Genre[]).map((g) => ({ value: g, label: g })),
];

const durText = (v: Vod) => (v.durationSec ? mmss(v.durationSec) : '—');

function vodPill(v: Vod): { tone: Tone; label: string } {
  switch (v.status) {
    case 'ready':
      return { tone: 'ok', label: 'Sẵn sàng' };
    case 'analyzed':
      return { tone: 'ok', label: 'Đã phân tích trước' };
    case 'uploading':
      return { tone: 'hot', label: `Đang tải lên ${v.uploadPct ?? 0}%` };
    default:
      return { tone: 'bad', label: 'Lỗi định dạng' };
  }
}

/** Màn 1. Thư viện VOD (UC-A.1, A.2) */
export function LibraryScreen() {
  const [q, setQ] = useState('');
  const [genre, setGenre] = useState<'' | Genre>('');
  const { data: vods, isLoading } = useVods(q, genre);
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const current = vods?.find((v) => v.id === selected) ?? vods?.[0];
  const libraryEmpty = !isLoading && vods?.length === 0 && !q && !genre;

  return (
    <>
      <ScreenHeader title="Thư viện VOD" />
      {libraryEmpty && !adding ? (
        <EmptyState
          message="Thư viện chưa có phim nào. Tải VOD lên để bắt đầu."
          action={
            <Button leftSection={<IconPlus size={18} />} onClick={() => setAdding(true)}>
              Thêm VOD
            </Button>
          }
        />
      ) : (
        <div className="grid-2">
          <Stack gap="sm">
            <Group gap="sm" wrap="nowrap" className="stack-sm">
              <TextInput
                style={{ flex: 1 }}
                placeholder="Tìm theo tên phim"
                aria-label="Tìm theo tên phim"
                leftSection={<IconSearch size={18} />}
                value={q}
                onChange={(e) => setQ(e.currentTarget.value)}
              />
              <Button leftSection={<IconPlus size={18} />} onClick={() => setAdding(true)}>
                Thêm VOD
              </Button>
            </Group>
            <ChipGroup label="Lọc thể loại" options={FILTERS} value={genre} onChange={setGenre} />
            {vods?.length === 0 && (
              <Text c="dimmed" py="lg" ta="center">
                Không có phim phù hợp bộ lọc.
              </Text>
            )}
            <Stack gap={8}>
              {vods?.map((v) => (
                <VodRow key={v.id} vod={v} active={!adding && v.id === current?.id} onClick={() => (setSelected(v.id), setAdding(false))} />
              ))}
            </Stack>
          </Stack>
          <div className="sticky-col">
            {adding ? (
              <UploadForm
                onCancel={() => setAdding(false)}
                onDone={(id) => {
                  setAdding(false);
                  setSelected(id);
                }}
              />
            ) : current ? (
              <VodDetail vod={current} />
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}

function VodRow({ vod, active, onClick }: { vod: Vod; active: boolean; onClick: () => void }) {
  const pill = vodPill(vod);
  return (
    <UnstyledButton
      onClick={onClick}
      aria-current={active}
      p={10}
      style={{ borderRadius: 12, border: `1.5px solid ${active ? 'var(--accent)' : 'var(--line)'}`, background: active ? 'var(--accent-soft)' : 'var(--bg)' }}
    >
      <Group gap="md" wrap="nowrap">
        <Box w={96} h={54} style={{ flex: 'none', borderRadius: 8, background: 'var(--player-bg)', display: 'grid', placeItems: 'center' }} className="seg-thumb">
          <IconMovie size={22} color="#6b7280" />
        </Box>
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text fw={700} fz={16} truncate>
            {vod.title}
          </Text>
          <Text fz={13} c="dimmed" className="num">
            {vod.genre} · {durText(vod)}
          </Text>
        </Box>
        <StatusPill tone={pill.tone} label={pill.label} />
      </Group>
    </UnstyledButton>
  );
}

function VodDetail({ vod }: { vod: Vod }) {
  const navigate = useNavigate();
  const chooseVod = useApp((s) => s.chooseVod);
  const { data: project } = useProject();
  const pill = vodPill(vod);
  const blocked = vod.status === 'uploading' || vod.status === 'error'; // V18
  return (
    <Card padding={14}>
      <Box style={{ aspectRatio: '16 / 9', borderRadius: 9, background: 'var(--player-bg)', display: 'grid', placeItems: 'center' }}>
        <IconMovie size={40} color="#6b7280" />
      </Box>
      <Group justify="space-between" mt="md" gap="sm">
        <Text fw={700} fz={21}>
          {vod.title}
        </Text>
        <StatusPill tone={pill.tone} label={pill.label} />
      </Group>
      <Text c="dimmed" fz={15} className="num">
        {vod.genre} · {durText(vod)} · {vod.resolution}
      </Text>
      <Stack gap="sm" mt="md">
        {vod.status === 'analyzed' && <Notice tone="ok">Phim đã được phân tích trước: dùng lại kết quả, bỏ qua bước phân tích.</Notice>}
        {vod.status === 'uploading' && (
          <>
            <Progress value={vod.uploadPct ?? 0} color="blue" size={8} />
            <Notice>Chưa tải xong. Có thể tạo clip khi tải lên hoàn tất.</Notice>
          </>
        )}
        {vod.status === 'error' && <Notice tone="warn">{vod.errorReason ?? 'File lỗi định dạng. Hãy tải lại file khác.'}</Notice>}
        {project && project.vodId === vod.id && (
          <Notice
            action={
              <Button size="sm" variant="white" onClick={() => navigate(project.phase2Done ? '/preview' : project.phase1Done ? '/review' : '/config')}>
                Tiếp tục
              </Button>
            }
          >
            Đang có dự án với phim này.
          </Notice>
        )}
        <Button
          fullWidth
          disabled={blocked}
          onClick={() => {
            chooseVod(vod.id);
            navigate('/config');
          }}
        >
          Tạo clip từ phim này
        </Button>
      </Stack>
    </Card>
  );
}

function UploadForm({ onCancel, onDone }: { onCancel: () => void; onDone: (vodId: string) => void }) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState<Genre>('Tâm lý');
  const [reject, setReject] = useState<string>();
  const [pct, setPct] = useState<number | null>(null);
  const busy = pct !== null;

  const run = async () => {
    setPct(0);
    try {
      const vod = await api.uploadVod({ file: file!, title: title.trim(), genre }, setPct);
      toast(`Đã tải lên "${vod.title}". Đang đọc thời lượng, độ phân giải và tạo ảnh đại diện.`, 'ok');
      qc.invalidateQueries({ queryKey: ['vods'] });
      onDone(vod.id);
    } catch (e) {
      setPct(null);
      toast((e as Error).message, 'bad');
    }
  };

  return (
    <Card padding={14}>
      <Text fw={700} fz={17} mb="sm">
        Thêm VOD
      </Text>
      <Stack gap="sm">
        <Dropzone
          onDrop={(f) => {
            setReject(undefined);
            setFile(f[0]);
            if (!title) setTitle(f[0].name.replace(/\.[^.]+$/, ''));
          }}
          onReject={(r) => setReject(r[0]?.errors[0]?.code === 'file-too-large' ? 'File vượt 8 GB.' : 'Chỉ nhận MP4, MOV, MKV.')}
          maxSize={VOD_MAX_BYTES}
          maxFiles={1}
          accept={{ 'video/mp4': ['.mp4'], 'video/quicktime': ['.mov'], 'video/x-matroska': ['.mkv'] }}
          disabled={busy}
          radius={12}
        >
          <Stack align="center" gap={6} mih={120} justify="center" style={{ pointerEvents: 'none' }}>
            <Dropzone.Reject>
              <IconX size={32} color="var(--bad)" />
            </Dropzone.Reject>
            <Dropzone.Idle>
              <IconUpload size={32} color="var(--muted)" />
            </Dropzone.Idle>
            <Text fw={600} ta="center">
              {file ? file.name : 'Kéo thả file phim vào đây hoặc bấm để chọn'}
            </Text>
            <Text fz={13} c="dimmed">
              {file ? `${(file.size / 1024 ** 2).toFixed(1)} MB` : `${VOD_EXT.map((x) => x.toUpperCase()).join(', ')} · tối đa 8 GB`}
            </Text>
          </Stack>
        </Dropzone>
        {reject && <Notice tone="warn">{reject}</Notice>}
        <TextInput label="Tên phim" required value={title} onChange={(e) => setTitle(e.currentTarget.value)} disabled={busy} />
        <Select
          label="Thể loại"
          data={GENRES}
          value={genre}
          onChange={(v) => v && setGenre(v as Genre)}
          allowDeselect={false}
          disabled={busy}
        />
        {busy && (
          <Stack gap={4}>
            <Group justify="space-between">
              <Text fz={14}>Đang tải lên…</Text>
              <Text fz={14} fw={700} className="num">
                {pct}%
              </Text>
            </Group>
            <Progress value={pct} color="blue" size={8} />
          </Stack>
        )}
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onCancel} disabled={busy}>
            Hủy
          </Button>
          <Button onClick={run} loading={busy} disabled={!file || !title.trim()}>
            Lưu vào thư viện
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
