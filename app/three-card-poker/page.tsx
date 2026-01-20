'use client';

import React, { useState } from 'react';
import { Spade, Heart, Diamond, Club } from 'lucide-react';

type Suit = '♠' | '♥' | '♦' | '♣';
type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

interface Card {
  suit: Suit;
  rank: Rank;
}

interface HandRank {
  rank: number;
  name: string;
  value: number;
}

type GamePhase = 'betting' | 'dealt' | 'result';

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

const ThreeCardPoker: React.FC = () => {
  const [chips, setChips] = useState<number>(100000);
  const [ante, setAnte] = useState<number>(1000);
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [dealerCards, setDealerCards] = useState<Card[]>([]);
  const [gamePhase, setGamePhase] = useState<GamePhase>('betting');
  const [message, setMessage] = useState<string>('アンティを設定してディールしてください');
  const [showDealerCards, setShowDealerCards] = useState<boolean>(false);

  const createDeck = (): Card[] => {
    const deck: Card[] = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ suit, rank });
      }
    }
    return deck;
  };

  const shuffleDeck = (deck: Card[]): Card[] => {
    const newDeck = [...deck];
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    return newDeck;
  };

  const getHandRank = (cards: Card[]): HandRank => {
    const ranks = cards.map(c => RANK_VALUES[c.rank]).sort((a, b) => b - a);
    const suits = cards.map(c => c.suit);
    const isFlush = suits.every(s => s === suits[0]);
    const isStraight = ranks[0] - ranks[1] === 1 && ranks[1] - ranks[2] === 1;
    const isAceLowStraight = ranks[0] === 14 && ranks[1] === 3 && ranks[2] === 2;

    if (isFlush && (isStraight || isAceLowStraight)) {
      return { rank: 5, name: 'ストレートフラッシュ', value: ranks[0] };
    }
    if (ranks[0] === ranks[1] && ranks[1] === ranks[2]) {
      return { rank: 4, name: 'スリーカード', value: ranks[0] };
    }
    if (isStraight || isAceLowStraight) {
      return { rank: 3, name: 'ストレート', value: ranks[0] };
    }
    if (isFlush) {
      return { rank: 2, name: 'フラッシュ', value: ranks[0] * 1000 + ranks[1] * 10 + ranks[2] };
    }
    if (ranks[0] === ranks[1] || ranks[1] === ranks[2]) {
      const pairRank = ranks[0] === ranks[1] ? ranks[0] : ranks[1];
      return { rank: 1, name: 'ワンペア', value: pairRank * 100 + Math.max(...ranks.filter(r => r !== pairRank)) };
    }
    return { rank: 0, name: 'ハイカード', value: ranks[0] * 1000 + ranks[1] * 10 + ranks[2] };
  };

  const dealCards = (): void => {
    if (ante > chips) {
      setMessage('所持金が足りません');
      return;
    }

    const deck = shuffleDeck(createDeck());
    setPlayerCards(deck.slice(0, 3));
    setDealerCards(deck.slice(3, 6));
    setGamePhase('dealt');
    setShowDealerCards(false);
    setMessage('プレイまたはフォールドを選択してください');
    setChips(chips - ante);
  };

  const fold = (): void => {
    setGamePhase('result');
    setShowDealerCards(true);
    setMessage(`フォールドしました。アンティ ${ante.toLocaleString()}円を失いました。`);

    setTimeout(() => {
      setGamePhase('betting');
      setPlayerCards([]);
      setDealerCards([]);
      setMessage('次のゲームを開始してください');
    }, 3000);
  };

  const play = (): void => {
    if (ante > chips) {
      setMessage('所持金が足りません');
      return;
    }

    // プレイベット分を引く
    const newChips = chips - ante;
    setChips(newChips);
    setShowDealerCards(true);
    setGamePhase('result');

    const playerHand = getHandRank(playerCards);
    const dealerHand = getHandRank(dealerCards);
    const dealerQualifies = dealerHand.rank > 0 || RANK_VALUES[dealerCards.map(c => c.rank).sort((a, b) => RANK_VALUES[b] - RANK_VALUES[a])[0]] >= 12;

    let winAmount = 0;
    let resultMessage = '';

    if (!dealerQualifies) {
      // ディーラー不成立：アンティのみ2倍返却、プレイベットは返却
      winAmount = ante * 3; // ante(最初) + ante(プレイ) + ante(配当)
      resultMessage = `ディーラー不成立。アンティ配当獲得! (+${ante.toLocaleString()}円)`;
    } else if (playerHand.rank > dealerHand.rank || (playerHand.rank === dealerHand.rank && playerHand.value > dealerHand.value)) {
      // 勝利：アンティとプレイベット両方に配当
      let bonus = 0;
      if (playerHand.rank === 5) bonus = ante * 5;
      else if (playerHand.rank === 4) bonus = ante * 4;
      else if (playerHand.rank === 3) bonus = ante * 1;

      winAmount = ante * 4 + bonus; // ante*2(元金) + ante*2(配当) + bonus
      const profit = winAmount - ante * 2;
      resultMessage = `勝利! ${playerHand.name} vs ${dealerHand.name} (+${profit.toLocaleString()}円${bonus > 0 ? ` ボーナス含む` : ''})`;
    } else if (playerHand.rank === dealerHand.rank && playerHand.value === dealerHand.value) {
      // 引き分け：ベット返却
      winAmount = ante * 2;
      resultMessage = `引き分け。ベット返却 ${playerHand.name}`;
    } else {
      // 敗北：没収（winAmount = 0）
      winAmount = 0;
      const totalLost = ante * 2;
      resultMessage = `敗北... ${playerHand.name} vs ${dealerHand.name} (-${totalLost.toLocaleString()}円)`;
    }

    setChips(newChips + winAmount);
    setMessage(resultMessage);

    setTimeout(() => {
      setGamePhase('betting');
      setPlayerCards([]);
      setDealerCards([]);
      setMessage('次のゲームを開始してください');
    }, 4000);
  };

  const CardComponent: React.FC<{ card: Card; hidden: boolean }> = ({ card, hidden }) => {
    const getSuitIcon = (suit: Suit) => {
      switch (suit) {
        case '♠': return <Spade className="w-6 h-6" />;
        case '♥': return <Heart className="w-6 h-6" />;
        case '♦': return <Diamond className="w-6 h-6" />;
        case '♣': return <Club className="w-6 h-6" />;
      }
    };

    const isRed = card.suit === '♥' || card.suit === '♦';

    if (hidden) {
      return (
        <div className="w-24 h-36 bg-blue-600 border-2 border-blue-700 rounded-lg flex items-center justify-center">
          <div className="text-white text-4xl">🂠</div>
        </div>
      );
    }

    return (
      <div className="w-24 h-36 bg-white border-2 border-gray-300 rounded-lg p-2 flex flex-col justify-between shadow-lg">
        <div className={`flex flex-col items-center ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
          <div className="text-2xl font-bold">{card.rank}</div>
          {getSuitIcon(card.suit)}
        </div>
        <div className={`flex flex-col items-center rotate-180 ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
          <div className="text-2xl font-bold">{card.rank}</div>
          {getSuitIcon(card.suit)}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-800 to-green-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white text-center mb-8">スリーカードポーカー</h1>

        <div className="bg-green-700 rounded-lg p-6 mb-6 shadow-xl">
          <div className="flex justify-between items-center text-white text-xl mb-4">
            <div className="flex items-center gap-4">
              <span className="font-bold">所持金:</span>
              <input
                type="number"
                step="1000"
                value={chips}
                onChange={(e) => setChips(Math.max(0, parseInt(e.target.value), 0))}
                className="px-3 py-1 rounded border-2 border-yellow-400 w-32 text-gray-900"
                disabled={gamePhase !== 'betting'}
              />
              <span>円 💰</span>
            </div>
            <div>アンティ: {ante.toLocaleString()}円</div>
          </div>

          <div className="text-center mb-6">
            <p className="text-white text-lg font-semibold">{message}</p>
          </div>

          {/* ディーラーカード */}
          <div className="mb-8">
            <h2 className="text-white text-xl mb-3">ディーラー</h2>
            <div className="flex gap-4 justify-center">
              {dealerCards.length > 0 ? (
                dealerCards.map((card, i) => (
                  <CardComponent key={i} card={card} hidden={!showDealerCards} />
                ))
              ) : (
                <div className="text-white text-lg">待機中...</div>
              )}
            </div>
          </div>

          {/* プレイヤーカード */}
          <div className="mb-6">
            <h2 className="text-white text-xl mb-3">あなた</h2>
            <div className="flex gap-4 justify-center">
              {playerCards.length > 0 ? (
                playerCards.map((card, i) => (
                  <CardComponent key={i} card={card} hidden={false} />
                ))
              ) : (
                <div className="text-white text-lg">待機中...</div>
              )}
            </div>
          </div>

          {/* コントロール */}
          <div className="flex flex-col gap-4">
            {gamePhase === 'betting' && (
              <div className="flex gap-4 items-center justify-center">
                <label className="text-white font-semibold">アンティ:</label>
                <input
                  type="number"
                  min="1000"
                  max={chips}
                  step="1000"
                  value={ante}
                  onChange={(e) => setAnte(Math.max(1000, parseInt(e.target.value) || 1000))}
                  className="px-4 py-2 rounded border-2 border-yellow-400 w-32 text-lg"
                />
                <button
                  onClick={dealCards}
                  className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-3 px-8 rounded-lg shadow-lg transition-all"
                >
                  ディール
                </button>
              </div>
            )}

            {gamePhase === 'dealt' && (
              <div className="flex gap-4 justify-center">
                <button
                  onClick={fold}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition-all"
                >
                  フォールド
                </button>
                <button
                  onClick={play}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition-all"
                >
                  プレイ (×2ベット)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ルール説明 */}
        <div className="bg-white rounded-lg p-6 shadow-xl">
          <h3 className="text-xl text-black font-bold mb-3">ルール</h3>
          <ul className="text-sm text-black space-y-1">
            <li>• 所持金は自由に変更可能(最低1,000円、ゲーム中は変更不可)</li>
            <li>• アンティを賭けてディールボタンを押すとゲーム開始(最低1,000円)</li>
            <li>• カードを見て、フォールド(降りる)かプレイ(続ける)を選択</li>
            <li>• プレイを選ぶとアンティと同額の追加ベットが必要(合計アンティ×2)</li>
            <li>• ディーラーはQ以上で勝負成立(クオリファイ)</li>
            <li>• 役の強さ: ストレートフラッシュ &gt; スリーカード &gt; ストレート &gt; フラッシュ &gt; ワンペア &gt; ハイカード</li>
            <li>• 配当: 勝利時アンティ+プレイベット両方に1:1配当、ボーナス配当あり</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ThreeCardPoker;
