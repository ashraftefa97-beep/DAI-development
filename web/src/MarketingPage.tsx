import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Check, Globe2, Mic, Search, ShieldCheck, Sparkles, WandSparkles } from 'lucide-react';
import DaiFace, { type DaiState } from './DaiFace';
import './marketing.css';

type Locale='ar'|'en'|'fr'|'es'|'de'|'it'|'pt'|'tr'|'ja'|'ko';

type Copy={
  nav:{product:string;personality:string;languages:string;open:string};
  hero:{eyebrow:string;title1:string;title2:string;body:string;primary:string;secondary:string;note:string};
  buddy:{label:string;title:string;body:string;actions:[string,string,string,string]};
  flow:{eyebrow:string;title:string;body:string;cards:Array<{kicker:string;title:string;body:string}>};
  personality:{eyebrow:string;title:string;body:string;points:string[]};
  languages:{eyebrow:string;title:string;body:string};
  privacy:{eyebrow:string;title:string;body:string;points:string[]};
  final:{title:string;body:string;button:string};
  footer:string;
};

const COPY:Record<Locale,Copy>={
  ar:{
    nav:{product:'عن ضي',personality:'الشخصية',languages:'اللغات',open:'افتح ضي'},
    hero:{
      eyebrow:'DAI AI · ضي',
      title1:'ضي، مساعدة ذكية.',
      title2:'تسمعك. تفهمك. وتتحرك معاك.',
      body:'ضي تجمع بين الكلام الطبيعي، البحث، الأدوات والحركة في شخصية واحدة خفيفة وسريعة — مش مجرد صندوق شات.',
      primary:'جرب ضي',
      secondary:'شوف الشخصية',
      note:'ويب الآن · نسخة الديسكتوب قيد التطوير'
    },
    buddy:{
      label:'جرب ردود الفعل',
      title:'وش صغير. حضور كبير.',
      body:'ضي بتتفاعل مع اللي بيحصل: تسمع، تركز، تدور، تفرح وتهدى — بحركة خفيفة بدل الأنيميشن المتكرر.',
      actions:['اسمعيني','ركزي','دوري','افرحي']
    },
    flow:{
      eyebrow:'من السؤال للفعل',
      title:'مصممة عشان تعمل، مش بس ترد.',
      body:'الواجهة بتوضح الحالة بدل ما تخبيها: ضي بتفهم، تبحث، تنفذ وترجعلك النتيجة في مسار واحد.',
      cards:[
        {kicker:'01',title:'صوت طبيعي',body:'تكلم بصوتك وخلي ضي ترد بصوت أنثوي مصري واضح ومباشر.'},
        {kicker:'02',title:'بحث وأدوات',body:'لما السؤال يحتاج معلومة حديثة، ضي تقدر تبحث وتجمع النتيجة بدل التخمين.'},
        {kicker:'03',title:'شخصية متحركة',body:'العين والرأس وتعبيرات الوجه تتغير حسب الحالة بدل حركة محفوظة واحدة.'},
        {kicker:'04',title:'من الويب للديسكتوب',body:'الهدف إن نفس الشخصية تكمل معاك من المتصفح لنسخة الكمبيوتر بصلاحيات واضحة.'}
      ]
    },
    personality:{
      eyebrow:'الشخصية والفيزياء',
      title:'حركة تحسها رد فعل، مش تشغيل ملف أنيميشن.',
      body:'بنستخدم طبقات حركة مستقلة للرأس والعين والوجه والجسم، مع Spring Dynamics وmicro‑reactions عشان ضي تفضل حية من غير مبالغة.',
      points:['تفاعل مع المؤشر والسحب','انتقالات مرنة بين الحالات','فم مرتبط بالصوت أثناء الكلام','الأيدي هادية وقت الحديث']
    },
    languages:{
      eyebrow:'واجهة متعددة اللغات',
      title:'ضي تتكلم بطريقتك.',
      body:'الصفحة التعريفية الجديدة جاهزة بعشر لغات، مع اتجاه RTL/LTR تلقائي وتصميم يحافظ على نفس الهوية في كل لغة.'
    },
    privacy:{
      eyebrow:'تحكم واضح',
      title:'أنت اللي تختار التجربة.',
      body:'إعدادات الصوت، الحركة، الحساب والوضع البصري تفضل واضحة ومباشرة بدل ما تكون مخفية جوه التجربة.',
      points:['تشغيل أو إيقاف الصوت والمؤثرات','اختيار الأفاتار وطريقة الحركة','تحكم في الحساب والجلسة','أوضاع عرض تناسب الموبايل والديسكتوب']
    },
    final:{title:'تعرف على ضي وهي شغالة.',body:'افتح التطبيق وجرب الكلام، البحث والحركة بنفسك.',button:'افتح DAI AI'},
    footer:'DAI AI — ضي · شخصية ذكية مصممة لتكون أخف وأقرب.'
  },
  en:{
    nav:{product:'About',personality:'Personality',languages:'Languages',open:'Open DAI'},
    hero:{eyebrow:'DAI AI · DAI',title1:'An AI assistant',title2:'that feels present.',body:'DAI brings natural conversation, search, tools and motion into one lightweight character — not just another chat box.',primary:'Try DAI',secondary:'Meet the character',note:'Web now · Desktop in development'},
    buddy:{label:'Try the reactions',title:'A little face. A real presence.',body:'DAI reacts to what is happening: listening, focusing, searching, celebrating and settling down with lightweight, varied motion.',actions:['Listen','Focus','Search','Celebrate']},
    flow:{eyebrow:'From question to action',title:'Built to do, not only answer.',body:'The interface makes every phase visible: DAI understands, searches, acts and returns the result in one flow.',cards:[
      {kicker:'01',title:'Natural voice',body:'Speak naturally and get a clear, direct feminine voice response.'},
      {kicker:'02',title:'Search & tools',body:'When current information matters, DAI can search and synthesize instead of guessing.'},
      {kicker:'03',title:'Living character',body:'Eyes, head and facial expression shift with context instead of repeating one loop.'},
      {kicker:'04',title:'Web to desktop',body:'The same character is designed to continue from the browser into a permission-aware desktop app.'}
    ]},
    personality:{eyebrow:'Personality & physics',title:'Motion that reads like reaction, not playback.',body:'Independent layers for gaze, head, face and body use spring dynamics and micro-reactions to keep DAI alive without becoming distracting.',points:['Pointer and drag reactions','Soft state transitions','Voice-driven mouth motion','Hands stay calm while speaking']},
    languages:{eyebrow:'Multilingual front-end',title:'DAI speaks your interface.',body:'This new introduction supports ten languages with automatic RTL/LTR direction while preserving the same visual identity.'},
    privacy:{eyebrow:'Clear control',title:'You choose the experience.',body:'Voice, motion, account and visual settings stay visible and understandable instead of disappearing behind the assistant.',points:['Voice and sound controls','Avatar and motion choices','Account and session controls','Responsive desktop and mobile layouts']},
    final:{title:'Meet DAI in motion.',body:'Open the app and try conversation, search and reactions for yourself.',button:'Open DAI AI'},
    footer:'DAI AI · A lightweight AI character built to feel closer.'
  },
  fr:{
    nav:{product:'À propos',personality:'Personnalité',languages:'Langues',open:'Ouvrir DAI'},
    hero:{eyebrow:'DAI AI · DAI',title1:'Une assistante IA',title2:'qui semble vraiment présente.',body:'DAI réunit conversation naturelle, recherche, outils et mouvement dans un seul personnage léger.',primary:'Essayer DAI',secondary:'Voir le personnage',note:'Web maintenant · Desktop en développement'},
    buddy:{label:'Tester les réactions',title:'Un petit visage. Une vraie présence.',body:'DAI écoute, se concentre, cherche, célèbre et se calme avec des mouvements légers et variés.',actions:['Écouter','Focus','Chercher','Célébrer']},
    flow:{eyebrow:'De la question à l’action',title:'Pensée pour agir, pas seulement répondre.',body:'Chaque étape reste visible : comprendre, chercher, agir et revenir avec un résultat.',cards:[
      {kicker:'01',title:'Voix naturelle',body:'Parlez naturellement et recevez une réponse vocale claire et directe.'},
      {kicker:'02',title:'Recherche et outils',body:'DAI peut rechercher des informations récentes au lieu de deviner.'},
      {kicker:'03',title:'Personnage vivant',body:'Le regard, la tête et le visage changent selon le contexte.'},
      {kicker:'04',title:'Web vers desktop',body:'La même personnalité est pensée pour continuer sur ordinateur.'}
    ]},
    personality:{eyebrow:'Personnalité & physique',title:'Des mouvements qui ressemblent à des réactions.',body:'Le regard, la tête, le visage et le corps utilisent des ressorts et micro‑réactions indépendantes.',points:['Réagit au pointeur','Transitions souples','Bouche liée à la voix','Mains calmes pendant la parole']},
    languages:{eyebrow:'Interface multilingue',title:'DAI parle votre interface.',body:'Cette page prend en charge dix langues avec direction RTL/LTR automatique.'},
    privacy:{eyebrow:'Contrôle clair',title:'Vous choisissez l’expérience.',body:'Les réglages de voix, mouvement, compte et affichage restent accessibles.',points:['Contrôle voix et sons','Choix avatar et mouvement','Contrôle du compte','Responsive mobile et desktop']},
    final:{title:'Découvrez DAI en mouvement.',body:'Ouvrez l’application et testez la conversation et la recherche.',button:'Ouvrir DAI AI'},
    footer:'DAI AI · Une personnalité IA légère et proche.'
  },
  es:{
    nav:{product:'Acerca de',personality:'Personalidad',languages:'Idiomas',open:'Abrir DAI'},
    hero:{eyebrow:'DAI AI · DAI',title1:'Una asistente de IA',title2:'que se siente presente.',body:'DAI combina conversación natural, búsqueda, herramientas y movimiento en un solo personaje ligero.',primary:'Probar DAI',secondary:'Conocer al personaje',note:'Web ahora · Desktop en desarrollo'},
    buddy:{label:'Prueba reacciones',title:'Una cara pequeña. Mucha presencia.',body:'DAI escucha, se concentra, busca, celebra y se relaja con movimientos ligeros y variados.',actions:['Escuchar','Enfocar','Buscar','Celebrar']},
    flow:{eyebrow:'De pregunta a acción',title:'Hecha para hacer, no solo responder.',body:'Cada fase es visible: entender, buscar, actuar y volver con el resultado.',cards:[
      {kicker:'01',title:'Voz natural',body:'Habla con naturalidad y recibe una respuesta de voz clara y directa.'},
      {kicker:'02',title:'Búsqueda y herramientas',body:'DAI puede buscar información actual en lugar de adivinar.'},
      {kicker:'03',title:'Personaje vivo',body:'Ojos, cabeza y expresión cambian con el contexto.'},
      {kicker:'04',title:'De web a escritorio',body:'La misma personalidad está pensada para continuar en desktop.'}
    ]},
    personality:{eyebrow:'Personalidad y física',title:'Movimiento que parece reacción, no reproducción.',body:'Capas independientes para mirada, cabeza, cara y cuerpo usan dinámica de resortes y micro‑reacciones.',points:['Reacción al puntero','Transiciones suaves','Boca guiada por voz','Manos tranquilas al hablar']},
    languages:{eyebrow:'Interfaz multilingüe',title:'DAI habla tu interfaz.',body:'La nueva página admite diez idiomas con dirección RTL/LTR automática.'},
    privacy:{eyebrow:'Control claro',title:'Tú eliges la experiencia.',body:'Voz, movimiento, cuenta y apariencia siguen siendo fáciles de controlar.',points:['Controles de voz y sonido','Avatares y movimiento','Cuenta y sesión','Diseño móvil y desktop']},
    final:{title:'Conoce a DAI en movimiento.',body:'Abre la app y prueba conversación, búsqueda y reacciones.',button:'Abrir DAI AI'},
    footer:'DAI AI · Un personaje de IA ligero y cercano.'
  },
  de:{
    nav:{product:'Über DAI',personality:'Persönlichkeit',languages:'Sprachen',open:'DAI öffnen'},
    hero:{eyebrow:'DAI AI · DAI',title1:'Eine KI-Assistentin,',title2:'die sich präsent anfühlt.',body:'DAI verbindet natürliche Gespräche, Suche, Tools und Bewegung in einer leichten Figur.',primary:'DAI testen',secondary:'Figur entdecken',note:'Web jetzt · Desktop in Entwicklung'},
    buddy:{label:'Reaktionen testen',title:'Ein kleines Gesicht. Viel Präsenz.',body:'DAI hört zu, fokussiert, sucht, freut sich und kommt wieder zur Ruhe — mit leichter, variabler Bewegung.',actions:['Zuhören','Fokus','Suchen','Freuen']},
    flow:{eyebrow:'Von Frage zu Aktion',title:'Zum Handeln gebaut, nicht nur zum Antworten.',body:'Jede Phase bleibt sichtbar: verstehen, suchen, handeln und Ergebnis liefern.',cards:[
      {kicker:'01',title:'Natürliche Stimme',body:'Natürlich sprechen und eine klare, direkte Antwort hören.'},
      {kicker:'02',title:'Suche & Tools',body:'DAI kann aktuelle Informationen suchen, statt zu raten.'},
      {kicker:'03',title:'Lebendige Figur',body:'Augen, Kopf und Gesicht reagieren auf den Kontext.'},
      {kicker:'04',title:'Web bis Desktop',body:'Die gleiche Persönlichkeit soll im Desktop weiterleben.'}
    ]},
    personality:{eyebrow:'Persönlichkeit & Physik',title:'Bewegung wie eine Reaktion, nicht wie Playback.',body:'Blick, Kopf, Gesicht und Körper nutzen unabhängige Federdynamik und Mikroreaktionen.',points:['Reagiert auf den Zeiger','Weiche Übergänge','Stimme steuert den Mund','Ruhige Hände beim Sprechen']},
    languages:{eyebrow:'Mehrsprachiges Frontend',title:'DAI spricht deine Oberfläche.',body:'Die neue Seite unterstützt zehn Sprachen mit automatischem RTL/LTR.'},
    privacy:{eyebrow:'Klare Kontrolle',title:'Du bestimmst das Erlebnis.',body:'Stimme, Bewegung, Konto und Darstellung bleiben verständlich steuerbar.',points:['Stimme & Sounds','Avatar & Bewegung','Konto & Sitzung','Mobile & Desktop Layouts']},
    final:{title:'Erlebe DAI in Bewegung.',body:'Öffne die App und teste Gespräch, Suche und Reaktionen.',button:'DAI AI öffnen'},
    footer:'DAI AI · Eine leichte KI-Persönlichkeit mit Präsenz.'
  },
  it:{
    nav:{product:'Chi è DAI',personality:'Personalità',languages:'Lingue',open:'Apri DAI'},
    hero:{eyebrow:'DAI AI · DAI',title1:'Un’assistente AI',title2:'che sembra davvero presente.',body:'DAI unisce conversazione naturale, ricerca, strumenti e movimento in un unico personaggio leggero.',primary:'Prova DAI',secondary:'Scopri il personaggio',note:'Web ora · Desktop in sviluppo'},
    buddy:{label:'Prova le reazioni',title:'Un piccolo volto. Una grande presenza.',body:'DAI ascolta, si concentra, cerca, festeggia e si rilassa con movimenti leggeri e vari.',actions:['Ascolta','Focus','Cerca','Festeggia']},
    flow:{eyebrow:'Dalla domanda all’azione',title:'Creata per fare, non solo rispondere.',body:'Ogni fase è visibile: capire, cercare, agire e restituire il risultato.',cards:[
      {kicker:'01',title:'Voce naturale',body:'Parla normalmente e ricevi una risposta vocale chiara e diretta.'},
      {kicker:'02',title:'Ricerca e strumenti',body:'DAI può cercare informazioni aggiornate invece di indovinare.'},
      {kicker:'03',title:'Personaggio vivo',body:'Occhi, testa ed espressioni cambiano con il contesto.'},
      {kicker:'04',title:'Dal web al desktop',body:'La stessa personalità è pensata per continuare sul computer.'}
    ]},
    personality:{eyebrow:'Personalità e fisica',title:'Movimento che sembra reazione, non playback.',body:'Sguardo, testa, viso e corpo usano dinamiche a molla e micro‑reazioni indipendenti.',points:['Reagisce al puntatore','Transizioni morbide','Bocca guidata dalla voce','Mani calme mentre parla']},
    languages:{eyebrow:'Front-end multilingue',title:'DAI parla la tua interfaccia.',body:'La nuova pagina supporta dieci lingue con RTL/LTR automatico.'},
    privacy:{eyebrow:'Controllo chiaro',title:'Scegli tu l’esperienza.',body:'Voce, movimento, account e aspetto restano facili da controllare.',points:['Voce e suoni','Avatar e movimento','Account e sessione','Layout mobile e desktop']},
    final:{title:'Scopri DAI in movimento.',body:'Apri l’app e prova conversazione, ricerca e reazioni.',button:'Apri DAI AI'},
    footer:'DAI AI · Un personaggio AI leggero e vicino.'
  },
  pt:{
    nav:{product:'Sobre',personality:'Personalidade',languages:'Idiomas',open:'Abrir DAI'},
    hero:{eyebrow:'DAI AI · DAI',title1:'Uma assistente de IA',title2:'que parece presente.',body:'DAI reúne conversa natural, pesquisa, ferramentas e movimento em uma personagem leve.',primary:'Experimentar DAI',secondary:'Conhecer a personagem',note:'Web agora · Desktop em desenvolvimento'},
    buddy:{label:'Teste as reações',title:'Um rosto pequeno. Uma presença real.',body:'DAI escuta, foca, pesquisa, comemora e relaxa com movimentos leves e variados.',actions:['Ouvir','Focar','Pesquisar','Comemorar']},
    flow:{eyebrow:'Da pergunta à ação',title:'Feita para agir, não só responder.',body:'Cada etapa fica visível: entender, pesquisar, agir e trazer o resultado.',cards:[
      {kicker:'01',title:'Voz natural',body:'Fale naturalmente e receba uma resposta de voz clara e direta.'},
      {kicker:'02',title:'Pesquisa e ferramentas',body:'DAI pode buscar informações atuais em vez de adivinhar.'},
      {kicker:'03',title:'Personagem viva',body:'Olhos, cabeça e expressão mudam conforme o contexto.'},
      {kicker:'04',title:'Web para desktop',body:'A mesma personalidade foi pensada para continuar no computador.'}
    ]},
    personality:{eyebrow:'Personalidade e física',title:'Movimento que parece reação, não reprodução.',body:'Olhar, cabeça, rosto e corpo usam molas e micro‑reações independentes.',points:['Reage ao ponteiro','Transições suaves','Boca guiada pela voz','Mãos calmas ao falar']},
    languages:{eyebrow:'Front-end multilíngue',title:'DAI fala a sua interface.',body:'A nova página suporta dez idiomas com RTL/LTR automático.'},
    privacy:{eyebrow:'Controle claro',title:'Você escolhe a experiência.',body:'Voz, movimento, conta e aparência continuam fáceis de controlar.',points:['Voz e sons','Avatar e movimento','Conta e sessão','Layouts mobile e desktop']},
    final:{title:'Conheça DAI em movimento.',body:'Abra o app e teste conversa, pesquisa e reações.',button:'Abrir DAI AI'},
    footer:'DAI AI · Uma personagem de IA leve e próxima.'
  },
  tr:{
    nav:{product:'DAI hakkında',personality:'Kişilik',languages:'Diller',open:'DAI’ı aç'},
    hero:{eyebrow:'DAI AI · DAI',title1:'Gerçekten yanında',title2:'hissettiren bir yapay zekâ.',body:'DAI doğal konuşma, arama, araçlar ve hareketi tek hafif karakterde birleştirir.',primary:'DAI’ı dene',secondary:'Karakteri gör',note:'Web şimdi · Masaüstü geliştiriliyor'},
    buddy:{label:'Tepkileri dene',title:'Küçük bir yüz. Güçlü bir varlık.',body:'DAI dinler, odaklanır, arar, sevinir ve sakinleşir; hareketler hafif ve çeşitlidir.',actions:['Dinle','Odaklan','Ara','Sevin']},
    flow:{eyebrow:'Sorudan eyleme',title:'Sadece cevaplamak için değil, yapmak için.',body:'Her aşama görünür: anlama, arama, eylem ve sonuç.',cards:[
      {kicker:'01',title:'Doğal ses',body:'Doğal konuş ve net, doğrudan bir sesli yanıt al.'},
      {kicker:'02',title:'Arama ve araçlar',body:'DAI güncel bilgi gerektiğinde arama yapabilir.'},
      {kicker:'03',title:'Canlı karakter',body:'Gözler, kafa ve yüz ifadesi bağlama göre değişir.'},
      {kicker:'04',title:'Web’den masaüstüne',body:'Aynı kişilik masaüstünde devam etmek üzere tasarlanıyor.'}
    ]},
    personality:{eyebrow:'Kişilik ve fizik',title:'Oynatma gibi değil, tepki gibi hareket.',body:'Bakış, kafa, yüz ve gövde bağımsız yay dinamikleri ve mikro tepkiler kullanır.',points:['İmlece tepki','Yumuşak geçişler','Sesle hareket eden ağız','Konuşurken sakin eller']},
    languages:{eyebrow:'Çok dilli arayüz',title:'DAI arayüzünün dilini konuşur.',body:'Yeni tanıtım sayfası otomatik RTL/LTR ile on dili destekler.'},
    privacy:{eyebrow:'Açık kontrol',title:'Deneyimi sen seçersin.',body:'Ses, hareket, hesap ve görünüm ayarları anlaşılır kalır.',points:['Ses ve efektler','Avatar ve hareket','Hesap ve oturum','Mobil ve masaüstü düzenleri']},
    final:{title:'DAI’ı hareket halinde gör.',body:'Uygulamayı açıp konuşma, arama ve tepkileri dene.',button:'DAI AI’ı aç'},
    footer:'DAI AI · Yakın hissettiren hafif bir yapay zekâ karakteri.'
  },
  ja:{
    nav:{product:'DAIについて',personality:'キャラクター',languages:'言語',open:'DAIを開く'},
    hero:{eyebrow:'DAI AI · DAI',title1:'そこにいるように感じる',title2:'AIアシスタント。',body:'自然な会話、検索、ツール、動きをひとつの軽やかなキャラクターにまとめました。',primary:'DAIを試す',secondary:'キャラクターを見る',note:'Web版公開中 · Desktop版開発中'},
    buddy:{label:'リアクションを試す',title:'小さな顔。大きな存在感。',body:'DAIは聞く、集中する、探す、喜ぶ、落ち着くを軽やかな動きで表現します。',actions:['聞く','集中','検索','喜ぶ']},
    flow:{eyebrow:'質問から行動へ',title:'答えるだけでなく、動くために。',body:'理解、検索、実行、結果までの流れを画面上で分かりやすく見せます。',cards:[
      {kicker:'01',title:'自然な音声',body:'自然に話しかけると、明瞭で直接的な音声で返します。'},
      {kicker:'02',title:'検索とツール',body:'最新情報が必要なときは検索してまとめます。'},
      {kicker:'03',title:'生きているキャラクター',body:'目、頭、表情が状況に応じて変化します。'},
      {kicker:'04',title:'WebからDesktopへ',body:'同じキャラクター体験をDesktopにも広げます。'}
    ]},
    personality:{eyebrow:'キャラクターと物理表現',title:'再生ではなく、反応に見える動き。',body:'視線、頭、顔、体を独立したスプリングとマイクロリアクションで動かします。',points:['ポインターに反応','滑らかな状態遷移','音声連動の口','話す時は手を落ち着かせる']},
    languages:{eyebrow:'多言語UI',title:'DAIはあなたのUI言語に合わせます。',body:'新しい紹介ページは自動RTL/LTRを含む10言語に対応します。'},
    privacy:{eyebrow:'明確なコントロール',title:'体験を選ぶのはあなた。',body:'音声、動き、アカウント、表示設定を分かりやすく操作できます。',points:['音声と効果音','アバターと動き','アカウントとセッション','モバイルとDesktop対応']},
    final:{title:'動くDAIを体験。',body:'アプリを開いて会話、検索、リアクションを試してください。',button:'DAI AIを開く'},
    footer:'DAI AI · 近く感じられる軽やかなAIキャラクター。'
  },
  ko:{
    nav:{product:'DAI 소개',personality:'캐릭터',languages:'언어',open:'DAI 열기'},
    hero:{eyebrow:'DAI AI · DAI',title1:'곁에 있는 듯 느껴지는',title2:'AI 어시스턴트.',body:'자연스러운 대화, 검색, 도구, 움직임을 하나의 가벼운 캐릭터에 담았습니다.',primary:'DAI 사용해보기',secondary:'캐릭터 보기',note:'웹 제공 중 · 데스크톱 개발 중'},
    buddy:{label:'반응을 시험해보세요',title:'작은 얼굴. 큰 존재감.',body:'DAI는 듣고, 집중하고, 찾고, 기뻐하고, 차분해지는 과정을 가볍고 다양한 움직임으로 보여줍니다.',actions:['듣기','집중','검색','기뻐하기']},
    flow:{eyebrow:'질문에서 행동까지',title:'답변만이 아니라 행동을 위해.',body:'이해, 검색, 실행, 결과까지의 과정을 한 흐름으로 보여줍니다.',cards:[
      {kicker:'01',title:'자연스러운 음성',body:'편하게 말하면 명확하고 직접적인 음성으로 답합니다.'},
      {kicker:'02',title:'검색과 도구',body:'최신 정보가 필요할 때 직접 검색해 정리합니다.'},
      {kicker:'03',title:'살아있는 캐릭터',body:'눈, 머리, 표정이 상황에 따라 바뀝니다.'},
      {kicker:'04',title:'웹에서 데스크톱까지',body:'같은 캐릭터 경험을 데스크톱으로 이어가도록 설계합니다.'}
    ]},
    personality:{eyebrow:'캐릭터와 물리감',title:'재생이 아니라 반응처럼 보이는 움직임.',body:'시선, 머리, 얼굴, 몸이 독립적인 스프링과 미세 반응으로 움직입니다.',points:['포인터 반응','부드러운 상태 전환','음성 연동 입 모양','말할 때 차분한 손']},
    languages:{eyebrow:'다국어 프런트엔드',title:'DAI가 당신의 UI 언어를 말합니다.',body:'새 소개 페이지는 자동 RTL/LTR을 포함한 10개 언어를 지원합니다.'},
    privacy:{eyebrow:'명확한 제어',title:'경험은 사용자가 선택합니다.',body:'음성, 움직임, 계정, 화면 설정을 쉽게 이해하고 조절할 수 있습니다.',points:['음성과 효과음','아바타와 움직임','계정과 세션','모바일과 데스크톱 레이아웃']},
    final:{title:'움직이는 DAI를 만나보세요.',body:'앱을 열고 대화, 검색, 반응을 직접 경험해보세요.',button:'DAI AI 열기'},
    footer:'DAI AI · 가까이 느껴지는 가벼운 AI 캐릭터.'
  }
};

