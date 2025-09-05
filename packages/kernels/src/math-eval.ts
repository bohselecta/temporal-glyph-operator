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
    if (!char) break;
    
    if (/\s/.test(char)) {
      i++;
      continue;
    }
    
    if (/\d/.test(char) || char === '.') {
      let number = '';
      while (i < expression.length) {
        const currentChar = expression[i];
        if (!currentChar || (!(/\d/.test(currentChar)) && currentChar !== '.')) break;
        number += currentChar;
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
    
    if (char in OPERATORS) {
      tokens.push({ type: 'operator', value: char });
      i++;
      continue;
    }
    
    if (/[a-zA-Z]/.test(char)) {
      let func = '';
      while (i < expression.length) {
        const currentChar = expression[i];
        if (!currentChar || !(/[a-zA-Z]/.test(currentChar))) break;
        func += currentChar;
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
      if (!op) throw new Error(`Unknown operator: ${token.value}`);
      
      while (
        stack.length > 0 &&
        stack[stack.length - 1] &&
        stack[stack.length - 1]!.type !== 'lparen' &&
        (
          stack[stack.length - 1]!.type === 'function' ||
          (
            stack[stack.length - 1]!.type === 'operator' &&
            (
              OPERATORS[stack[stack.length - 1]!.value]!.precedence > op.precedence ||
              (OPERATORS[stack[stack.length - 1]!.value]!.precedence === op.precedence && op.associativity === 'left')
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
      while (stack.length > 0 && stack[stack.length - 1] && stack[stack.length - 1]!.type !== 'lparen') {
        output.push(stack.pop()!);
      }
      if (stack.length === 0) {
        throw new Error('Mismatched parentheses');
      }
      stack.pop(); // Remove the left parenthesis
      
      if (stack.length > 0 && stack[stack.length - 1] && stack[stack.length - 1]!.type === 'function') {
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
  
  const result = stack[0];
  if (result === undefined) {
    throw new Error('Invalid expression result');
  }
  
  return result;
}

/**
 * Safely evaluates a mathematical expression using shunting-yard algorithm
 * @param expression - Mathematical expression string
 * @returns Evaluation result
 * @throws Error if expression is invalid
 */
export function evaluateExpression(expression: string): number {
  try {
    const tokens = tokenize(expression.trim());
    const rpn = toRPN(tokens);
    return evaluateRPN(rpn);
  } catch (error) {
    throw new Error(`Math evaluation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
