import React, { useState, useEffect, useCallback, useMemo } from 'react';

// Firebase imports
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, doc, setDoc, getDoc, updateDoc, 
  onSnapshot
} from 'firebase/firestore';

// --- Firebase ve Global Durum Yönetimi ---

// KULLANICININ İSTEĞİ ÜZERİNE, SAĞLANAN HARDBOARDED FIREBASE AYARLARI KULLANILIYOR.
// Not: Platformun otomatik kimlik doğrulama token'ı (__initial_auth_token) çalışması için korunmuştur.
const HARDCODED_FIREBASE_CONFIG = {
    apiKey: "AIzaSyCWomiP6AUe13iKexXZAPibxvi67zrY11A",
    authDomain: "ramoot-game.firebaseapp.com",
    projectId: "ramoot-game", // Bu değer, Firestore yolunda appId olarak kullanılacaktır.
    storageBucket: "ramoot-game.firebasestorage.app",
    messagingSenderId: "403149392724",
    appId: "1:403149392724:web:36fbcff884eec5bac6d6c1"
};

// Yapılandırmayı doğrudan kullan
const firebaseConfig = HARDCODED_FIREBASE_CONFIG;
// Firestore yolu için projectId'yi appId olarak kullan
const appId = HARDCODED_FIREBASE_CONFIG.projectId;
// Platformun kritik kimlik doğrulama token'ını koru
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Soru Cevaplama Süre Limiti (Saniye)
const TIME_LIMIT = 15; 

// --- 18 SORU VE FOTOĞRAF URL'leri ---
const QUESTIONS = [
  { id: 1, questionText: "Türkiye'nin başkenti neresidir?", options: ["İstanbul", "Ankara", "İzmir", "Bursa"], correctAnswerIndex: 1, imageUrl: "/images/soru1-ankara.jpg", points: 1000 },
  { id: 2, questionText: "Dünyanın en yüksek dağı nedir?", options: ["K2", "Kangchenjunga", "Everest", "Lhotse"], correctAnswerIndex: 2, imageUrl: "/images/soru2-everest.jpg", points: 1000 },
  { id: 3, questionText: "React hangi şirket tarafından geliştirilmiştir?", options: ["Google", "Microsoft", "Facebook (Meta)", "Apple"], correctAnswerIndex: 2, imageUrl: "/images/soru3-react.jpg", points: 1000 },
  { id: 4, questionText: "Işık yılı neyin birimidir?", options: ["Zaman", "Hız", "Mesafe", "Kütle"], correctAnswerIndex: 2, imageUrl: "/images/soru4-space.jpg", points: 1000 },
  { id: 5, questionText: "Hangi element periyodik tablonun 'Au' sembolüdür?", options: ["Gümüş", "Altın", "Alüminyum", "Cıva"], correctAnswerIndex: 1, imageUrl: "/images/soru5-gold.jpg", points: 1000 },
  { id: 6, questionText: "Vercel üzerinde hangi tür uygulamalar yayınlanır?", options: ["Veritabanları", "Frontend/Fullstack Uygulamalar", "Mobil Uygulamalar", "Donanım Sürücüleri"], correctAnswerIndex: 1, imageUrl: "/images/soru6-vercel.jpg", points: 1000 },
  { id: 7, questionText: "1923 yılında kurulan cumhuriyet hangi ülkededir?", options: ["ABD", "Fransa", "Türkiye", "Rusya"], correctAnswerIndex: 2, imageUrl: "/images/soru7-turkey.jpg", points: 1000 },
  { id: 8, questionText: "Bir byte kaç bittir?", options: ["4", "8", "16", "32"], correctAnswerIndex: 1, imageUrl: "/images/soru8-byte.jpg", points: 1000 },
  { id: 9, questionText: "Leonardo da Vinci'nin en ünlü tablosu nedir?", options: ["Son Akşam Yemeği", "Yıldızlı Gece", "Mona Lisa", "Çığlık"], correctAnswerIndex: 2, imageUrl: "/images/soru9-monalisa.jpg", points: 1000 },
  { id: 10, questionText: "En büyük okyanus hangisidir?", options: ["Atlantik", "Hint", "Arktik", "Pasifik"], correctAnswerIndex: 3, imageUrl: "/images/soru10-ocean.jpg", points: 1000 },
  { id: 11, questionText: "Hangi gezegen Güneş Sistemi'nin en büyüğüdür?", options: ["Dünya", "Mars", "Jüpiter", "Satürn"], correctAnswerIndex: 2, imageUrl: "/images/soru11-jupiter.jpg", points: 1000 },
  { id: 12, questionText: "Bir metrekare kaç santimetrekaredir?", options: ["100", "1.000", "10.000", "100.000"], correctAnswerIndex: 2, imageUrl: "/images/soru12-area.jpg", points: 1000 },
  { id: 13, questionText: "İnsan vücudundaki en büyük organ nedir?", options: ["Kalp", "Beyin", "Akciğer", "Deri"], correctAnswerIndex: 3, imageUrl: "/images/soru13-skin.jpg", points: 1000 },
  { id: 14, questionText: "Hangi film serisi Yüzüklerin Efendisi'nin öncülüdür?", options: ["Narnia", "Hobbit", "Harry Potter", "Game of Thrones"], correctAnswerIndex: 1, imageUrl: "/images/soru14-hobbit.jpg", points: 1000 },
  { id: 15, questionText: "Bir üçgenin iç açıları toplamı kaç derecedir?", options: ["90", "180", "270", "360"], correctAnswerIndex: 1, imageUrl: "/images/soru15-triangle.jpg", points: 1000 },
  { id: 16, questionText: "Firebase ne tür bir hizmettir?", options: ["İşletim Sistemi", "Mobil Geliştirme Platformu", "Veri Analiz Aracı", "Oyun Motoru"], correctAnswerIndex: 1, imageUrl: "/images/soru16-firebase.jpg", points: 1000 },
  { id: 17, questionText: "Hangi renkler birleşince yeşil oluşur?", options: ["Mavi ve Kırmızı", "Sarı ve Mavi", "Kırmızı ve Sarı", "Mavi ve Beyaz"], correctAnswerIndex: 1, imageUrl: "/images/soru17-colors.jpg", points: 1000 },
  { id: 18, questionText: "Ramoot'un yapımcısı kimdir? (İpucu: Sizsiniz!)", options: ["Mark Zuckerberg", "İlkay (Siz)", "Elon Musk", "Gemini"], correctAnswerIndex: 1, imageUrl: "/images/soru18-maker.jpg", points: 1000 },
];