const LANGUAGE_NAMES:Record<Locale,string>={
  ar:'العربية',en:'English',fr:'Français',es:'Español',de:'Deutsch',it:'Italiano',pt:'Português',tr:'Türkçe',ja:'日本語',ko:'한국어'
};

const DEMO_STATES:DaiState[]=['listen','focus','search','happy'];

function pickLocale():Locale{
  try{
    const saved=localStorage.getItem('dai-marketing-locale') as Locale|null;
    if(saved&&saved in COPY)return saved;
  }catch{}
  const lang=(navigator.language||'en').toLowerCase();
  if(lang.startsWith('ar'))return'ar';
  if(lang.startsWith('fr'))return'fr';
  if(lang.startsWith('es'))return'es';
  if(lang.startsWith('de'))return'de';
  if(lang.startsWith('it'))return'it';
  if(lang.startsWith('pt'))return'pt';
  if(lang.startsWith('tr'))return'tr';
  if(lang.startsWith('ja'))return'ja';
  if(lang.startsWith('ko'))return'ko';
  return'en';
}

function appUrl(){
  const url=new URL(window.location.href);
  url.searchParams.delete('intro');
  url.searchParams.set('v','app');
  url.hash='';
  return url.toString();
}

export default function MarketingPage(){
  const [locale,setLocale]=useState<Locale>(pickLocale);
  const [demoIndex,setDemoIndex]=useState(0);
  const [heroState,setHeroState]=useState<DaiState>('idle');
  const buddyRef=useRef<HTMLDivElement>(null);
  const copy=COPY[locale];
  const rtl=locale==='ar';

  useEffect(()=>{
    try{localStorage.setItem('dai-marketing-locale',locale)}catch{}
    document.documentElement.lang=locale;
    document.documentElement.dir=rtl?'rtl':'ltr';
  },[locale,rtl]);

  useEffect(()=>{
    const nodes=[...document.querySelectorAll<HTMLElement>('[data-reveal]')];
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries){
        if(entry.isIntersecting)(entry.target as HTMLElement).classList.add('is-visible');
      }
    },{threshold:.16});
    nodes.forEach(node=>observer.observe(node));
    return()=>observer.disconnect();
  },[]);

  useEffect(()=>{
    const sequence:DaiState[]=['idle','curious','relax','look_around','happy','idle'];
    let index=0;
    const timer=window.setInterval(()=>{
      index=(index+1)%sequence.length;
      setHeroState(sequence[index]);
    },4200);
    return()=>window.clearInterval(timer);
  },[]);

  useEffect(()=>{
    const node=buddyRef.current;
    if(!node)return;
    let raf=0;
    let tx=0,ty=0,tr=0;
    let x=0,y=0,r=0;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const move=(event:PointerEvent)=>{
      const box=node.getBoundingClientRect();
      const nx=(event.clientX-(box.left+box.width/2))/Math.max(1,box.width/2);
      const ny=(event.clientY-(box.top+box.height/2))/Math.max(1,box.height/2);
      tx=Math.max(-1,Math.min(1,nx))*8;
      ty=Math.max(-1,Math.min(1,ny))*5;
      tr=Math.max(-1,Math.min(1,nx))*2.6;
    };
    const leave=()=>{tx=0;ty=0;tr=0};
    const tick=()=>{
      x+=(tx-x)*.10;
      y+=(ty-y)*.10;
      r+=(tr-r)*.09;
      if(!reduced)node.style.transform=`translate3d(${x}px,${y}px,0) rotate(${r}deg)`;
      raf=requestAnimationFrame(tick);
    };
    node.addEventListener('pointermove',move);
    node.addEventListener('pointerleave',leave);
    raf=requestAnimationFrame(tick);
    return()=>{
      cancelAnimationFrame(raf);
      node.removeEventListener('pointermove',move);
      node.removeEventListener('pointerleave',leave);
    };
  },[]);

  const languageList=useMemo(()=>Object.entries(LANGUAGE_NAMES) as Array<[Locale,string]>,[]);

  const setDemo=(index:number)=>{
    setDemoIndex(index);
    setHeroState(DEMO_STATES[index]);
  };

  return <main className='dai-marketing-page' dir={rtl?'rtl':'ltr'} data-locale={locale}>
    <header className='dai-mkt-nav'>
      <a className='dai-mkt-brand' href='#top' aria-label='DAI AI'>
        <img src='./dai-logo.svg' alt=''/>
        <span><strong>DAI AI</strong><small>ضي</small></span>
      </a>
      <nav className='dai-mkt-links' aria-label='Primary'>
        <a href='#product'>{copy.nav.product}</a>
        <a href='#personality'>{copy.nav.personality}</a>
        <a href='#languages'>{copy.nav.languages}</a>
      </nav>
      <div className='dai-mkt-actions'>
        <label className='dai-mkt-language'>
          <Globe2 size={16}/>
          <select value={locale} onChange={e=>setLocale(e.target.value as Locale)} aria-label='Language'>
            {languageList.map(([code,name])=><option value={code} key={code}>{name}</option>)}
          </select>
        </label>
        <button className='dai-mkt-open' onClick={()=>{window.location.href=appUrl()}}>{copy.nav.open}<ArrowUpRight size={16}/></button>
      </div>
    </header>

    <section className='dai-mkt-hero' id='top'>
      <div className='dai-mkt-hero-gridwash' aria-hidden='true'/>
      <div className='dai-mkt-hero-orb orb-one' aria-hidden='true'/>
      <div className='dai-mkt-hero-orb orb-two' aria-hidden='true'/>
      <div className='dai-mkt-hero-copy' data-reveal>
        <span className='dai-mkt-eyebrow'>{copy.hero.eyebrow}</span>
        <h1><span>{copy.hero.title1}</span><span className='accent'>{copy.hero.title2}</span></h1>
        <p>{copy.hero.body}</p>
        <div className='dai-mkt-hero-cta'>
          <button className='primary' onClick={()=>{window.location.href=appUrl()}}>{copy.hero.primary}<ArrowUpRight size={18}/></button>
          <a className='secondary' href='#personality'>{copy.hero.secondary}</a>
        </div>
        <small className='dai-mkt-note'><i/>{copy.hero.note}</small>
        <div className='dai-mkt-hero-proof' aria-label='DAI highlights'>
          <span><b>24</b><small>Avatars</small></span>
          <span><b>10</b><small>Languages</small></span>
          <span><b>Live</b><small>Voice</small></span>
        </div>
      </div>

      <div className='dai-mkt-buddy-column' data-reveal>
        <div className='dai-mkt-buddy-shadow'/>
        <div className='dai-mkt-buddy' ref={buddyRef}>
          <span className='dai-mkt-buddy-fin fin-left' aria-hidden='true'/>
          <span className='dai-mkt-buddy-fin fin-right' aria-hidden='true'/>
          <span className='dai-mkt-buddy-ring ring-a' aria-hidden='true'/>
          <span className='dai-mkt-buddy-ring ring-b' aria-hidden='true'/>
          <span className='dai-mkt-buddy-scanline' aria-hidden='true'/>
          <div className='dai-mkt-buddy-topline'>
            <span>DAI</span>
            <i/>
          </div>
          <div className='dai-mkt-face-stage'>
            <DaiFace state={heroState} avatar='classic' quality='high'/>
          </div>
          <div className='dai-mkt-buddy-base'><span/><span/></div>
        </div>
        <div className='dai-mkt-floating-card card-a'><Sparkles size={16}/><span>24 avatars</span></div>
        <div className='dai-mkt-floating-card card-b'><Mic size={16}/><span>Voice</span></div>
        <div className='dai-mkt-floating-card card-c'><Search size={16}/><span>Search</span></div>
      </div>
    </section>

    <section className='dai-mkt-motion-strip' aria-label='DAI capabilities'>
      <div className='dai-mkt-motion-track'>
        <span>VOICE</span><i/> <span>SEARCH</span><i/> <span>TOOLS</span><i/> <span>MOTION</span><i/>
        <span>24 AVATARS</span><i/> <span>10 LANGUAGES</span><i/> <span>VOICE</span><i/> <span>SEARCH</span><i/>
        <span>TOOLS</span><i/> <span>MOTION</span><i/> <span>24 AVATARS</span><i/> <span>10 LANGUAGES</span>
      </div>
    </section>

    <section className='dai-mkt-buddy-demo' id='product'>
      <div className='dai-mkt-demo-copy' data-reveal>
        <span className='dai-mkt-eyebrow'>{copy.buddy.label}</span>
        <h2>{copy.buddy.title}</h2>
        <p>{copy.buddy.body}</p>
      </div>
      <div className='dai-mkt-demo-controls' data-reveal>
        {copy.buddy.actions.map((label,index)=><button
          key={label}
          className={demoIndex===index?'active':''}
          onClick={()=>setDemo(index)}
        ><span>{String(index+1).padStart(2,'0')}</span>{label}</button>)}
      </div>
    </section>

    <section className='dai-mkt-flow'>
      <div className='dai-mkt-flow-index' aria-hidden='true'>
        <span>DAI / EXPERIENCE</span>
        <b>01 — 04</b>
      </div>
      <div className='dai-mkt-section-head' data-reveal>
        <span className='dai-mkt-eyebrow'>{copy.flow.eyebrow}</span>
        <h2>{copy.flow.title}</h2>
        <p>{copy.flow.body}</p>
      </div>
      <div className='dai-mkt-card-grid'>
        {copy.flow.cards.map(card=><article className='dai-mkt-card' data-reveal key={card.kicker}>
          <span>{card.kicker}</span>
          <h3>{card.title}</h3>
          <p>{card.body}</p>
        </article>)}
      </div>
    </section>

    <section className='dai-mkt-personality' id='personality'>
      <div className='dai-mkt-personality-visual' data-reveal>
        <div className='dai-mkt-orbit orbit-one'/>
        <div className='dai-mkt-orbit orbit-two'/>
        <div className='dai-mkt-personality-face'>
          <DaiFace state='curious' avatar='classic' quality='high'/>
        </div>
      </div>
      <div className='dai-mkt-personality-copy' data-reveal>
        <span className='dai-mkt-eyebrow'>{copy.personality.eyebrow}</span>
        <h2>{copy.personality.title}</h2>
        <p>{copy.personality.body}</p>
        <ul>{copy.personality.points.map(item=><li key={item}><Check size={17}/><span>{item}</span></li>)}</ul>
      </div>
    </section>

    <section className='dai-mkt-languages' id='languages'>
      <div className='dai-mkt-section-head' data-reveal>
        <span className='dai-mkt-eyebrow'>{copy.languages.eyebrow}</span>
        <h2>{copy.languages.title}</h2>
        <p>{copy.languages.body}</p>
      </div>
      <div className='dai-mkt-language-cloud' data-reveal>
        {languageList.map(([code,name])=><button
          key={code}
          className={locale===code?'active':''}
          onClick={()=>setLocale(code)}
        >{name}</button>)}
      </div>
    </section>

    <section className='dai-mkt-control'>
      <div className='dai-mkt-control-card' data-reveal>
        <div>
          <span className='dai-mkt-eyebrow'>{copy.privacy.eyebrow}</span>
          <h2>{copy.privacy.title}</h2>
          <p>{copy.privacy.body}</p>
        </div>
        <ul>{copy.privacy.points.map(item=><li key={item}><ShieldCheck size={18}/><span>{item}</span></li>)}</ul>
      </div>
    </section>

    <section className='dai-mkt-final' data-reveal>
      <WandSparkles size={28}/>
      <h2>{copy.final.title}</h2>
      <p>{copy.final.body}</p>
      <button onClick={()=>{window.location.href=appUrl()}}>{copy.final.button}<ArrowUpRight size={18}/></button>
    </section>

    <footer className='dai-mkt-footer'>
      <span>{copy.footer}</span>
      <span>© {new Date().getFullYear()} DAI AI</span>
    </footer>
  </main>;
}
