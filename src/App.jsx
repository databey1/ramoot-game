import React, { useState, useEffect, useCallback, useMemo } from 'react';

// Firebase imports
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, doc, setDoc, getDoc, updateDoc, 
  onSnapshot
} from 'firebase/firestore';

// --- Firebase ve Global Durum Yönetimi ---

// KULLANICININ İSTEĞİ ÜZERİNE, SAĞLANAN HARDBOARDED FIREBASE AYARLARI KULLANILIYOR.
const HARDCODED_FIREBASE_CONFIG = {
    apiKey: "AIzaSyCWomiP6AUe13iKexXZAPibxvi67zrY11A",
    authDomain: "ramoot-game.firebaseapp.com",
    projectId: "ramoot-game",
    storageBucket: "ramoot-game.firebasestorage.app",
    messagingSenderId: "403149392724",
    appId: "1:403149392724:web:36fbcff884eec5bac6d6c1"
};

// Yapılandırmayı doğrudan kullan
const firebaseApp = initializeApp(HARDCODED_FIREBASE_CONFIG);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

// --- YENİ EKLENEN KISIM: 18 SORU VE FOTOĞRAF URL'leri ---
// NOT: BU URL'LER SADECE ÖRNEKTİR. LÜTFEN public/images KLASÖRÜNE ATTIĞINIZ FOTOĞRAFLARIN ADLARIYLA DEĞİŞTİRİN.
const QUESTIONS = [
  { id: 1, questionText: "Ditching esnasında tüm sınıfı raft'e çekerken tüm gün ayak görüp yorgunluktan ve nefessizlikten inkapasite olan kimdir?", options: ["Cansu", "İlkay", "Aleyna", "Ezher"], correctAnswerIndex: 1, imageUrl: "/images/soru1-ankara.jpg", points: 1000 },
  { id: 2, questionText: "Fındık anonsunu son dakika değişikliği ile anons kitabına ekleten kimdir?", options: ["Aylin", "Serkan", "Kübra", "Gürkan"], correctAnswerIndex: 2, imageUrl: "/images/soru2-everest.jpg", points: 1000 },
  { id: 3, questionText: "Yolcu acil olarak işemeye çalışırken PDF'e göre karar veren kimdi?", options: ["Rana", "Fadime", "Ramazan", "Berke"], correctAnswerIndex: 2, imageUrl: "/images/soru3-react.jpg", points: 1000 },
  { id: 4, questionText: "Arnavutköy isimli zehirli oku İLK sıkan kimdir?", options: ["Fadime", "Zeynep", "Kübra", "Mert"], correctAnswerIndex: 2, imageUrl: "/images/soru4-space.jpg", points: 1000 },
  { id: 5, questionText: "Ev kiralarıyla oto galeri açmaya yemin etmiş ekip arkadaşımız kimdir?", options: ["Hatice", "Hatice Kübra", "Özlem", "Mert"], correctAnswerIndex: 1, imageUrl: "/images/soru5-gold.jpg", points: 1000 },
  { id: 6, questionText: "Allahın hakkı üçtür diyip her sınava 3 kere kim girmişti?", options: ["Aylin", "Rana", "Aleyna", "Oğuzhan"], correctAnswerIndex: 1, imageUrl: "/images/soru6-vercel.jpg", points: 1000 },
  { id: 7, questionText: "Yangın tiplerine yeni bir soluk getirerek 'alpha türü' yangını jargona sokan kimdi?", options: ["Ezher", "Fadime", "Özlem", "Gürkan"], correctAnswerIndex: 2, imageUrl: "/images/soru7-turkey.jpg", points: 1000 },
  { id: 8, questionText: "Sınıfımızın Ankaralı zengin ismi kimdir?", options: ["İlkay", "Rana", "Gürkan", "Ezher"], correctAnswerIndex: 1, imageUrl: "/images/soru8-byte.jpg", points: 1000 },
  { id: 9, questionText: "Üniversiteyi 4.sınıfta dondurduğuna şerefi ve namusu üzerine yemin eden arkadaşımız kimdir?", options: ["Özlem", "Zeynep", "Berke", "Ramazan"], correctAnswerIndex: 2, imageUrl: "/images/soru9-monalisa.jpg", points: 1000 },
  { id: 10, questionText: "Bu testi çözerken bile duygulanıp ağlama ihtimali olan kimdir?", options: ["Kübra", "Hatice Kübra", "Hatice", "Aleyna"], correctAnswerIndex: 3, imageUrl: "/images/soru10-ocean.jpg", points: 1000 },
  { id: 11, questionText: "Bizi manitadan ayrı düşünmeyip sabahları gruba güno aşkım mesajı atan kimdir?", options: ["Mert", "Oğuz", "Berke", "Gürkan"], correctAnswerIndex: 2, imageUrl: "/images/soru11-jupiter.jpg", points: 1000 },
  { id: 12, questionText: "Japonya'da anime festivallerinde edindiği CRM becerileriyle derste halka problemini tekte çözen kimdir?", options: ["Ramazan", "Kübra", "Berke", "Cansu"], correctAnswerIndex: 2, imageUrl: "/images/soru12-area.jpg", points: 1000 },
  { id: 13, questionText: "İş çıkışı piercing ve sayısız küpeyle hardcore death metalci takılan arkadaşımız kimdir", options: ["Rana", "Fadime", "Zeynep", "Aylin"], correctAnswerIndex: 3, imageUrl: "/images/soru13-skin.jpg", points: 1000 },
  { id: 14, questionText: "Görme engelli yolcuya bağırarak dudaklarımı görebiliyor musun diyen kimdir?", options: ["İlkay", "Serkan", "Oğuz", "Mert"], correctAnswerIndex: 1, imageUrl: "/images/soru14-hobbit.jpg", points: 1000 },
  { id: 15, questionText: "Apronda babadan yadigar doblosuyla sıfır çizmek isteyen kimdir?", options: ["Hatice Kübra", "Ramazan", "Gürkan", "Hatice"], correctAnswerIndex: 1, imageUrl: "/images/soru15-triangle.jpg", points: 1000 },
  { id: 16, questionText: "Ders çalışma bahanesiyle tüm sınıfı sürekli Gloria Jeanse götürüp şubeden kar payı alan kimdir?", options: ["Aleyna", "Fadime", "Ezher", "Rana"], correctAnswerIndex: 1, imageUrl: "/images/soru16-firebase.jpg", points: 1000 },
  { id: 17, questionText: "Rusyanın eşsiz bucaksız tundralarından, Ciddenin kavurucu sıcaklarına kadar tüm coğrafya bilgisini bize aktaran kişi kimdir?", options: ["Hatice Kübra", "Gürkan", "Ezher", "İlkay"], correctAnswerIndex: 1, imageUrl: "/images/soru17-colors.jpg", points: 1000 },
  { id: 18, questionText: "Uğur Dündar gibi araştırmacı gazetici, Picasso gibi soyut bir ressam ve İngiltere Kralı gibi İngilicce bilen kimdir?", options: ["Zeynep", "Cansu", "Serkan", "Oğuz"], correctAnswerIndex: 1, imageUrl: "/images/soru18-maker.jpg", points: 1000 },
];

