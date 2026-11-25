import { useState } from 'react';
import { Button, Group, Modal, Progress, Select, Stack, Tabs, Text, TextInput } from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { IconFileUpload, IconLink, IconMovie, IconX } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useAddVod } from '../../lib/queries';
import { genreLabel } from '../../lib/labels';
import type { FilmGenre } from '../../types/domain';

const MAX_BYTES = 20 * 1024 ** 3; // 20 GB

/** UC-A.1: thêm VOD bằng upload (có tiến độ) hoặc dán link. */
export function AddVodModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const add = useAddVod();
  const [tab, setTab] = useState<string | null>('file');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState<FilmGenre>('other');
  const [progress, setProgress] = useState<number | null>(null);
  const [rejectMsg, setRejectMsg] = useState<string>();

  const reset = () => {
    setFile(null);
    setUrl('');
    setTitle('');
    setGenre('other');
    setProgress(null);
    setRejectMsg(undefined);
  };
  const close = () => {
    if (add.isPending) return;
    reset();
    onClose();
  };

  const canSubmit = title.trim() && (tab === 'file' ? !!file : /^https?:\/\//i.test(url.trim()));

  const submit = () => {
    const meta = { title: title.trim(), genre };
    const done = {
      onSuccess: () => {
        notifications.show({ color: 'green', message: `Đã thêm "${meta.title}". Hệ thống đang đọc metadata và tạo thumbnail.` });
        reset();
        onClose();
      },
    };
    if (tab === 'file' && file) {
      setProgress(0);
      add.mutate({ kind: 'file', file, meta, onProgress: setProgress }, { ...done, onError: () => setProgress(null) });
    } else {
      add.mutate({ kind: 'link', url: url.trim(), meta }, done);
    }
  };

  return (
    <Modal opened={opened} onClose={close} title={<Text fw={600}>Thêm VOD</Text>} size="lg">
      <Stack gap="md">
        <Tabs value={tab} onChange={setTab}>
          <Tabs.List grow>
            <Tabs.Tab value="file" leftSection={<IconFileUpload size={16} />}>
              Tải file lên
            </Tabs.Tab>
            <Tabs.Tab value="link" leftSection={<IconLink size={16} />}>
              Dán link
            </Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="file" pt="md">
            <Dropzone
              onDrop={(files) => {
                setRejectMsg(undefined);
                setFile(files[0]);
                if (!title) setTitle(files[0].name.replace(/\.[^.]+$/, ''));
              }}
              onReject={(r) =>
                setRejectMsg(r[0]?.errors[0]?.code === 'file-too-large' ? 'File vượt 20 GB – hãy dùng link.' : 'File không phải video (MP4, MOV, MKV).')
              }
              maxSize={MAX_BYTES}
              maxFiles={1}
              accept={{ 'video/*': ['.mp4', '.mov', '.mkv', '.webm'] }}
              disabled={add.isPending}
            >
              <Group justify="center" gap="md" mih={110} style={{ pointerEvents: 'none' }}>
                <Dropzone.Accept>
                  <IconFileUpload size={36} color="var(--mantine-color-orange-6)" />
                </Dropzone.Accept>
                <Dropzone.Reject>
                  <IconX size={36} color="var(--mantine-color-red-6)" />
                </Dropzone.Reject>
                <Dropzone.Idle>
                  <IconMovie size={36} color="var(--mantine-color-gray-5)" />
                </Dropzone.Idle>
                <div>
                  <Text fw={500}>{file ? file.name : 'Kéo thả file phim vào đây hoặc bấm để chọn'}</Text>
                  <Text fz="xs" c="gray.6">
                    {file ? `${(file.size / 1024 ** 2).toFixed(1)} MB` : 'MP4, MOV, MKV · tối đa 20 GB'}
                  </Text>
                </div>
              </Group>
            </Dropzone>
            {rejectMsg && (
              <Text fz="xs" c="red.7" mt={4}>
                {rejectMsg}
              </Text>
            )}
            {progress !== null && (
              <Stack gap={2} mt="sm">
                <Group justify="space-between">
                  <Text fz="xs">Đang tải lên…</Text>
                  <Text fz="xs" className="mono">
                    {progress}%
                  </Text>
                </Group>
                <Progress value={progress} color="blue" animated />
              </Stack>
            )}
          </Tabs.Panel>
          <Tabs.Panel value="link" pt="md">
            <TextInput
              label="Link VOD"
              placeholder="https://…"
              value={url}
              onChange={(e) => setUrl(e.currentTarget.value)}
              error={url && !/^https?:\/\//i.test(url) ? 'Link phải bắt đầu bằng http:// hoặc https://' : undefined}
            />
          </Tabs.Panel>
        </Tabs>
        <Group grow>
          <TextInput label="Tên phim" required value={title} onChange={(e) => setTitle(e.currentTarget.value)} />
          <Select
            label="Thể loại"
            data={Object.entries(genreLabel).map(([value, label]) => ({ value, label }))}
            value={genre}
            onChange={(v) => v && setGenre(v as FilmGenre)}
            allowDeselect={false}
          />
        </Group>
        <Group justify="flex-end">
          <Button variant="default" onClick={close} disabled={add.isPending}>
            Hủy
          </Button>
          <Button onClick={submit} loading={add.isPending} disabled={!canSubmit}>
            Thêm VOD
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
