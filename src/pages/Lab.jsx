import { favoriteCache } from '../lib/favoriteCache.mjs';
import { getDrillVideo } from '../data/drillVideos.js';
import usePreviewNavigate from '../lib/usePreviewNavigate.js';
import { PREVIEW_DRILLS } from '../data/previewDrills.js';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiArrowRight,
  FiBookOpen,
  FiChevronRight,
  FiClock,
  FiHeart,
  FiHome,
  FiPlay,
  FiRefreshCw,
  FiSearch,
  FiStar,
  FiZap,
} from 'react-icons/fi';
import { supabase } from '../lib/supabaseClient.js';
import '../lab-catalog-controls.css';

const sectionLabels = { foundations: 'Foundations', 'control-rhythm': 'Control & Rhythm', crossovers: 'Crossovers', 'between-legs': 'Between the Legs', 'behind-back': 'Behind the Back', combinations: 'Combinations', 'movement-game-speed': 'Movement & Game Speed' };
function sectionLabel(section) { return sectionLabels[section.section_key] || section.name; }

function formatHand(hand) {
  if (hand === 'right') return 'Right Hand';
  if (hand === 'left') return 'Left Hand';
  return 'Both Hands';
}


function DrillPreview({ drill }) {
  if (getDrillVideo(drill)) {
    return (
      <div className="cs-lab-row-preview cs-lab-row-preview-video">
        <video src={getDrillVideo(drill)} muted playsInline preload="metadata" aria-label={`${drill.name} preview`} />
        <span className="cs-lab-preview-play" aria-hidden="true"><FiPlay /></span>
      </div>
    );
  }

  return (
    <div className="cs-lab-row-preview cs-lab-row-preview-placeholder" aria-hidden="true">
      <div className="cs-lab-ball">
        <i className="cs-lab-ball-seam cs-lab-ball-seam-one" />
        <i className="cs-lab-ball-seam cs-lab-ball-seam-two" />
        <i className="cs-lab-ball-seam cs-lab-ball-seam-three" />
      </div>
      <small>CS</small>
    </div>
  );
}