// Soru Cevaplama Süre Limiti (Saniye)
const TIME_LIMIT = 15; 

// --- Component: WelcomeScreen (Karşılama Ekranı) ---
const WelcomeScreen = ({ setGameId, setMode, handleCreateGame }) => {
    const [inputCode, setInputCode] = useState('');
    const [joinError, setJoinError] = useState('');

    const handleJoinGame = async () => {
        if (!inputCode) {
            setJoinError("Lütfen bir oyun kodu giriniz.");
            return;
        }

        const gameRef = doc(db, 'games', inputCode);
        const gameSnap = await getDoc(gameRef);

        if (gameSnap.exists()) {
            const gameData = gameSnap.data();
            if (gameData.status === 'lobby' || gameData.status === 'in-game') {
                setGameId(inputCode);
                setMode('join');
                setJoinError('');
            } else {
                setJoinError("Oyun bulunamadı veya sona erdi.");
            }
        } else {
            setJoinError("Geçersiz oyun kodu.");
        }
    };

    return (
        <div className="bg-white p-10 rounded-xl shadow-2xl max-w-lg w-full text-center border-b-8 border-blue-500 transition duration-500">
            <h1 className="text-5xl font-extrabold text-blue-800 mb-6 tracking-wider">RAMOOT!</h1>
            <p className="text-gray-600 mb-8 text-lg font-semibold">Kahoot tarzı quiz oyununa hoş geldiniz.</p>

            <div className="flex justify-center space-x-4 mb-8">
                <button
                    onClick={handleCreateGame}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg transition duration-200 shadow-xl transform hover:scale-105"
                >
                    Yeni Oyun Başlat (Admin)
                </button>
            </div>
            
            <div className="border-t pt-6">
                <h2 className="text-2xl font-bold text-gray-700 mb-4">Oyuna Katıl</h2>
                <input
                    type="text"
                    placeholder="Oyun Kodunu Giriniz (örn: 1234)"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    className="w-full p-3 mb-4 border-2 border-gray-300 rounded-lg text-lg text-center focus:ring-4 focus:ring-yellow-400 focus:border-yellow-400"
                />
                <button
                    onClick={handleJoinGame}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200 shadow-xl transform hover:scale-105"
                >
                    Oyuna Katıl
                </button>
                {joinError && <p className="text-red-500 mt-3">{joinError}</p>}
            </div>
        </div>
    );
};

