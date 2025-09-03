"use client"
import { useState, useEffect, useRef, useCallback } from 'react';

// --- 定数設定 ---
const GAME_WIDTH = 800; // ゲームエリアの幅
const GAME_HEIGHT = 600; // ゲームエリアの高さ
const PADDLE_WIDTH = 15; // パドルの幅
const PADDLE_HEIGHT = 100; // パドルの高さ
const BALL_RADIUS = 10; // ボールの半径
const PADDLE_SPEED = 10; // 相手パドルの最大速度
const INITIAL_BALL_SPEED = 6; // ボールの初期速度
const WINNING_SCORE = 5; // 勝利スコア

// --- メインのゲームコンポーネント ---
export default function App() {
  // --- State管理 ---
  // プレイヤーパドルのY座標
  const [playerPaddleY, setPlayerPaddleY] = useState(GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2);
  // 相手パドルのY座標
  const [opponentPaddleY, setOpponentPaddleY] = useState(GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2);
  // ボールの位置
  const [ballPosition, setBallPosition] = useState({ x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 });
  // ボールの速度（useRefで管理し、再レンダリングを防止）
  const ballVelocity = useRef({ dx: 0, dy: 0 });
  // スコア
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  // ゲームの状態
  const [gameStatus, setGameStatus] = useState('before-start'); // 'before-start', 'playing', 'game-over'
  
  const gameAreaRef = useRef<SVGSVGElement | null>(null);

  // --- ゲームロジック ---

  // ボールを中央にリセットし、ランダムな方向へ動かす
  const resetBall = useCallback((servePlayer: Boolean) => {
    setBallPosition({ x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 });
    let angle = Math.random() * Math.PI / 2 - Math.PI / 4; // -45度から+45度の間
    if (!servePlayer) {
      angle += Math.PI; // 相手サーブの場合は180度回転
    }
    ballVelocity.current = {
      dx: INITIAL_BALL_SPEED * Math.cos(angle),
      dy: INITIAL_BALL_SPEED * Math.sin(angle),
    };
  }, []);
  
  // ゲーム開始処理
  const startGame = () => {
    setPlayerScore(0);
    setOpponentScore(0);
    setGameStatus('playing');
    resetBall(true); // プレイヤーサーブで開始
  };

  // ゲームループ（useEffect内で実行）
  useEffect(() => {
    if (gameStatus !== 'playing') return;

    const gameLoop = () => {
      // 1. ボールの移動
      let newBallPos = {
        x: ballPosition.x + ballVelocity.current.dx,
        y: ballPosition.y + ballVelocity.current.dy,
      };

      // 2. 衝突判定
      // 上下の壁との衝突
      if (newBallPos.y - BALL_RADIUS < 0 || newBallPos.y + BALL_RADIUS > GAME_HEIGHT) {
        ballVelocity.current.dy *= -1;
        newBallPos.y = ballPosition.y + ballVelocity.current.dy; // 壁にめり込まないように調整
      }

      // パドルとの衝突判定
      const playerPaddle = { x: 30, y: playerPaddleY, width: PADDLE_WIDTH, height: PADDLE_HEIGHT };
      const opponentPaddle = { x: GAME_WIDTH - 30 - PADDLE_WIDTH, y: opponentPaddleY, width: PADDLE_WIDTH, height: PADDLE_HEIGHT };

      // プレイヤーパドル
      if (
        newBallPos.x - BALL_RADIUS < playerPaddle.x + playerPaddle.width &&
        newBallPos.x + BALL_RADIUS > playerPaddle.x &&
        newBallPos.y > playerPaddle.y &&
        newBallPos.y < playerPaddle.y + playerPaddle.height &&
        ballVelocity.current.dx < 0
      ) {
        ballVelocity.current.dx *= -1.1; // 速度を少し上げる
        // パドルのどこに当たったかでY方向の速度を変える
        const relativeIntersectY = (playerPaddle.y + playerPaddle.height / 2) - newBallPos.y;
        ballVelocity.current.dy = -relativeIntersectY * 0.1;
      }
      
      // 相手パドル
      if (
        newBallPos.x + BALL_RADIUS > opponentPaddle.x &&
        newBallPos.x - BALL_RADIUS < opponentPaddle.x + opponentPaddle.width &&
        newBallPos.y > opponentPaddle.y &&
        newBallPos.y < opponentPaddle.y + opponentPaddle.height &&
        ballVelocity.current.dx > 0
      ) {
        ballVelocity.current.dx *= -1.1; // 速度を少し上げる
        const relativeIntersectY = (opponentPaddle.y + opponentPaddle.height / 2) - newBallPos.y;
        ballVelocity.current.dy = -relativeIntersectY * 0.1;
      }

      // 3. 得点判定
      // 相手のゴール
      if (newBallPos.x - BALL_RADIUS < 0) {
        setOpponentScore(s => s + 1);
        resetBall(false); // 相手サーブ
        return;
      }
      // プレイヤーのゴール
      if (newBallPos.x + BALL_RADIUS > GAME_WIDTH) {
        setPlayerScore(s => s + 1);
        resetBall(true); // プレイヤーサーブ
        return;
      }

      // 4. 相手パドルのAI制御
      const opponentCenter = opponentPaddleY + PADDLE_HEIGHT / 2;
      if (opponentCenter < newBallPos.y - 10) {
          setOpponentPaddleY(y => Math.min(y + PADDLE_SPEED, GAME_HEIGHT - PADDLE_HEIGHT));
      } else if (opponentCenter > newBallPos.y + 10) {
          setOpponentPaddleY(y => Math.max(y - PADDLE_SPEED, 0));
      }

      // ボールの位置を更新
      setBallPosition(newBallPos);
    };

    const animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [ballPosition, gameStatus, playerPaddleY, opponentPaddleY, resetBall]);
  
  // 勝利判定
  useEffect(() => {
    if (playerScore >= WINNING_SCORE || opponentScore >= WINNING_SCORE) {
      setGameStatus('game-over');
      ballVelocity.current = { dx: 0, dy: 0 };
    }
  }, [playerScore, opponentScore]);


  // プレイヤーのパドル操作
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!gameAreaRef.current) return;
    const rect = gameAreaRef.current.getBoundingClientRect();
    const newY = e.clientY - rect.top - PADDLE_HEIGHT / 2;
    // パドルがエリア外に出ないように制限
    setPlayerPaddleY(Math.max(0, Math.min(newY, GAME_HEIGHT - PADDLE_HEIGHT)));
  };

  // --- レンダリング ---
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-800 text-white font-sans p-4">
      <h1 className="text-4xl font-bold mb-2 text-yellow-300 tracking-wider">React Hockey</h1>
      <div className="flex justify-around w-full max-w-4xl mb-2 text-2xl font-mono">
        <div className="w-1/3 text-center">YOU: {playerScore}</div>
        <div className="w-1/3 text-center text-gray-400 text-lg">First to {WINNING_SCORE} wins</div>
        <div className="w-1/3 text-center">CPU: {opponentScore}</div>
      </div>

      <div className="relative shadow-2xl" onMouseMove={handleMouseMove}>
        <svg
          ref={gameAreaRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          className="bg-black border-4 border-gray-400 rounded-lg"
        >
          {/* センターライン */}
          <line
            x1={GAME_WIDTH / 2}
            y1="0"
            x2={GAME_WIDTH / 2}
            y2={GAME_HEIGHT}
            stroke="white"
            strokeWidth="2"
            strokeDasharray="10 10"
          />

          {/* プレイヤーパドル */}
          <rect
            x={30}
            y={playerPaddleY}
            width={PADDLE_WIDTH}
            height={PADDLE_HEIGHT}
            fill="white"
            rx="5"
          />

          {/* 相手パドル */}
          <rect
            x={GAME_WIDTH - 30 - PADDLE_WIDTH}
            y={opponentPaddleY}
            width={PADDLE_WIDTH}
            height={PADDLE_HEIGHT}
            fill="white"
            rx="5"
          />

          {/* ボール */}
          {gameStatus !== 'before-start' && (
             <circle
               cx={ballPosition.x}
               cy={ballPosition.y}
               r={BALL_RADIUS}
               fill="yellow"
             />
          )}
        </svg>

        {/* ゲーム開始前/終了後オーバーレイ */}
        {gameStatus !== 'playing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-70">
            {gameStatus === 'before-start' && (
                <>
                    <h2 className="text-5xl font-bold mb-8 text-yellow-400">Welcome!</h2>
                    <button 
                        onClick={startGame}
                        className="px-8 py-4 text-2xl font-bold text-gray-900 bg-yellow-400 rounded-lg hover:bg-yellow-300 transition-colors shadow-lg"
                    >
                        Start Game
                    </button>
                </>
            )}
            {gameStatus === 'game-over' && (
                <>
                    <h2 className="text-6xl font-bold mb-4">
                        {playerScore > opponentScore ? 'You Win!' : 'Game Over'}
                    </h2>
                    <p className="text-xl mb-8">Final Score: {playerScore} - {opponentScore}</p>
                    <button 
                        onClick={startGame}
                        className="px-8 py-4 text-2xl font-bold text-gray-900 bg-yellow-400 rounded-lg hover:bg-yellow-300 transition-colors shadow-lg"
                    >
                        Play Again
                    </button>
                </>
            )}
          </div>
        )}
      </div>
      <p className="mt-4 text-gray-400">Move your mouse up and down to control the paddle.</p>
    </div>
  );
}
