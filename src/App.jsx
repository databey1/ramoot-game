import React, { useState, useEffect } from 'react';
import { Trophy, Users, Clock, Zap } from 'lucide-react';

const QUESTIONS = [
  { id: 1, questionText: "Ditching esnasında tüm sınıfı raft'e çekerken tüm gün ayak görüp yorgunluktan ve nefessizlikten inkapasite olan kimdir?", options: ["Cansu", "İlkay", "Aleyna", "Ezher"], correctAnswerIndex: 1, imageUrl: "/images/soru1-ankara.jpg", points: 1000 },
  { id: 2, questionText: "Fındık anonsunu son dakika değişikliği ile anons kitabına ekleten kimdir?", options: ["Aylin", "Serkan", "Kübra", "Gürkan"], correctAnswerIndex: 3, imageUrl: "/images/soru2-everest.jpg", points: 1000 },
  { id: 3, questionText: "Yolcu acil olarak işemeye çalışırken PDF'e göre karar veren kimdi?", options: ["Rana", "Fadime", "Ramazan", "Berke"], correctAnswerIndex: 2, imageUrl: "/images/soru3-react.jpg", points: 1000 },
  { id: 4, questionText: "Arnavutköy isimli zehirli oku İLK sıkan kimdir?", options: ["Fadime", "Zeynep", "Kübra", "Mert"], correctAnswerIndex: 2, imageUrl: "/images/soru4-space.jpg", points: 1000 },
  { id: 5, questionText: "Ev kiralarıyla oto galeri açmaya yemin etmiş ekip arkadaşımız kimdir?", options: ["Hatice", "Hatice Kübra", "Özlem", "Mert"], correctAnswerIndex: 3, imageUrl: "/images/soru5-gold.jpg", points: 1000 },
  { id: 6, questionText: "Allahın hakkı üçtür diyip her sınava 3 kere kim girmişti?", options: ["Aylin", "Rana", "Aleyna", "Oğuzhan"], correctAnswerIndex: 0, imageUrl: "/images/soru6-vercel.jpg", points: 1000 },
  { id: 7, questionText: "Yangın tiplerine yeni bir soluk getirerek 'alpha türü' yangını jargona sokan kimdi?", options: ["Ezher", "Fadime", "Özlem", "Gürkan"], correctAnswerIndex: 0, imageUrl: "/images/soru7-turkey.jpg", points: 1000 },
  { id: 8, questionText: "Sınıfımızın Ankaralı zengin ismi kimdir?", options: ["İlkay", "Rana", "Gürkan", "Ezher"], correctAnswerIndex: 1, imageUrl: "/images/soru8-byte.jpg", points: 1000 },
  { id: 9, questionText: "Üniversiteyi 4.sınıfta dondurduğuna şerefi ve namusu üzerine yemin eden arkadaşımız kimdir?", options: ["Özlem", "Zeynep", "Berke", "Ramazan"], correctAnswerIndex: 0, imageUrl: "/images/soru9-monalisa.jpg", points: 1000 },
  { id: 10, questionText: "Bu testi çözerken bile duygulanıp ağlama ihtimali olan kimdir?", options: ["Kübra", "Hatice Kübra", "Hatice", "Aleyna"], correctAnswerIndex: 3, imageUrl: "/images/soru10-ocean.jpg", points: 1000 },
  { id: 11, questionText: "Bizi manitadan ayrı düşünmeyip sabahları gruba güno aşkım mesajı atan kimdir?", options: ["Mert", "Oğuz", "Berke", "Gürkan"], correctAnswerIndex: 2, imageUrl: "/images/soru11-jupiter.jpg", points: 1000 },
  { id: 12, questionText: "Japonya'da anime festivallerinde edindiği CRM becerileriyle derste halka problemini tekte çözen kimdir?", options: ["Ramazan", "Kübra", "Berke", "Cansu"], correctAnswerIndex: 3, imageUrl: "/images/soru12-area.jpg", points: 1000 },
  { id: 13, questionText: "İş çıkışı piercing ve sayısız küpeyle hardcore death metalci takılan arkadaşımız kimdir", options: ["Rana", "Fadime", "Zeynep", "Aylin"], correctAnswerIndex: 2, imageUrl: "/images/soru13-skin.jpg", points: 1000 },
  { id: 14, questionText: "Görme engelli yolcuya bağırarak dudaklarımı görebiliyor musun diyen kimdir?", options: ["İlkay", "Serkan", "Oğuz", "Mert"], correctAnswerIndex: 2, imageUrl: "/images/soru14-hobbit.jpg", points: 1000 },
  { id: 15, questionText: "Apronda babadan yadigar doblosuyla sıfır çizmek isteyen kimdir?", options: ["Hatice Kübra", "Ramazan", "Gürkan", "Hatice"], correctAnswerIndex: 3, imageUrl: "/images/soru15-triangle.jpg", points: 1000 },
  { id: 16, questionText: "Ders çalışma bahanesiyle tüm sınıfı sürekli Gloria Jeanse götürüp şubeden kar payı alan kimdir?", options: ["Aleyna", "Fadime", "Ezher", "Rana"], correctAnswerIndex: 1, imageUrl: "/images/soru16-firebase.jpg", points: 1000 },
  { id: 17, questionText: "Rusyanın eşsiz bucaksız tundralarından, Ciddenin kavurucu sıcaklarına kadar tüm coğrafya bilgisini bize aktaran kişi kimdir?", options: ["Hatice Kübra", "Gürkan", "Ezher", "İlkay"], correctAnswerIndex: 0, imageUrl: "/images/soru17-colors.jpg", points: 1000 },
  { id: 18, questionText: "Uğur Dündar gibi araştırmacı gazeteci, Picasso gibi soyut bir ressam ve İngiltere Kralı gibi İngilicce bilen kimdir?", options: ["Zeynep", "Cansu", "Serkan", "Oğuz"], correctAnswerIndex: 2, imageUrl: "/images/soru18-maker.jpg", points: 1000 },
];

