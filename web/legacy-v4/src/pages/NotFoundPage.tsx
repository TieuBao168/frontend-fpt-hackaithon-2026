import { Button } from '@mantine/core';
import { useNavigate } from 'react-router';
import { EmptyState } from '../components/common';

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <EmptyState
      title="Không tìm thấy trang"
      description="Đường dẫn không tồn tại hoặc dự án đã bị xóa."
      action={<Button onClick={() => navigate('/')}>Về thư viện</Button>}
    />
  );
}
