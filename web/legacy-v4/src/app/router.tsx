import { createBrowserRouter } from 'react-router';
import { Layout } from './Layout';
import { LibraryPage } from '../pages/LibraryPage';
import { ConfigurePage } from '../pages/ConfigurePage';
import { ProjectPage } from '../pages/ProjectPage';
import { HistoryPage } from '../pages/HistoryPage';
import { PublishPage } from '../pages/PublishPage';
import { ProjectsPage } from '../pages/ProjectsPage';
import { NotFoundPage } from '../pages/NotFoundPage';

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <LibraryPage /> },
      { path: 'vods/:vodId/configure', element: <ConfigurePage /> },
      { path: 'projects', element: <ProjectsPage /> },
      { path: 'projects/:projectId', element: <ProjectPage /> },
      { path: 'projects/:projectId/history', element: <HistoryPage /> },
      { path: 'projects/:projectId/publish', element: <PublishPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
