import { createBrowserRouter, Navigate } from 'react-router';
import { AppShell } from './AppShell';
import { LibraryScreen } from '../screens/LibraryScreen';
import { TemplatesScreen } from '../screens/TemplatesScreen';
import { ConfigScreen } from '../screens/ConfigScreen';
import { ReviewScreen } from '../screens/ReviewScreen';
import { MusicScreen } from '../screens/MusicScreen';
import { TextScreen } from '../screens/TextScreen';
import { PreviewScreen } from '../screens/PreviewScreen';
import { PublishScreen } from '../screens/PublishScreen';

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/library" replace /> },
      { path: 'library', element: <LibraryScreen /> },
      { path: 'templates', element: <TemplatesScreen /> },
      { path: 'config', element: <ConfigScreen /> },
      { path: 'review', element: <ReviewScreen /> },
      { path: 'music', element: <MusicScreen /> },
      { path: 'text', element: <TextScreen /> },
      { path: 'preview', element: <PreviewScreen /> },
      { path: 'publish', element: <PublishScreen /> },
      { path: '*', element: <Navigate to="/library" replace /> },
    ],
  },
]);