// Component: JoinScreen (Oyuncu Katılım Ekranı)
const JoinScreen = ({ setMode, gameCode, handleJoinLobby }) => {
    const [playerName, setPlayerName] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = () => {
        if (playerName.length < 3 || playerName.length > 15) {
            setError("İsim 3-15 karakter arasında olmalıdır.");
            return;
        }
        handleJoinLobby(playerName, gameCode);
    };

    return (
        <div className="bg-white p-8 rounded-xl shadow-2xl max-w-sm w-full text-center border-b-8 border-blue-500 transition duration-500">
            <h1 className="text-3xl font-extrabold text-blue-700 mb-4">Oyuna Katıl</h1>
            <p className="text-xl font-mono tracking-widest bg-gray-100 p-2 rounded-lg mb-6">KOD: {gameCode}</p>

            <input
                type="text"
                placeholder="Takma Adınızı Giriniz"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full p-3 mb-4 border-2 border-blue-300 rounded-lg text-lg text-center focus:ring-4 focus:ring-blue-400 focus:border-blue-400"
                maxLength={15}
            />
            {error && <p className="text-red-500 mb-3">{error}</p>}
            <button
                onClick={handleSubmit}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200 shadow-xl transform hover:scale-105"
            >
                Lobiye Gir
            </button>
            <button
                onClick={() => setMode('welcome')}
                className="w-full mt-3 bg-gray-400 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg transition duration-200 shadow-md"
            >
                Geri Dön
            </button>
        </div>
    );
};

// Component: Lobby (Lobi Ekranı)
const Lobby = ({ game, user, isAdmin, handleStartGame }) => {
    const players = useMemo(() => game?.players || {}, [game]);
    const playerList = useMemo(() => Object.values(players).sort((a, b) => a.joinedAt - b.joinedAt), [players]);

    return (
        <div className="bg-white p-8 rounded-xl shadow-2xl max-w-xl w-full text-center border-b-8 border-green-500 transition duration-500">
            <h1 className="text-4xl font-extrabold text-green-600 mb-4">LOBİ</h1>
            <p className="text-gray-700 text-2xl mb-6 font-mono tracking-widest bg-yellow-100 p-3 rounded-lg shadow-inner">KOD: {game.gameCode}</p>

            {isAdmin && playerList.length > 0 && (
                <button
                    onClick={handleStartGame}
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition duration-200 shadow-lg mb-6 transform hover:scale-105"
                >
                    Oyunu Başlat ({playerList.length} Oyuncu)
                </button>
            )}
            
            <div className="mt-4 max-h-60 overflow-y-auto">
                <h2 className="text-xl font-bold text-gray-700 mb-3">Katılımcılar: ({playerList.length})</h2>
                <ul className="space-y-2">
                    {playerList.map(player => (
                        <li key={player.id} className={`p-2 rounded-lg text-left font-medium shadow-sm transition duration-150 ${player.id === user.uid ? 'bg-yellow-200 text-yellow-900 border-l-4 border-yellow-500' : 'bg-gray-100'}`}>
                            {player.name}
                        </li>
                    ))}
                </ul>
            </div>

            {!isAdmin && <p className="text-lg mt-4 font-semibold text-gray-600">Admin oyunu başlatmayı bekliyor...</p>}
            {isAdmin && playerList.length === 0 && <p className="text-lg mt-4 text-red-500 font-semibold">Oyuncuların katılmasını bekliyorsunuz.</p>}
        </div>
    );
};

