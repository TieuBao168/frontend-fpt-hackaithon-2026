import { useMemo, useState } from 'react';
import { Badge, Button, Card, Group, Loader, SegmentedControl, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import { IconMovie, IconPlus, IconSearch } from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { useVods } from '../lib/queries';
import { genreLabel } from '../lib/labels';
import { formatDuration } from '../lib/time';
import { EmptyState, ErrorBlock, LoadingBlock, PageHeader } from '../components/common';
import { AddVodModal } from '../features/library/AddVodModal';
import type { FilmGenre, Vod } from '../types/domain';

export function LibraryPage() {
  const { data, isLoading, error, refetch } = useVods();
  const [q, setQ] = useState('');
  const [genre, setGenre] = useState<'all' | FilmGenre>('all');
  const [adding, setAdding] = useState(false);

  const items = useMemo(
    () => (data ?? []).filter((v) => (genre === 'all' || v.genre === genre) && v.title.toLowerCase().includes(q.trim().toLowerCase())),
    [data, q, genre],
  );

  return (
    <>
      <PageHeader
        title="Thư viện VOD"
        subtitle="Chọn một phim để tạo highlight/trailer."
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={() => setAdding(true)}>
            Thêm VOD
          </Button>
        }
      />

      <Group mb="md" gap="sm" wrap="wrap">
        <TextInput placeholder="Tìm theo tên phim" leftSection={<IconSearch size={16} />} value={q} onChange={(e) => setQ(e.currentTarget.value)} w={280} />
        <SegmentedControl
          value={genre}
          onChange={(v) => setGenre(v as typeof genre)}
          data={[{ value: 'all', label: 'Tất cả' }, ...Object.entries(genreLabel).map(([value, label]) => ({ value, label }))]}
        />
      </Group>

      {isLoading && <LoadingBlock />}
      {error && <ErrorBlock error={error} onRetry={refetch} />}
      {data && items.length === 0 && (
        <EmptyState
          title={data.length === 0 ? 'Thư viện đang trống' : 'Không có phim phù hợp'}
          description={data.length === 0 ? 'Thêm VOD bằng cách upload file hoặc dán link do BTC cung cấp.' : 'Thử đổi từ khóa hoặc thể loại.'}
          action={data.length === 0 ? <Button onClick={() => setAdding(true)}>Thêm VOD</Button> : undefined}
        />
      )}

      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
        {items.map((v) => (
          <VodCard key={v.id} vod={v} />
        ))}
      </SimpleGrid>

      <AddVodModal opened={adding} onClose={() => setAdding(false)} />
    </>
  );
}

function VodCard({ vod }: { vod: Vod }) {
  const navigate = useNavigate();
  const processing = vod.status === 'uploading' || vod.status === 'processing';
  return (
    <Card>
      <Card.Section>
        <Stack h={150} bg="var(--player-bg)" align="center" justify="center" gap={6} pos="relative">
          {processing ? <Loader color="blue" size="sm" /> : <IconMovie size={32} color="#5b6170" stroke={1.5} />}
          {processing && (
            <Text c="gray.4" fz="xs">
              Đang đọc metadata, tạo thumbnail…
            </Text>
          )}
          <Text pos="absolute" bottom={8} right={10} c="gray.3" className="mono">
            {formatDuration(vod.durationSec)}
          </Text>
        </Stack>
      </Card.Section>
      <Stack gap={6} mt="sm">
        <Group justify="space-between" wrap="nowrap">
          <Text fw={600} lineClamp={1}>
            {vod.title}
          </Text>
          <Badge color="gray">{genreLabel[vod.genre]}</Badge>
        </Group>
        <Group gap="xs">
          <Text fz="xs" c="gray.6">
            {vod.resolution}
          </Text>
          {vod.analyzed && (
            <Badge color="green" size="xs">
              Đã phân tích
            </Badge>
          )}
          {processing && (
            <Badge color="blue" size="xs">
              Đang xử lý
            </Badge>
          )}
          {vod.status === 'error' && (
            <Badge color="red" size="xs">
              Lỗi file
            </Badge>
          )}
        </Group>
        <Button mt={4} fullWidth disabled={vod.status !== 'ready'} onClick={() => navigate(`/vods/${vod.id}/configure`)}>
          Tạo clip
        </Button>
      </Stack>
    </Card>
  );
}