const OPTION_COLORS = [
  { bg: 'bg-red-500', hover: 'hover:bg-red-600', text: 'text-white' },
  { bg: 'bg-blue-500', hover: 'hover:bg-blue-600', text: 'text-white' },
  { bg: 'bg-yellow-500', hover: 'hover:bg-yellow-600', text: 'text-white' },
  { bg: 'bg-green-500', hover: 'hover:bg-green-600', text: 'text-white' },
];

export default function KahootQuiz() {
  const [gameState, setGameState] = useState('start'); // start, playing, result, leaderboard
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);
  const [answers, setAnswers] = useState([]);

  useEffect(() => {
    if (gameState === 'playing' && !showResult && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !showResult) {
      handleAnswer(null);
    }
  }, [timeLeft, gameState, showResult]);

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
      setGameState('leaderboard');
    }
  };

  if (gameState === 'start') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500 flex items-center justify-center p-4">
        <div className="text-center space-y-8 animate-fadeIn">
          <div className="space-y-4">
            <h1 className="text-7xl font-black text-white drop-shadow-2xl tracking-tight">
              KAHOOT!
            </h1>
            <p className="text-2xl text-white/90 font-semibold">Arkadaş Trivia Zamanı 🎉</p>
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

  if (gameState === 'playing') {
    const question = QUESTIONS[currentQuestion];
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 mb-6 flex justify-between items-center border-2 border-white/30">
            <div className="text-white">
              <span className="text-lg font-bold">Soru {currentQuestion + 1}/{QUESTIONS.length}</span>
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

          {/* Options or Image */}
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
              <div className={`${selectedAnswer === question.correctAnswerIndex ? 'bg-green-500' : 'bg-red-500'} text-white rounded-2xl p-6 text-center animate-fadeIn`}>
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

              {/* Image */}
              <div className="bg-white rounded-2xl p-4 shadow-2xl">
                <img 
                  src={question.imageUrl} 
                  alt={`Soru ${question.id}`}
                  className="w-full h-auto rounded-xl"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="hidden items-center justify-center h-64 bg-gray-100 rounded-xl">
                  <p className="text-gray-500 text-lg">Fotoğraf yükleniyor...</p>
                </div>
              </div>
            </div>
          )}

          {/* Next Button */}
          {showResult && (
            <div className="mt-6 text-center animate-fadeIn">
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

  if (gameState === 'leaderboard') {
    const percentage = Math.round((answers.filter(a => a.isCorrect).length / QUESTIONS.length) * 100);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-500 via-teal-500 to-blue-500 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full space-y-8">
          <div className="text-center space-y-4">
            <Trophy className="mx-auto text-yellow-300" size={80} />
            <h1 className="text-6xl font-black text-white drop-shadow-2xl">Tebrikler!</h1>
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

          <div className="text-center">
            <button
              onClick={startGame}
              className="bg-white text-purple-600 px-12 py-4 rounded-full text-2xl font-black hover:scale-110 transition-transform shadow-2xl"
            >
              Tekrar Oyna 🔄
            </button>
          </div>
        </div>
      </div>
    );
  }
}