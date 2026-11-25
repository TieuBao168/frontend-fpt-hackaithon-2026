import { useEffect, useState } from 'react';
import { Box, Button, Card, Checkbox, Group, Slider, Stack, Tabs, Text, TextInput } from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { IconUpload } from '@tabler/icons-react';
import { TemplateThumb } from '../components/inputs';
import { EmptyState, Notice, ScreenHeader, StatusPill } from '../components/ui';
import { api } from '../lib/api';
import { toast, useTemplateAction, useTemplates } from '../lib/queries';
import { RESOLUTION, TEMPLATE_RULES } from '../lib/rules';
import type { Ratio, Template } from '../types/domain';

type Kind = 'intro' | 'outro';
const kindName: Record<Kind, string> = { intro: 'đầu clip', outro: 'cuối clip' };

/** Màn 2. Template đầu/cuối (UC-J.1) – màn của vận hành, làm một lần */
export function TemplatesScreen() {
  const { data: list } = useTemplates();
  const [tab, setTab] = useState<Kind>('intro');
  const tabLabel = (k: Kind) => {
    const items = (list ?? []).filter((t) => t.type === k);
    const def = items.find((t) => t.isDefault);
    return `${k === 'intro' ? 'Đầu clip' : 'Cuối clip'} (${items.length}${def ? ` · mặc định ${def.durationSec}s` : ''})`;
  };
  return (
    <>
      <ScreenHeader title="Template đầu/cuối" />
      <Text c="dimmed" mb="md" maw={760}>
        Khi dựng, hệ thống tự chèn template mặc định đang bật, đúng tỉ lệ, vào đầu và cuối mọi clip.
      </Text>
      <Tabs value={tab} onChange={(v) => setTab(v as Kind)} keepMounted={false}>
        <Tabs.List mb="md">
          <Tabs.Tab value="intro" fz={16}>
            {tabLabel('intro')}
          </Tabs.Tab>
          <Tabs.Tab value="outro" fz={16}>
            {tabLabel('outro')}
          </Tabs.Tab>
        </Tabs.List>
        {(['intro', 'outro'] as Kind[]).map((k) => (
          <Tabs.Panel key={k} value={k}>
            <TemplateTab kind={k} items={(list ?? []).filter((t) => t.type === k)} />
          </Tabs.Panel>
        ))}
      </Tabs>
    </>
  );
}

function TemplateTab({ kind, items }: { kind: Kind; items: Template[] }) {
  return (
    <div className="grid-2 grid-2-even">
      <Stack gap={8}>
        {items.length === 0 ? (
          <EmptyState message={`Chưa có template ${kindName[kind]} nào. Clip sẽ không có ${kindName[kind]} cho tới khi thêm.`} />
        ) : (
          items.map((t) => <TemplateRow key={t.id} t={t} />)
        )}
      </Stack>
      <div>
        <AddTemplateForm kind={kind} />
      </div>
    </div>
  );
}

function TemplateRow({ t }: { t: Template }) {
  const patch = useTemplateAction((b: { enabled?: boolean; isDefault?: boolean }) => api.patchTemplate(t.id, b));
  const del = useTemplateAction(() => api.deleteTemplate(t.id));
  const [confirmDel, setConfirmDel] = useState(false);
  useEffect(() => {
    if (!confirmDel) return;
    const h = setTimeout(() => setConfirmDel(false), 3000);
    return () => clearTimeout(h);
  }, [confirmDel]);
  const onErr = { onError: (e: Error) => toast(e.message, 'bad') };
  return (
    <Card padding={12}>
      <Group gap="md" wrap="nowrap" align="flex-start">
        <Box w={112} style={{ flex: 'none' }} className="seg-thumb">
          <TemplateThumb template={t} />
        </Box>
        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          <Group gap={8}>
            <Text fw={700} fz={16}>
              {t.name}
            </Text>
            {t.isDefault && <StatusPill tone="ok" label="Mặc định" />}
          </Group>
          <Text fz={13} c="dimmed">
            {t.durationSec} giây · {t.ratios.join(', ')} · {t.format}
          </Text>
          <Group gap="sm" mt={4} wrap="wrap">
            <Checkbox label="Đang bật" checked={t.enabled} onChange={(e) => patch.mutate({ enabled: e.currentTarget.checked }, onErr)} />
            <Button size="sm" variant="default" disabled={t.isDefault || !t.enabled} loading={patch.isPending} onClick={() => patch.mutate({ isDefault: true }, onErr)}>
              Đặt làm mặc định
            </Button>
            <Button
              size="sm"
              variant={confirmDel ? 'filled' : 'default'}
              color="red"
              loading={del.isPending}
              onClick={() => (confirmDel ? del.mutate(undefined, onErr) : setConfirmDel(true))}
            >
              {confirmDel ? 'Bấm lần nữa để xóa' : 'Xóa'}
            </Button>
          </Group>
        </Stack>
      </Group>
    </Card>
  );
}

interface FileInfo {
  file: File;
  isVideo: boolean;
  width: number;
  height: number;
  duration?: number;
}

/** Đọc kích thước (và thời lượng với video) ngay trên trình duyệt để kiểm tra V3 */
function readFileInfo(file: File): Promise<FileInfo> {
  const url = URL.createObjectURL(file);
  const isVideo = file.type.startsWith('video/');
  return new Promise((resolve) => {
    if (isVideo) {
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = () => resolve({ file, isVideo, width: v.videoWidth, height: v.videoHeight, duration: v.duration });
      v.onerror = () => resolve({ file, isVideo, width: 0, height: 0, duration: 0 });
      v.src = url;
    } else {
      const img = new Image();
      img.onload = () => resolve({ file, isVideo, width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ file, isVideo, width: 0, height: 0 });
      img.src = url;
    }
  });
}

