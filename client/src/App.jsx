import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './components/Auth/LoginPage';
import SignupPage from './components/Auth/SignupPage';
import AuthGuard from './components/Auth/AuthGuard';
import Dashboard from './components/Dashboard/Dashboard';
import EditorPage from './components/Editor/EditorPage';
import ArenaLobby from './components/Lobby/ArenaLobby';
import CollabLobby from './components/Lobby/CollabLobby';
import DuelArena from './components/Duel/DuelArena';
import ProfilePage from './components/Profile/ProfilePage';
import { ProjectProvider } from './contexts/ProjectContext';
import { EditorProvider } from './contexts/EditorContext';
import { ThemeProvider } from './contexts/ThemeContext';

export default function App() {
  return (
    <ThemeProvider>
      <ProjectProvider>
        <EditorProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <AuthGuard>
                <Dashboard />
              </AuthGuard>
            }
          />
          <Route
            path="/editor/:projectId"
            element={
              <AuthGuard>
                <EditorPage />
              </AuthGuard>
            }
          />

          {/* Arena & Duel routes */}
          <Route
            path="/arena"
            element={
              <AuthGuard>
                <ArenaLobby />
              </AuthGuard>
            }
          />
          <Route
            path="/collab"
            element={
              <AuthGuard>
                <CollabLobby />
              </AuthGuard>
            }
          />
          <Route
            path="/duel/:duelId"
            element={
              <AuthGuard>
                <DuelArena />
              </AuthGuard>
            }
          />
          <Route
            path="/profile/:userId"
            element={
              <AuthGuard>
                <ProfilePage />
              </AuthGuard>
            }
          />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </EditorProvider>
    </ProjectProvider>
    </ThemeProvider>
  );
}
