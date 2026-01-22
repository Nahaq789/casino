// app/page.tsx
"use client";

import { useState } from "react";
import {
  Strategy,
  GameResult,
  StrategyId,
  BetTarget,
  SimulationResults,
  RoundHistory,
} from "../type";

// 定数
const INITIAL_BALANCE = 100000;
const MIN_BET = 1000;
const BANKER_COMMISSION = 0.05;
const MAX_CONSECUTIVE_LOSSES = 3;

const STRATEGIES: Strategy[] = [
  { id: "bankerOnly", name: "バンカーのみ" },
  { id: "playerOnly", name: "プレイヤーのみ" },
  { id: "followWinner", name: "前回勝った方に賭ける" },
  { id: "alternate", name: "プレイヤー⇔バンカー交互" },
  { id: "ppbb", name: "PP→BB（2回ずつ交互）" },
];

// ユーティリティ関数
const playRound = (): GameResult => {
  const rand = Math.random() * 100;
  if (rand < 45.86) return "banker";
  if (rand < 90.48) return "player";
  return "tie";
};

const getBetTarget = (
  strategy: StrategyId,
  roundNum: number,
  lastWinner: BetTarget | null
): BetTarget => {
  switch (strategy) {
    case "bankerOnly":
      return "banker";
    case "playerOnly":
      return "player";
    case "followWinner":
      return lastWinner ?? "banker";
    case "alternate":
      return roundNum % 2 === 0 ? "player" : "banker";
    case "ppbb":
      const cycle = Math.floor((roundNum - 1) / 2) % 2;
      return cycle === 0 ? "player" : "banker";
    default:
      return "banker";
  }
};

const getResultText = (result: GameResult): string => {
  const map: Record<GameResult, string> = {
    banker: "バンカー",
    player: "プレイヤー",
    tie: "タイ",
  };
  return map[result];
};

const getResultColor = (result: GameResult): string => {
  const map: Record<GameResult, string> = {
    banker: "text-red-600",
    player: "text-blue-600",
    tie: "text-green-600",
  };
  return map[result];
};

const getTargetColor = (target: BetTarget): string => {
  return target === "banker" ? "text-red-400" : "text-blue-400";
};

const getTargetText = (target: BetTarget): string => {
  return target === "banker" ? "B" : "P";
};

