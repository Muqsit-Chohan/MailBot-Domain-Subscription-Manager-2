import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import LandingPage from './pages/LandingPage';

// Build-time only: renders the landing page to static HTML so it paints before the JS bundle loads.
export function render() {
  return renderToString(
    <ThemeProvider>
      <StaticRouter location="/">
        <LandingPage />
      </StaticRouter>
    </ThemeProvider>
  );
}
