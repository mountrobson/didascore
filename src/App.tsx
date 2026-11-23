import { useEffect } from 'react';
import { HashRouter, Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Crest } from './components/Crest';
import { Icon } from './components/Icon';
import { Toasts } from './components/Toasts';
import { club, favorites, settings } from './lib/store';
import { Following } from './pages/Following';
import { Home } from './pages/Home';
import { LeaguePage } from './pages/League';
import { Leagues } from './pages/Leagues';
import { MatchPage } from './pages/Match';
import { Settings } from './pages/Settings';
import { Scorers } from './pages/Scorers';
import { ClubPage, TeamPage } from './pages/Team';
import { PlayerPage } from './pages/Player';

function Theme() {
  const { theme } = settings.use();
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
  }, [theme]);
  return null;
}

function TopBar() {
  const loc = useLocation();
  const nav = useNavigate();
  const isRoot = ['/', '/following', '/leagues', '/settings', '/club', '/scorers'].includes(loc.pathname);
  return (
    <header className="topbar">
      {isRoot ? (
        <Link to="/" className="brand" aria-label="DiDa Score home">
          <span className="brand-mark" aria-hidden><span /></span>
          <span className="brand-word">DiDa<b>Score</b></span>
        </Link>
      ) : (
        <button className="iconbtn" onClick={() => (window.history.length > 1 ? nav(-1) : nav('/'))} aria-label="Back"><Icon name="back" /></button>
      )}
      <div className="topbar-actions">
        <Link to="/leagues" className="iconbtn" aria-label="Search"><Icon name="search" /></Link>
        <Link to="/settings" className="iconbtn" aria-label="Settings"><Icon name="gear" /></Link>
      </div>
    </header>
  );
}

function BottomNav() {
  const { team } = club.use();
  return (
    <nav className="bottomnav" aria-label="Main">
      <NavLink to="/" end><Icon name="ball" /><span>Scores</span></NavLink>
      <NavLink to="/club"><Crest src={team.logo} name={team.name} size={22} /><span>{team.name.length > 10 ? 'My club' : team.name}</span></NavLink>
      <NavLink to="/scorers"><Icon name="boot" /><span>Scorers</span></NavLink>
      <NavLink to="/following"><Icon name="star" /><span>Following</span></NavLink>
      <NavLink to="/leagues"><Icon name="trophy" /><span>Leagues</span></NavLink>
    </nav>
  );
}

function SideBar() {
  const fav = favorites.use();
  return (
    <aside className="sidebar">
      <nav className="side-nav">
        <NavLink to="/" end><Icon name="ball" /> Scores</NavLink>
        <NavLink to="/club"><Icon name="shield" /> My club</NavLink>
        <NavLink to="/scorers"><Icon name="boot" /> Golden Shoe</NavLink>
        <NavLink to="/following"><Icon name="star" /> Following</NavLink>
        <NavLink to="/leagues"><Icon name="trophy" /> Leagues</NavLink>
      </nav>
      {fav.teams.length > 0 && (
        <div className="side-block">
          <div className="side-title">Your teams</div>
          {fav.teams.map((t) => (
            <Link key={t.id} to={`/team/${t.sport}/${t.league}/${t.id}`} className="side-link"><Crest src={t.logo} name={t.name} size={18} />{t.name}</Link>
          ))}
        </div>
      )}
      {fav.leagues.length > 0 && (
        <div className="side-block">
          <div className="side-title">Your competitions</div>
          {fav.leagues.map((l) => (
            <Link key={l.slug} to={`/league/${l.sport}/${l.slug}`} className="side-link"><Crest src={l.logo} name={l.name} size={18} />{l.name}</Link>
          ))}
        </div>
      )}
    </aside>
  );
}

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Theme />
      <ScrollTop />
      <TopBar />
      <div className="shell">
        <SideBar />
        <main className="content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/match/:sport/:league/:id" element={<MatchPage />} />
            <Route path="/league/:sport/:slug" element={<LeaguePage />} />
            <Route path="/team/:sport/:league/:id" element={<TeamPage />} />
            <Route path="/player/:sport/:league/:id" element={<PlayerPage />} />
            <Route path="/following" element={<Following />} />
            <Route path="/leagues" element={<Leagues />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/club" element={<ClubPage />} />
            <Route path="/scorers" element={<Scorers />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </main>
      </div>
      <BottomNav />
      <Toasts />
    </HashRouter>
  );
}