export default function Lab({ previewOnly = false }) {
  const navigate = usePreviewNavigate(previewOnly);
  const [sections, setSections] = useState([]);
  const [drills, setDrills] = useState([]);
  const [userId, setUserId] = useState('');
  const [favoriteKeys, setFavoriteKeys] = useState([]);
  const [recentKeys, setRecentKeys] = useState([]);
  const [activeView, setActiveView] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [favoriteMessage, setFavoriteMessage] = useState('');
  const [favoriteBusy, setFavoriteBusy] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadLab() {
      if (previewOnly) {
        const sectionKeys = [...new Set(PREVIEW_DRILLS.map((d) => d.section_key))];
        setSections(sectionKeys.map((key, index) => ({ id: key, section_key: key, name: key.replace(/-/g, ' '), display_order: index })));
        setDrills(PREVIEW_DRILLS.map((d) => ({ ...d, id: d.drill_key, section_id: d.section_key })));
        setLoading(false); return;
      }
      if (!supabase) {
        if (mounted) {
          setErrorMessage('CourtStreak could not connect to Supabase.');
          setLoading(false);
        }
        return;
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        navigate('/login', { replace: true });
        return;
      }

      setUserId(user.id);

      const [sectionsResult, drillsResult] = await Promise.all([
        supabase
          .from('lab_sections')
          .select('id, section_key, name, description, display_order')
          .eq('is_active', true)
          .order('display_order', { ascending: true }),
        supabase
          .from('drills')
          .select(`
            id,
            drill_key,
            section_id,
            name,
            hand,
            demo_video_url,
            key_points,
            metric_type,
            metric_label,
            default_duration_seconds,
            allowed_durations_seconds,
            ai_tracking_available,
            xp_reward,
            short_description,
            difficulty,
            display_order,
            status
          `)
          .eq('status', 'active')
          .order('display_order', { ascending: true }),
      ]);

      if (!mounted) return;
      if (sectionsResult.error || drillsResult.error) {
        console.error('Could not load The Lab:', sectionsResult.error || drillsResult.error);
        setErrorMessage('CourtStreak could not load The Lab. Please try again.');
        setLoading(false);
        return;
      }

      setSections(sectionsResult.data ?? []);
      setDrills(drillsResult.data ?? []);

      const [favoritesResult, recentResult] = await Promise.all([
        supabase.from('drill_favorites').select('drill_key').eq('user_id', user.id),
        supabase
          .from('drill_recent_activity')
          .select('drill_key, last_practiced_at')
          .eq('user_id', user.id)
          .order('last_practiced_at', { ascending: false })
          .limit(12),
      ]);

      const storedFavoriteKeys = favoriteCache.read(user.id);
      const remoteFavoriteKeys = favoritesResult.error ? [] : (favoritesResult.data ?? []).map((item) => item.drill_key);
      setFavoriteKeys([...new Set([...storedFavoriteKeys, ...remoteFavoriteKeys])]);
      if (!recentResult.error) {
        setRecentKeys((recentResult.data ?? []).map((item) => item.drill_key));
      }
      setLoading(false);
    }

    loadLab().catch(() => { if (mounted) { setErrorMessage("The drill library could not load. Please try again."); setLoading(false); } });
    return () => { mounted = false; };
  }, [navigate, previewOnly]);

  const drillsBySection = useMemo(() => {
    return drills.reduce((groups, drill) => {
      if (!groups[drill.section_id]) groups[drill.section_id] = [];
      groups[drill.section_id].push(drill);
      return groups;
    }, {});
  }, [drills]);

  const visibleDrillsBySection = useMemo(() => {
    const selectedKeys = activeView === 'all'
      ? null
      : activeView === 'favorites' ? favoriteKeys : recentKeys;
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return Object.fromEntries(
      Object.entries(drillsBySection).map(([sectionId, sectionDrills]) => [
        sectionId,
        sectionDrills.filter((drill) => {
          if (selectedKeys && !selectedKeys.includes(drill.drill_key)) return false;
          if (difficultyFilter !== 'all' && drill.difficulty !== difficultyFilter) return false;
          if (!normalizedSearch) return true;
          return [drill.name, drill.short_description, drill.hand, drill.difficulty]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(normalizedSearch));
        }),
      ])
    );
  }, [activeView, difficultyFilter, drillsBySection, favoriteKeys, recentKeys, searchTerm]);

  const visibleDrillCount = useMemo(
    () => Object.values(visibleDrillsBySection).reduce((total, sectionDrills) => total + sectionDrills.length, 0),
    [visibleDrillsBySection]
  );

  const hasCatalogFilters = searchTerm.trim().length > 0 || difficultyFilter !== 'all';
  const activeCollectionKeys = activeView === 'favorites' ? favoriteKeys : recentKeys;
  const hasEmptyCollection = activeView !== 'all' && activeCollectionKeys.length === 0;

  async function toggleFavorite(drill, event) {
    event.stopPropagation();
    if (previewOnly) { navigate('/preview/membership'); return; }
    if (!userId || favoriteBusy) return;
    const previous = favoriteKeys, selected = previous.includes(drill.drill_key);
    const next = selected ? previous.filter(key => key !== drill.drill_key) : [...new Set([...previous, drill.drill_key])];
    setFavoriteBusy(true); setFavoriteMessage(''); setFavoriteKeys(next);
    const cached = favoriteCache.write(userId, next);
    try {
      const result = selected
        ? await supabase.from('drill_favorites').delete().eq('user_id', userId).eq('drill_key', drill.drill_key)
        : await supabase.from('drill_favorites').upsert({user_id: userId, drill_key: drill.drill_key});
      if (result.error) throw result.error;
    } catch {
      if (!cached) setFavoriteKeys(previous);
      setFavoriteMessage(cached ? 'Changed on this device. Account sync could not finish.' : 'Favorite could not save. Please try again.');
    } finally { setFavoriteBusy(false); }
  }

  if (loading) {
    return (
      <main className="cs-lab-page cs-lab-page-compact">
        <div className="cs-lab-state">
          <FiRefreshCw />
          <strong>Opening The Lab...</strong>
          <span>Loading your CourtStreak drill library.</span>
        </div>
      </main>
    );
  }

  return (
    <main className="cs-lab-page cs-lab-page-compact">
      {favoriteMessage && <p role="status">{favoriteMessage}</p>}
      <header className="cs-lab-topbar">
        <Link to={previewOnly ? "/preview" : "/dashboard"} className="cs-lab-brand">
          <span>CS</span>
          <strong>CourtStreak</strong>
        </Link>
        <button type="button" onClick={() => navigate('/dashboard')}><FiHome /> Dashboard</button>
      </header>

      <section className="cs-lab-hero cs-lab-hero-compact">
        <div className="cs-lab-hero-copy">
          <span className="cs-lab-eyebrow"><FiBookOpen /> BALL HANDLING DRILL LIBRARY</span>
          <h1>THE LAB</h1>
          <h2>Learn it. Practice it. Master it.</h2>
        </div>
        <div className="cs-lab-hero-card">
          <span>COURTSTREAK TRAINING</span>
          <strong>{drills.length}</strong>
          <p>official drills in your library</p>
          <button type="button" onClick={() => navigate('/workout')}><FiPlay /> Follow a Workout</button>
        </div>
      </section>

      {errorMessage ? (
        <section className="cs-lab-error">
          <strong>We couldn't open The Lab.</strong>
          <span>{errorMessage}</span>
        </section>
      ) : (
        <>
          <section className="cs-lab-shortcuts cs-lab-shortcuts-compact">
            <button type="button" className={activeView === 'recent' ? 'is-active' : ''} onClick={() => setActiveView(activeView === 'recent' ? 'all' : 'recent')}>
              <div className="cs-lab-shortcut-icon"><FiClock /></div>
              <div><span>QUICK ACCESS</span><h3>Recently Practiced</h3>{recentKeys.length ? <small>{recentKeys.length} drills</small> : null}</div>
              <FiChevronRight className="cs-lab-shortcut-arrow" aria-hidden="true" />
            </button>
            <button type="button" className={activeView === 'favorites' ? 'is-active' : ''} onClick={() => setActiveView(activeView === 'favorites' ? 'all' : 'favorites')}>
              <div className="cs-lab-shortcut-icon"><FiHeart /></div>
              <div><span>YOUR COLLECTION</span><h3>Favorites</h3>{favoriteKeys.length ? <small>{favoriteKeys.length} saved</small> : null}</div>
              <FiChevronRight className="cs-lab-shortcut-arrow" aria-hidden="true" />
            </button>
          </section>

          <section className="cs-lab-list-library">
            <header className="cs-lab-list-intro">
              <div><span className="cs-lab-eyebrow">BALL HANDLING</span><h2>{activeView === 'favorites' ? 'Favorite drills.' : activeView === 'recent' ? 'Recently practiced.' : 'Choose your drill.'}</h2></div>
            </header>

            <div className="cs-lab-catalog-tools">
              <label className="cs-lab-search">
                <FiSearch aria-hidden="true" />
                <span className="sr-only">Search drills</span>
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search moves or skills"
                />
              </label>
              <label className="cs-lab-level-filter">
                <span className="sr-only">Filter by level</span>
                <select value={difficultyFilter} onChange={(event) => setDifficultyFilter(event.target.value)}>
                  <option value="all">All levels</option>
                  <option value="Foundation">Foundation</option>
                  <option value="Developing">Developing</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </label>
              <span className="cs-lab-result-count">{visibleDrillCount} {visibleDrillCount === 1 ? 'drill' : 'drills'}</span>
            </div>

            <nav className="cs-lab-section-jump" aria-label="Lab skill sections">
              {sections.filter((section) => (visibleDrillsBySection[section.id] ?? []).length > 0).map((section) => <a key={section.id} href={`#${section.section_key}`}>{sectionLabel(section)}</a>)}
            </nav>

            <div className="cs-lab-skill-list">
              {sections.map((section, sectionIndex) => {
                const sectionDrills = visibleDrillsBySection[section.id] ?? [];
                if ((activeView !== 'all' || hasCatalogFilters) && sectionDrills.length === 0) return null;
                return (
                  <section className="cs-lab-list-section" key={section.id} id={section.section_key}>
                    <div className="cs-lab-list-section-head">
                      <div className="cs-lab-section-number">{String(sectionIndex + 1).padStart(2, '0')}</div>
                      <div className="cs-lab-section-title"><h3>{sectionLabel(section)}</h3>{section.description ? <p>{section.description}</p> : null}</div>
                      <span className="cs-lab-section-count">{sectionDrills.length} {sectionDrills.length === 1 ? 'drill' : 'drills'}</span>
                    </div>

                    {sectionDrills.length > 0 ? (
                      <div className="cs-lab-rows">
                        {sectionDrills.map((drill) => (
                          <article
                            className="cs-lab-row"
                            key={drill.id}
                            role="link"
                            tabIndex="0"
                            onClick={() => navigate(`/lab/drill/${drill.drill_key}`)}
                            onKeyDown={(event) => {
                              if (event.target !== event.currentTarget) return;
                              if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(`/lab/drill/${drill.drill_key}`); }
                            }}
                          >
                            <DrillPreview drill={drill} />
                            <div className="cs-lab-row-copy">
                              <div className="cs-lab-row-title-line">
                                <h4>{drill.name}</h4>
                                
                              </div>
                              <div className="cs-lab-row-meta">
                                {drill.difficulty ? <span className="cs-lab-row-level">{drill.difficulty}</span> : null}
                                <span className="cs-lab-row-hand">{formatHand(drill.hand)}</span>
                                <span><FiClock /> {drill.default_duration_seconds} sec</span>
                                <span><FiStar /> +{Math.min(10, drill.xp_reward)} XP</span>
                              </div>
                            </div>
                            <div className="cs-lab-row-actions">
                              <span
                                role="button"
                                tabIndex="0"
                                className={`cs-lab-favorite-toggle ${favoriteKeys.includes(drill.drill_key) ? 'is-favorite' : ''}`}
                                onClick={(event) => toggleFavorite(drill, event)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleFavorite(drill, event); }
                                }}
                                aria-label={favoriteKeys.includes(drill.drill_key) ? `Remove ${drill.name} from favorites` : `Add ${drill.name} to favorites`}
                              ><FiHeart /></span>
                              <div className="cs-lab-row-open"><span>View Drill</span><FiArrowRight /></div>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : <div className="cs-lab-empty-section">More {section.name} drills are coming to The Lab.</div>}
                  </section>
                );
              })}
              {hasEmptyCollection ? (
                <div className="cs-lab-filter-empty">
                  <FiHeart />
                  <strong>{activeView === 'favorites' ? 'No favorite drills yet.' : 'No recent drills yet.'}</strong>
                  <span>{activeView === 'favorites' ? 'Tap the heart beside a drill to save it here.' : 'Completed practice sessions will appear here.'}</span>
                  <button type="button" onClick={() => setActiveView('all')}>Browse all drills</button>
                </div>
              ) : null}
              {visibleDrillCount === 0 && !hasEmptyCollection && (hasCatalogFilters || activeView !== 'all') ? (
                <div className="cs-lab-filter-empty">
                  <FiSearch />
                  <strong>No drills match those filters.</strong>
                  <span>Try another move, level, or return to the full library.</span>
                  <button type="button" onClick={() => { setSearchTerm(''); setDifficultyFilter('all'); setActiveView('all'); }}>Clear filters</button>
                </div>
              ) : null}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
