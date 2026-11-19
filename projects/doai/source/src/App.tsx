/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useLayoutEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { MakerCardPrompt } from './components/layout/MakerCardPrompt';
import { Footer } from './components/layout/Footer';
import { RouterView } from './components/router/RouterView';
import { LoginModal } from './components/modals/LoginModal';
import { NotificationDrawer } from './components/modals/NotificationDrawer';
import { PolicyModal } from './components/modals/PolicyModal';
import { Sparkles, ArrowRight } from 'lucide-react';

const MainContent: React.FC = () => {
  const { activeRoute } = useApp();

  // Reset before paint. Views with section anchors scroll in their passive
  // effects afterwards, so detail routes start at the top without racing anchors.
  useLayoutEffect(() => {
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    root.style.scrollBehavior = previous;
  }, [activeRoute]);

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#111111]">
      {/* Main Top Navigation */}
      <Navbar />

      {/* Main Body View — resolved by the route table */}
      <main className="flex-1">
        <RouterView />
      </main>

      {/* Global Modals & Drawers */}
      <LoginModal />
      <NotificationDrawer />
      <PolicyModal />
      <MakerCardPrompt />

      {/* Global Footer */}
      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
