import React, { useState } from "react";

// ──────────────────────────────────────────────────────────────────────────────
// Safe Math Evaluator (Shunting-Yard Algorithm)
// No eval() - parses and evaluates mathematical expressions safely
// ──────────────────────────────────────────────────────────────────────────────

interface Token {
  type: 'number' | 'operator' | 'function' | 'lparen' | 'rparen';
  value: string;
}

const OPERATORS: Record<string, { precedence: number; associativity: 'left' | 'right' }> = {
  '+': { precedence: 1, associativity: 'left' },
  '-': { precedence: 1, associativity: 'left' },
  '*': { precedence: 2, associativity: 'left' },
  '/': { precedence: 2, associativity: 'left' },
  '^': { precedence: 3, associativity: 'right' },
};

const FUNCTIONS = new Set(['sin', 'cos', 'tan', 'log', 'sqrt', 'abs']);

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  
  while (i < expression.length) {
    const char = expression[i];
    
    if (/\s/.test(char)) {
      i++;
      continue;
    }
    
    if (/\d/.test(char) || char === '.') {
      let number = '';
      while (i < expression.length && (/\d/.test(expression[i]) || expression[i] === '.')) {
        number += expression[i];
        i++;
      }
      tokens.push({ type: 'number', value: number });
      continue;
    }
    
    if (char === '(') {
      tokens.push({ type: 'lparen', value: char });
      i++;
      continue;
    }
    
    if (char === ')') {
      tokens.push({ type: 'rparen', value: char });
      i++;
      continue;
    }
    
    if (OPERATORS[char]) {
      tokens.push({ type: 'operator', value: char });
      i++;
      continue;
    }
    
    if (/[a-zA-Z]/.test(char)) {
      let func = '';
      while (i < expression.length && /[a-zA-Z]/.test(expression[i])) {
        func += expression[i];
        i++;
      }
      if (FUNCTIONS.has(func)) {
        tokens.push({ type: 'function', value: func });
      } else {
        throw new Error(`Unknown function: ${func}`);
      }
      continue;
    }
    
    throw new Error(`Unexpected character: ${char}`);
  }
  
  return tokens;
}

function toRPN(tokens: Token[]): Token[] {
  const output: Token[] = [];
  const stack: Token[] = [];
  
  for (const token of tokens) {
    if (token.type === 'number') {
      output.push(token);
    } else if (token.type === 'function') {
      stack.push(token);
    } else if (token.type === 'operator') {
      const op = OPERATORS[token.value];
      while (
        stack.length > 0 &&
        stack[stack.length - 1].type !== 'lparen' &&
        (
          stack[stack.length - 1].type === 'function' ||
          (
            stack[stack.length - 1].type === 'operator' &&
            (
              OPERATORS[stack[stack.length - 1].value].precedence > op.precedence ||
              (OPERATORS[stack[stack.length - 1].value].precedence === op.precedence && op.associativity === 'left')
            )
          )
        )
      ) {
        output.push(stack.pop()!);
      }
      stack.push(token);
    } else if (token.type === 'lparen') {
      stack.push(token);
    } else if (token.type === 'rparen') {
      while (stack.length > 0 && stack[stack.length - 1].type !== 'lparen') {
        output.push(stack.pop()!);
      }
      if (stack.length === 0) {
        throw new Error('Mismatched parentheses');
      }
      stack.pop(); // Remove the left parenthesis
      
      if (stack.length > 0 && stack[stack.length - 1].type === 'function') {
        output.push(stack.pop()!);
      }
    }
  }
  
  while (stack.length > 0) {
    const token = stack.pop()!;
    if (token.type === 'lparen' || token.type === 'rparen') {
      throw new Error('Mismatched parentheses');
    }
    output.push(token);
  }
  
  return output;
}

