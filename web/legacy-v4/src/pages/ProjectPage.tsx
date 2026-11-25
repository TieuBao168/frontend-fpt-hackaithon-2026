import { Button } from '@mantine/core';
import { IconHistory, IconSend } from '@tabler/icons-react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { useProject } from '../lib/queries';
import { goalLabel } from '../lib/labels';
import { formatDuration } from '../lib/time';
import { ErrorBlock, LoadingBlock, PageHeader, StatusBadge } from '../components/common';
import { ProcessingView } from '../features/processing/ProcessingView';
import { PreviewStudio } from '../features/studio/PreviewStudio';

export function ProjectPage() {
  const { projectId } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { data: project, isLoading, error, refetch } = useProject(projectId);

  if (isLoading) return <LoadingBlock />;
  if (error) return <ErrorBlock error={error} onRetry={refetch} />;
  if (!project) return null;

  const hasResult = project.variants.some((v) => v.revisions.length > 0);
  const showStudio = hasResult && ['review_video', 'review_audio', 'ready', 'published'].includes(project.status);

  return (
    <>
      <PageHeader
        title={
          <>
            {project.vodTitle} <StatusBadge status={project.status} />
          </>
        }
        subtitle={`${goalLabel[project.config.goal]} · ${project.config.outputType === 'short' ? 'Video ngắn' : 'Video dài'} ${formatDuration(project.config.durationSec)} · ${project.mode === 'auto' ? 'Tự động hoàn toàn' : 'Có duyệt'}`}
        actions={
          <>
            {hasResult && (
              <Button variant="subtle" color="gray" leftSection={<IconHistory size={16} />} onClick={() => navigate(`/projects/${project.id}/history`)}>
                Lịch sử phiên bản
              </Button>
            )}
            {(project.status === 'ready' || project.status === 'published') && (
              <Button variant="light" leftSection={<IconSend size={16} />} onClick={() => navigate(`/projects/${project.id}/publish`)}>
                Đăng bài
              </Button>
            )}
          </>
        }
      />
      {showStudio ? <PreviewStudio key={project.id} project={project} revisionId={search.get('rev')} /> : <ProcessingView project={project} />}
    </>
  );
}