function AddTemplateForm({ kind }: { kind: Kind }) {
  const [info, setInfo] = useState<FileInfo | null>(null);
  const [name, setName] = useState('');
  const [ratios, setRatios] = useState<Ratio[]>(['16:9']);
  const [dur, setDur] = useState<number>(TEMPLATE_RULES.defaultSec);
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState<string | null>(null);
  const save = useTemplateAction((form: FormData) => api.addTemplate(form));

  const duration = info?.isVideo ? Math.round((info.duration ?? 0) * 10) / 10 : dur;

  const validate = (): string[] => {
    const e: string[] = [];
    if (!info) e.push('Chưa chọn file.');
    if (!name.trim()) e.push('Thiếu tên template.');
    if (!ratios.length) e.push('Chưa chọn tỉ lệ.');
    if (info) {
      if (info.file.size > TEMPLATE_RULES.maxBytes) e.push('File lớn hơn 50 MB.');
      if (info.isVideo && (duration < TEMPLATE_RULES.minSec || duration > TEMPLATE_RULES.maxSec)) e.push(`Video dài ${duration} giây, ngoài khoảng 1 đến 5 giây.`);
      if (ratios.length && !ratios.some((r) => RESOLUTION[r].w === info.width && RESOLUTION[r].h === info.height)) {
        const r = ratios[0];
        e.push(`File ${info.width}x${info.height} không đúng ${RESOLUTION[r].w}x${RESOLUTION[r].h} của khung ${r}.`);
      }
    }
    return e;
  };

  const submit = () => {
    const e = validate();
    setErrors(e);
    setSaved(null);
    if (e.length || !info) return;
    const f = new FormData();
    f.append('file', info.file);
    f.append('name', name.trim());
    f.append('type', kind);
    f.append('ratios', JSON.stringify(ratios));
    f.append('durationSec', String(duration));
    f.append('format', info.file.name.split('.').pop()!.toUpperCase());
    f.append('width', String(info.width));
    f.append('height', String(info.height));
    save.mutate(f, {
      onSuccess: () => {
        setSaved(`Đã lưu template "${name.trim()}".`);
        setInfo(null);
        setName('');
      },
      onError: (err) => setErrors([(err as Error).message]),
    });
  };

  return (
    <Card padding={14}>
      <Text fw={700} fz={17} mb="sm">
        Thêm template {kindName[kind]}
      </Text>
      <Stack gap="sm">
        <Dropzone
          onDrop={async (f) => {
            setErrors([]);
            setSaved(null);
            const i = await readFileInfo(f[0]);
            setInfo(i);
            if (!name) setName(f[0].name.replace(/\.[^.]+$/, ''));
          }}
          maxFiles={1}
          accept={{ 'video/mp4': ['.mp4'], 'video/quicktime': ['.mov'], 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] }}
          radius={12}
        >
          <Stack align="center" gap={4} mih={90} justify="center" style={{ pointerEvents: 'none' }}>
            <IconUpload size={28} color="var(--muted)" />
            <Text fw={600} ta="center">
              {info ? info.file.name : 'Kéo thả MP4, MOV, PNG hoặc JPG'}
            </Text>
            <Text fz={13} c="dimmed">
              {info ? `${info.width}×${info.height}${info.isVideo ? ` · ${duration} giây` : ''} · ${(info.file.size / 1024 ** 2).toFixed(1)} MB` : 'Tối đa 50 MB · 1920×1080 (16:9) hoặc 1080×1920 (9:16)'}
            </Text>
          </Stack>
        </Dropzone>
        <TextInput label="Tên" value={name} onChange={(e) => setName(e.currentTarget.value)} />
        <Group gap="lg">
          {(['16:9', '9:16'] as Ratio[]).map((r) => (
            <Checkbox
              key={r}
              label={`Khung ${r}`}
              checked={ratios.includes(r)}
              onChange={(e) => {
                const on = e.currentTarget.checked;
                setRatios((s) => (on ? [...s, r] : s.filter((x) => x !== r)));
              }}
            />
          ))}
        </Group>
        {ratios.length === 2 && (
          <Text fz={13} c="dimmed">
            File cần đúng một trong hai khung; khung còn lại hệ thống tự thêm nền.
          </Text>
        )}
        <Box>
          <Text fz={15} fw={600} mb={4}>
            Thời lượng: {duration} giây {info?.isVideo && '(theo file video)'}
          </Text>
          <Slider
            min={TEMPLATE_RULES.minSec}
            max={TEMPLATE_RULES.maxSec}
            step={0.5}
            value={dur}
            onChange={setDur}
            disabled={info?.isVideo}
            marks={[1, 2, 3, 4, 5].map((v) => ({ value: v, label: `${v}s` }))}
            mb="lg"
            aria-label="Thời lượng template"
          />
        </Box>
        {errors.map((e) => (
          <Notice key={e} tone="warn">
            {e}
          </Notice>
        ))}
        {saved && <Notice tone="ok">{saved}</Notice>}
        <Group justify="flex-end">
          <Button onClick={submit} loading={save.isPending}>
            Lưu
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