// Component: AdminGameScreen (Admin Soru Ekranı)
const AdminGameScreen = ({ game, handleNextQuestion, handleShowScoreboard, user }) => {
    const currentQ = game.questions?.[game.currentQuestionIndex];
    const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);

    // Geri Sayım Efekti (Otomatik cevaplamayı tetikler)
    useEffect(() => {
        if (!currentQ || currentQ.answered) {
            setTimeLeft(TIME_LIMIT); 
            return;
        }

        const elapsed = Math.floor((Date.now() - currentQ.startTime) / 1000);
        const remaining = TIME_LIMIT - elapsed;
        
        if (remaining <= 0) {
            // Süre doldu, soruyu otomatik olarak cevaplanmış olarak işaretle
            const gameRef = doc(db, 'games', game.gameCode);
            updateDoc(gameRef, {
                [`questions.${game.currentQuestionIndex}.answered`]: true
            });
            setTimeLeft(0);
            return;
        }

        setTimeLeft(remaining);

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    // Süre doldu, soruyu otomatik olarak cevaplanmış olarak işaretle
                    const gameRef = doc(db, 'games', game.gameCode);
                    updateDoc(gameRef, {
                        [`questions.${game.currentQuestionIndex}.answered`]: true
                    });
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [game, currentQ]);

    // Soruya ait fotoğrafı gösterme alanı
    const ImageDisplay = () => {
        if (!currentQ || !currentQ.answered || !currentQ.imageUrl) return null;
        
        return (
            <div className="mt-8 bg-white p-6 rounded-xl shadow-xl border-4 border-yellow-400">
                <h3 className="text-2xl font-bold mb-4 text-center text-indigo-700">DOĞRU CEVAP GÖRSELİ</h3>
                <img 
                    src={currentQ.imageUrl} 
                    alt="Soruya ait görsel" 
                    className="max-w-full h-auto rounded-lg mx-auto max-h-96 object-contain shadow-lg" 
                />
            </div>
        );
    };

    return (
        <div className="w-full max-w-4xl bg-white p-8 rounded-xl shadow-2xl border-b-8 border-indigo-600 transition duration-500">
            <h1 className="text-3xl font-extrabold text-gray-700 mb-4 text-center">Admin Ekranı - RAMOOT!</h1>
            <p className="text-2xl font-bold text-gray-500 mb-4 text-center">Soru: {game.currentQuestionIndex + 1} / {game.questions.length}</p>

            {currentQ ? (
                <>
                    <div className={`p-6 rounded-lg shadow-inner mb-6 transition-all duration-500 ${currentQ.answered ? 'bg-green-100' : 'bg-indigo-100'}`}>
                        <h2 className="text-3xl font-bold text-indigo-900 text-center">{currentQ.questionText}</h2>
                    </div>
                    
                    {/* Geri Sayım Çubuğu */}
                    <div className="text-center mb-6">
                        <div className={`text-6xl font-extrabold transition-colors duration-300 ${timeLeft <= 5 && !currentQ.answered ? 'text-red-600 animate-pulse' : 'text-blue-600'}`}>
                            {currentQ.answered ? 'Cevaplandı!' : timeLeft}
                        </div>
                        <p className="text-gray-500 font-semibold">{currentQ.answered ? 'Sonraki soruya geçin.' : 'Kalan Süre (saniye)'}</p>
                    </div>

                    {/* FOTOĞRAF ALANI */}
                    <ImageDisplay />

                    <div className="mt-8 flex justify-center space-x-4">
                        {game.currentQuestionIndex < game.questions.length - 1 ? (
                            <button
                                onClick={handleNextQuestion}
                                disabled={!currentQ.answered} 
                                className="bg-green-500 disabled:opacity-50 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-lg transition duration-200 shadow-lg transform hover:scale-105"
                            >
                                Sonraki Soruya Geç
                            </button>
                        ) : (
                            <button
                                onClick={handleShowScoreboard}
                                disabled={!currentQ.answered} 
                                className="bg-yellow-500 disabled:opacity-50 hover:bg-yellow-600 text-gray-900 font-bold py-3 px-8 rounded-lg transition duration-200 shadow-lg transform hover:scale-105"
                            >
                                Skor Tablosuna Geç
                            </button>
                        )}
                    </div>
                </>
            ) : (
                <div className="text-center text-xl text-red-500 font-semibold">Oyun Sorusu Yüklenemedi.</div>
            )}
        </div>
    );
};

