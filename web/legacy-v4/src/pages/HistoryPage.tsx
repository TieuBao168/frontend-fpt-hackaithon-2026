import { useState } from 'react';
import { Badge, Button, Card, Group, SegmentedControl, Stack, Text, Timeline } from '@mantine/core';
import { useNavigate, useParams } from 'react-router';
import { useProject, useRestoreRevision } from '../lib/queries';
import { phaseLabel, scopeLabel, styleLabel } from '../lib/labels';
import { formatDateTime, formatDuration, segmentsDurationSec } from '../lib/time';
import { AiTag, ErrorBlock, LoadingBlock, PageHeader } from '../components/common';

/** UC-I.1, I.2: chuỗi lần điều chỉnh → phiên bản. Cũng là bằng chứng AI chọn mọi đoạn. */
export function HistoryPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { data: project, isLoading, error } = useProject(projectId);
  const restore = useRestoreRevision();
  const [variantId, setVariantId] = useState<string>();

  if (isLoading) return <LoadingBlock />;
  if (error) return <ErrorBlock error={error} />;
  if (!project) return null;

  const variant = project.variants.find((v) => v.id === variantId) ?? project.variants.find((v) => v.isPrimary) ?? project.variants[0];
  const revisions = [...variant.revisions].reverse();
  const busy = ['analyzing', 'rendering', 'exporting'].includes(project.status);

  return (
    <>
      <PageHeader
        title={`Lịch sử phiên bản · ${project.vodTitle}`}
        subtitle="Mỗi lần điều chỉnh hoặc áp dụng tùy chỉnh tạo một phiên bản mới; khôi phục không xóa các phiên bản sau."
        actions={
          <Button variant="default" onClick={() => navigate(`/projects/${project.id}`)}>
            Về dự án
          </Button>
        }
      />
      {project.variants.length > 1 && (
        <SegmentedControl
          mb="lg"
          value={variant.id}
          onChange={setVariantId}
          data={project.variants.map((v, i) => ({ value: v.id, label: `Phương án ${i + 1} · ${styleLabel[v.style]}${v.isPrimary ? ' ★' : ''}` }))}
        />
      )}
      <Card maw={780}>
        <Timeline active={0} bulletSize={22} lineWidth={2} color="blue">
          {revisions.map((r) => {
            const active = r.id === variant.activeRevisionId;
            return (
              <Timeline.Item
                key={r.id}
                color={r.exported ? 'green' : r.phase === 'audio' ? 'blue' : 'gray'}
                title={
                  <Group gap="xs">
                    <Text fw={600}>v{r.no}</Text>
                    <Badge color={r.phase === 'audio' ? 'blue' : 'gray'} variant="light">
                      {phaseLabel[r.phase]}
                    </Badge>
                    {active && <Badge color="orange">Hiện hành</Badge>}
                    {variant.lockedRevisionId === r.id && <Badge color="green" variant="light">Video đã chốt</Badge>}
                    {r.exported && <Badge color="green">Đã xuất</Badge>}
                    <Text fz="xs" c="gray.6">
                      {formatDateTime(r.createdAt)}
                    </Text>
                  </Group>
                }
              >
                <Stack gap={4} mt={4}>
                  {r.no === 1 && !r.restoredFrom && (
                    <Group gap={6}>
                      <AiTag />
                      <Text fz="sm">AI đề xuất từ cấu hình ban đầu{project.config.prompt ? ` · “${project.config.prompt}”` : ''}</Text>
                    </Group>
                  )}
                  {r.adjustment && (
                    <Text fz="sm">
                      {scopeLabel[r.adjustment.scope]}
                      {r.adjustment.prompt && <>: “{r.adjustment.prompt}”</>}
                      {Object.keys(r.adjustment.configDiff).length > 0 && (
                        <Text span c="gray.6">
                          {' '}
                          · đổi {Object.keys(r.adjustment.configDiff).join(', ')}
                        </Text>
                      )}
                    </Text>
                  )}
                  {r.changeSummary && (
                    <Text fz="sm" c="blue.7">
                      {r.changeSummary}
                    </Text>
                  )}
                  <Text fz="xs" c="gray.6">
                    {r.segments.length} đoạn AI · {formatDuration(segmentsDurationSec(r.segments))}
                    {r.audio && ` · ${r.audio.subtitleCues.length} câu phụ đề · ${r.audio.musicTracks.length} bản nhạc`}
                  </Text>
                  <Group gap="xs" mt={4}>
                    <Button size="xs" variant="default" onClick={() => navigate(`/projects/${project.id}?rev=${r.id}`)}>
                      Xem
                    </Button>
                    {!active && (
                      <Button
                        size="xs"
                        variant="light"
                        disabled={busy}
                        loading={restore.isPending && restore.variables?.revisionId === r.id}
                        onClick={() =>
                          restore.mutate({ projectId: project.id, variantId: variant.id, revisionId: r.id }, { onSuccess: () => navigate(`/projects/${project.id}`) })
                        }
                      >
                        Khôi phục
                      </Button>
                    )}
                  </Group>
                </Stack>
              </Timeline.Item>
            );
          })}
        </Timeline>
      </Card>
    </>
  );
}
