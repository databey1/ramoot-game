import React, { useState, useEffect } from 'react';
import { Trophy, Users, Clock, Zap, LogOut } from 'lucide-react';

const QUESTIONS = [
  { id: 1, questionText: "Ditching esnasında tüm sınıfı raft'e çekerken tüm gün ayak görüp yorgunluktan ve nefessizlikten inkapasite olan kimdir?", options: ["Cansu", "İlkay", "Aleyna", "Ezher"], correctAnswerIndex: 1, points: 1000 },
  { id: 2, questionText: "Fındık anonsunu son dakika değişikliği ile anons kitabına ekleten kimdir?", options: ["Aylin", "Serkan", "Kübra", "Gürkan"], correctAnswerIndex: 3, points: 1000 },
  { id: 3, questionText: "Yolcu acil olarak işemeye çalışırken PDF'e göre karar veren kimdi?", options: ["Rana", "Fadime", "Ramazan", "Berke"], correctAnswerIndex: 2, points: 1000 },
  { id: 4, questionText: "Arnavutköy isimli zehirli oku İLK sıkan kimdir?", options: ["Fadime", "Zeynep", "Kübra", "Mert"], correctAnswerIndex: 2, points: 1000 },
  { id: 5, questionText: "Ev kiralarıyla oto galeri açmaya yemin etmiş ekip arkadaşımız kimdir?", options: ["Hatice", "Hatice Kübra", "Özlem", "Mert"], correctAnswerIndex: 3, points: 1000 },
  { id: 6, questionText: "Allahın hakkı üçtür diyip her sınava 3 kere kim girmişti?", options: ["Aylin", "Rana", "Aleyna", "Oğuzhan"], correctAnswerIndex: 0, points: 1000 },
  { id: 7, questionText: "Yangın tiplerine yeni bir soluk getirerek 'alpha türü' yangını jargona sokan kimdi?", options: ["Ezher", "Fadime", "Özlem", "Gürkan"], correctAnswerIndex: 0, points: 1000 },
  { id: 8, questionText: "Sınıfımızın Ankaralı zengin ismi kimdir?", options: ["İlkay", "Rana", "Gürkan", "Ezher"], correctAnswerIndex: 1, points: 1000 },
  { id: 9, questionText: "Üniversiteyi 4.sınıfta dondurduğuna şerefi ve namusu üzerine yemin eden arkadaşımız kimdir?", options: ["Özlem", "Zeynep", "Berke", "Ramazan"], correctAnswerIndex: 0, points: 1000 },
  { id: 10, questionText: "Bu testi çözerken bile duygulanıp ağlama ihtimali olan kimdir?", options: ["Kübra", "Hatice Kübra", "Hatice", "Aleyna"], correctAnswerIndex: 3, points: 1000 },
  { id: 11, questionText: "Bizi manitadan ayrı düşünmeyip sabahları gruba güno aşkım mesajı atan kimdir?", options: ["Mert", "Oğuz", "Berke", "Gürkan"], correctAnswerIndex: 2, points: 1000 },
  { id: 12, questionText: "Japonya'da anime festivallerinde edindiği CRM becerileriyle derste halka problemini tekte çözen kimdir?", options: ["Ramazan", "Kübra", "Berke", "Cansu"], correctAnswerIndex: 3, points: 1000 },
  { id: 13, questionText: "İş çıkışı piercing ve sayısız küpeyle hardcore death metalci takılan arkadaşımız kimdir", options: ["Rana", "Fadime", "Zeynep", "Aylin"], correctAnswerIndex: 2, points: 1000 },
  { id: 14, questionText: "Görme engelli yolcuya bağırarak dudaklarımı görebiliyor musun diyen kimdir?", options: ["İlkay", "Serkan", "Oğuz", "Mert"], correctAnswerIndex: 2, points: 1000 },
  { id: 15, questionText: "Apronda babadan yadigar doblosuyla sıfır çizmek isteyen kimdir?", options: ["Hatice Kübra", "Ramazan", "Gürkan", "Hatice"], correctAnswerIndex: 3, points: 1000 },
  { id: 16, questionText: "Ders çalışma bahanesiyle tüm sınıfı sürekli Gloria Jeanse götürüp şubeden kar payı alan kimdir?", options: ["Aleyna", "Fadime", "Ezher", "Rana"], correctAnswerIndex: 1, points: 1000 },
  { id: 17, questionText: "Rusyanın eşsiz bucaksız tundralarından, Ciddenin kavurucu sıcaklarına kadar tüm coğrafya bilgisini bize aktaran kişi kimdir?", options: ["Hatice Kübra", "Gürkan", "Ezher", "İlkay"], correctAnswerIndex: 0, points: 1000 },
  { id: 18, questionText: "Uğur Dündar gibi araştırmacı gazeteci, Picasso gibi soyut bir ressam ve İngiltere Kralı gibi İngilicce bilen kimdir?", options: ["Zeynep", "Cansu", "Serkan", "Oğuz"], correctAnswerIndex: 2, points: 1000 },
];

