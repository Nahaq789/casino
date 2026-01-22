import { GameResult } from "./type";

export const playRound = (): GameResult => {
  const rand = Math.random() * 100;
  if (rand < 45.86) return "banker";
  if (rand < 90.48) return "player";
  return "tie";
};
