import { useState, useCallback, useMemo } from 'react';
import { Copy, RefreshCw, Check, Shuffle } from 'lucide-react';
import { generatePassword } from '../utils/crypto.js';
import StrengthMeter from './StrengthMeter.jsx';

// Simple word list for passphrase generation (using crypto random)
const WORD_LIST = [
  'able','acid','also','arch','area','army','away','back','ball','band',
  'bank','base','bath','bear','beat','been','bell','best','bird','blow',
  'blue','boat','body','bomb','bond','bone','book','born','both','burn',
  'busy','call','calm','came','camp','cape','card','care','case','cash',
  'cast','cave','cell','chat','chip','city','club','coal','coat','code',
  'cold','come','cook','cool','cope','copy','core','cost','crew','crop',
  'dark','data','date','dawn','dead','deal','dear','debt','deep','deny',
  'desk','diet','dirt','dish','disk','does','done','door','dose','down',
  'draw','drew','drop','drug','drum','dual','duke','dump','dust','duty',
  'each','earn','ease','east','easy','edge','else','emit','even','ever',
  'exam','exit','face','fact','fail','fair','fall','fame','farm','fast',
  'fate','fear','feed','feel','feet','fell','file','fill','film','find',
  'fine','fire','firm','fish','five','flag','flat','flew','flow','fold',
  'folk','font','food','fool','foot','ford','form','fort','four','free',
  'from','fuel','full','fund','fury','gain','game','gang','gate','gave',
  'gear','gift','girl','give','glad','glow','glue','goal','goes','gold',
  'golf','gone','good','grab','gray','grew','grid','grip','grow','gulf',
  'guru','hack','hair','half','hall','hand','hang','hard','harm','hate',
  'have','head','hear','heat','held','hell','help','here','hero','hide',
  'high','hill','hint','hire','hold','hole','holy','home','hood','hook',
  'hope','horn','host','hour','huge','hung','hunt','hurt','icon','idea',
  'inch','into','iron','item','jack','jail','jazz','jean','join','joke',
  'jump','jury','just','keen','keep','kept','kick','kill','kind','king',
  'knee','knew','knit','knot','know','lack','lady','laid','lake','lamp',
  'land','lane','last','late','lawn','lead','leaf','lean','left','lend',
  'less','life','lift','like','limb','lime','line','link','lion','list',
];

function generatePassphrase(wordCount, separator) {
  const words = [];
  for (let i = 0; i < wordCount; i++) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    words.push(WORD_LIST[arr[0] % WORD_LIST.length]);
  }
  return words.join(separator);
}

