import { useState, useRef, useEffect } from "react"
import "./App.css"

const mapScales = {
  "dust2": { "pos_x": -2476, "pos_y": 3239, "scale": 4.4 },
  "inferno": { "pos_x": -2087, "pos_y": 3870, "scale": 4.9 },
  "mirage": { "pos_x": -3230, "pos_y": 1713, "scale": 5.0 },
  "nuke": { "pos_x": -3453, "pos_y": 2887, "scale": 7.0 },
  "overpass": { "pos_x": -4831, "pos_y": 1781, "scale": 5.2 },
  "vertigo": { "pos_x": -3168, "pos_y": 1762, "scale": 4.0 },
  "ancient": { "pos_x": -2953, "pos_y": 2164, "scale": 5.0 },
  "anubis": { "pos_x": -2796, "pos_y": 3328, "scale": 5.22 },
  "train": { "pos_x": -2477, "pos_y": 2392, "scale": 4.7 },
  "cache": { "pos_x": -2000, "pos_y": 3250, "scale": 5.5 }
}

function ReplayPlayer({ sample, mapName, grenades }) {
  const [tickIdx, setTickIdx] = useState(0);
  
  useEffect(() => {
    if (!sample || sample.length === 0) {
      return;
    }
    
    setTickIdx(0);
    const interval = setInterval(() => {
      setTickIdx(prev => {
        if (prev >= sample.length - 1) {
          return 0;
        }
        return prev + 1;
      });
    }, 16);
    
    return () => clearInterval(interval);
  }, [sample]);
  
  if (!sample || sample.length === 0 || !mapName) return null;
  
  const currentTick = sample[tickIdx];
  const config = mapScales[mapName];
  if (!config || !currentTick) return null;
  
  const x = (currentTick.X - config.pos_x) / config.scale;
  const y = (config.pos_y - currentTick.Y) / config.scale;
  
  const left = (x / 1024) * 100 + "%";
  const top = (y / 1024) * 100 + "%";

  const dotColor = currentTick.side.toLowerCase() === 't' ? '#facc15' : '#60a5fa';

  const currentGrenades = grenades ? grenades.filter(g => g.tick === currentTick.tick) : [];

  return (
    <div className="replay-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <h3 className="replay-title">Sample Run</h3>
        <span style={{ color: '#888', fontSize: '0.9rem' }}>Tick: {tickIdx} / {sample.length}</span>
      </div>
      <div className="replay-map-wrapper">
        <img className="replay-map-bg" src={`http://localhost:8000/radars/${mapName}.png`} alt="Radar" />
        
        {currentGrenades.map((g, idx) => {
          const gx = (g.X - config.pos_x) / config.scale;
          const gy = (config.pos_y - g.Y) / config.scale;
          const gleft = (gx / 1024) * 100 + "%";
          const gtop = (gy / 1024) * 100 + "%";
          
          let color = '#fff';
          if (g.grenade_type === 'CFlashbangProjectile') color = '#e2e8f0';
          else if (g.grenade_type === 'CSmokeGrenadeProjectile') color = '#94a3b8';
          else if (g.grenade_type === 'CHEGrenadeProjectile') color = '#ef4444';
          else if (g.grenade_type === 'CMolotovProjectile' || g.grenade_type === 'CIncendiaryGrenadeProjectile') color = '#f97316';
          else if (g.grenade_type === 'CDecoyProjectile') color = '#8b5cf6';
          
          return (
            <div 
              key={g.entity_id || idx}
              className="grenade-dot"
              style={{
                left: gleft,
                top: gtop,
                backgroundColor: color,
                boxShadow: `0 0 6px ${color}`
              }}
              title={g.grenade_type}
            />
          );
        })}

        <div 
          className="player-dot" 
          style={{
            left, 
            top,
            backgroundColor: dotColor,
            boxShadow: `0 0 8px ${dotColor}`
          }}
        >
          <div className="player-dir" style={{ transform: `translate(0%, -50%) rotate(${-currentTick.yaw}deg)` }} />
        </div>
      </div>
    </div>
  )
}