// Component: PlayerGameScreen (Oyuncu Soru/Cevap Ekranı)
const PlayerGameScreen = ({ game, currentPlayer, handleAnswerQuestion, user }) => {
    const currentQ = game.questions?.[game.currentQuestionIndex];
    const isAnswered = currentPlayer?.answeredQuestions?.[currentQ?.id];

    // Oyuncunun Cevap Butonları
    const PlayerAnswerButtons = () => (
        <div className="grid grid-cols-2 gap-4 mt-8">
            {currentQ.options.map((option, index) => (
                <button
                    key={index}
                    onClick={() => handleAnswerQuestion(index)}
                    disabled={isAnswered !== undefined || currentQ.answered} // Cevapladıysa veya süre bittiyse pasifize et
                    className={`
                        text-white font-bold py-8 px-4 rounded-lg transition duration-200 shadow-xl text-lg transform hover:scale-105 disabled:opacity-75 disabled:shadow-none
                        ${index === 0 ? 'bg-red-500 hover:bg-red-600' : 
                          index === 1 ? 'bg-blue-500 hover:bg-blue-600' : 
                          index === 2 ? 'bg-yellow-500 hover:bg-yellow-600' : 
                          'bg-green-500 hover:bg-green-600'}
                        ${isAnswered === index ? 'border-4 border-white ring-4 ring-black/20' : ''}
                    `}
                >
                    {option}
                </button>
            ))}
        </div>
    );

    // Soruya ait fotoğrafı gösterme alanı (Oyuncu için)
    const ImageDisplay = () => {
        if (!currentQ || !currentQ.answered || !currentQ.imageUrl) return null;
        
        return (
            <div className="mt-8 bg-gray-100 p-4 rounded-xl shadow-md border-2 border-green-500">
                <h3 className="text-lg font-bold mb-2 text-center text-green-700">Doğru Cevap Görseli</h3>
                <img 
                    src={currentQ.imageUrl} 
                    alt="Soruya ait görsel" 
                    className="max-w-full h-auto rounded-lg mx-auto max-h-40 object-contain" 
                />
            </div>
        );
    };

    return (
        <div className="w-full max-w-md bg-white p-6 rounded-xl shadow-2xl border-b-8 border-purple-500 transition duration-500">
            {currentQ ? (
                <>
                    <p className="text-xl font-bold text-gray-500 mb-4 text-center">Soru: {game.currentQuestionIndex + 1}</p>
                    <div className="bg-purple-100 p-4 rounded-lg shadow-inner mb-4">
                        <h2 className="text-2xl font-bold text-purple-900 text-center">{currentQ.questionText}</h2>
                    </div>
                    
                    {currentQ.answered ? (
                        <>
                            <p className="text-center text-xl font-bold mt-4 text-green-600">Süre Bitti / Cevap Gösterildi!</p>
                            <p className="text-center text-lg font-semibold text-gray-700">
                                {isAnswered !== undefined ? (
                                    isAnswered === currentQ.correctAnswerIndex ? "Tebrikler, DOĞRU cevap!" : "Üzgünüm, YANLIŞ cevap."
                                ) : "Cevap vermeyi kaçırdınız."}
                            </p>
                            {/* FOTOĞRAF ALANI */}
                            <ImageDisplay />
                        </>
                    ) : (
                        isAnswered !== undefined ? (
                            <p className="text-center text-xl font-bold mt-4 text-yellow-600">Cevabınız Alındı! Admini Bekleyiniz.</p>
                        ) : (
                            <PlayerAnswerButtons />
                        )
                    )}
                </>
            ) : (
                <div className="text-center text-xl text-red-500 font-semibold">Soru yükleniyor...</div>
            )}
        </div>
    );
};