export default function PasswordGenerator() {
  const [mode, setMode] = useState('random'); // 'random' | 'passphrase'
  const [length, setLength] = useState(20);
  const [upper, setUpper] = useState(true);
  const [lower, setLower] = useState(true);
  const [digits, setDigits] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);
  // Passphrase options
  const [wordCount, setWordCount] = useState(5);
  const [separator, setSeparator] = useState('-');

  const [password, setPassword] = useState(() =>
    generatePassword({ length: 20, upper: true, lower: true, digits: true, symbols: true })
  );
  const [copied, setCopied] = useState(false);

  const regenerate = useCallback(() => {
    if (mode === 'passphrase') {
      setPassword(generatePassphrase(wordCount, separator));
    } else {
      setPassword(generatePassword({ length, upper, lower, digits, symbols, excludeAmbiguous }));
    }
    setCopied(false);
  }, [mode, length, upper, lower, digits, symbols, excludeAmbiguous, wordCount, separator]);

  const handleOptionChange = useCallback(
    (setter, value) => {
      setter(value);
      setTimeout(() => {
        setPassword(
          generatePassword({
            length,
            upper: setter === setUpper ? value : upper,
            lower: setter === setLower ? value : lower,
            digits: setter === setDigits ? value : digits,
            symbols: setter === setSymbols ? value : symbols,
            excludeAmbiguous: setter === setExcludeAmbiguous ? value : excludeAmbiguous,
          })
        );
      }, 0);
    },
    [length, upper, lower, digits, symbols, excludeAmbiguous]
  );

  // Entropy calculation
  const entropy = useMemo(() => {
    if (mode === 'passphrase') {
      return Math.round(Math.log2(WORD_LIST.length) * wordCount);
    }
    let poolSize = 0;
    if (upper) poolSize += excludeAmbiguous ? 25 : 26; // minus O/I
    if (lower) poolSize += excludeAmbiguous ? 25 : 26; // minus l
    if (digits) poolSize += excludeAmbiguous ? 8 : 10; // minus 0,1
    if (symbols) poolSize += 26;
    if (poolSize === 0) poolSize = 26;
    return Math.round(Math.log2(poolSize) * length);
  }, [mode, length, upper, lower, digits, symbols, excludeAmbiguous, wordCount]);

  const copyPassword = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setTimeout(() => navigator.clipboard.writeText('').catch(() => {}), 30000);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-300">Password Generator</h3>

      {/* Mode toggle */}
      <div className="flex gap-2">
        {[
          { key: 'random', label: 'Random', icon: Shuffle },
          { key: 'passphrase', label: 'Passphrase', icon: Shuffle },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setMode(key); setTimeout(regenerate, 0); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              mode === key
                ? 'bg-vault-accent/10 text-vault-accent'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Preview */}
      <div className="flex items-center gap-2">
        <div className="vault-input flex-1 font-mono text-sm break-all select-all">
          {password}
        </div>
        <button onClick={regenerate} className="vault-btn-secondary shrink-0" title="Regenerate">
          <RefreshCw size={16} />
        </button>
        <button onClick={copyPassword} className="vault-btn-secondary shrink-0" title="Copy">
          {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
        </button>
      </div>

      <StrengthMeter password={password} />

      {mode === 'random' ? (
        <>
          {/* Length slider */}
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Length: {length}</span>
              <span>~{entropy} bits entropy</span>
            </div>
            <input
              type="range"
              min={8}
              max={64}
              value={length}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setLength(val);
                setPassword(generatePassword({ length: val, upper, lower, digits, symbols, excludeAmbiguous }));
              }}
              className="w-full accent-vault-accent"
            />
          </div>

          {/* Charset toggles */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Uppercase (A-Z)', state: upper, setter: setUpper },
              { label: 'Lowercase (a-z)', state: lower, setter: setLower },
              { label: 'Numbers (0-9)', state: digits, setter: setDigits },
              { label: 'Symbols (!@#$)', state: symbols, setter: setSymbols },
              { label: 'Exclude ambiguous (0OIl1)', state: excludeAmbiguous, setter: setExcludeAmbiguous },
            ].map(({ label, state, setter }) => (
              <label
                key={label}
                className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={state}
                  onChange={(e) => handleOptionChange(setter, e.target.checked)}
                  className="accent-vault-accent"
                />
                {label}
              </label>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Passphrase options */}
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Words: {wordCount}</span>
              <span>~{entropy} bits entropy</span>
            </div>
            <input
              type="range"
              min={3}
              max={10}
              value={wordCount}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setWordCount(val);
                setPassword(generatePassphrase(val, separator));
              }}
              className="w-full accent-vault-accent"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Separator</label>
            <div className="flex gap-2">
              {['-', '.', '_', ' ', '#'].map((sep) => (
                <button
                  key={sep}
                  onClick={() => {
                    setSeparator(sep);
                    setPassword(generatePassphrase(wordCount, sep));
                  }}
                  className={`px-3 py-1.5 rounded text-sm font-mono transition-colors ${
                    separator === sep
                      ? 'bg-vault-accent/10 text-vault-accent border border-vault-accent/30'
                      : 'text-gray-500 hover:text-gray-300 border border-vault-border'
                  }`}
                >
                  {sep === ' ' ? '␣' : sep}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
