// 型定義
export type BetTarget = "banker" | "player";
export type GameResult = "banker" | "player" | "tie";
export type StrategyId =
  | "bankerOnly"
  | "playerOnly"
  | "followWinner"
  | "alternate"
  | "ppbb";

export interface Strategy {
  id: StrategyId;
  name: string;
}

export interface RoundHistory {
  round: number;
  bet: number;
  betTarget: BetTarget;
  result: GameResult;
  balanceBefore: number;
  balanceAfter: number;
  action: string;
}

export interface SimulationResults {
  finalBalance: number;
  profit: number;
  totalRounds: number;
  wins: number;
  losses: number;
  ties: number;
}