function evaluateRPN(rpn: Token[]): number {
  const stack: number[] = [];
  
  for (const token of rpn) {
    if (token.type === 'number') {
      stack.push(parseFloat(token.value));
    } else if (token.type === 'operator') {
      if (stack.length < 2) {
        throw new Error('Invalid expression');
      }
      const b = stack.pop()!;
      const a = stack.pop()!;
      
      switch (token.value) {
        case '+': stack.push(a + b); break;
        case '-': stack.push(a - b); break;
        case '*': stack.push(a * b); break;
        case '/': 
          if (b === 0) throw new Error('Division by zero');
          stack.push(a / b); 
          break;
        case '^': stack.push(Math.pow(a, b)); break;
        default: throw new Error(`Unknown operator: ${token.value}`);
      }
    } else if (token.type === 'function') {
      if (stack.length < 1) {
        throw new Error('Invalid expression');
      }
      const a = stack.pop()!;
      
      switch (token.value) {
        case 'sin': stack.push(Math.sin(a)); break;
        case 'cos': stack.push(Math.cos(a)); break;
        case 'tan': stack.push(Math.tan(a)); break;
        case 'log': stack.push(Math.log(a)); break;
        case 'sqrt': stack.push(Math.sqrt(a)); break;
        case 'abs': stack.push(Math.abs(a)); break;
        default: throw new Error(`Unknown function: ${token.value}`);
      }
    }
  }
  
  if (stack.length !== 1) {
    throw new Error('Invalid expression');
  }
  
  return stack[0];
}

function evaluateExpression(expression: string): number {
  try {
    const tokens = tokenize(expression.trim());
    const rpn = toRPN(tokens);
    return evaluateRPN(rpn);
  } catch (error) {
    throw new Error(`Math evaluation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Navigation Tabs Component
// ──────────────────────────────────────────────────────────────────────────────

interface NavTabsProps {
  activeTab: string;
}

function NavTabs({ activeTab }: NavTabsProps) {
  const tabs = [
    { id: 'tgo', label: 'TGO', href: '/tgo' },
    { id: 'strategy', label: 'Strategy Lab', href: '/strategy' },
    { id: 'gallery', label: 'Gallery', href: '/gallery' },
    { id: 'compare', label: 'Compare', href: '/compare' },
    { id: 'replay', label: 'Replay', href: '/replay' },
    { id: 'calc', label: 'Calculator', href: '/calc' },
  ];

  return (
    <div className="border-b border-zinc-800 mb-6">
      <nav className="flex space-x-8">
        {tabs.map((tab) => (
          <a
            key={tab.id}
            href={tab.href}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === tab.id
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-700'
            }`}
          >
            {tab.label}
          </a>
        ))}
      </nav>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// TGO Compute Integration
// ──────────────────────────────────────────────────────────────────────────────

interface TGOGlobals {
  __TGO_PLANNER__?: {
    submit: (job: any) => Promise<string>;
  };
  __TGO_OBSERVER__?: {
    on: (event: string, callback: (data: any) => void) => void;
    off: (event: string, callback: (data: any) => void) => void;
  };
}

