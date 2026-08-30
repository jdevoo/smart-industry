declare module 'javascript-lp-solver' {
  export interface LpModel {
    optimize: string;
    opType: 'max' | 'min';
    constraints: Record<string, { equal?: number; min?: number; max?: number }>;
    variables: Record<string, Record<string, number>>;
    ints?: Record<string, number>;
    binaries?: Record<string, number>;
  }

  export interface LpResult {
    feasible: boolean;
    result: number;
    bounded?: boolean;
    isIntegral?: boolean;
    [key: string]: any;
  }

  export function Solve(model: LpModel): LpResult;
  
  const solver: {
    Solve: typeof Solve;
  };

  export default solver;
}