export default function BaccaratSimulator() {
  const [results, setResults] = useState<SimulationResults | null>(null);
  const [history, setHistory] = useState<RoundHistory[]>([]);
  const [simCount, setSimCount] = useState<number>(100);
  const [betStrategy, setBetStrategy] = useState<StrategyId>("bankerOnly");
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const runSimulation = (): void => {
    setIsRunning(true);

    let balance = INITIAL_BALANCE;
    let currentBet = MIN_BET;
    let consecutiveLosses = 0;
    let lastWinner: BetTarget | null = null;
    const roundHistory: RoundHistory[] = [];
    let totalWins = 0;
    let totalLosses = 0;
    let totalTies = 0;

    for (let i = 0; i < simCount && balance >= currentBet; i++) {
      const roundNum = i + 1;
      const betTarget = getBetTarget(betStrategy, roundNum, lastWinner);
      const result = playRound();
      const betAmount = Math.min(currentBet, balance);

      const roundResult: RoundHistory = {
        round: roundNum,
        bet: betAmount,
        betTarget,
        result,
        balanceBefore: balance,
        balanceAfter: balance,
        action: "",
      };

      if (result === "tie") {
        totalTies++;
        roundResult.action = "タイ (返金)";
      } else {
        lastWinner = result;

        if (result === betTarget) {
          const winAmount =
            betTarget === "banker"
              ? Math.floor(betAmount * (1 - BANKER_COMMISSION))
              : betAmount;
          balance += winAmount;
          totalWins++;
          consecutiveLosses = 0;
          currentBet = MIN_BET;
          roundResult.action = `勝ち +${winAmount.toLocaleString()}円`;
        } else {
          balance -= betAmount;
          totalLosses++;
          consecutiveLosses++;

          if (consecutiveLosses >= MAX_CONSECUTIVE_LOSSES) {
            currentBet = MIN_BET;
            consecutiveLosses = 0;
            roundResult.action = `負け -${betAmount.toLocaleString()}円 (3連敗リセット)`;
          } else {
            currentBet = Math.min(currentBet * 2, balance);
            roundResult.action = `負け -${betAmount.toLocaleString()}円 (次回${currentBet.toLocaleString()}円)`;
          }
        }
      }

      roundResult.balanceAfter = balance;
      roundHistory.push(roundResult);
    }

    setResults({
      finalBalance: balance,
      profit: balance - INITIAL_BALANCE,
      totalRounds: roundHistory.length,
      wins: totalWins,
      losses: totalLosses,
      ties: totalTies,
    });
    setHistory(roundHistory);
    setIsRunning(false);
  };

  const exportCSV = (): void => {
    if (history.length === 0) return;

    const headers = [
      "回数",
      "賭け先",
      "賭け金",
      "結果",
      "所持金(前)",
      "所持金(後)",
      "損益",
      "アクション",
    ];
    const rows = history.map((h) => [
      h.round,
      h.betTarget === "banker" ? "バンカー" : "プレイヤー",
      h.bet,
      getResultText(h.result),
      h.balanceBefore,
      h.balanceAfter,
      h.balanceAfter - h.balanceBefore,
      h.action,
    ]);

    const bom = "\uFEFF";
    const csv = bom + [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `baccarat_${betStrategy}_${simCount}games.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async (): Promise<void> => {
    if (history.length === 0) return;

    const headers = [
      "回数",
      "賭け先",
      "賭け金",
      "結果",
      "所持金(前)",
      "所持金(後)",
      "損益",
      "アクション",
    ];
    const rows = history.map((h) => [
      h.round,
      h.betTarget === "banker" ? "バンカー" : "プレイヤー",
      h.bet,
      getResultText(h.result),
      h.balanceBefore,
      h.balanceAfter,
      h.balanceAfter - h.balanceBefore,
      h.action,
    ]);

    const tsv = [headers, ...rows].map((row) => row.join("\t")).join("\n");
    await navigator.clipboard.writeText(tsv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 max-w-4xl mx-auto bg-gray-900 min-h-screen text-white">
      <h1 className="text-2xl font-bold text-center mb-6 text-yellow-400">
        🎰 バカラ マーチンゲール法シミュレーター
      </h1>

      <div className="bg-gray-800 rounded-lg p-4 mb-4">
        <h2 className="font-bold mb-2 text-yellow-300">ルール設定</h2>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• 初期所持金: ¥100,000 / 最低ベット: ¥1,000</li>
          <li>• バンカー勝利時は5%コミッション</li>
          <li>• 勝ち→¥1,000に戻す / 負け→2倍賭け / 3連敗→リセット</li>
        </ul>
      </div>

      <div className="bg-gray-800 rounded-lg p-4 mb-4">
        <h2 className="font-bold mb-3 text-yellow-300">賭け方戦略</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {STRATEGIES.map((s) => (
            <label
              key={s.id}
              className={`flex items-center p-2 rounded cursor-pointer transition ${
                betStrategy === s.id
                  ? "bg-yellow-600"
                  : "bg-gray-700 hover:bg-gray-600"
              }`}
            >
              <input
                type="radio"
                name="strategy"
                value={s.id}
                checked={betStrategy === s.id}
                onChange={(e) => setBetStrategy(e.target.value as StrategyId)}
                className="mr-2"
              />
              <span className="text-sm">{s.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <label className="text-sm">
          ゲーム数:
          <input
            type="number"
            value={simCount}
            onChange={(e) =>
              setSimCount(Math.max(1, parseInt(e.target.value) || 1))
            }
            className="ml-2 w-24 px-2 py-1 rounded bg-gray-700 text-white"
            min={1}
            max={1000}
          />
        </label>
        <button
          onClick={runSimulation}
          disabled={isRunning}
          className="px-6 py-2 bg-yellow-500 text-black font-bold rounded hover:bg-yellow-400 disabled:opacity-50"
        >
          {isRunning ? "実行中..." : "シミュレーション開始"}
        </button>
      </div>

      {results && (
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <h2 className="font-bold mb-3 text-yellow-300">結果サマリー</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-gray-700 p-3 rounded">
              <div className="text-sm text-gray-400">最終所持金</div>
              <div
                className={`text-xl font-bold ${
                  results.finalBalance >= INITIAL_BALANCE
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                ¥{results.finalBalance.toLocaleString()}
              </div>
            </div>
            <div className="bg-gray-700 p-3 rounded">
              <div className="text-sm text-gray-400">損益</div>
              <div
                className={`text-xl font-bold ${
                  results.profit >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {results.profit >= 0 ? "+" : ""}¥
                {results.profit.toLocaleString()}
              </div>
            </div>
            <div className="bg-gray-700 p-3 rounded">
              <div className="text-sm text-gray-400">プレイ回数</div>
              <div className="text-xl font-bold">{results.totalRounds}回</div>
            </div>
            <div className="bg-gray-700 p-3 rounded">
              <div className="text-sm text-gray-400">勝ち</div>
              <div className="text-xl font-bold text-green-400">
                {results.wins}回
              </div>
            </div>
            <div className="bg-gray-700 p-3 rounded">
              <div className="text-sm text-gray-400">負け</div>
              <div className="text-xl font-bold text-red-400">
                {results.losses}回
              </div>
            </div>
            <div className="bg-gray-700 p-3 rounded">
              <div className="text-sm text-gray-400">タイ</div>
              <div className="text-xl font-bold text-yellow-400">
                {results.ties}回
              </div>
            </div>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-yellow-300">ゲーム履歴</h2>
            <div className="flex gap-2">
              <button
                onClick={copyToClipboard}
                className="px-3 py-1 bg-gray-600 text-sm rounded hover:bg-gray-500"
              >
                {copied ? "✓ コピー完了" : "📋 コピー"}
              </button>
              <button
                onClick={exportCSV}
                className="px-3 py-1 bg-green-600 text-sm rounded hover:bg-green-500"
              >
                📥 CSV保存
              </button>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-800">
                <tr className="text-gray-400 border-b border-gray-600">
                  <th className="py-2 text-left">回</th>
                  <th className="py-2 text-center">賭先</th>
                  <th className="py-2 text-right">賭金</th>
                  <th className="py-2 text-center">結果</th>
                  <th className="py-2 text-right">所持金</th>
                  <th className="py-2 text-left">アクション</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.round} className="border-b border-gray-700">
                    <td className="py-1">{h.round}</td>
                    <td
                      className={`py-1 text-center font-bold ${getTargetColor(
                        h.betTarget
                      )}`}
                    >
                      {getTargetText(h.betTarget)}
                    </td>
                    <td className="py-1 text-right">
                      ¥{h.bet.toLocaleString()}
                    </td>
                    <td
                      className={`py-1 text-center font-bold ${getResultColor(
                        h.result
                      )}`}
                    >
                      {getResultText(h.result)}
                    </td>
                    <td className="py-1 text-right">
                      ¥{h.balanceAfter.toLocaleString()}
                    </td>
                    <td className="py-1 text-xs text-gray-400">{h.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