function App(){
  const [radar, setRadar] = useState(null)
  const [sampleData, setSampleData] = useState(null)
  const [grenadesData, setGrenadesData] = useState(null)
  const [currentMap, setCurrentMap] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  
  const [tags, setTags] = useState([])
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef(null)

  const playerTags = [
  'sh1ro', 'magixx', 'tN1R', 'zont1x', 'donk',
  'karrigan', 'NiKo', 'TeSeS', 'm0NESY', 'kyousuke',
  'FalleN', 'yuurih', 'YEKINDAR', 'KSCERATO', 'molodoy',
  'apEX', 'ropz', 'ZywOo', 'flameZ', 'mezii',
  'torzsi', 'Spinx', 'xertioN', 'PR', 'xelex',
  'xfl0ud', 'dem0n', 'Krabeni', 'cmtry', 'dziugss',
  'arT', 'dumau', 'latto', 'n1ssim', 'try',
  'Aleksib', 'iM', 'b1t', 'w0nderful', 'makazze',
  'huNter-', 'NertZ', 'r1nkle', 'HeavyGod', 'MATYS',
  'XANTARES', 'woxic', 'Jimpphat', 'kyxsan', 'Wicadia',
  'max', 'dgt', 'meyern', 'luchov', 'HUASOPEEK',
  'frozen', 'Twistzz', 'Neityu', 'jcobbb', 'JBOEN',
  'HooXi', 'phzy', 'jabbi', 'Staehr', 'ryu',
  'bLitz', 'Techno', '910', 'tikuak', 'DarkMeister',
  'alex666', 'npl', 'kensizor', 'esenthial', 's1zzi',
  'Boombl4', 'zorte', 'S1ren', 'd1Ledez', 'Magnojez',
  'FL1T', 'Jame', 'xiELO', 'zweih', 'slaxejezzz',
  'Snax', 'REZ', 'Tauson', 'FL4MUS', 'hypex',
  'vsm', 'biguzera', 'piriajr', 'saffee', 'snow',
  'MaSvAl', 'sFade8', 'AW', 'mo0N', 'tenzy'
  ]
  const mapTags = ['ancient','mirage','dust2','anubis','cache','nuke']
  const roundTags = ['eco','buy','force','pistol']

  function getTagType(tag) {
    if (playerTags.includes(tag)) return 'player'
    if (mapTags.includes(tag)) return 'map'
    if (roundTags.includes(tag)) return 'round'
    if (tag === 't' || tag === 'ct') return 'side'
    return null
  }

  const handleInputChange = (e) => {
    const val = e.target.value;
    if (val.includes(' ')) {
      const words = val.split(' ');
      let newTags = [...tags];
      let remaining = [];
      for (let word of words) {
        if (word === '') continue;
        if (getTagType(word)) {
          if (!newTags.includes(word)) newTags.push(word);
        } else {
          remaining.push(word);
        }
      }
      setTags(newTags);
      setInputValue(remaining.join(' ') + (val.endsWith(' ') ? ' ' : ''));
    } else {
      setInputValue(val);
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const words = inputValue.split(' ').filter(w => w !== '');
      let newTags = [...tags];
      let remaining = [];
      for (let word of words) {
        if (getTagType(word)) {
          if (!newTags.includes(word)) newTags.push(word);
        } else {
          remaining.push(word);
        }
      }
      
      setTags(newTags);
      setInputValue(remaining.join(' '));
      triggerSearch(newTags);
      inputRef.current?.blur();
    }
    
    if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      const newTags = [...tags];
      newTags.pop();
      setTags(newTags);
    }
  }

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove))
  }

  async function triggerSearch(currentTags) {
    const map = currentTags.filter(tag => mapTags.includes(tag))
    const player = currentTags.filter(tag => playerTags.includes(tag))
    const side = currentTags.filter(tag => tag === 't' || tag === 'ct')
    const round = currentTags.filter(tag => roundTags.includes(tag))

    setIsLoading(true)
    try {
      const response = await fetch(`http://localhost:8000/api/demos?player=${player[0] || ''}&round_type=${round[0] || ''}&side=${side[0] || ''}&map=${map[0] || ''}`)
      if (response.ok) {
        const data = await response.json()

        if (data.heatmap) {
          setRadar(`data:image/jpeg;base64,${data.heatmap}`)
          setSampleData(data.sample || [])
          setGrenadesData(data.grenades || [])
          setCurrentMap(map[0] || '')
        } else {
          console.error("No heatmap in response")
        }
      } else {
        console.error("Failed to fetch heatmap")
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  const hasResults = radar || isLoading;
  const headerClass = hasResults && !isSearchFocused ? 'header-section compact' : 'header-section';

  return(
    <div className={`container ${hasResults ? 'has-results' : ''}`}>
      
      <div 
        className={headerClass}
        onClick={() => {
          if (hasResults && !isSearchFocused) {
            inputRef.current?.focus();
          }
        }}
      >
        <div className="logo">CS Heatmaps</div>
        <div className="search-bar-container">
          {tags.map(tag => (
            <span className={`tag-chip type-${getTagType(tag)}`} key={tag}>
              {tag}
              <button className="remove-tag" onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}>×</button>
            </span>
          ))}
          <input 
            ref={inputRef}
            type="text" 
            className="search-input"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            placeholder={tags.length === 0 ? "Enter tags (e.g., donk mirage t buy)..." : ""} 
          />
        </div>
      </div>

      {radar && !isLoading && (
        <div className="dashboard">
          <div className="heatmap-container">
            <h3 className="heatmap-title">Aggregate Heatmap</h3>
            <img className="heatmap-img" src={radar} alt="Heatmap Result" />
          </div>
          
          <ReplayPlayer sample={sampleData} mapName={currentMap} grenades={grenadesData} />
        </div>
      )}
      
      {isLoading && (
        <div className="results-container" style={{color: '#888', marginTop: '40px'}}>
          Loading...
        </div>
      )}
    </div>
  )
}

export default App