// Component: Scoreboard (Skor Tablosu)
const Scoreboard = ({ game, isAdmin, handleRestart, setMode, setGameId }) => {
    const sortedScores = useMemo(() => {
        if (!game?.scores || !game?.players) return [];
        return Object.values(game.players)
            .map(player => ({
                name: player.name,
                score: game.scores[player.id] || 0
            }))
            .sort((a, b) => b.score - a.score);
    }, [game]);

    const handleGoHome = () => {
        setMode('welcome');
        setGameId(null);
    };

    return (
        <div className="w-full max-w-xl bg-white p-8 rounded-xl shadow-2xl border-b-8 border-yellow-500 transition duration-500">
            <h1 className="text-4xl font-extrabold text-yellow-600 mb-6 text-center">SKOR TABLOSU</h1>
            <ul className="space-y-3">
                {sortedScores.map((score, index) => (
                    <li key={index} className={`p-4 rounded-lg flex justify-between items-center font-bold shadow-md transition duration-150
                        ${index === 0 ? 'bg-yellow-200 text-yellow-800 text-xl border-l-8 border-yellow-500 transform scale-105' : 'bg-gray-100'}`}>
                        <span>{index + 1}. {score.name}</span>
                        <span>{score.score} Puan</span>
                    </li>
                ))}
            </ul>

            <div className="mt-8 flex justify-center space-x-4">
                {isAdmin && (
                    <button
                        onClick={handleRestart}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200 shadow-lg transform hover:scale-105"
                    >
                        Yeni Oyun Başlat
                    </button>
                )}
                <button
                    onClick={handleGoHome}
                    className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg transition duration-200 shadow-md"
                >
                    Ana Sayfaya Dön
                </button>
            </div>
        </div>
    );
};