// Oyunun ana bileşeni
const App = () => {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [gameId, setGameId] = useState('');
  const [game, setGame] = useState(null);
  const [mode, setMode] = useState('welcome'); // welcome | admin | player
  const [userName, setUserName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Constants
  const GAME_COLLECTION_NAME = 'ramoot_games';
  // Firestore koleksiyon yolu
  const GAME_COLLECTION_PATH = `/artifacts/${appId}/public/data/${GAME_COLLECTION_NAME}`;
  
  // Quiz creation state
  const [quizQuestions, setQuizQuestions] = useState([]);


  // 1. Firebase Initialization and Authentication
  useEffect(() => {
    const initFirebase = async () => {
        try {
            if (!Object.keys(firebaseConfig).length) {
                throw new Error("Firebase config is missing."); 
           }
            
            const app = initializeApp(firebaseConfig); 
            const firestore = getFirestore(app);
            const firebaseAuth = getAuth(app);
            
            setDb(firestore);
            setAuth(firebaseAuth);

            const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
                if (!user) {
                    try {
                        if (initialAuthToken) {
                            await signInWithCustomToken(firebaseAuth, initialAuthToken);
                        } else {
                            await signInAnonymously(firebaseAuth);
                        }
                    } catch (e) {
                        console.error("Auth Error:", e);
                        setError("Kimlik doğrulama hatası oluştu. (Firebase ayarlarınızı kontrol edin)");
                    }
                }
                
                const currentUserId = firebaseAuth.currentUser?.uid || crypto.randomUUID();
                setUserId(currentUserId);
                setIsAuthReady(true);
            });

            return () => unsubscribe();
        } catch (e) {
            console.error("Firebase Init Error:", e);
            setError("Firebase başlatılırken kritik bir hata oluştu.");
        }
    };

    initFirebase();
  }, []);
  
  // 2. Real-time Game State Listener (onSnapshot)
  useEffect(() => {
    if (!isAuthReady || !db || !gameId) return;

    const gameDocRef = doc(db, GAME_COLLECTION_PATH, gameId.toUpperCase());
    
    const unsubscribe = onSnapshot(gameDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const liveGameData = docSnap.data();
      
        setGame(liveGameData);
        
        // Oyuncular için oyun başladığında otomatik mod geçişi
        if (mode === 'welcome' && liveGameData.status !== 'lobby') {
            setMode('player');
        }

      } else {
        setGame(null);
        if (mode !== 'welcome') {
          setError(`Oyun ID'si (${gameId.toUpperCase()}) bulunamadı veya sona erdi.`);
          setMode('welcome');
          setGameId('');
        }
      }
      setLoading(false);
    }, (e) => {
      console.error("Firestore Snapshot Error:", e);
      setError("Oyun verileri çekilirken bir hata oluştu.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, gameId, isAuthReady, mode, GAME_COLLECTION_PATH]);


  // --- Helper Functions ---

  const getGameRef = useCallback((id) => {
    if (!db) return null;
    return doc(db, GAME_COLLECTION_PATH, id.toUpperCase());
  }, [db, GAME_COLLECTION_PATH]);
  
  // --- ADMIN/HOST Functions ---

  // ADMIN: Yeni bir oyun oluşturur (Hardcoded soruları kullanır)
  const createGame = async (adminName) => {
    if (!isAuthReady || !db || !userId) {
      setError("Sistem hazır değil. Lütfen bekleyin.");
      return;
    }
    
    if (QUESTIONS.length === 0) {
      setError("Soru bankası boş.");
      return;
    }

    setLoading(true);
    setError('');
    const newGameId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newGameRef = getGameRef(newGameId);
    
    const initialQuestions = QUESTIONS.map(q => ({
        ...q,
        answered: false, 
        startTime: null
    }));

    const adminPlayer = {
        name: adminName,
        score: 0,
        streak: 0,
        id: userId,
    };

    try {
      await setDoc(newGameRef, {
        gameId: newGameId,
        status: 'lobby', // Durum: Lobi (Oyuncu Bekliyor)
        adminId: userId,
        currentQuestionIndex: -1, 
        questions: initialQuestions, 
        players: { [userId]: adminPlayer }, // Admin oyuncu olarak eklendi
        answersReceived: {}, 
        playerAnswers: {}, 
        createdAt: new Date().toISOString(),
      });
      setGameId(newGameId);
      setUserName(adminName);
      setMode('admin');
    } catch (e) {
      console.error("Create Game Error:", e);
      setError("Oyun oluşturulurken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };
  
  // ADMIN: Oyunu bir sonraki soruya ilerletir veya bitirir
  const nextQuestion = async () => {
    if (!game || game.adminId !== userId) return;
    setLoading(true);
    const newIndex = game.currentQuestionIndex + 1;
    const gameRef = getGameRef(gameId);
    
    const currentQ = game.questions[game.currentQuestionIndex];
    if (currentQ && !currentQ.answered) {
        await updateDoc(gameRef, {
            [`questions.${game.currentQuestionIndex}.answered`]: true
        });
    }

    // Cevapları göstermek için bekleme süresi
    await new Promise(resolve => setTimeout(resolve, 3000)); 

    try {
      if (newIndex < game.questions.length) {
        // Go to the next question
        await updateDoc(gameRef, {
          status: 'in-game',
          currentQuestionIndex: newIndex,
          answersReceived: {},
          playerAnswers: {},
          [`questions.${newIndex}.startTime`]: Date.now(), 
        });
      } else {
        // End the game
        await updateDoc(gameRef, {
          status: 'score', 
          currentQuestionIndex: newIndex,
        });
      }
    } catch (e) {
      console.error("Next Question Error:", e);
      setError("Sonraki soruya geçilemedi.");
    } finally {
      setLoading(false);
    }
  };
  
  // ADMIN: Lobiden oyunu başlatır
  const startGameFromLobby = async () => {
    if (!game || game.adminId !== userId || game.status !== 'lobby') return;
    setLoading(true);
    const gameRef = getGameRef(gameId);
    try {
      await updateDoc(gameRef, {
        status: 'in-game',
        currentQuestionIndex: 0,
        answersReceived: {},
        playerAnswers: {},
        [`questions.0.startTime`]: Date.now(),
      });
    } catch (e) {
      console.error("Start Game Error:", e);
      setError("Oyun başlatılırken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };
  
  // --- PLAYER Functions ---

  // PLAYER: Var olan oyuna katılır
  const joinGame = async (code, name) => {
    // İsim kontrolü burada da tekrar ediyoruz.
    if (!isAuthReady || !db || !userId || !code || !name || name.length < 3) {
      setError("Sistem hatası: Lütfen kodu ve en az 3 karakterli kullanıcı adını girin.");
      return;
    }
    setLoading(true);
    setError('');
    
    const uppercaseGameId = code.toUpperCase();
    const gameRef = getGameRef(uppercaseGameId);
    try {
      const docSnap = await getDoc(gameRef);
      if (!docSnap.exists()) {
        setError(`Oyun ID'si (${uppercaseGameId}) bulunamadı.`);
        setLoading(false);
        return;
      }
      
      const existingGame = docSnap.data();
      if (existingGame.status !== 'lobby') {
        setError("Oyun çoktan başladı. Katılamazsınız.");
        setLoading(false);
        return;
      }

      // İsim çakışması kontrolü
      const existingNames = Object.values(existingGame.players || {}).map(p => p.name.toLowerCase());
      if (existingNames.includes(name.toLowerCase())) {
          setError(`'${name}' adı zaten kullanımda. Lütfen başka bir isim seçin.`);
          setLoading(false);
          return;
      }

      // Oyuncuyu oyuna ekle
      const playerUpdate = {
        name: name,
        score: 0,
        streak: 0,
        id: userId,
      };
      await updateDoc(gameRef, {
        [`players.${userId}`]: playerUpdate,
      });

      setGameId(uppercaseGameId);
      setUserName(name); 
      setMode('player');
    } catch (e) {
      console.error("Join Game Error:", e);
      setError("Oyuna katılırken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };
  
  // PLAYER: Cevabını gönderir (Hız tabanlı puanlama)
  const submitAnswer = async (answerIndex) => {
    if (!game || game.status !== 'in-game' || game.answersReceived[userId]) return;
    const gameRef = getGameRef(gameId);
    const question = game.questions[game.currentQuestionIndex];
    
    const timeElapsed = question.startTime ? (Date.now() - question.startTime) / 1000 : 0;
    if (timeElapsed > TIME_LIMIT) return; 

    const isCorrect = answerIndex === question.correctAnswerIndex;
    
    // Puan hesaplama
    const basePoints = 1000;
    const timePenaltyFactor = 50; 
    let scoreEarned = 0;

    if (isCorrect) {
        const timePenalty = timeElapsed * timePenaltyFactor;
        scoreEarned = Math.max(100, basePoints - timePenalty);
        
        const currentStreak = game.players[userId].streak || 0;
        const streakBonus = Math.min(currentStreak * 100, 500);
        scoreEarned += streakBonus;
        scoreEarned = Math.round(scoreEarned);
    }
    
    // Oyuncu istatistiklerini ve oyun durumunu güncelle
    try {
        await updateDoc(gameRef, {
            [`answersReceived.${userId}`]: true,
            [`playerAnswers.${userId}`]: { answerIndex, scoreEarned, timeElapsed, isCorrect },
            [`players.${userId}.score`]: (game.players[userId].score || 0) + scoreEarned,
            [`players.${userId}.streak`]: isCorrect ? (game.players[userId].streak || 0) + 1 : 0,
        });
    } catch (e) {
      console.error("Submit Answer Error:", e);
      setError("Cevap gönderilirken bir hata oluştu.");
    }
  };


  // --- Calculated Data ---

  const currentQuestion = useMemo(() => {
    if (!game || game.currentQuestionIndex < 0 || game.currentQuestionIndex >= game.questions.length) {
      return null;
    }
    return game.questions[game.currentQuestionIndex];
  }, [game]);
  
  const sortedPlayers = useMemo(() => {
    if (!game || !game.players) return [];
    return Object.values(game.players)
      .sort((a, b) => b.score - a.score)
      .map((player, index) => ({ 
        ...player, 
        rank: index + 1,
        isCurrentUser: player.name === userName,
      }));
  }, [game, userName]);
  
  const currentPlayer = useMemo(() => {
      if (!game || !userId) return null;
      return game.players[userId];
  }, [game, userId]);
  
  const answeredCount = useMemo(() => {
      if (!game || !game.answersReceived) return 0;
      return Object.keys(game.answersReceived).length;
  }, [game]);
  
  const isAdmin = useMemo(() => game && userId === game.adminId, [game, userId]);
  
  // --- UI Components ---
  
  // Ortak düğme bileşeni (Tailwind stilleri ile)
  const Button = ({ onClick, children, className = '', disabled = false, color = 'bg-indigo-600 hover:bg-indigo-700' }) => (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${color} text-white font-bold py-3 px-6 rounded-xl shadow-lg transition duration-200 
        transform hover:scale-[1.02] active:scale-95 disabled:bg-gray-400 disabled:shadow-none
        ${className}
     `}
    >
      {loading ? 'Yükleniyor...' : children}
    </button>
  );
  
  // Giriş alanı bileşeni
  const Input = ({ label, value, onChange, placeholder, type = 'text', readOnly = false }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
      />
    </div>
  );
  
  const QuizCreation = () => (
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-4xl text-center">
          <h2 className="text-3xl font-extrabold text-red-700 mb-6 border-b pb-2">SORU DÜZENLEYİCİ ATLANDI</h2>
          <p className="text-gray-600">Oyun, önceden tanımlı sorularla otomatik olarak oluşturulacaktır.</p>
          <Button onClick={() => setMode('welcome')} className="mt-4">Ana Sayfaya Dön</Button>
      </div>
  );

  // Oyun Lobisi (Admin & Oyuncu)
  const Lobby = () => {
    if (!game) return <div className="text-center text-xl text-red-500">Oyun yüklenemedi.</div>;
    const gameLink = `${window.location.origin}/?gameId=${game.gameId}`;

    return (
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-2xl text-center border-b-8 border-green-500">
        <h2 className="text-4xl font-extrabold text-green-700 mb-4">Ramoot Lobi</h2>
        <p className="text-xl text-gray-600 mb-8">Oyuncuların Katılmasını Bekliyor...</p>
        
        <div className="bg-green-50 p-6 rounded-xl border border-green-200 mb-8">
          <p className="text-2xl font-bold text-green-800">Oyun ID'si</p>
          <p className="text-6xl font-black text-green-900 mt-2">{game.gameId}</p>
          {isAdmin && (
              <div className="mt-4">
                  <Input 
                    label="Paylaşılabilir Bağlantı (Kopyalayın)"
                    value={gameLink}
                    readOnly
                  />
                  <button
                    onClick={() => {
                        navigator.clipboard.writeText(gameLink).then(() => {
                            setError('Bağlantı panoya kopyalandı!');
                            setTimeout(() => setError(''), 3000);
                        }).catch(err => {
                             setError('Kopyalama başarısız oldu.');
                        });
                    }}
                    className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Bağlantıyı Kopyala
                  </button>
              </div>
          )}
        </div>

        <h3 className="text-2xl font-bold text-gray-700 mb-4">Katılan Oyuncular ({Object.keys(game.players).length})</h3>
        <div className="flex flex-wrap justify-center gap-2 max-h-40 overflow-y-auto p-2">
          {Object.values(game.players).map((player) => (
            <span 
              key={player.name} 
              className={`px-4 py-2 rounded-full font-semibold shadow-md ${
                player.id === userId ? 'bg-yellow-500 text-yellow-900 border-2 border-yellow-700' : 'bg-gray-200 text-gray-800'
              }`}
            >
              {player.name}
            </span>
          ))}
        </div>

        {isAdmin && (
          <Button onClick={startGameFromLobby} disabled={Object.keys(game.players).length === 1} className="mt-8 w-full" color="bg-indigo-600 hover:bg-indigo-700">
            {Object.keys(game.players).length > 1 ?
            'Oyunu BAŞLAT' : 'Oyuncu Bekleniyor (En az 2 oyuncu gerekli)'}
          </Button>
        )}
      </div>
    );
  };
  
  // Oyun İçi Soru Ekranı (Admin)
  const AdminGameScreen = () => {
    if (!game || !currentQuestion) return <div className="text-center text-xl text-red-500">Hata: Soru yüklenemedi.</div>;
    const totalPlayers = Object.keys(game.players).length;
    
    const elapsed = currentQuestion.startTime ? Math.floor((Date.now() - currentQuestion.startTime) / 1000) : 0;
    const isTimeUp = elapsed >= TIME_LIMIT;
    
    const isQuestionFinished = currentQuestion.answered || answeredCount === totalPlayers || isTimeUp;
    
    const answerSummary = currentQuestion.options.map((option, index) => {
        const correct = index === currentQuestion.correctAnswerIndex;
        const totalAnswers = Object.values(game.playerAnswers).filter(a => a.answerIndex === index).length; 
        const percentage = totalPlayers > 0 ? Math.round((totalAnswers / totalPlayers) * 100) : 0;
        
        return { option, totalAnswers, percentage, correct, index };
    });
    
    const colors = ['bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500'];
    
    const ImageDisplay = () => {
        if (!currentQuestion || !currentQuestion.answered || !currentQuestion.imageUrl) return null;
        
        return (
            <div className="mt-8 bg-white p-6 rounded-xl shadow-xl border-4 border-yellow-400">
                <h3 className="text-2xl font-bold mb-4 text-center text-indigo-700">DOĞRU CEVAP GÖRSELİ</h3>
                <img 
                    src={currentQuestion.imageUrl} 
                    alt="Soruya ait görsel" 
                    className="max-w-full h-auto rounded-lg mx-auto max-h-96 object-contain shadow-lg" 
                />
            </div>
        );
    };

    return (
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-4xl border-b-8 border-indigo-600">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h2 className="text-3xl font-extrabold text-indigo-700">
            Soru {game.currentQuestionIndex + 1} / {game.questions.length}
          </h2>
          <span className="text-xl font-bold text-gray-600">
            {answeredCount} / {totalPlayers} Cevapladı
          </span>
        </div>

        <div className="bg-gray-100 p-8 rounded-xl mb-8">
            <p className="text-3xl font-semibold text-gray-800 text-center">{currentQuestion.questionText}</p>
        </div>

        {/* Geri Sayım Çubuğu */}
        {!isQuestionFinished && (
            <div className="text-center mb-6">
                <div className={`text-6xl font-extrabold transition-colors duration-300 ${TIME_LIMIT - elapsed <= 5 ? 'text-red-600 animate-pulse' : 'text-blue-600'}`}>
                    {TIME_LIMIT - elapsed}
                </div>
                <p className="text-gray-500 font-semibold">Kalan Süre (saniye)</p>
            </div>
        )}
        
        {/* Cevap Seçenekleri */}
        <div className="grid grid-cols-2 gap-4">
          {currentQuestion.options.map((option, index) => (
            <div key={index} className={`p-4 rounded-xl text-white font-bold text-lg transition duration-300 shadow-md ${colors[index]} ${isQuestionFinished ? 'opacity-100' : 'opacity-70'}`}>
              {option}
              {isQuestionFinished && (
                  <div className="mt-2 text-sm bg-black bg-opacity-30 p-2 rounded-lg">
                      <p>Cevap Sayısı: {answerSummary[index].totalAnswers}</p>
                      <p>Oran: {answerSummary[index].percentage}%</p>
                      {answerSummary[index].correct && <p className="text-yellow-300">✓ DOĞRU CEVAP</p>}
                  </div>
              )}
            </div>
          ))}
        </div>
        
        {/* FOTOĞRAF ALANI */}
        {isQuestionFinished && <ImageDisplay />}
        
        <div className="mt-8 border-t pt-4">
          <Button onClick={nextQuestion} className="w-full" disabled={!isQuestionFinished}>
            {game.currentQuestionIndex + 1 < game.questions.length ?
            'Sonraki Soruya Geç' : 'Skor Tablosunu Göster'}
          </Button>
        </div>
      </div>
    );
  };
  
  // Oyun İçi Cevap Ekranı (Oyuncu)
  const PlayerGameScreen = () => {
    if (!game || !currentQuestion || !currentPlayer) return <div className="text-center text-xl text-red-500">Hata: Oyun verisi eksik.</div>;
    
    const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
    const hasAnswered = game.answersReceived[userId];
    const playerAnswerInfo = game.playerAnswers[userId];

    useEffect(() => {
        if (!currentQuestion || currentQuestion.answered || hasAnswered) {
            setTimeLeft(TIME_LIMIT);
            return;
        }

        const elapsed = currentQuestion.startTime ? Math.floor((Date.now() - currentQuestion.startTime) / 1000) : 0;
        const remaining = TIME_LIMIT - elapsed;
        
        if (remaining <= 0) {
            setTimeLeft(0);
            return;
        }
        
        setTimeLeft(remaining);

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [game, currentQuestion, hasAnswered]);


    const colors = ['bg-red-500 hover:bg-red-600', 'bg-blue-500 hover:bg-blue-600', 'bg-yellow-500 hover:bg-yellow-600', 'bg-green-500 hover:bg-green-600'];
    const isQuestionOver = game.questions[game.currentQuestionIndex]?.answered;

    return (
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-2xl text-center border-b-8 border-purple-500">
        <h2 className="text-3xl font-extrabold text-purple-700 mb-6">
          {isQuestionOver ? 'Cevap Gösteriliyor...' : hasAnswered ? 'Cevap Gönderildi!' : `Soru ${game.currentQuestionIndex + 1}`}
        </h2>
        
        <div className="bg-gray-100 p-6 rounded-xl mb-6">
          <p className="text-xl font-semibold text-gray-800">{currentQuestion.questionText}</p>
        </div>

        {/* Geri Sayım */}
        {!isQuestionOver && !hasAnswered && (
            <div className="text-center mb-6">
                <div className={`text-5xl font-extrabold transition-colors duration-300 ${timeLeft <= 5 ? 'text-red-600 animate-pulse' : 'text-blue-600'}`}>
                    {timeLeft}
                </div>
                <p className="text-gray-500 font-semibold">Kalan Süre (saniye)</p>
            </div>
        )}
       
        {isQuestionOver && (
            <div className={`p-4 rounded-xl mb-4 font-bold text-white text-xl ${
                playerAnswerInfo && playerAnswerInfo.isCorrect ? 'bg-green-600' : 'bg-red-600'
            }`}>
                {playerAnswerInfo ? (playerAnswerInfo.isCorrect ? 'DOĞRU CEVAP! (+ ' + playerAnswerInfo.scoreEarned + ' puan)' : 'YANLIŞ CEVAP!') : 'SÜRE DOLDU!'}
            </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {currentQuestion.options.map((option, index) => (
            <Button
              key={index}
              onClick={() => submitAnswer(index)}
              disabled={hasAnswered || isQuestionOver || timeLeft === 0}
              className={`
                w-full h-20 text-xl font-extrabold shadow-lg ${colors[index]}
                ${hasAnswered && playerAnswerInfo.answerIndex === index ? 
                    'border-4 border-white ring-4 ring-black/20' : ''}
                ${hasAnswered && playerAnswerInfo.answerIndex !== index ? 'opacity-50' : ''}
              `}
              color="" // Varsayılan rengi özel renklerle geçersiz kıl
            >
              {option}
            </Button>
          ))}
        </div>
        
        <div className="mt-6 text-lg font-medium">
            <p className="text-gray-700">Puanınız: <span className="text-indigo-600 font-bold">{currentPlayer.score}</span></p>
            <p className="text-gray-700">Seri: <span className="text-green-600 font-bold">{currentPlayer.streak}</span></p>
        </div>
      </div>
    );
  };
  
  // Skor Tablosu Ekranı (Admin & Oyuncu)
  const Scoreboard = () => {
    if (!game) return <div className="text-center text-xl text-red-500">Oyun yüklenemedi.</div>;
    const isFinal = game.currentQuestionIndex >= game.questions.length;
    
    return (
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-2xl text-center border-b-8 border-yellow-500">
        <h2 className={`text-4xl font-extrabold mb-2 ${isFinal ? 'text-green-700' : 'text-indigo-700'}`}>
          {isFinal ? 'OYUN BİTTİ!' : 'SKOR TABLOSU'}
        </h2>
        <p className="text-xl text-gray-600 mb-8">
          {isFinal ? 'Nihai Sonuçlar' : `Soru ${game.currentQuestionIndex} Sonrası Durum`}
        </p>

        <div className="space-y-3">
          {sortedPlayers.map((player, index) => (
            <div 
              key={player.name} 
              className={`flex justify-between items-center p-4 rounded-xl shadow-md transition duration-300 
                ${player.id === userId ? 'bg-indigo-100 border-2 border-indigo-500' : 'bg-gray-50'}`}
            >
              <div className="flex items-center space-x-4">
                <span className={`text-2xl font-black w-8 ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ?
                'text-amber-700' : 'text-gray-500'}`}>
                  #{player.rank}
                </span>
                <span className="text-xl font-semibold text-gray-800">{player.name}</span>
                {player.id === userId && <span className="text-xs font-bold text-indigo-600 bg-indigo-200 px-2 py-0.5 rounded-full">Siz</span>}
              </div>
      
              <div className="text-right">
                <p className="text-2xl font-extrabold text-green-700">{player.score}</p>
                <p className="text-sm text-gray-500">Seri: {player.streak}</p>
              </div>
            </div>
          ))}
        </div>
        
        {isAdmin && !isFinal && (
          <div className="mt-8 border-t pt-4">
            <Button onClick={nextQuestion} className="w-full">
              Sonraki Soruya Geç ({game.currentQuestionIndex + 1} / {game.questions.length})
            </Button>
          </div>
        )}
        
        {isAdmin && isFinal && (
             <div className="mt-8 border-t pt-4">
                <p className="text-lg font-bold text-gray-700">Tebrikler, oyun sona erdi!</p>
            </div>
        )}
      </div>
    );
  };

  // YENİ Karşılama Ekranı (Basitleştirilmiş ve Minimum 3 Karakter Kontrollü)
  const WelcomeScreen = () => {
      
    const handleEntry = async () => {
        // İsim kontrolü: En az 3 karakter olmalı
        if (!userName || userName.length < 3) {
            setError("Lütfen en az 3 karakterli geçerli bir rumuz girin.");
            return;
        }

        // Eğer URL'de bir gameId varsa, oyuncu katılmaya çalışıyor
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('gameId') || '';

        if (code) {
            // Oyuncu Katılma Akışı
            await joinGame(code, userName);
        } else {
            // Admin (Yeni Oyun Oluşturma) Akışı
            await createGame(userName);
        }
    };

    const isJoining = new URLSearchParams(window.location.search).get('gameId');
    const isButtonDisabled = !userName || userName.length < 3;

    return (
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md text-center border-b-8 border-indigo-700">
        <h1 className="text-4xl font-black text-indigo-700 mb-2">Ramoot</h1>
        <p className="text-xl text-gray-600 mb-8 font-extrabold">TEMEL 13 GERRRRRRRRÇEK BİTİRME SINAVI</p>

        <Input 
          label="Adın nedir?"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="Rumuzunuz (Örn: Sadrazamın Keyfi)"
        />
        
        <div className="space-y-4 mt-6">
          <Button onClick={handleEntry} className="w-full" disabled={isButtonDisabled}>
            {/* Buton metni dinamik: URL'de gameId varsa Katıl, yoksa Başlat */}
            {isJoining ? 'Oyuna Katıl' : 'Oyunu Başlat (Admin)'}
          </Button>
        </div>
        
        {/* Kullanıcının kafasını karıştıran userId'yi buradan kaldırdık */}
      </div>
    );
  };
  
  // --- Ana Render Mantığı ---
  
  // Yükleme Durumu
  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-indigo-800">
        <p className="text-xl text-white">Sistem başlatılıyor...</p>
      </div>
    );
  }
  
  // Hata Gösterimi
  if (error) {
    return (
        <div className="min-h-screen bg-indigo-800 flex flex-col items-center justify-center p-4">
            <div className="bg-red-50 border-l-4 border-red-400 p-6 rounded-lg shadow-xl max-w-xl mx-auto mb-8">
                <div className="flex items-center">
                    <span className="text-red-800 font-bold text-lg mr-3">HATA!</span>
                    <p className="text-base text-red-700">{error}</p>
                </div>
            </div>
            <Button onClick={() => {
                setMode('welcome'); 
                setGameId(''); 
                setError('');
            }} color="bg-gray-500 hover:bg-gray-600">
                Ana Sayfaya Dön
            </Button>
            {/* Hatanın neyle ilgili olduğunu görmek isteyenler için, alt tarafa userId'yi bıraktık. */}
            <p className="mt-6 text-xs text-gray-400">Hata Kodu/Kullanıcı ID: {userId}</p>
        </div>
    );
  }

  let Content;
  
  if (mode === 'create-questions') {
    Content = <QuizCreation />; 
  } else if (gameId && game) {
    const isLobby = game.status === 'lobby';
    const isInGame = game.status === 'in-game';
    const isScore = game.status === 'score';

    if (isLobby) {
      Content = <Lobby />;
    } else if (isInGame) {
      if (isAdmin) {
        Content = <AdminGameScreen />;
      } else if (currentPlayer) {
        Content = <PlayerGameScreen />;
      } else {
        Content = <div className="text-center text-xl text-white font-bold p-8 bg-red-600 rounded-xl shadow-2xl">Oyun başladı, katılamazsınız.</div>;
      }
    } else if (isScore) {
      Content = <Scoreboard />;
    }
  } else {
    Content = <WelcomeScreen />;
  }

  // Nihai düzen
  return (
    <div className="min-h-screen bg-indigo-800 flex flex-col items-center justify-center p-4 font-sans antialiased">
      {/* Dinamik İçerik Alanı */}
      {Content}
      
      {/* Geri Dön düğmesi (Oyun dışı ekranlar için) */}
      {(mode !== 'welcome' && !game) && (
        <div className="mt-8">
            <Button onClick={() => {
                setMode('welcome'); 
                setGameId(''); 
                setError('');
            }} color="bg-gray-500 hover:bg-gray-600">
                Ana Sayfaya Dön
            </Button>
        </div>
      )}
    </div>
  );
};

export default App;