const OPTION_COLORS = [
  { bg: 'bg-red-500', hover: 'hover:bg-red-600', text: 'text-white' },
  { bg: 'bg-blue-500', hover: 'hover:bg-blue-600', text: 'text-white' },
  { bg: 'bg-yellow-500', hover: 'hover:bg-yellow-600', text: 'text-white' },
  { bg: 'bg-green-500', hover: 'hover:bg-green-600', text: 'text-white' },
];

export default function KahootQuiz() {
  const [gameState, setGameState] = useState('login'); // login, start, playing, result, leaderboard
  const [userName, setUserName] = useState('');
  const [userNameInput, setUserNameInput] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);
  const [answers, setAnswers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);

  // Leaderboard'u yükle
  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const data = await window.storage.get('leaderboard-scores', true);
      if (data) {
        setLeaderboard(JSON.parse(data.value));
      }
    } catch (e) {
      console.log('Leaderboard yüklenemedi');
    }
  };

  const saveToLeaderboard = async (finalScore) => {
    try {
      const currentBoard = leaderboard || [];
      const newEntry = {
        name: userName,
        score: finalScore,
        date: new Date().toLocaleString('tr-TR'),
      };
      const updatedBoard = [...currentBoard, newEntry].sort((a, b) => b.score - a.score);
      await window.storage.set('leaderboard-scores', JSON.stringify(updatedBoard), true);
      setLeaderboard(updatedBoard);
    } catch (e) {
      console.log('Leaderboard kaydedilemedi');
    }
  };

  useEffect(() => {
    if (gameState === 'playing' && !showResult && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !showResult && gameState === 'playing') {
      handleAnswer(null);
    }
  }, [timeLeft, gameState, showResult]);

  const handleLogin = () => {
    if (userNameInput.trim().length > 0) {
      setUserName(userNameInput);
      setGameState('start');
    }
  };

  const startGame = () => {
    setGameState('playing');
    setCurrentQuestion(0);
    setScore(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setTimeLeft(20);
    setAnswers([]);
  };

  const handleAnswer = (answerIndex) => {
    if (showResult) return;
    
    setSelectedAnswer(answerIndex);
    setShowResult(true);
    
    const question = QUESTIONS[currentQuestion];
    const isCorrect = answerIndex === question.correctAnswerIndex;
    
    if (isCorrect) {
      const timeBonus = Math.floor(timeLeft * 10);
      const earnedPoints = question.points + timeBonus;
      setScore(score + earnedPoints);
    }
    
    setAnswers([...answers, {
      questionId: question.id,
      selected: answerIndex,
      correct: question.correctAnswerIndex,
      isCorrect
    }]);
  };

  const nextQuestion = () => {
    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setTimeLeft(20);
    } else {
      saveToLeaderboard(score);
      setGameState('result');
    }
  };

  const logout = () => {
    setUserName('');
    setUserNameInput('');
    setGameState('login');
    loadLeaderboard();
  };

  // LOGIN SCREEN
  if (gameState === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500 flex items-center justify-center p-4">
        <div className="text-center space-y-8 max-w-md w-full">
          <div className="space-y-4">
            <h1 className="text-7xl font-black text-white drop-shadow-2xl tracking-tight">
              KAHOOT!
            </h1>
            <p className="text-2xl text-white/90 font-semibold">Arkadaş Trivia Zamanı 🎉</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Adını gir..."
                value={userNameInput}
                onChange={(e) => setUserNameInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full px-6 py-4 rounded-full text-2xl font-bold text-center border-4 border-white/50 bg-white/20 backdrop-blur-md text-white placeholder-white/50 focus:outline-none focus:border-white"
              />
            </div>
            <button
              onClick={handleLogin}
              className="w-full bg-white text-purple-600 px-8 py-4 rounded-full text-2xl font-black hover:scale-105 transition-transform shadow-2xl hover:shadow-purple-500/50"
            >
              Devam Et →
            </button>
          </div>

          <div className="bg-white/20 backdrop-blur-md rounded-3xl p-6 border-4 border-white/30">
            <p className="text-white font-bold mb-3">🏆 TOP 5 OYUNCU</p>
            <div className="space-y-2">
              {leaderboard.slice(0, 5).map((entry, idx) => (
                <div key={idx} className="flex justify-between items-center text-white">
                  <span className="font-bold">{idx + 1}. {entry.name}</span>
                  <span className="text-yellow-300 font-black">{entry.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // START SCREEN
  if (gameState === 'start') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500 flex items-center justify-center p-4">
        <div className="text-center space-y-8 animate-fadeIn">
          <div className="space-y-2">
            <p className="text-white text-2xl">Hoşgeldin!</p>
            <h1 className="text-5xl font-black text-white drop-shadow-2xl">{userName}</h1>
          </div>
          
          <div className="bg-white/20 backdrop-blur-md rounded-3xl p-8 space-y-4 border-4 border-white/30">
            <div className="flex items-center justify-center gap-3 text-white">
              <Users size={32} />
              <span className="text-xl font-bold">{QUESTIONS.length} Soru</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-white">
              <Clock size={32} />
              <span className="text-xl font-bold">Her soru için 20 saniye</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-white">
              <Zap size={32} />
              <span className="text-xl font-bold">Hız bonusu kazanın!</span>
            </div>
          </div>

          <button
            onClick={startGame}
            className="bg-white text-purple-600 px-16 py-6 rounded-full text-3xl font-black hover:scale-110 transition-transform shadow-2xl hover:shadow-purple-500/50"
          >
            BAŞLA!
          </button>
        </div>
      </div>
    );
  }

  // PLAYING SCREEN
  if (gameState === 'playing') {
    const question = QUESTIONS[currentQuestion];
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 mb-6 flex justify-between items-center border-2 border-white/30">
            <div className="text-white">
              <span className="text-lg font-bold">{userName}</span>
              <p className="text-sm">Soru {currentQuestion + 1}/{QUESTIONS.length}</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 bg-white/30 px-4 py-2 rounded-full">
                <Clock className="text-white" size={24} />
                <span className={`text-2xl font-black ${timeLeft <= 5 ? 'text-red-300' : 'text-white'}`}>
                  {timeLeft}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-white/30 px-4 py-2 rounded-full">
                <Trophy className="text-yellow-300" size={24} />
                <span className="text-2xl font-black text-white">{score}</span>
              </div>
            </div>
          </div>

          {/* Question */}
          <div className="bg-white rounded-3xl p-8 mb-6 shadow-2xl border-4 border-white/50">
            <h2 className="text-3xl font-black text-gray-800 text-center leading-relaxed">
              {question.questionText}
            </h2>
          </div>

          {/* Options */}
          {!showResult ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {question.options.map((option, index) => {
                const colorScheme = OPTION_COLORS[index];
                
                return (
                  <button
                    key={index}
                    onClick={() => handleAnswer(index)}
                    className={`${colorScheme.bg} ${colorScheme.hover} ${colorScheme.text} p-8 rounded-2xl text-2xl font-black transition-all transform hover:scale-105 shadow-xl`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Result Message */}
              <div className={`${selectedAnswer === question.correctAnswerIndex ? 'bg-green-500' : 'bg-red-500'} text-white rounded-2xl p-6 text-center animate-pulse`}>
                <p className="text-3xl font-black mb-2">
                  {selectedAnswer === question.correctAnswerIndex ? '🎉 DOĞRU!' : '❌ YANLIŞ!'}
                </p>
                <p className="text-xl font-bold">
                  Doğru cevap: {question.options[question.correctAnswerIndex]}
                </p>
                {selectedAnswer === question.correctAnswerIndex && (
                  <p className="text-lg mt-2">
                    +{question.points + Math.floor(timeLeft * 10)} puan kazandın!
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Next Button */}
          {showResult && (
            <div className="mt-6 text-center animate-pulse">
              <button
                onClick={nextQuestion}
                className="bg-white text-purple-600 px-12 py-4 rounded-full text-2xl font-black hover:scale-110 transition-transform shadow-2xl"
              >
                {currentQuestion < QUESTIONS.length - 1 ? 'Sonraki Soru →' : 'Sonuçları Gör 🏆'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // RESULT SCREEN
  if (gameState === 'result') {
    const percentage = Math.round((answers.filter(a => a.isCorrect).length / QUESTIONS.length) * 100);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 via-teal-500 to-blue-500 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full space-y-8">
          <div className="text-center space-y-4">
            <Trophy className="mx-auto text-yellow-300" size={80} />
            <h1 className="text-6xl font-black text-white drop-shadow-2xl">Tebrikler {userName}!</h1>
            <p className="text-3xl text-white/90 font-bold">Oyun Bitti</p>
          </div>

          <div className="bg-white/20 backdrop-blur-md rounded-3xl p-8 space-y-6 border-4 border-white/30">
            <div className="text-center space-y-2">
              <p className="text-white/80 text-xl font-semibold">Toplam Puanın</p>
              <p className="text-7xl font-black text-white drop-shadow-lg">{score}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-white/20 rounded-2xl p-4">
                <p className="text-white/80 font-semibold">Doğru</p>
                <p className="text-4xl font-black text-green-300">{answers.filter(a => a.isCorrect).length}</p>
              </div>
              <div className="bg-white/20 rounded-2xl p-4">
                <p className="text-white/80 font-semibold">Yanlış</p>
                <p className="text-4xl font-black text-red-300">{answers.filter(a => !a.isCorrect).length}</p>
              </div>
            </div>

            <div className="text-center">
              <p className="text-white/80 font-semibold mb-2">Başarı Oranı</p>
              <div className="bg-white/30 rounded-full h-8 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-yellow-400 to-green-400 h-full flex items-center justify-center font-black text-white transition-all duration-1000"
                  style={{ width: `${percentage}%` }}
                >
                  {percentage}%
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setGameState('leaderboard')}
              className="w-full bg-white text-blue-600 px-12 py-4 rounded-full text-2xl font-black hover:scale-110 transition-transform shadow-2xl"
            >
              Leaderboard'u Gör 🏆
            </button>
            <button
              onClick={startGame}
              className="w-full bg-yellow-400 text-blue-600 px-12 py-4 rounded-full text-2xl font-black hover:scale-110 transition-transform shadow-2xl"
            >
              Tekrar Oyna 🔄
            </button>
            <button
              onClick={logout}
              className="w-full bg-red-500 text-white px-12 py-4 rounded-full text-2xl font-black hover:scale-110 transition-transform shadow-2xl flex items-center justify-center gap-2"
            >
              <LogOut size={24} /> Çıkış Yap
            </button>
          </div>
        </div>
      </div>
    );
  }

  // LEADERBOARD SCREEN
  if (gameState === 'leaderboard') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 flex items-center justify-center p-4">
        <div className="max-w-3xl w-full space-y-8">
          <div className="text-center space-y-4">
            <Trophy className="mx-auto text-white" size={80} />
            <h1 className="text-6xl font-black text-white drop-shadow-2xl">LEADERBOARD</h1>
            <p className="text-2xl text-white/90 font-bold">En İyi 10 Oyuncu</p>
          </div>

          <div className="bg-white/20 backdrop-blur-md rounded-3xl p-6 border-4 border-white/30 space-y-3 max-h-96 overflow-y-auto">
            {leaderboard.length === 0 ? (
              <p className="text-white text-center text-xl font-bold">Henüz kimse oyun oynamadı!</p>
            ) : (
              leaderboard.slice(0, 10).map((entry, idx) => (
                <div
                  key={idx}
                  className={`flex justify-between items-center p-4 rounded-2xl font-bold text-xl ${
                    idx === 0 ? 'bg-yellow-300 text-gray-800' :
                    idx === 1 ? 'bg-gray-300 text-gray-800' :
                    idx === 2 ? 'bg-orange-300 text-gray-800' :
                    'bg-white/20 text-white'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-2xl">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}</span>
                    <span>{entry.name}</span>
                  </span>
                  <span>{entry.score}</span>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setGameState('result')}
              className="flex-1 bg-white text-orange-600 px-8 py-4 rounded-full text-2xl font-black hover:scale-110 transition-transform shadow-2xl"
            >
              Geri Dön ←
            </button>
            <button
              onClick={logout}
              className="flex-1 bg-red-600 text-white px-8 py-4 rounded-full text-2xl font-black hover:scale-110 transition-transform shadow-2xl flex items-center justify-center gap-2"
            >
              <LogOut size={24} /> Çıkış
            </button>
          </div>
        </div>
      </div>
    );
  }
}