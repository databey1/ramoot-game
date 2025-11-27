import React, { useState, useEffect, useCallback, useMemo } from 'react';

// Firebase imports
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, doc, setDoc, getDoc, updateDoc, 
  onSnapshot, collection, query, where, arrayUnion 
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


// Oyunun ana bileşeni
const App = () => {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [gameId, setGameId] = useState('');
  const [game, setGame] = useState(null);
  const [mode, setMode] = useState('welcome'); // welcome | admin | player | create-questions
  const [userName, setUserName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Constants
  const GAME_COLLECTION_NAME = 'ramoot_games';
  // Firestore koleksiyon yolu: /artifacts/{appId}/public/data/ramoot_games
  const GAME_COLLECTION_PATH = `/artifacts/${appId}/public/data/${GAME_COLLECTION_NAME}`;
  
  // Quiz creation state
  const [newQuestion, setNewQuestion] = useState({ 
    text: '', 
    options: ['', '', '', ''], 
    correctAnswerIndex: 0 
  });
  const [quizQuestions, setQuizQuestions] = useState([]);


  // 1. Firebase Initialization and Authentication
  useEffect(() => {
    const initFirebase = async () => {
        try {
            if (!Object.keys(firebaseConfig).length) {
                // Konfigürasyonun varlığını kontrol et
                throw new Error("Firebase config is missing."); 
            }
            
            // Kullanıcının sağladığı konfigürasyon ile Firebase'i başlat
            const app = initializeApp(firebaseConfig); 
            const firestore = getFirestore(app);
            const firebaseAuth = getAuth(app);
            
            setDb(firestore);
            setAuth(firebaseAuth);

            // Kimlik doğrulama dinleyicisi: Oturum açma durumunu yönetir.
            const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
                if (!user) {
                    // Kullanıcı oturum açmamışsa oturum açmayı dene (Custom Token > Anonim)
                    try {
                        if (initialAuthToken) {
                            console.log("Attempting sign in with custom token...");
                            await signInWithCustomToken(firebaseAuth, initialAuthToken);
                        } else {
                            console.log("Attempting anonymous sign in...");
                            await signInAnonymously(firebaseAuth);
                        }
                    } catch (e) {
                        console.error("Auth Error (Check Rules/Token Validity):", e);
                        setError("Kimlik doğrulama hatası oluştu. (Firebase ayarlarınızı veya kurallarınızı kontrol edin)");
                    }
                }
                
                // Kimlik doğrulama tamamlandıktan sonra userId'yi ayarla
                const currentUserId = firebaseAuth.currentUser?.uid || crypto.randomUUID();
                setUserId(currentUserId);
                setIsAuthReady(true);
                console.log("Firebase initialized and Auth Ready. User ID:", currentUserId);
            });

            return () => unsubscribe(); // Cleanup listener
        } catch (e) {
            console.error("Firebase Init Error:", e);
            setError("Firebase başlatılırken kritik bir hata oluştu.");
        }
    };

    initFirebase();
  }, []);

  // 2. Real-time Game State Listener (onSnapshot)
  useEffect(() => {
    // Auth hazır değilse, db yoksa veya gameId boşsa dinlemeyi başlatma
    if (!isAuthReady || !db || !gameId) return;

    // Koleksiyon yolunu kullan
    const gameDocRef = doc(db, GAME_COLLECTION_PATH, gameId.toUpperCase());
    
    console.log(`Listening to Game ID: ${gameId.toUpperCase()} at path: ${GAME_COLLECTION_PATH}/${gameId.toUpperCase()}`);

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
        if (mode !== 'welcome' && mode !== 'create-questions') {
          setError(`Oyun ID'si (${gameId.toUpperCase()}) bulunamadı veya sona erdi.`);
          setMode('welcome');
          setGameId('');
        }
      }
      setLoading(false);
    }, (e) => {
      console.error("Firestore Snapshot Error:", e);
      setError("Oyun verileri çekilirken bir hata oluştu. Firestore kurallarını veya API durumunu kontrol edin.");
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

  // ADMIN: Yeni bir oyun oluşturur
  const createGame = async () => {
    if (!isAuthReady || !db || !userId) {
      setError("Sistem hazır değil. Lütfen bekleyin.");
      return;
    }
    
    if (quizQuestions.length === 0) {
      setError("Lütfen oyunu başlatmadan önce en az bir soru ekleyin.");
      return;
    }

    setLoading(true);
    setError('');
    const newGameId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newGameRef = getGameRef(newGameId);

    try {
      await setDoc(newGameRef, {
        gameId: newGameId,
        status: 'lobby', // Durum: Lobi (Oyuncu Bekliyor)
        adminId: userId,
        currentQuestionIndex: -1, // İlk soruya geçmek için 0'dan başlatılacak
        questions: quizQuestions,
        players: {}, // userId: { name, score, streak }
        answersReceived: {}, // userId: true for current question
        playerAnswers: {}, // userId: { answerIndex, timestamp }
        createdAt: new Date().toISOString(),
      });
      setGameId(newGameId);
      setMode('admin');
      console.log(`Game created successfully with ID: ${newGameId}`);
    } catch (e) {
      console.error("Create Game Error:", e);
      setError("Oyun oluşturulurken bir hata oluştu. (Yol hatası veya Firestore kurallarını kontrol edin)");
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

    try {
      if (newIndex < game.questions.length) {
        // Go to the next question
        await updateDoc(gameRef, {
          status: 'in-game',
          currentQuestionIndex: newIndex,
          answersReceived: {},
          playerAnswers: {},
        });
      } else {
        // End the game (Go to final scoreboard)
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
  
  // ADMIN: Lobiden oyunu başlatır (currentQuestionIndex = 0)
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
  const joinGame = async () => {
    if (!isAuthReady || !db || !userId || !gameId || !userName) {
      setError("Lütfen Oyun ID ve Kullanıcı Adı girin.");
      return;
    }
    setLoading(true);
    setError('');
    
    const uppercaseGameId = gameId.toUpperCase();
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
      if (existingNames.includes(userName.toLowerCase())) {
          setError(`'${userName}' adı zaten kullanımda. Lütfen başka bir isim seçin.`);
          setLoading(false);
          return;
      }

      // Oyuncuyu oyuna ekle
      const playerUpdate = {
        name: userName,
        score: 0,
        streak: 0,
      };

      await updateDoc(gameRef, {
        [`players.${userId}`]: playerUpdate,
      });

      setGameId(uppercaseGameId);
      setMode('player'); // Oyuncu moduna geçiş (lobide bekliyor)
    } catch (e) {
      console.error("Join Game Error:", e);
      setError("Oyuna katılırken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };
  
  // PLAYER: Cevabını gönderir
  const submitAnswer = async (answerIndex) => {
    if (!game || game.status !== 'in-game' || game.answersReceived[userId]) return;

    const gameRef = getGameRef(gameId);
    const question = game.questions[game.currentQuestionIndex];
    const isCorrect = answerIndex === question.correctAnswerIndex;
    const timestamp = Date.now();

    // 1. Puan Hesaplama (Basit puanlama + seri bonusu)
    const baseScore = 1000; 
    let scoreEarned = 0;

    if (isCorrect) {
        // Seri bonusu ekle, max 500 puan ile sınırla
        const streakBonus = game.players[userId].streak * 100; 
        scoreEarned = baseScore + Math.min(streakBonus, 500);
    }
    
    // 2. Oyuncu istatistiklerini ve oyun durumunu güncelle
    try {
        await updateDoc(gameRef, {
            // Oyuncuyu cevapladı olarak işaretle
            [`answersReceived.${userId}`]: true,
            // Cevabı ve zamanı kaydet
            [`playerAnswers.${userId}`]: { answerIndex, timestamp },
            // Oyuncunun puanını ve serisini güncelle
            [`players.${userId}.score`]: game.players[userId].score + scoreEarned,
            [`players.${userId}.streak`]: isCorrect ? game.players[userId].streak + 1 : 0,
        });
    } catch (e) {
      console.error("Submit Answer Error:", e);
      setError("Cevap gönderilirken bir hata oluştu.");
    }
  };


  // --- Calculated Data ---

  // Mevcut soruyu getir
  const currentQuestion = useMemo(() => {
    if (!game || game.currentQuestionIndex < 0 || game.currentQuestionIndex >= game.questions.length) {
      return null;
    }
    return game.questions[game.currentQuestionIndex];
  }, [game]);

  // Skor tablosu için oyuncu listesini puana göre sırala
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
  
  // Mevcut oyuncunun istatistikleri
  const currentPlayer = useMemo(() => {
      if (!game || !userId) return null;
      return game.players[userId];
  }, [game, userId]);

  // Cevaplayan oyuncu sayısı
  const answeredCount = useMemo(() => {
      if (!game || !game.answersReceived) return 0;
      return Object.keys(game.answersReceived).length;
  }, [game]);

  // Mevcut kullanıcının admin olup olmadığı
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
  
  // Quiz Oluşturma Ekranı
  const QuizCreation = () => {

    const handleQuestionChange = (e) => {
      setNewQuestion(prev => ({ ...prev, text: e.target.value }));
    };

    const handleOptionChange = (index, e) => {
      const newOptions = [...newQuestion.options];
      newOptions[index] = e.target.value;
      setNewQuestion(prev => ({ ...prev, options: newOptions }));
    };

    const handleAddQuestion = () => {
      if (!newQuestion.text || newQuestion.options.some(opt => !opt)) {
        setError("Lütfen soruyu ve tüm 4 cevabı doldurun.");
        return;
      }
      setQuizQuestions(prev => [...prev, newQuestion]);
      setNewQuestion({ 
        text: '', 
        options: ['', '', '', ''], 
        correctAnswerIndex: 0 
      });
      setError('');
    };

    const handleDeleteQuestion = (index) => {
      setQuizQuestions(prev => prev.filter((_, i) => i !== index));
    };

    return (
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-4xl">
        <h2 className="text-3xl font-extrabold text-indigo-700 mb-6 border-b pb-2">Ramoot Soru Editörü</h2>
        
        {/* Mevcut Soru Oluşturucu */}
        <div className="p-5 border-2 border-indigo-200 rounded-xl mb-6 bg-indigo-50">
          <h3 className="text-xl font-bold mb-4 text-indigo-800">Yeni Soru Ekle</h3>
          <Input 
            label="Soru Metni"
            value={newQuestion.text}
            onChange={handleQuestionChange}
            placeholder="Sorunuzu buraya yazın..."
          />
          <div className="grid grid-cols-2 gap-4 mb-4">
            {newQuestion.options.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="radio"
                  id={`correct-opt-${index}`}
                  name="correct-option"
                  checked={newQuestion.correctAnswerIndex === index}
                  onChange={() => setNewQuestion(prev => ({ ...prev, correctAnswerIndex: index }))}
                  className="w-5 h-5 text-green-500 focus:ring-green-500"
                />
                <Input
                  label={`Cevap Seçeneği ${index + 1}`}
                  value={option}
                  onChange={(e) => handleOptionChange(index, e)}
                  placeholder={`Seçenek ${index + 1}`}
                />
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Doğru cevap: <span className="font-semibold text-green-600">Cevap Seçeneği {newQuestion.correctAnswerIndex + 1}</span>
          </p>
          <Button onClick={handleAddQuestion} color="bg-green-600 hover:bg-green-700" className="w-full">
            Listeye Ekle ({quizQuestions.length + 1}. Soru)
          </Button>
        </div>

        {/* Soru Listesi */}
        <h3 className="text-2xl font-bold text-indigo-700 mb-4">Hazır Sorular ({quizQuestions.length})</h3>
        {quizQuestions.length === 0 ? (
          <p className="text-gray-500 italic">Henüz soru eklemediniz. Lütfen yukarıdaki formu kullanın.</p>
        ) : (
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {quizQuestions.map((q, index) => (
              <div key={index} className="flex justify-between items-start bg-gray-50 p-3 rounded-lg border">
                <div>
                  <p className="font-semibold text-gray-800">Soru {index + 1}: {q.text}</p>
                  <p className="text-sm text-green-600 mt-1">
                    Doğru Cevap: {q.options[q.correctAnswerIndex]}
                  </p>
                </div>
                <button 
                  onClick={() => handleDeleteQuestion(index)}
                  className="text-red-500 hover:text-red-700 text-sm font-semibold ml-4 p-1"
                >
                  Sil
                </button>
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-8 border-t pt-4">
          <Button onClick={createGame} disabled={quizQuestions.length === 0} className="w-full">
            Oyunu Oluştur ve Lobiye Git ({quizQuestions.length} Soru)
          </Button>
        </div>
      </div>
    );
  };


  // Oyun Lobisi (Admin & Oyuncu)
  const Lobby = () => {
    if (!game) return <div className="text-center text-xl text-red-500">Oyun yüklenemedi.</div>;

    const gameLink = `${window.location.origin}/?gameId=${game.gameId}`;

    return (
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-2xl text-center">
        <h2 className="text-4xl font-extrabold text-indigo-700 mb-4">Ramoot Lobi</h2>
        <p className="text-xl text-gray-600 mb-8">Oyuncuların Katılmasını Bekliyor...</p>
        
        <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-200 mb-8">
          <p className="text-2xl font-bold text-indigo-800">Oyun ID'si</p>
          <p className="text-6xl font-black text-indigo-900 mt-2">{game.gameId}</p>
          {isAdmin && (
              <div className="mt-4">
                  <Input 
                    label="Paylaşılabilir Bağlantı (Kopyalayın)"
                    value={gameLink}
                    readOnly
                  />
                  <button
                    onClick={() => {
                        // execCommand kopyalama işlemi (iframe'lerde daha güvenilir)
                        document.execCommand('copy', false, gameLink); 
                        setError('Bağlantı panoya kopyalandı!');
                        setTimeout(() => setError(''), 3000);
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
                player.name === userName ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-800'
              }`}
            >
              {player.name}
            </span>
          ))}
        </div>

        {isAdmin && (
          <Button onClick={startGameFromLobby} disabled={Object.keys(game.players).length === 0} className="mt-8 w-full">
            {Object.keys(game.players).length > 0 ? 'Oyunu BAŞLAT' : 'Oyuncu Bekleniyor...'}
          </Button>
        )}
      </div>
    );
  };
  
  // Oyun İçi Soru Ekranı (Admin)
  const AdminGameScreen = () => {
    if (!game || !currentQuestion) return <div className="text-center text-xl text-red-500">Hata: Soru yüklenemedi.</div>;

    const totalPlayers = Object.keys(game.players).length;
    
    // Tüm oyuncular cevapladı mı?
    const isQuestionFinished = answeredCount === totalPlayers;
    
    // Cevap özetini hesapla
    const answerSummary = currentQuestion.options.map((option, index) => {
        const correct = index === currentQuestion.correctAnswerIndex;
        // Bu cevabı veren oyuncu sayısı
        const totalAnswers = Object.values(game.playerAnswers).filter(a => a.answerIndex === index).length; 
        const percentage = totalPlayers > 0 ? Math.round((totalAnswers / totalPlayers) * 100) : 0;
        
        return { option, totalAnswers, percentage, correct, index };
    });
    
    const colors = ['bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500'];

    return (
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-4xl">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h2 className="text-3xl font-extrabold text-indigo-700">
            Soru {game.currentQuestionIndex + 1} / {game.questions.length}
          </h2>
          <span className="text-xl font-bold text-gray-600">
            {answeredCount} / {totalPlayers} Cevapladı
          </span>
        </div>

        <div className="bg-gray-100 p-8 rounded-xl mb-8">
          <p className="text-3xl font-semibold text-gray-800 text-center">{currentQuestion.text}</p>
        </div>

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
        
        <div className="mt-8 border-t pt-4">
          <Button onClick={nextQuestion} className="w-full" disabled={!isQuestionFinished}>
            {game.currentQuestionIndex + 1 < game.questions.length ? 'Sonraki Soruya Geç' : 'Skor Tablosunu Göster'}
          </Button>
        </div>
      </div>
    );
  };
  
  // Oyun İçi Cevap Ekranı (Oyuncu)
  const PlayerGameScreen = () => {
    if (!game || !currentQuestion || !currentPlayer) return <div className="text-center text-xl text-red-500">Hata: Oyun verisi eksik.</div>;

    const hasAnswered = game.answersReceived[userId];
    const colors = ['bg-red-500 hover:bg-red-600', 'bg-blue-500 hover:bg-blue-600', 'bg-yellow-500 hover:bg-yellow-600', 'bg-green-500 hover:bg-green-600'];
    const answerIndex = game.playerAnswers[userId]?.answerIndex;
    
    // Yöneticinin sonraki soruya geçtiği anlamına gelen basit bir vekil kontrol
    const isQuestionOver = game.status !== 'in-game'; 

    return (
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-2xl text-center">
        <h2 className="text-3xl font-extrabold text-indigo-700 mb-6">
          {hasAnswered ? 'Cevap Gönderildi!' : `Soru ${game.currentQuestionIndex + 1}`}
        </h2>
        
        <div className="bg-gray-100 p-6 rounded-xl mb-6">
          <p className="text-xl font-semibold text-gray-800">{currentQuestion.text}</p>
        </div>
        
        {hasAnswered && (
            <div className={`p-4 rounded-xl mb-4 font-bold text-white ${
                answerIndex === currentQuestion.correctAnswerIndex ? 'bg-green-600' : 'bg-red-600'
            }`}>
                {answerIndex === currentQuestion.correctAnswerIndex ? 'DOĞRU!' : 'YANLIŞ!'} Cevabınız kaydedildi.
            </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {currentQuestion.options.map((option, index) => (
            <Button
              key={index}
              onClick={() => submitAnswer(index)}
              disabled={hasAnswered || isQuestionOver}
              className={`
                w-full h-20 text-xl font-extrabold shadow-lg ${colors[index]}
                ${hasAnswered && answerIndex !== index ? 'opacity-50' : ''}
              `}
              color="" // Varsayılan rengi özel renklerle geçersiz kıl
            >
              {hasAnswered ? 'Gönderildi' : option}
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
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-2xl text-center">
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
                ${player.isCurrentUser ? 'bg-indigo-100 border-2 border-indigo-500' : 'bg-gray-50'}`}
            >
              <div className="flex items-center space-x-4">
                <span className={`text-2xl font-black w-8 ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-amber-700' : 'text-gray-500'}`}>
                  #{player.rank}
                </span>
                <span className="text-xl font-semibold text-gray-800">{player.name}</span>
                {player.isCurrentUser && <span className="text-xs font-bold text-indigo-600 bg-indigo-200 px-2 py-0.5 rounded-full">Siz</span>}
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


  // Karşılama Ekranı (İlk görünüm)
  const WelcomeScreen = () => {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md text-center">
        <h1 className="text-4xl font-black text-indigo-700 mb-2">Ramoot</h1>
        <p className="text-lg text-gray-600 mb-8">Canlı Çok Oyunculu Quiz Sistemi</p>

        <Input 
          label="Oyun ID (Katılmak İçin)"
          value={gameId}
          onChange={(e) => setGameId(e.target.value.toUpperCase())}
          placeholder="Örn: A1B2C3"
        />
        <Input 
          label="Adın nedir?"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="Rumuzunuz"
        />
        
        <div className="space-y-4 mt-6">
          <Button onClick={joinGame} className="w-full" disabled={!gameId || !userName}>
            Oyuna Katıl
          </Button>
          <Button 
            onClick={() => setMode('create-questions')} 
            className="w-full" 
            color="bg-purple-600 hover:bg-purple-700"
          >
            Yeni Oyun Oluştur (Admin)
          </Button>
        </div>
        
        <p className="mt-6 text-xs text-gray-400">Kullanıcı ID: {userId}</p>
      </div>
    );
  };
  
  // --- Ana Render Mantığı ---
  
  // Yükleme Durumu
  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-xl text-indigo-600">Sistem başlatılıyor...</p>
      </div>
    );
  }
  
  // Hata Gösterimi
  if (error) {
    // Hata mesajını belirgin şekilde göster
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
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
            <p className="mt-6 text-xs text-gray-400">Kullanıcı ID: {userId}</p>
        </div>
    );
  }

  // Hata yoksa, hangi ekranı göstereceğine karar ver
  let Content;
  
  if (mode === 'create-questions') {
    Content = <QuizCreation />;
  } else if (gameId && game) {
    // Oyun var, durumu kontrol et
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
        // Oyuncu oyuna katılamamışsa veya oyun başlamışsa
        Content = <div className="text-center text-xl text-red-500">Oyun başladı, katılamazsınız.</div>;
      }
    } else if (isScore) {
      Content = <Scoreboard />;
    }
  } else {
    // Varsayılan karşılama ekranı
    Content = <WelcomeScreen />;
  }

  // Nihai düzen
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans antialiased">
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