async function computeWithTGO(expression: string, timeoutMs = 5000): Promise<{ result: number; meta: any }> {
  const globals = window as unknown as TGOGlobals;
  
  if (!globals.__TGO_PLANNER__ || !globals.__TGO_OBSERVER__) {
    // Fallback to local evaluation
    const result = evaluateExpression(expression);
    return { 
      result, 
      meta: { 
        kernel: 'calc-fallback', 
        fallback: true,
        timestamp: Date.now() 
      } 
    };
  }

  const jobId = `calc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      globals.__TGO_OBSERVER__?.off('pinned', pinnedHandler);
      // Fallback to local evaluation on timeout
      try {
        const result = evaluateExpression(expression);
        resolve({ 
          result, 
          meta: { 
            kernel: 'calc-timeout-fallback', 
            fallback: true,
            timeout: true,
            timestamp: Date.now() 
          } 
        });
      } catch (error) {
        reject(error);
      }
    }, timeoutMs);

    const pinnedHandler = (data: any) => {
      if (data.jobId === jobId && data.payload?.meta?.kernel === 'calc') {
        clearTimeout(timeout);
        globals.__TGO_OBSERVER__?.off('pinned', pinnedHandler);
        resolve({
          result: data.payload.result,
          meta: data.payload.meta
        });
      }
    };

    globals.__TGO_OBSERVER__?.on('pinned', pinnedHandler);

    // Submit job to planner
    globals.__TGO_PLANNER__?.submit({
      jobId,
      kernel: 'calc',
      payload: {
        expression,
        meta: {
          kernel: 'calc',
          timestamp: Date.now()
        }
      }
    }).catch((error) => {
      clearTimeout(timeout);
      globals.__TGO_OBSERVER__?.off('pinned', pinnedHandler);
      // Fallback to local evaluation on submit error
      try {
        const result = evaluateExpression(expression);
        resolve({ 
          result, 
          meta: { 
            kernel: 'calc-submit-fallback', 
            fallback: true,
            submitError: error.message,
            timestamp: Date.now() 
          } 
        });
      } catch (evalError) {
        reject(evalError);
      }
    });
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Calculator Component
// ──────────────────────────────────────────────────────────────────────────────

export default function CalcCompare() {
  const [expression, setExpression] = useState("(1+2)*3^4/5 - 6");
  const [cpuMs, setCpuMs] = useState<number | null>(null);
  const [cpuOut, setCpuOut] = useState("");
  const [tgoMs, setTgoMs] = useState<number | null>(null);
  const [tgoOut, setTgoOut] = useState("");
  const [computing, setComputing] = useState(false);

  const fmt = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(1)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const trunc = (str: string, maxLen = 1000) => {
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen) + '... (truncated)';
  };

  const handleCompute = async () => {
    if (!expression.trim() || computing) return;
    
    setComputing(true);
    setCpuMs(null);
    setCpuOut("");
    setTgoMs(null);
    setTgoOut("");

    // CPU computation
    try {
      const cpuStart = performance.now();
      const cpuResult = evaluateExpression(expression);
      const cpuEnd = performance.now();
      
      setCpuMs(cpuEnd - cpuStart);
      setCpuOut(JSON.stringify({
        result: cpuResult,
        expression,
        method: 'cpu',
        timestamp: Date.now()
      }, null, 2));
    } catch (error) {
      setCpuMs(0);
      setCpuOut(JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        expression,
        method: 'cpu',
        timestamp: Date.now()
      }, null, 2));
    }

    // TGO computation
    try {
      const tgoStart = performance.now();
      const tgoResult = await computeWithTGO(expression);
      const tgoEnd = performance.now();
      
      setTgoMs(tgoEnd - tgoStart);
      setTgoOut(JSON.stringify({
        result: tgoResult.result,
        expression,
        method: 'tgo',
        meta: tgoResult.meta,
        timestamp: Date.now()
      }, null, 2));
    } catch (error) {
      const tgoEnd = performance.now();
      setTgoMs(tgoEnd - performance.now());
      setTgoOut(JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        expression,
        method: 'tgo',
        timestamp: Date.now()
      }, null, 2));
    }

    setComputing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCompute();
    }
  };

  const handleClear = () => {
    setExpression("");
    setCpuMs(null);
    setCpuOut("");
    setTgoMs(null);
    setTgoOut("");
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      <div className="max-w-6xl mx-auto p-6">
        <NavTabs activeTab="calc" />
        
        <h1 className="text-3xl font-bold mb-8">Calculator Compare</h1>
        
        {/* Input Section */}
        <div className="mb-8">
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter mathematical expression (e.g., (1+2)*3^4/5 - 6)"
              className="flex-1 px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-400 focus:outline-none focus:border-cyan-500"
              disabled={computing}
            />
            <button
              onClick={handleCompute}
              disabled={computing || !expression.trim()}
              className="px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:bg-zinc-700 disabled:cursor-not-allowed font-semibold transition-colors"
            >
              {computing ? "Computing..." : "Compute"}
            </button>
            <button
              onClick={handleClear}
              className="px-6 py-3 rounded-xl bg-zinc-700 hover:bg-zinc-600 font-semibold transition-colors"
            >
              Clear
            </button>
          </div>
          
          <div className="text-sm text-zinc-400">
            Supported: +, -, *, /, ^ (power), sin, cos, tan, log, sqrt, abs, parentheses
          </div>
        </div>

        {/* Results Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CPU Panel */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="text-lg font-semibold mb-1">CPU (baseline)</div>
            <div className="text-sm text-zinc-400 mb-3">Regular single‑threaded evaluation on your machine.</div>
            <div className="text-sm mb-2">{cpuMs == null ? "—" : fmt(cpuMs)}</div>
            <textarea
              readOnly
              value={trunc(cpuOut)}
              className="w-full h-28 px-3 py-2 rounded-xl bg-black/40 border border-zinc-800 text-zinc-100 font-mono text-sm"
              placeholder="Results will appear here..."
            />
          </div>

          {/* TGO Panel */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="text-lg font-semibold mb-1">TGO (temporal)</div>
            <div className="text-sm text-zinc-400 mb-3">Planner→kernel pipeline on the same machine; falls back locally if planner unavailable.</div>
            <div className="text-sm mb-2">{tgoMs == null ? "—" : fmt(tgoMs)}</div>
            <textarea
              readOnly
              value={trunc(tgoOut)}
              className="w-full h-28 px-3 py-2 rounded-xl bg-black/40 border border-zinc-800 text-zinc-100 font-mono text-sm"
              placeholder="Results will appear here..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