// --- Main App Component ---
const App = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [gameId, setGameId] = useState(null);
    const [game, setGame] = useState(null);
    const [mode, setMode] = useState('welcome'); 

    // 1. Firebase Auth Kontrolü
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                signInAnonymously(auth).then((result) => {
                    setUser(result.user);
                }).catch(error => {
                    console.error("Anonim oturum açma hatası:", error);
                });
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // 2. Oyun Durumu Dinleme
    useEffect(() => {
        if (!gameId) {
            setGame(null);
            return;
        }

        const gameRef = doc(db, 'games', gameId);
        const unsubscribe = onSnapshot(gameRef, (docSnap) => {
            if (docSnap.exists()) {
                setGame(docSnap.data());
            } else {
                setGame(null);
                if (mode !== 'welcome' && mode !== 'join') setMode('welcome'); 
            }
        }, (error) => {
            console.error("Oyun dinleme hatası:", error);
        });

        return () => unsubscribe();
    }, [gameId, mode]);

    const isAdmin = useMemo(() => user && game && game.adminId === user.uid, [user, game]);
    const currentPlayer = useMemo(() => user && game?.players?.[user.uid], [user, game]);
    
    // --- Oyun Yönetim Fonksiyonları ---

    // 1. Oyun Yarat
    const handleCreateGame = useCallback(async () => {
        if (!user) return;
        
        const gameCode = Math.floor(1000 + Math.random() * 9000).toString();
        const gameRef = doc(db, 'games', gameCode);

        // Soruları hazırlarken answered ve startTime alanlarını ekle
        const initialQuestions = QUESTIONS.map(q => ({
            ...q,
            answered: false, 
            startTime: null
        }));

        await setDoc(gameRef, {
            adminId: user.uid,
            status: 'lobby',
            currentQuestionIndex: -1,
            questions: initialQuestions,
            scores: {},
            playerCount: 0,
            gameCode: gameCode,
            players: {},
        });

        setGameId(gameCode);
        setMode('game'); 
    }, [user]);

    // 2. Oyuna Katıl (Lobiye)
    const handleJoinLobby = useCallback(async (playerName, code) => {
        if (!user) return;
        const gameRef = doc(db, 'games', code);
        const gameSnap = await getDoc(gameRef);

        if (!gameSnap.exists() || gameSnap.data().status === 'score') {
            alert("Oyun kodu geçersiz veya oyun sona erdi.");
            return;
        }

        const gameData = gameSnap.data();
        const newPlayer = {
            id: user.uid,
            name: playerName,
            joinedAt: Date.now(),
            score: 0,
            answeredQuestions: {}, 
        };

        // Oyuncu sayısı ve oyuncular listesini güncelle
        await updateDoc(gameRef, {
            playerCount: (gameData.playerCount || 0) + 1,
            [`players.${user.uid}`]: newPlayer,
        });

        setGameId(code);
        setMode('game'); 
    }, [user]);

    // 3. Oyuncu Cevapla (Hız ve Doğruluğa Bağlı Puanlama)
    const handleAnswerQuestion = useCallback(async (answerIndex) => {
        if (!user || !game || !game.gameCode || !game.players[user.uid]) return;
        const gameRef = doc(db, 'games', game.gameCode);
        const qIndex = game.currentQuestionIndex;
        const currentQ = game.questions[qIndex];

        // Süre veya durum kontrolü
        const isTimeUp = (Date.now() - currentQ.startTime) / 1000 > TIME_LIMIT;
        if (!currentQ || currentQ.answered || isTimeUp) return; 
        if (game.players[user.uid].answeredQuestions?.[currentQ.id]) return; 

        const isCorrect = answerIndex === currentQ.correctAnswerIndex;
        const timeElapsed = (Date.now() - currentQ.startTime) / 1000;
        
        // Puan hesaplama: Hızlı ve doğru cevaplar daha çok puan getirir.
        // Puan Kaybı Katsayısı 50 olarak belirlendi.
        const pointsAwarded = isCorrect ? Math.max(100, currentQ.points - (timeElapsed * 50)) : 0;
        
        // Oyuncunun skorunu ve cevaplarını güncelle
        await updateDoc(gameRef, {
            [`players.${user.uid}.score`]: (game.players[user.uid].score || 0) + pointsAwarded,
            [`players.${user.uid}.answeredQuestions.${currentQ.id}`]: answerIndex,
        });

    }, [user, game]);
    
    // 4. Admin Sonraki Soruya Geç
    const handleNextQuestion = useCallback(async () => {
        if (!isAdmin || !game) return;
        const gameRef = doc(db, 'games', game.gameCode);
        const nextIndex = game.currentQuestionIndex + 1;

        if (nextIndex < game.questions.length) {
            // Yeni soruya geç
            await updateDoc(gameRef, {
                currentQuestionIndex: nextIndex,
                // Yeni sorunun başlangıç zamanı
                [`questions.${nextIndex}.startTime`]: Date.now(),
            });
        } else {
            // Oyun bitti, skor tablosuna geç
            // Son skorları hesapla ve statüyü değiştir
            const finalScores = Object.fromEntries(Object.entries(game.players).map(([id, player]) => [id, player.score]));
            await updateDoc(gameRef, {
                status: 'score',
                scores: finalScores
            });
        }
    }, [isAdmin, game]);

    // 5. Admin Oyunu Başlat
    const handleStartGame = useCallback(async () => {
        if (!isAdmin || !game || Object.keys(game.players).length === 0) return;
        const gameRef = doc(db, 'games', game.gameCode);

        // İlk soruya geç ve oyunu başlat
        await updateDoc(gameRef, {
            status: 'in-game',
            currentQuestionIndex: 0,
            [`questions.0.startTime`]: Date.now(),
        });
    }, [isAdmin, game]);

    // 6. Admin Skor Tablosunu Göster
    const handleShowScoreboard = useCallback(async () => {
        if (!isAdmin || !game) return;
        const gameRef = doc(db, 'games', game.gameCode);
        
        const finalScores = Object.fromEntries(Object.entries(game.players).map(([id, player]) => [id, player.score]));
        
        await updateDoc(gameRef, {
            status: 'score',
            scores: finalScores
        });
    }, [isAdmin, game]);

    // 7. Admin Oyunu Sıfırla (Yeniden Başlat)
    const handleRestart = useCallback(async () => {
        if (!isAdmin || !game) return;
        const gameRef = doc(db, 'games', game.gameCode);

        // Oyuncu skorlarını sıfırla
        const resetPlayers = Object.fromEntries(Object.entries(game.players).map(([id, player]) => [id, { ...player, score: 0, answeredQuestions: {} }]));
        
        // Soruları sıfırla
        const resetQuestions = game.questions.map(q => ({
            ...q,
            answered: false,
            startTime: null
        }));

        await updateDoc(gameRef, {
            status: 'lobby',
            currentQuestionIndex: -1,
            players: resetPlayers,
            questions: resetQuestions,
            scores: {},
        });
    }, [isAdmin, game]);


    // --- Ekran Yönlendirmesi ---

    if (loading) {
        return <div className="text-white text-3xl font-bold">Yükleniyor...</div>;
    }

    let Content = null;
    
    if (mode === 'welcome') {
        Content = <WelcomeScreen setGameId={setGameId} setMode={setMode} handleCreateGame={handleCreateGame} />;
    } else if (mode === 'join') {
        Content = <JoinScreen setMode={setMode} gameCode={gameId} handleJoinLobby={handleJoinLobby} />;
    } else if (gameId && game) {
        const isLobby = game.status === 'lobby';
        const isInGame = game.status === 'in-game';
        const isScore = game.status === 'score';
        
        if (isLobby) {
            Content = <Lobby 
                        game={game} 
                        user={user} 
                        isAdmin={isAdmin} 
                        handleStartGame={handleStartGame} 
                      />;
        } else if (isInGame) {
            if (isAdmin) {
                Content = <AdminGameScreen 
                            game={game} 
                            handleNextQuestion={handleNextQuestion} 
                            handleShowScoreboard={handleShowScoreboard}
                            user={user}
                          />;
            } else if (currentPlayer) {
                Content = <PlayerGameScreen 
                            game={game} 
                            currentPlayer={currentPlayer} 
                            handleAnswerQuestion={handleAnswerQuestion}
                            user={user}
                          />;
            } else {
                Content = <div className="text-center text-xl text-white font-bold p-8 bg-red-600 rounded-xl shadow-2xl">
                            Oyun başladı, katılamazsınız.
                          </div>;
            }
        } else if (isScore) {
            Content = <Scoreboard 
                        game={game} 
                        isAdmin={isAdmin} 
                        handleRestart={handleRestart} 
                        setMode={setMode} 
                        setGameId={setGameId} 
                      />;
        }
    } else {
        Content = <div className="text-center text-xl text-white font-bold p-8 bg-red-600 rounded-xl shadow-2xl">
                    Oyun bulunamadı veya sona erdi.
                  </div>;
    }

    // son düzen
    return (
        //  arka plan rengi eklendi
        <div className="min-h-screen bg-indigo-800 flex flex-col items-center justify-center p-4 font-sans antialiased">
            {Content}
            
            {(mode !== 'welcome' && !game) && (
                 <button
                    onClick={() => setMode('welcome')}
                    className="mt-6 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition duration-200 shadow-md"
                >
                    Ana Sayfaya Dön
                </button>
            )}
        </div>
    );
};


export default App;