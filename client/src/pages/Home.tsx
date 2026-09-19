import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { UserButton, useUser } from "@clerk/clerk-react";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Command,
  LayoutDashboard,
  Mic,
  Package,
  Pencil,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Store,
  X,
} from "lucide-react";

type Product = {
  _id?: string;
  name: string;
  icon?: string;
  stock: number | string;
  unit: string;
  reorder: number | string;
  price?: number | string;
  unitPrice?: number | string;
  unit_price?: number | string;
  sellingPrice?: number | string;
  selling_price?: number | string;
  mrp?: number | string;
  rate?: number | string;
  tint?: string;
  accent?: string;
};

type Transaction = {
  _id?: string;
  type: "add" | "remove";
  product: string;
  quantity: number;
  unit: string;
  time?: string;
  actor?: string;
  createdAt?: string;
};

type PurchaseLine = {
  productName: string;
  quantity: number;
  unit: string;
  price: number | null;
  amount: number | null;
  stock: number;
  error?: string;
};

type Language = "EN" | "HI" | "TE";

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type SpeechRecognitionErrorEvent = {
  error: string;
};

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const fallbackTint = "#eef4e6";
const fallbackIcon = "BS";
const quantityWords: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  ek: 1,
  do: 2,
  teen: 3,
  char: 4,
  chaar: 4,
  panch: 5,
  paanch: 5,
  che: 6,
  chhe: 6,
  saat: 7,
  aath: 8,
  nau: 9,
  das: 10,
  okati: 1,
  rendu: 2,
  moodu: 3,
  mudu: 3,
  nalugu: 4,
  aidu: 5,
  aaru: 6,
  edu: 7,
  enimidi: 8,
  tommidi: 9,
  padi: 10,
  एक: 1,
  दो: 2,
  तीन: 3,
  चार: 4,
  पांच: 5,
  छह: 6,
  सात: 7,
  आठ: 8,
  नौ: 9,
  दस: 10,
  ఒకటి: 1,
  రెండు: 2,
  మూడు: 3,
  నాలుగు: 4,
  ఐదు: 5,
  ఆరు: 6,
  ఏడు: 7,
  ఎనిమిది: 8,
  తొమ్మిది: 9,
  పది: 10,
};
const unitWords = [
  "kg", "kgs", "kilogram", "kilograms", "packet", "packets", "bag", "bags", "carton", "cartons", "box", "boxes", "piece", "pieces", "unit", "units",
  "kilo", "kilos", "kilogramu", "packetlu", "baglu", "dabba", "dabbalu", "nag", "nags",
  "kilo", "packet", "dabba", "piece", "पीस", "किलो", "पैकेट", "बैग", "डब्बा", "नग", "केजी",
  "కిలో", "కేజీ", "ప్యాకెట్", "బ్యాగ్", "డబ్బా", "ముక్క", "నగ",
];
const addWords = ["add", "added", "increase", "restock", "new", "vachayi", "add chey", "jod", "jodo", "jod do", "badhao", "badha", "जोड़", "जोड़ो", "बढ़ाओ", "బెట్టు", "జోడించు", "వచ్చాయి"];
const removeWords = ["sale", "sold", "remove", "removed", "used", "deduct", "ammam", "poyindi", "becha", "bika", "nikalo", "hatao", "ghatao", "बेचा", "बिका", "निकालो", "हटाओ", "घटाओ", "అమ్మాం", "పోయింది", "తీసేయి", "తగ్గించు"];
const stockQuestionWords = ["how much", "available", "have", "stock", "kitna", "kitne", "bacha", "bachi", "hai kya", "enta", "entha", "unnayi", "undi", "कितना", "कितने", "बचा", "बची", "स्टॉक", "ఎంత", "ఎన్ని", "ఉన్నాయి", "ఉంది", "స్టాక్"];
const lowStockWords = ["order", "low", "running out", "reorder", "need", "khatam", "kam", "mangwana", "order karna", "తక్కువ", "అయిపోతుంది", "ఆర్డర్", "कम", "खत्म", "ऑर्डर"];
const connectorWords = ["and", "aur", "और", "మరియు"];
const ignoredProductWords = new Set([...Object.keys(quantityWords), ...unitWords, ...addWords, ...removeWords, ...stockQuestionWords, ...lowStockWords, ...connectorWords, "stock", "item", "items", "to", "from", "of", "the", "a", "an", "hai", "hain", "kya", "chey", "do", "lo"]);

const uiCopy = {
  EN: {
    shop: "My Shop",
    workspace: "Workspace",
    inventoryWorkspace: "Inventory workspace",
    manage: "Manage",
    overview: "Overview",
    inventory: "Inventory",
    transactions: "Transactions",
    alerts: "Alerts",
    settings: "Settings",
    upgradeTitle: "Make stock feel easy.",
    upgradeText: "BoltiStock helps you run your shop without the paperwork.",
    explore: "Explore BoltiStock",
    owner: "Store owner",
    admin: "Inventory admin",
    search: "Search inventory",
    liveInventory: "LIVE INVENTORY",
    greeting: "Good morning",
    heading: "Here is your MongoDB-backed stock at a glance.",
    speakUpdate: "Speak to update stock",
    speakHint: "Tap to start a voice command",
    noticeDefault: "Connect MongoDB Atlas and add products to start tracking stock.",
    loading: "Loading inventory from MongoDB Atlas...",
    totalItems: "Total items",
    live: "Live",
    fromAtlas: "from Atlas",
    stockHealth: "Stock health",
    healthyItems: "items healthy",
    needsAttention: "Needs attention",
    restockSoon: "Restock soon",
    beforeRunOut: "before you run out",
    shelvesTitle: "What is on your shelves",
    viewAll: "View all",
    noStocked: "No stocked products right now.",
    addStockHint: "Add stock to a product to show it on these shelves.",
    addItem: "Add an item",
    recentActivity: "RECENT ACTIVITY",
    whatChanged: "What changed",
    added: "Stock added",
    removed: "Stock removed",
    noTransactions: "No transactions yet.",
    transactionsHint: "Stock changes will appear after your first update.",
    synced: "Synced with Atlas",
    history: "See history",
    customerPurchase: "CUSTOMER PURCHASE VOICE",
    billTitle: "Build the bill first.",
    billHint: "Say items and quantities. Prices come from MongoDB, and stock changes only after Done.",
    recordPurchase: "Record purchase",
    item: "Item",
    quantity: "Quantity",
    price: "Price",
    amount: "Amount",
    purchaseExample: "Speak: 2 kg rice, 1 packet sugar, 3 soaps",
    typeItems: "Type customer items if voice misses them",
    buildBill: "Build bill",
    clear: "Clear",
    totalAmount: "Total Amount",
    done: "Done",
    completing: "Completing...",
    product: "Product",
    onHand: "On hand",
    reorderAt: "Reorder at",
    status: "Status",
    action: "Action",
    when: "When",
    updateVoice: "Update by voice",
    noProducts: "No products in MongoDB yet.",
    noProductsHint: "Add documents to the products collection to fill this table.",
    allHealthy: "All shelves look healthy.",
    allHealthyHint: "Nothing needs your attention right now.",
    language: "Language",
    currentVoiceLanguage: "Current voice language",
    lowStockAlerts: "Low stock alerts",
    databaseStatus: "Database status",
    speakAnUpdate: "Speak an update",
    voiceCommand: "VOICE COMMAND",
    voiceTitle: "What happened in the shop?",
    voiceHelp: "Speak naturally. Include the product name and quantity, like \"add 10 rice\" or \"remove 2 oil\".",
    listeningCommand: "Listening for your command",
    listenAgain: "Listen again",
    purchaseModalTitle: "What is the customer buying?",
    purchaseModalHelp: "Say only item names and quantities. Prices are read from MongoDB.",
    listeningBasket: "Listening for the customer basket",
    voiceIdle: "Tap the microphone and allow browser access.",
    purchaseIdle: "Tap the customer mic and speak the basket.",
  },
  HI: {
    shop: "मेरी दुकान",
    workspace: "वर्कस्पेस",
    inventoryWorkspace: "इन्वेंटरी वर्कस्पेस",
    manage: "मैनेज",
    overview: "ओवरव्यू",
    inventory: "इन्वेंटरी",
    transactions: "लेन-देन",
    alerts: "अलर्ट",
    settings: "सेटिंग्स",
    upgradeTitle: "स्टॉक मैनेज करना आसान बनाएं।",
    upgradeText: "BoltiStock आपकी दुकान बिना कागजी काम के चलाने में मदद करता है।",
    explore: "BoltiStock देखें",
    owner: "दुकान मालिक",
    admin: "इन्वेंटरी एडमिन",
    search: "इन्वेंटरी खोजें",
    liveInventory: "लाइव इन्वेंटरी",
    greeting: "सुप्रभात",
    heading: "आपका MongoDB वाला स्टॉक एक नज़र में।",
    speakUpdate: "बोलकर स्टॉक अपडेट करें",
    speakHint: "वॉइस कमांड शुरू करें",
    noticeDefault: "MongoDB Atlas कनेक्ट करें और स्टॉक ट्रैक करने के लिए प्रोडक्ट जोड़ें।",
    loading: "MongoDB Atlas से इन्वेंटरी लोड हो रही है...",
    totalItems: "कुल आइटम",
    live: "लाइव",
    fromAtlas: "Atlas से",
    stockHealth: "स्टॉक हेल्थ",
    healthyItems: "आइटम ठीक हैं",
    needsAttention: "ध्यान चाहिए",
    restockSoon: "जल्दी रीस्टॉक करें",
    beforeRunOut: "खत्म होने से पहले",
    shelvesTitle: "शेल्फ पर क्या है",
    viewAll: "सभी देखें",
    noStocked: "अभी कोई स्टॉक वाला प्रोडक्ट नहीं है।",
    addStockHint: "शेल्फ में दिखाने के लिए किसी प्रोडक्ट में स्टॉक जोड़ें।",
    addItem: "आइटम जोड़ें",
    recentActivity: "हाल की गतिविधि",
    whatChanged: "क्या बदला",
    added: "स्टॉक जोड़ा गया",
    removed: "स्टॉक हटाया गया",
    noTransactions: "अभी कोई लेन-देन नहीं है।",
    transactionsHint: "पहले अपडेट के बाद स्टॉक बदलाव यहां दिखेंगे।",
    synced: "Atlas से सिंक",
    history: "इतिहास देखें",
    customerPurchase: "ग्राहक खरीद वॉइस",
    billTitle: "पहले बिल बनाएं।",
    billHint: "आइटम और मात्रा बोलें। कीमत MongoDB से आएगी, और Done के बाद ही स्टॉक बदलेगा।",
    recordPurchase: "खरीद रिकॉर्ड करें",
    item: "आइटम",
    quantity: "मात्रा",
    price: "कीमत",
    amount: "राशि",
    purchaseExample: "बोलें: 2 kg rice, 1 packet sugar, 3 soaps",
    typeItems: "अगर वॉइस छूट जाए तो आइटम टाइप करें",
    buildBill: "बिल बनाएं",
    clear: "क्लियर",
    totalAmount: "कुल राशि",
    done: "Done",
    completing: "पूरा हो रहा है...",
    product: "प्रोडक्ट",
    onHand: "उपलब्ध",
    reorderAt: "रीऑर्डर स्तर",
    status: "स्थिति",
    action: "एक्शन",
    when: "कब",
    updateVoice: "वॉइस से अपडेट",
    noProducts: "MongoDB में अभी कोई प्रोडक्ट नहीं है।",
    noProductsHint: "टेबल भरने के लिए products collection में documents जोड़ें।",
    allHealthy: "सभी शेल्फ ठीक हैं।",
    allHealthyHint: "अभी कुछ करने की जरूरत नहीं है।",
    language: "भाषा",
    currentVoiceLanguage: "मौजूदा वॉइस भाषा",
    lowStockAlerts: "कम स्टॉक अलर्ट",
    databaseStatus: "डेटाबेस स्थिति",
    speakAnUpdate: "अपडेट बोलें",
    voiceCommand: "वॉइस कमांड",
    voiceTitle: "दुकान में क्या हुआ?",
    voiceHelp: "स्वाभाविक बोलें। प्रोडक्ट नाम और मात्रा बोलें, जैसे \"10 rice जोड़ो\" या \"2 oil बेचा\"।",
    listeningCommand: "आपका कमांड सुन रहे हैं",
    listenAgain: "फिर से सुनें",
    purchaseModalTitle: "ग्राहक क्या खरीद रहा है?",
    purchaseModalHelp: "सिर्फ आइटम नाम और मात्रा बोलें। कीमत MongoDB से पढ़ी जाएगी।",
    listeningBasket: "ग्राहक की टोकरी सुन रहे हैं",
    voiceIdle: "माइक दबाएं और ब्राउज़र अनुमति दें।",
    purchaseIdle: "ग्राहक माइक दबाएं और सामान बोलें।",
  },
  TE: {
    shop: "నా షాప్",
    workspace: "వర్క్‌స్పేస్",
    inventoryWorkspace: "ఇన్వెంటరీ వర్క్‌స్పేస్",
    manage: "మేనేజ్",
    overview: "ఓవర్వ్యూ",
    inventory: "ఇన్వెంటరీ",
    transactions: "లావాదేవీలు",
    alerts: "అలర్ట్స్",
    settings: "సెట్టింగ్స్",
    upgradeTitle: "స్టాక్ నిర్వహణను సులభం చేయండి.",
    upgradeText: "BoltiStock కాగితపు పని లేకుండా మీ షాప్ నడపడానికి సహాయం చేస్తుంది.",
    explore: "BoltiStock చూడండి",
    owner: "షాప్ యజమాని",
    admin: "ఇన్వెంటరీ అడ్మిన్",
    search: "ఇన్వెంటరీలో వెతకండి",
    liveInventory: "లైవ్ ఇన్వెంటరీ",
    greeting: "శుభోదయం",
    heading: "MongoDB ఆధారిత స్టాక్ ఒక చూపులో.",
    speakUpdate: "మాట్లాడి స్టాక్ అప్డేట్ చేయండి",
    speakHint: "వాయిస్ కమాండ్ ప్రారంభించండి",
    noticeDefault: "MongoDB Atlas కనెక్ట్ చేసి, స్టాక్ ట్రాక్ చేయడానికి ప్రోడక్ట్స్ జోడించండి.",
    loading: "MongoDB Atlas నుంచి ఇన్వెంటరీ లోడ్ అవుతోంది...",
    totalItems: "మొత్తం ఐటమ్స్",
    live: "లైవ్",
    fromAtlas: "Atlas నుంచి",
    stockHealth: "స్టాక్ హెల్త్",
    healthyItems: "ఐటమ్స్ బాగున్నాయి",
    needsAttention: "శ్రద్ధ అవసరం",
    restockSoon: "త్వరలో రీస్టాక్ చేయండి",
    beforeRunOut: "అయిపోయే ముందు",
    shelvesTitle: "షెల్ఫ్‌లలో ఏముంది",
    viewAll: "అన్నీ చూడండి",
    noStocked: "ప్రస్తుతం స్టాక్ ఉన్న ప్రోడక్ట్స్ లేవు.",
    addStockHint: "షెల్ఫ్‌లో చూపడానికి ప్రోడక్ట్‌కు స్టాక్ జోడించండి.",
    addItem: "ఐటమ్ జోడించండి",
    recentActivity: "ఇటీవలి కార్యాచరణ",
    whatChanged: "ఏం మారింది",
    added: "స్టాక్ జోడించబడింది",
    removed: "స్టాక్ తీసివేయబడింది",
    noTransactions: "ఇంకా లావాదేవీలు లేవు.",
    transactionsHint: "మొదటి అప్డేట్ తర్వాత స్టాక్ మార్పులు ఇక్కడ కనిపిస్తాయి.",
    synced: "Atlas తో సింక్ అయింది",
    history: "చరిత్ర చూడండి",
    customerPurchase: "కస్టమర్ కొనుగోలు వాయిస్",
    billTitle: "ముందుగా బిల్ తయారు చేయండి.",
    billHint: "ఐటమ్స్ మరియు పరిమాణాలు చెప్పండి. ధరలు MongoDB నుంచి వస్తాయి, Done తర్వాతే స్టాక్ మారుతుంది.",
    recordPurchase: "కొనుగోలు రికార్డ్ చేయండి",
    item: "ఐటమ్",
    quantity: "పరిమాణం",
    price: "ధర",
    amount: "మొత్తం",
    purchaseExample: "చెప్పండి: 2 kg rice, 1 packet sugar, 3 soaps",
    typeItems: "వాయిస్ మిస్ అయితే ఐటమ్స్ టైప్ చేయండి",
    buildBill: "బిల్ తయారు చేయండి",
    clear: "క్లియర్",
    totalAmount: "మొత్తం ధర",
    done: "Done",
    completing: "పూర్తి అవుతోంది...",
    product: "ప్రోడక్ట్",
    onHand: "ఉన్నది",
    reorderAt: "రీఆర్డర్ స్థాయి",
    status: "స్థితి",
    action: "యాక్షన్",
    when: "ఎప్పుడు",
    updateVoice: "వాయిస్‌తో అప్డేట్",
    noProducts: "MongoDB లో ఇంకా ప్రోడక్ట్స్ లేవు.",
    noProductsHint: "టేబుల్ నింపడానికి products collection లో documents జోడించండి.",
    allHealthy: "అన్ని షెల్ఫ్‌లు బాగున్నాయి.",
    allHealthyHint: "ఇప్పుడేం చేయాల్సిన అవసరం లేదు.",
    language: "భాష",
    currentVoiceLanguage: "ప్రస్తుత వాయిస్ భాష",
    lowStockAlerts: "తక్కువ స్టాక్ అలర్ట్స్",
    databaseStatus: "డేటాబేస్ స్థితి",
    speakAnUpdate: "అప్డేట్ చెప్పండి",
    voiceCommand: "వాయిస్ కమాండ్",
    voiceTitle: "షాప్‌లో ఏమైంది?",
    voiceHelp: "సహజంగా మాట్లాడండి. ప్రోడక్ట్ పేరు మరియు పరిమాణం చెప్పండి, ఉదా: \"10 rice జోడించు\" లేదా \"2 oil అమ్మాం\".",
    listeningCommand: "మీ కమాండ్ వినుతోంది",
    listenAgain: "మళ్లీ వినండి",
    purchaseModalTitle: "కస్టమర్ ఏమి కొనుగోలు చేస్తున్నారు?",
    purchaseModalHelp: "ఐటమ్ పేర్లు మరియు పరిమాణాలు మాత్రమే చెప్పండి. ధరలు MongoDB నుంచి చదవబడతాయి.",
    listeningBasket: "కస్టమర్ బాస్కెట్ వినుతోంది",
    voiceIdle: "మైక్ నొక్కి బ్రౌజర్ అనుమతి ఇవ్వండి.",
    purchaseIdle: "కస్టమర్ మైక్ నొక్కి బాస్కెట్ చెప్పండి.",
  },
};

function Logo() {
  return (
    <div className="brand-lockup">
      <div className="brand-mark"><span>↗</span></div>
      <div>
        <div className="brand-name">Bolti<span>Stock</span></div>
        <div className="brand-tagline">Speak. Stock. Sorted.</div>
      </div>
    </div>
  );
}

function StatusPill({ product }: { product: Product }) {
  const isLow = getProductStock(product) <= getProductReorder(product);
  return (
    <span className={`status-pill ${isLow ? "is-low" : "is-good"}`}>
      <span className="status-dot" /> {isLow ? "Running low" : "In stock"}
    </span>
  );
}

function formatTransactionTime(transaction: Transaction) {
  if (transaction.time) return transaction.time;
  if (!transaction.createdAt) return "Just now";

  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(transaction.createdAt));
}

function toProductName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function inferProductName(command: string) {
  const cleaned = normalizeWords(command)
    .split(" ")
    .filter((word) => !toFiniteNumber(word) && !ignoredProductWords.has(word))
    .join(" ");

  return cleaned ? toProductName(cleaned) : "New Item";
}

function findCommandProduct(command: string, products: Product[]) {
  const normalizedCommand = normalizeWords(command);

  return products.find((product) => {
    const normalizedName = normalizeWords(product.name);
    const firstNameWord = normalizedName.split(" ")[0];
    return normalizedCommand.includes(normalizedName) || (firstNameWord.length > 2 && normalizedCommand.includes(firstNameWord));
  });
}

function toFiniteNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;

  const normalized = value.replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  if (!normalized) return null;

  const number = Number(normalized[0]);
  return Number.isFinite(number) ? number : null;
}

function getSavedProductPrice(product: Product) {
  return (
    toFiniteNumber(product.price) ??
    toFiniteNumber(product.unitPrice) ??
    toFiniteNumber(product.unit_price) ??
    toFiniteNumber(product.sellingPrice) ??
    toFiniteNumber(product.selling_price) ??
    toFiniteNumber(product.mrp) ??
    toFiniteNumber(product.rate)
  );
}

function getProductPrice(product: Product) {
  return getSavedProductPrice(product);
}

function getProductStock(product: Product) {
  return toFiniteNumber(product.stock) ?? 0;
}

function getProductReorder(product: Product) {
  return toFiniteNumber(product.reorder) ?? 0;
}

function formatMoney(value: number | null) {
  if (value === null) return "No price";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);
}

async function readApiJson(response: Response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error("API server is not returning JSON. Make sure the backend is running on port 3001.");
  }
}

function normalizeWords(value: string) {
  return Array.from(value.toLowerCase())
    .map((character) => {
      const code = character.codePointAt(0) || 0;
      const isBasicWord = /[a-z0-9\s]/.test(character);
      const isHindi = code >= 0x0900 && code <= 0x097f;
      const isTelugu = code >= 0x0c00 && code <= 0x0c7f;
      return isBasicWord || isHindi || isTelugu ? character : " ";
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAnyPhrase(value: string, phrases: string[]) {
  const normalized = ` ${normalizeWords(value)} `;
  return phrases.some((phrase) => normalized.includes(` ${normalizeWords(phrase)} `));
}

function extractQuantity(value: string) {
  const normalized = normalizeWords(value);
  const quantityMatch = normalized.match(/\d+(?:\.\d+)?/);
  if (quantityMatch) return Number(quantityMatch[0]);

  const wordQuantity = normalized
    .split(" ")
    .map((word) => quantityWords[word])
    .find((quantity) => typeof quantity === "number");

  return wordQuantity || 1;
}

function extractUnit(value: string) {
  const normalizedWords = normalizeWords(value).split(" ");
  return unitWords.find((unit) => normalizedWords.includes(normalizeWords(unit)));
}

function stripInventoryWords(value: string) {
  return normalizeWords(value)
    .split(" ")
    .filter((word) => !toFiniteNumber(word) && !ignoredProductWords.has(word))
    .join(" ");
}

function singularize(value: string) {
  return value.endsWith("s") && value.length > 3 ? value.slice(0, -1) : value;
}

function getEditDistance(left: string, right: string) {
  const distances = Array.from({ length: left.length + 1 }, (_, index) => [index]);

  for (let column = 1; column <= right.length; column += 1) {
    distances[0][column] = column;
  }

  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      distances[row][column] = left[row - 1] === right[column - 1]
        ? distances[row - 1][column - 1]
        : Math.min(distances[row - 1][column - 1], distances[row][column - 1], distances[row - 1][column]) + 1;
    }
  }

  return distances[left.length][right.length];
}

function findPurchaseProduct(segment: string, products: Product[]) {
  const normalizedSegment = normalizeWords(segment);
  const segmentWords = normalizedSegment.split(" ").filter((word) => word.length > 2);

  return [...products]
    .map((product) => {
      const name = normalizeWords(product.name);
      const nameWords = name.split(" ");
      const exactMatch = normalizedSegment.includes(name) || normalizedSegment.includes(singularize(name));
      const fuzzyMatch = nameWords.some((nameWord) =>
        segmentWords.some((segmentWord) => {
          const distance = getEditDistance(singularize(segmentWord), singularize(nameWord));
          return distance <= Math.max(1, Math.floor(nameWord.length / 3));
        })
      );

      const nameScore = exactMatch ? 100 : fuzzyMatch ? 70 : 0;
      const stock = getProductStock(product);
      return {
        product,
        nameScore,
        score: nameScore + (stock > 0 ? 12 : 0) + Math.min(stock, 25),
      };
    })
    .filter((candidate) => candidate.nameScore > 0)
    .sort((a, b) => b.score - a.score || b.product.name.length - a.product.name.length)[0]?.product;
}

function parsePurchaseCommand(command: string, products: Product[]) {
  const lines = command
    .split(/,|\band\b|\baur\b|और|మరియు/gi)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((segment) => {
      const quantity = extractQuantity(segment);
      const spokenUnit = extractUnit(segment);
      const product = findPurchaseProduct(segment, products);

      if (!product) {
        const productName = stripInventoryWords(segment);

        return {
          productName: productName ? toProductName(productName) : "Unknown Item",
          quantity,
          unit: spokenUnit || "units",
          price: null,
          amount: null,
          stock: 0,
          error: "Not found",
        };
      }

      const price = getProductPrice(product);
      return {
        productName: product.name,
        quantity,
        unit: spokenUnit || product.unit,
        price,
        amount: price === null ? null : price * quantity,
        stock: getProductStock(product),
        error: getProductStock(product) < quantity ? `Only ${getProductStock(product)} ${product.unit} available` : undefined,
      };
    });

  return Array.from(lines.reduce((combined, line) => {
    const key = line.productName.toLowerCase();
    const existing = combined.get(key);
    if (!existing) {
      combined.set(key, line);
      return combined;
    }

    const quantity = existing.quantity + line.quantity;
    const stock = Math.max(existing.stock, line.stock);
    const price = existing.price ?? line.price;
    combined.set(key, {
      ...existing,
      quantity,
      price,
      amount: price === null ? null : price * quantity,
      stock,
      error: existing.error || line.error || (stock < quantity ? `Only ${stock} ${existing.unit} available` : undefined),
    });
    return combined;
  }, new Map<string, PurchaseLine>()).values());
}

export default function Home() {
  const { isLoaded, user } = useUser();
  const [activeTab, setActiveTab] = useState("Overview");
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceStatus, setVoiceStatus] = useState(uiCopy.EN.voiceIdle);
  const [showLanguage, setShowLanguage] = useState(false);
  const [language, setLanguage] = useState<Language>("EN");
  const ui = uiCopy[language];
  const [notice, setNotice] = useState(uiCopy.EN.noticeDefault);
  const [databaseStatus, setDatabaseStatus] = useState<"idle" | "checking" | "connected" | "error">("idle");
  const [showAddItem, setShowAddItem] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductStock, setNewProductStock] = useState("1");
  const [newProductUnit, setNewProductUnit] = useState("units");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductReorder, setNewProductReorder] = useState("5");
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [priceProduct, setPriceProduct] = useState<Product | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);
  const [isPurchaseListening, setIsPurchaseListening] = useState(false);
  const [purchaseTranscript, setPurchaseTranscript] = useState("");
  const [purchaseStatus, setPurchaseStatus] = useState(uiCopy.EN.purchaseIdle);
  const [purchaseLines, setPurchaseLines] = useState<PurchaseLine[]>([]);
  const [typedPurchaseCommand, setTypedPurchaseCommand] = useState("");
  const [isCompletingPurchase, setIsCompletingPurchase] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const lowStock = useMemo(() => products.filter((product) => getProductStock(product) <= getProductReorder(product)), [products]);
  const stockedProducts = useMemo(() => products.filter((product) => getProductStock(product) > 0), [products]);
  const totalUnits = useMemo(() => products.reduce((sum, product) => sum + getProductStock(product), 0), [products]);
  const healthyProducts = useMemo(() => products.filter((product) => getProductStock(product) > getProductReorder(product)).length, [products]);
  const stockHealth = products.length ? Math.round((healthyProducts / products.length) * 100) : 0;
  const purchaseTotal = useMemo(() => purchaseLines.reduce((sum, line) => sum + (line.amount || 0), 0), [purchaseLines]);
  const canCompletePurchase = purchaseLines.length > 0 && purchaseLines.every((line) => !line.error && line.price !== null);
  const priceUnitLabel = newProductUnit === "units" ? "unit" : newProductUnit.replace(/s$/, "");
  const firstProduct = products[0];
  const secondProduct = products[1] || products[0];
  const ownerId = user?.id || "";
  const apiHeaders = useMemo(() => ({
    "Content-Type": "application/json",
    "X-Owner-Id": ownerId,
  }), [ownerId]);
  const commands = useMemo(() => [
    firstProduct ? `Add 10 ${firstProduct.unit} ${firstProduct.name}` : "Add 10 bags Rice",
    secondProduct ? `Remove 2 ${secondProduct.unit} ${secondProduct.name}` : "Remove 2 cartons Oil",
    firstProduct ? `How much ${firstProduct.name} do I have?` : "How much stock do I have?",
    "What do I need to order?",
  ], [firstProduct, secondProduct]);
  const purchaseExamples = useMemo(() => {
    const available = stockedProducts.slice(0, 3);
    if (!available.length) return ["2 kg rice, 1 packet sugar, 3 soaps"];
    return [
      available.map((product, index) => `${index + 1} ${product.unit.replace(/s$/, "")} ${product.name}`).join(", "),
      `1 ${available[0].unit.replace(/s$/, "")} ${available[0].name}`,
    ];
  }, [stockedProducts]);

  useEffect(() => {
    setProducts([]);
    setTransactions([]);
    setPurchaseLines([]);
    setPurchaseTranscript("");
    setTypedPurchaseCommand("");
    setPurchaseStatus(ui.purchaseIdle);
    setPriceProduct(null);
  }, [ownerId, ui.purchaseIdle]);

  useEffect(() => {
    setVoiceStatus(ui.voiceIdle);
    setPurchaseStatus(ui.purchaseIdle);
    setNotice(ui.noticeDefault);
  }, [language, ui.noticeDefault, ui.purchaseIdle, ui.voiceIdle]);

  useEffect(() => {
    let ignore = false;

    async function loadInventory() {
      if (!isLoaded || !ownerId) {
        setProducts([]);
        setTransactions([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const [productsResponse, transactionsResponse] = await Promise.all([
          fetch("/api/products", { headers: apiHeaders }),
          fetch("/api/transactions", { headers: apiHeaders }),
        ]);

        if (!productsResponse.ok || !transactionsResponse.ok) {
          throw new Error("Could not load inventory from MongoDB Atlas.");
        }

        const productsPayload = await readApiJson(productsResponse);
        const transactionsPayload = await readApiJson(transactionsResponse);

        if (!ignore) {
          setProducts(productsPayload.products || []);
          setTransactions(transactionsPayload.transactions || []);
          setNotice("Inventory loaded from MongoDB Atlas.");
        }
      } catch (error) {
        if (!ignore) {
          setProducts([]);
          setTransactions([]);
          setNotice(error instanceof Error ? error.message : "Could not connect to MongoDB Atlas.");
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    loadInventory();

    return () => {
      ignore = true;
    };
  }, [apiHeaders, isLoaded, ownerId]);

  const applyCommand = async (command: string) => {
    let target = findCommandProduct(command, products);
    if (!target && normalizeWords(command).includes("oil")) target = products.find((product) => normalizeWords(product.name).includes("oil"));

    if (hasAnyPhrase(command, stockQuestionWords)) {
      if (target) setNotice(`You have ${getProductStock(target)} ${target.unit} of ${target.name.toLowerCase()}.`);
      else setNotice(`You have ${totalUnits} units across ${products.length} products.`);
      setIsListening(false);
      return;
    }

    if (hasAnyPhrase(command, lowStockWords)) {
      setNotice(lowStock.length ? `${lowStock.map((product) => product.name).join(" and ")} ${lowStock.length === 1 ? "is" : "are"} running low.` : "Everything is above its reorder level.");
      setIsListening(false);
      return;
    }

    const quantity = extractQuantity(command);
    const isRemove = hasAnyPhrase(command, removeWords);
    const productName = target?.name || inferProductName(command);
    const productUnit = target?.unit || extractUnit(command) || "units";

    if (!target && isRemove) {
      setNotice(`${productName} is not in MongoDB yet, so it cannot be removed.`);
      setIsListening(false);
      return;
    }

    if (isRemove && target && getProductStock(target) < quantity) {
      setNotice(`You only have ${getProductStock(target)} ${target.unit} of ${target.name.toLowerCase()}. You cannot remove ${quantity}.`);
      setIsListening(false);
      return;
    }

    try {
      const response = await fetch("/api/stock-events", {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify({ productName, quantity, type: isRemove ? "remove" : "add" }),
      });

      const payload = await readApiJson(response);
      if (!response.ok) throw new Error(payload.error || "Could not update stock.");

      const updatedProduct = payload.product as Product;
      setProducts((current) => {
        const exists = current.some((product) => product.name === updatedProduct.name);
        return exists
          ? current.map((product) => product.name === updatedProduct.name ? updatedProduct : product)
          : [...current, updatedProduct].sort((a, b) => a.name.localeCompare(b.name));
      });
      setTransactions(payload.transactions || []);
      setNotice(`${quantity} ${productUnit} of ${productName.toLowerCase()} ${isRemove ? "removed" : "added"}. Current stock: ${updatedProduct.stock} ${updatedProduct.unit}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update MongoDB.");
    } finally {
      setIsListening(false);
    }
  };

  const stopVoiceRecognition = () => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setIsListening(false);
  };

  const startVoiceRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    setVoiceTranscript("");
    setIsListening(true);
    setIsPurchaseListening(false);

    if (!SpeechRecognition) {
      setVoiceStatus(language === "HI" ? "वॉइस रिकॉर्डिंग Chrome या Edge में समर्थित है।" : language === "TE" ? "వాయిస్ రికార్డింగ్ Chrome లేదా Edge లో పనిచేస్తుంది." : "Voice recording is supported in Chrome or Edge. Use the command buttons for now.");
      setNotice(language === "HI" ? "आपका ब्राउज़र speech recognition सपोर्ट नहीं करता। Chrome या Edge इस्तेमाल करें।" : language === "TE" ? "మీ బ్రౌజర్ speech recognition సపోర్ట్ చేయదు. Chrome లేదా Edge ఉపయోగించండి." : "Your browser does not support speech recognition. Try Chrome or Edge.");
      return;
    }

    recognitionRef.current?.abort();

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = language === "HI" ? "hi-IN" : language === "TE" ? "te-IN" : "en-IN";

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();

      setVoiceTranscript(transcript);
      setVoiceStatus(transcript ? (language === "HI" ? "कमांड मिला। इन्वेंटरी अपडेट हो रही है..." : language === "TE" ? "కమాండ్ వచ్చింది. ఇన్వెంటరీ అప్డేట్ అవుతోంది..." : "Command received. Updating inventory...") : (language === "HI" ? "समझ नहीं आया। फिर कोशिश करें।" : language === "TE" ? "అది పట్టలేదు. మళ్లీ ప్రయత్నించండి." : "I did not catch that. Try again."));

      if (transcript) {
        void applyCommand(transcript);
      }
    };

    recognition.onerror = (event) => {
      const message = event.error === "not-allowed"
        ? (language === "HI" ? "माइक्रोफोन अनुमति ब्लॉक है। ब्राउज़र में mic access allow करें।" : language === "TE" ? "మైక్రోఫోన్ అనుమతి బ్లాక్ అయింది. బ్రౌజర్‌లో mic access allow చేయండి." : "Microphone permission was blocked. Allow mic access in the browser.")
        : `Voice recognition error: ${event.error}`;
      setVoiceStatus(message);
      setNotice(message);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setVoiceStatus((current) => current.includes("Updating") || current.includes("अपडेट") || current.includes("అప్డేట్") ? current : (language === "HI" ? "सुनना बंद हुआ। कुछ नहीं बदला तो फिर कोशिश करें।" : language === "TE" ? "వినడం ఆగింది. ఏమీ మారకపోతే మళ్లీ ప్రయత్నించండి." : "Listening stopped. Try again if nothing changed."));
    };

    try {
      recognition.start();
      setVoiceStatus(language === "HI" ? "सुन रहे हैं। प्रोडक्ट नाम और मात्रा बोलें।" : language === "TE" ? "వింటోంది. ప్రోడక్ట్ పేరు మరియు పరిమాణం చెప్పండి." : "Listening now. Say a product name and quantity.");
    } catch {
      setVoiceStatus(language === "HI" ? "माइक्रोफोन शुरू नहीं हुआ। वॉइस पैनल बंद करके फिर खोलें।" : language === "TE" ? "మైక్రోఫోన్ ప్రారంభం కాలేదు. వాయిస్ ప్యానెల్ మూసి మళ్లీ తెరవండి." : "Could not start the microphone. Try closing and opening the voice panel.");
    }
  };

  const applyPurchaseCommand = (command: string) => {
    const lines = parsePurchaseCommand(command, products);
    setPurchaseLines(lines);
    setPurchaseTranscript(command);
    setPurchaseStatus(lines.length ? (language === "HI" ? "खरीद मिली। भुगतान के बाद Done दबाएं।" : language === "TE" ? "కొనుగోలు గుర్తించబడింది. చెల్లింపు తర్వాత Done నొక్కండి." : "Purchase detected. Confirm payment, then click Done.") : (language === "HI" ? "कोई खरीद आइटम नहीं मिला।" : language === "TE" ? "కొనుగోలు ఐటమ్స్ కనిపించలేదు." : "I did not detect any purchase items."));
    setNotice(lines.length ? (language === "HI" ? "ग्राहक खरीद तैयार है। Done के बाद ही इन्वेंटरी बदलेगी।" : language === "TE" ? "కస్టమర్ కొనుగోలు సిద్ధంగా ఉంది. Done తర్వాతే ఇన్వెంటరీ మారుతుంది." : "Customer purchase is ready. Inventory will change only after Done.") : (language === "HI" ? "कोई ग्राहक खरीद आइटम नहीं मिला।" : language === "TE" ? "కస్టమర్ కొనుగోలు ఐటమ్స్ గుర్తించబడలేదు." : "No customer purchase items were detected."));
    setTypedPurchaseCommand(command);
    setIsPurchaseListening(false);
  };

  const stopPurchaseRecognition = () => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setIsPurchaseListening(false);
  };

  const startPurchaseRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    setPurchaseTranscript("");
    setIsPurchaseListening(true);
    setIsListening(false);

    if (!SpeechRecognition) {
      setPurchaseStatus(language === "HI" ? "वॉइस रिकॉर्डिंग Chrome या Edge में समर्थित है।" : language === "TE" ? "వాయిస్ రికార్డింగ్ Chrome లేదా Edge లో పనిచేస్తుంది." : "Voice recording is supported in Chrome or Edge.");
      setNotice(language === "HI" ? "आपका ब्राउज़र speech recognition सपोर्ट नहीं करता। Chrome या Edge इस्तेमाल करें।" : language === "TE" ? "మీ బ్రౌజర్ speech recognition సపోర్ట్ చేయదు. Chrome లేదా Edge ఉపయోగించండి." : "Your browser does not support speech recognition. Try Chrome or Edge.");
      return;
    }

    recognitionRef.current?.abort();

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = language === "HI" ? "hi-IN" : language === "TE" ? "te-IN" : "en-IN";

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();

      setPurchaseTranscript(transcript);
      setPurchaseStatus(transcript ? (language === "HI" ? "बास्केट मिला। बिल बन रहा है..." : language === "TE" ? "బాస్కెట్ వచ్చింది. బిల్ లెక్కిస్తోంది..." : "Basket received. Calculating bill...") : (language === "HI" ? "समझ नहीं आया। फिर कोशिश करें।" : language === "TE" ? "అది పట్టలేదు. మళ్లీ ప్రయత్నించండి." : "I did not catch that. Try again."));

      if (transcript) {
        applyPurchaseCommand(transcript);
      }
    };

    recognition.onerror = (event) => {
      const message = event.error === "not-allowed"
        ? (language === "HI" ? "माइक्रोफोन अनुमति ब्लॉक है। ब्राउज़र में mic access allow करें।" : language === "TE" ? "మైక్రోఫోన్ అనుమతి బ్లాక్ అయింది. బ్రౌజర్‌లో mic access allow చేయండి." : "Microphone permission was blocked. Allow mic access in the browser.")
        : `Voice recognition error: ${event.error}`;
      setPurchaseStatus(message);
      setNotice(message);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setPurchaseStatus((current) => current.includes("Calculating") || current.includes("बिल") || current.includes("బిల్") ? current : (language === "HI" ? "ग्राहक खरीद सुनना बंद हुआ।" : language === "TE" ? "కస్టమర్ కొనుగోలు వినడం ఆగింది." : "Customer purchase listening stopped."));
    };

    try {
      recognition.start();
      setPurchaseStatus(language === "HI" ? "ग्राहक आइटम और मात्रा सुन रहे हैं।" : language === "TE" ? "కస్టమర్ ఐటమ్స్ మరియు పరిమాణాలు వినుతోంది." : "Listening for customer items and quantities.");
    } catch {
      setPurchaseStatus(language === "HI" ? "माइक्रोफोन शुरू नहीं हुआ। फिर कोशिश करें।" : language === "TE" ? "మైక్రోఫోన్ ప్రారంభం కాలేదు. మళ్లీ ప్రయత్నించండి." : "Could not start the microphone. Try again.");
    }
  };

  const completeCustomerPurchase = async () => {
    if (!canCompletePurchase) {
      setNotice("Fix unavailable items or missing prices before clicking Done.");
      return;
    }

    setIsCompletingPurchase(true);
    try {
      const response = await fetch("/api/customer-purchases/checkout", {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify({
          items: purchaseLines.map((line) => ({ productName: line.productName, quantity: line.quantity })),
        }),
      });

      const payload = await readApiJson(response);
      if (!response.ok) throw new Error(payload.error || "Could not complete purchase.");

      setProducts(payload.products || []);
      setTransactions(payload.transactions || []);
      setPurchaseLines([]);
      setPurchaseTranscript("");
      setTypedPurchaseCommand("");
      setPurchaseStatus("Ready for the next customer.");
      setNotice(`Payment received. Purchase completed for ${formatMoney(purchaseTotal)}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not complete purchase.");
    } finally {
      setIsCompletingPurchase(false);
    }
  };

  const checkDatabaseStatus = async () => {
    setDatabaseStatus("checking");
    setNotice("Checking MongoDB Atlas connection...");

    try {
      const response = await fetch("/api/health");
      const payload = await readApiJson(response);

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Database health check failed.");
      }

      setDatabaseStatus("connected");
      setNotice(`MongoDB Atlas is connected. ${products.length} products are synced.`);
    } catch (error) {
      setDatabaseStatus("error");
      setNotice(error instanceof Error ? error.message : "Could not check database status.");
    }
  };

  const addInventoryItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const productName = toProductName(newProductName);
    const quantity = Number(newProductStock);
    const reorder = Number(newProductReorder);
    const price = Number(newProductPrice);

    if (!productName || !Number.isFinite(quantity) || quantity < 1 || !Number.isFinite(reorder) || reorder < 0 || !Number.isFinite(price) || price < 0) {
      setNotice("Enter a product name, stock quantity, reorder level, and unit price.");
      return;
    }

    setIsAddingItem(true);
    try {
      const response = await fetch("/api/stock-events", {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify({
          productName,
          quantity,
          type: "add",
          unit: newProductUnit.trim() || "units",
          reorder,
          price,
        }),
      });

      const payload = await readApiJson(response);
      if (!response.ok) throw new Error(payload.error || "Could not add item.");

      const updatedProduct = payload.product as Product;
      setProducts((current) => {
        const exists = current.some((product) => product.name === updatedProduct.name);
        return exists
          ? current.map((product) => product.name === updatedProduct.name ? updatedProduct : product)
          : [...current, updatedProduct].sort((a, b) => a.name.localeCompare(b.name));
      });
      setTransactions(payload.transactions || []);
      setNotice(`${updatedProduct.name} added. Current stock: ${updatedProduct.stock} ${updatedProduct.unit}.`);
      setNewProductName("");
      setNewProductStock("1");
      setNewProductUnit("units");
      setNewProductPrice("");
      setNewProductReorder("5");
      setShowAddItem(false);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not add item.");
    } finally {
      setIsAddingItem(false);
    }
  };

  const openPriceEditor = (product: Product) => {
    setPriceProduct(product);
    setEditPrice(String(getSavedProductPrice(product) ?? ""));
  };

  const updateProductPrice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!priceProduct?._id) {
      setNotice("This product cannot be updated because it is missing an id.");
      return;
    }

    const price = Number(editPrice);
    if (!Number.isFinite(price) || price < 0) {
      setNotice("Enter a valid item price.");
      return;
    }

    setIsUpdatingPrice(true);
    try {
      const response = await fetch(`/api/products/${priceProduct._id}/price`, {
        method: "PATCH",
        headers: apiHeaders,
        body: JSON.stringify({ price }),
      });
      const payload = await readApiJson(response);
      if (!response.ok) throw new Error(payload.error || "Could not update price.");

      const updatedProduct = payload.product as Product;
      setProducts((current) => current.map((product) => product._id === updatedProduct._id ? updatedProduct : product));
      setPurchaseLines((current) => current.map((line) => line.productName === updatedProduct.name
        ? { ...line, price, amount: price * line.quantity }
        : line
      ));
      setNotice(`${updatedProduct.name} price updated to ${formatMoney(price)} per ${updatedProduct.unit.replace(/s$/, "")}.`);
      setPriceProduct(null);
      setEditPrice("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update price.");
    } finally {
      setIsUpdatingPrice(false);
    }
  };

  const navItems = [
    { label: "Overview", display: ui.overview, icon: LayoutDashboard },
    { label: "Inventory", display: ui.inventory, icon: Package },
    { label: "Transactions", display: ui.transactions, icon: Clock3 },
    { label: "Alerts", display: ui.alerts, icon: Bell, count: lowStock.length },
  ];
  const manageItems = [
    { label: "Settings", display: ui.settings, icon: Settings2 },
  ];
  const tabTitle = activeTab === "Inventory"
    ? (language === "HI" ? "हर आइटम का हिसाब" : language === "TE" ? "ప్రతి ఐటమ్ లెక్కలో ఉంది" : "Every item, accounted for")
    : activeTab === "Transactions"
      ? (language === "HI" ? "हर बदलाव का साफ रिकॉर्ड" : language === "TE" ? "ప్రతి మార్పుకు స్పష్టమైన రికార్డ్" : "A clear trail of every change")
      : activeTab === "Alerts"
        ? (language === "HI" ? "अचानक स्टॉक खत्म न हो" : language === "TE" ? "అचानक స్టాక్ అయిపోకుండా" : "Never run out by surprise")
        : activeTab === "Settings"
          ? (language === "HI" ? "वर्कस्पेस सेट करें" : language === "TE" ? "వర్క్‌స్పేస్ సెట్ చేయండి" : "Tune your workspace")
          : ui.upgradeTitle;
  const activeTabDisplay = navItems.find((item) => item.label === activeTab)?.display || manageItems.find((item) => item.label === activeTab)?.display || activeTab;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <Logo />
          <div className="store-switcher">
            <div className="store-icon"><Store size={16} /></div>
            <div className="store-copy"><strong>{ui.shop}</strong><span>{ui.inventoryWorkspace}</span></div>
            <ChevronDown size={15} className="muted-icon" />
          </div>
        </div>

        <div className="side-nav">
          <div className="nav-label">{ui.workspace}</div>
          {navItems.map(({ label, display, icon: Icon, count }) => (
            <button key={label} className={`nav-item ${activeTab === label ? "active" : ""}`} onClick={() => setActiveTab(label)}>
              <Icon size={18} strokeWidth={activeTab === label ? 2.4 : 1.8} />
              <span>{display}</span>
              {count ? <span className="nav-count">{count}</span> : null}
            </button>
          ))}
          <div className="nav-label nav-label-spaced">{ui.manage}</div>
          {manageItems.map(({ label, display, icon: Icon }) => (
            <button key={label} className={`nav-item ${activeTab === label ? "active" : ""}`} onClick={() => setActiveTab(label)}>
              <Icon size={18} strokeWidth={activeTab === label ? 2.4 : 1.8} />
              <span>{display}</span>
            </button>
          ))}
        </div>

        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <div className="upgrade-spark"><Sparkles size={15} /></div>
            <strong>{ui.upgradeTitle}</strong>
            <p>{ui.upgradeText}</p>
            <button onClick={() => setActiveTab("Explore")}>{ui.explore} <ChevronRight size={14} /></button>
          </div>
          <div className="profile-row">
            <UserButton appearance={{ elements: { avatarBox: "clerk-avatar" } }} />
            <div><strong>{user?.firstName || user?.username || ui.owner}</strong><span>{ui.admin}</span></div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumbs"><span>{ui.workspace}</span><ChevronRight size={14} /><strong>{activeTabDisplay}</strong></div>
          <div className="top-actions">
            <div className="search-box"><Search size={17} /><input aria-label={ui.search} placeholder={ui.search} /><kbd>Ctrl K</kbd></div>
            <button className="icon-button" aria-label="Notifications" onClick={() => setActiveTab("Alerts")}><Bell size={18} /><span className="notification-dot" /></button>
            <div className="language-wrap">
              <button className="language-button" onClick={() => setShowLanguage((value) => !value)}>{language}<ChevronDown size={14} /></button>
              {showLanguage && <div className="language-menu">{(["EN", "TE", "HI"] as Language[]).map((item) => <button key={item} onClick={() => { setLanguage(item); setShowLanguage(false); }}>{item}{language === item && <Check size={14} />}</button>)}</div>}
            </div>
          </div>
        </header>

        <div className="page-wrap">
          <section className="page-heading">
            <div>
              <p className="eyebrow">{ui.liveInventory} <span className="eyebrow-line" /></p>
              <h1>{ui.greeting} <span className="wave">*</span></h1>
              <p className="heading-copy">{ui.heading}</p>
            </div>
            <button className="speak-button" onClick={startVoiceRecognition}><span className="speak-icon"><Mic size={19} /></span><span><strong>{ui.speakUpdate}</strong><small>{ui.speakHint}</small></span><span className="speak-shortcut">Ctrl S</span></button>
          </section>

          <div className={`notice-bar ${notice.includes("cannot") || notice.includes("Could not") ? "notice-error" : ""}`}><div className="notice-status"><span className="live-dot" /> {isLoading ? ui.loading : notice}</div><button onClick={() => setNotice(ui.noticeDefault)}><X size={15} /></button></div>

          {activeTab === "Overview" && <>
            <section className="metric-grid">
              <div className="metric-card metric-primary"><div className="metric-top"><span>{ui.totalItems}</span><span className="metric-icon"><Package size={16} /></span></div><strong>{totalUnits}</strong><div className="metric-foot"><span className="trend-up"><ArrowUpRight size={14} /> {ui.live}</span> <span>{ui.fromAtlas}</span></div><div className="metric-squiggle"><svg viewBox="0 0 200 40" preserveAspectRatio="none"><path d="M0 30 C25 28, 27 19, 45 22 S73 31, 92 17 S117 4, 134 18 S160 36, 181 10 S194 2, 200 4" fill="none" stroke="currentColor" strokeWidth="2" /></svg></div></div>
              <div className="metric-card"><div className="metric-top"><span>{ui.stockHealth}</span><span className="health-badge">{products.length ? "LIVE" : "EMPTY"}</span></div><strong>{stockHealth}<small>%</small></strong><div className="health-bar"><span style={{ width: `${stockHealth}%` }} /></div><div className="metric-foot"><span>{healthyProducts} / {products.length} {ui.healthyItems}</span></div></div>
              <div className="metric-card metric-alert"><div className="metric-top"><span>{ui.needsAttention}</span><span className="alert-icon"><AlertCircle size={16} /></span></div><strong>{lowStock.length}<small> {ui.item}</small></strong><div className="metric-foot"><span className="trend-alert">{ui.restockSoon}</span> <span>{ui.beforeRunOut}</span></div><div className="alert-product">{lowStock.map((product) => <span key={product._id || product.name}>{product.icon || fallbackIcon} {product.name}</span>)}</div></div>
            </section>

            <section className="content-grid">
              <div className="panel inventory-panel">
                <div className="panel-heading"><div><p className="section-kicker">{ui.liveInventory}</p><h2>{ui.shelvesTitle}</h2></div><button className="text-button" onClick={() => setActiveTab("Inventory")}>{ui.viewAll} <ChevronRight size={15} /></button></div>
                <div className="inventory-list">{stockedProducts.length ? stockedProducts.map((product) => <div className="inventory-row" key={product._id || product.name}><div className="product-symbol" style={{ background: product.tint || fallbackTint }}>{product.icon || fallbackIcon}</div><div className="product-name"><strong>{product.name}</strong><span>{formatMoney(getProductPrice(product))} per {product.unit.replace(/s$/, "")}</span></div><div className="product-stock"><strong>{getProductStock(product)}</strong><span>{product.unit}</span></div><div className="product-status"><StatusPill product={product} /></div><button className="row-menu" aria-label={`View ${product.name} details and price`} title="View details and price" onClick={() => openPriceEditor(product)}><Pencil size={15} /></button></div>) : <div className="empty-state"><Package size={24} /><strong>{ui.noStocked}</strong><span>{ui.addStockHint}</span></div>}</div>
                <button className="add-item-button" onClick={() => setShowAddItem(true)}><Plus size={16} /> {ui.addItem}</button>
              </div>

              <div className="panel activity-panel">
                <div className="panel-heading"><div><p className="section-kicker">{ui.recentActivity}</p><h2>{ui.whatChanged}</h2></div><button className="icon-button ghost" onClick={() => setActiveTab("Transactions")}><ChevronRight size={17} /></button></div>
                <div className="activity-list">{transactions.length ? transactions.slice(0, 4).map((transaction, index) => <div className="activity-row" key={transaction._id || `${transaction.product}-${index}`}><div className={`activity-icon ${transaction.type}`} aria-hidden="true">{transaction.type === "add" ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}</div><div className="activity-copy"><strong>{transaction.type === "add" ? ui.added : ui.removed}</strong><span>{transaction.quantity} {transaction.unit} of {transaction.product}</span></div><div className="activity-time">{formatTransactionTime(transaction)}</div></div>) : <div className="empty-state"><Clock3 size={24} /><strong>{ui.noTransactions}</strong><span>{ui.transactionsHint}</span></div>}</div>
                <div className="activity-footer"><span><span className="tiny-live" /> {ui.synced}</span><button onClick={() => setActiveTab("Transactions")}>{ui.history} <ChevronRight size={14} /></button></div>
              </div>
            </section>

            <section className="purchase-panel">
              <div className="purchase-head">
                <button className="voice-orb" onClick={startPurchaseRecognition} aria-label="Start customer purchase voice"><div className="orb-ring ring-one" /><div className="orb-ring ring-two" /><div className="orb-core"><Mic size={24} /></div></button>
                <div className="voice-promo-copy"><p className="section-kicker">{ui.customerPurchase}</p><h2>{ui.billTitle}</h2><p>{ui.billHint}</p></div>
                <button className="purchase-listen-button" onClick={startPurchaseRecognition}><Mic size={15} /> {ui.recordPurchase}</button>
              </div>
              <div className="purchase-table">
                <div className="purchase-row purchase-row-head"><span>{ui.item}</span><span>{ui.quantity}</span><span>{ui.price}</span><span>{ui.amount}</span></div>
                {purchaseLines.length ? purchaseLines.map((line) => <div className={`purchase-row ${line.error || line.price === null ? "has-error" : ""}`} key={`${line.productName}-${line.unit}`}><strong>{line.productName}</strong><span>{line.quantity} {line.unit}</span><span>{formatMoney(line.price)}</span><span>{line.amount === null ? "-" : formatMoney(line.amount)}</span>{line.error && <em>{line.error}</em>}</div>) : <div className="purchase-empty"><Package size={20} /><span>{ui.purchaseExample}</span></div>}
              </div>
              <form className="purchase-manual" onSubmit={(event) => { event.preventDefault(); applyPurchaseCommand(typedPurchaseCommand); }}>
                <input value={typedPurchaseCommand} onChange={(event) => setTypedPurchaseCommand(event.target.value)} placeholder={ui.typeItems} />
                <button type="submit">{ui.buildBill}</button>
              </form>
              <div className="purchase-footer">
                <button className="text-button" onClick={() => { setPurchaseLines([]); setPurchaseTranscript(""); setTypedPurchaseCommand(""); setPurchaseStatus(language === "HI" ? "अगले ग्राहक के लिए तैयार।" : language === "TE" ? "తరువాతి కస్టమర్ కోసం సిద్ధం." : "Ready for the next customer."); }}>{ui.clear}</button>
                <div><span>{ui.totalAmount}</span><strong>{formatMoney(purchaseTotal)}</strong></div>
                <button className="done-button" onClick={completeCustomerPurchase} disabled={!canCompletePurchase || isCompletingPurchase}>{isCompletingPurchase ? ui.completing : ui.done}</button>
              </div>
            </section>
          </>}

          {activeTab !== "Overview" && <section className="tab-panel panel"><div className="panel-heading"><div><p className="section-kicker">{activeTabDisplay.toUpperCase()}</p><h2>{tabTitle}</h2></div>{["Inventory", "Transactions", "Alerts"].includes(activeTab) && <button className="speak-button compact" onClick={startVoiceRecognition}><span className="speak-icon"><Mic size={17} /></span><span><strong>{ui.speakAnUpdate}</strong></span></button>}</div>{activeTab === "Inventory" && <div className="detail-table"><div className="table-head"><span>{ui.product}</span><span>{ui.onHand}</span><span>{ui.reorderAt}</span><span>{ui.status}</span></div>{products.length ? products.map((product) => <div className="table-row" key={product._id || product.name}><div className="table-product"><span className="product-symbol" style={{ background: product.tint || fallbackTint }}>{product.icon || fallbackIcon}</span><strong>{product.name}</strong></div><span>{getProductStock(product)} {product.unit}</span><span>{getProductReorder(product)} {product.unit}</span><StatusPill product={product} /></div>) : <div className="empty-state"><Package size={24} /><strong>{ui.noProducts}</strong><span>{ui.noProductsHint}</span></div>}</div>}{activeTab === "Transactions" && <div className="detail-table transaction-table"><div className="table-head"><span>{ui.action}</span><span>{ui.item}</span><span>{ui.quantity}</span><span>{ui.when}</span></div>{transactions.length ? transactions.map((transaction, index) => <div className="table-row" key={transaction._id || `${transaction.product}-${index}`}><div className={`action-label ${transaction.type}`}>{transaction.type === "add" ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}{transaction.type === "add" ? ui.added : ui.removed}</div><strong>{transaction.product}</strong><span>{transaction.quantity} {transaction.unit}</span><span className="muted-text">{formatTransactionTime(transaction)}</span></div>) : <div className="empty-state"><Clock3 size={24} /><strong>{ui.noTransactions}</strong><span>{ui.transactionsHint}</span></div>}</div>}{activeTab === "Alerts" && <div className="alerts-view">{lowStock.length ? lowStock.map((product) => <div className="alert-row" key={product._id || product.name}><div className="alert-symbol">{product.icon || fallbackIcon}</div><div><strong>{product.name} {language === "HI" ? "कम चल रहा है" : language === "TE" ? "తక్కువగా ఉంది" : "is running low"}</strong><p>{language === "HI" ? `सिर्फ ${getProductStock(product)} ${product.unit} बचा है। रीऑर्डर स्तर ${getProductReorder(product)} है।` : language === "TE" ? `${getProductStock(product)} ${product.unit} మాత్రమే మిగిలింది. రీఆర్డర్ స్థాయి ${getProductReorder(product)}.` : `Only ${getProductStock(product)} ${product.unit} remaining. Your reorder level is ${getProductReorder(product)}.`}</p></div><button onClick={startVoiceRecognition}>{ui.updateVoice} <Mic size={14} /></button></div>) : <div className="empty-state"><Check size={24} /><strong>{ui.allHealthy}</strong><span>{ui.allHealthyHint}</span></div>}</div>}{activeTab === "Settings" && <div className="manage-grid"><button className="manage-tile" onClick={() => setNotice(language === "HI" ? "स्टोर प्रोफाइल आपके Clerk अकाउंट से जुड़ी है।" : language === "TE" ? "స్టోర్ ప్రొఫైల్ మీ Clerk అకౌంట్‌కి కనెక్ట్ అయింది." : "Store profile is connected to your signed-in Clerk account.")}><Store size={20} /><strong>{language === "HI" ? "स्टोर प्रोफाइल" : language === "TE" ? "స్టోర్ ప్రొఫైల్" : "Store profile"}</strong><span>{user?.primaryEmailAddress?.emailAddress || "Signed in with Clerk"}</span></button><button className="manage-tile" onClick={() => setShowLanguage(true)}><Settings2 size={20} /><strong>{ui.language}</strong><span>{ui.currentVoiceLanguage}: {language}</span></button><button className="manage-tile" onClick={() => setActiveTab("Alerts")}><Bell size={20} /><strong>{ui.lowStockAlerts}</strong><span>{lowStock.length ? `${lowStock.length} ${ui.item}` : ui.allHealthy}</span></button><button className={`manage-tile ${databaseStatus === "error" ? "manage-tile-error" : ""}`} onClick={checkDatabaseStatus} disabled={databaseStatus === "checking"}><Check size={20} /><strong>{ui.databaseStatus}</strong><span>{databaseStatus === "checking" ? "Checking connection..." : databaseStatus === "connected" ? `${products.length} products synced. Atlas connected.` : databaseStatus === "error" ? "Connection check failed. Click to retry." : "Click to check MongoDB connection"}</span></button></div>}{activeTab === "Explore" && <div className="explore-grid"><div><Sparkles size={22} /><strong>{ui.speakUpdate}</strong><span>{ui.voiceHelp}</span></div><div><Package size={22} /><strong>Atlas-backed inventory</strong><span>{ui.heading}</span></div><div><Bell size={22} /><strong>{ui.lowStockAlerts}</strong><span>{ui.allHealthyHint}</span></div></div>}</section>}
        </div>
      </main>

      {showAddItem && <div className="modal-backdrop" onClick={() => setShowAddItem(false)}><form className="item-modal" onSubmit={addInventoryItem} onClick={(event) => event.stopPropagation()}><button type="button" className="modal-close" onClick={() => setShowAddItem(false)}><X size={17} /></button><p className="section-kicker">{language === "HI" ? "नया इन्वेंटरी आइटम" : language === "TE" ? "కొత్త ఇన్వెంటరీ ఐటమ్" : "NEW INVENTORY ITEM"}</p><h2>{ui.addItem}</h2><p className="modal-copy">{language === "HI" ? "ग्राहक बिल के लिए opening stock और selling price के साथ MongoDB में प्रोडक्ट बनाएं।" : language === "TE" ? "కస్టమర్ బిల్లుల కోసం opening stock మరియు selling price తో MongoDB లో ప్రోడక్ట్ సృష్టించండి." : "Create a product in MongoDB with opening stock and selling price for customer bills."}</p><label><span>{ui.product} {language === "EN" ? "name" : ""}</span><input value={newProductName} onChange={(event) => setNewProductName(event.target.value)} placeholder="Rice" autoFocus /></label><div className="item-form-grid"><label><span>{language === "HI" ? "शुरुआती स्टॉक" : language === "TE" ? "ప్రారంభ స్టాక్" : "Opening stock"}</span><input type="number" min="1" value={newProductStock} onChange={(event) => setNewProductStock(event.target.value)} /></label><label><span>{language === "HI" ? "यूनिट" : language === "TE" ? "యూనిట్" : "Unit"}</span><select value={newProductUnit} onChange={(event) => setNewProductUnit(event.target.value)}><option value="units">units</option><option value="bags">bags</option><option value="cartons">cartons</option><option value="boxes">boxes</option><option value="kg">kg</option><option value="packets">packets</option></select></label></div><div className="item-form-grid"><label><span>{ui.price} per {priceUnitLabel}</span><input type="number" min="0" step="0.01" value={newProductPrice} onChange={(event) => setNewProductPrice(event.target.value)} placeholder="0.00" /></label><label><span>{ui.reorderAt}</span><input type="number" min="0" value={newProductReorder} onChange={(event) => setNewProductReorder(event.target.value)} /></label></div><button className="submit-item-button" type="submit" disabled={isAddingItem}>{isAddingItem ? (language === "HI" ? "आइटम जुड़ रहा है..." : language === "TE" ? "ఐటమ్ జోడిస్తోంది..." : "Adding item...") : ui.addItem}</button></form></div>}

      {priceProduct && <div className="modal-backdrop" onClick={() => setPriceProduct(null)}><form className="item-modal" onSubmit={updateProductPrice} onClick={(event) => event.stopPropagation()}><button type="button" className="modal-close" onClick={() => setPriceProduct(null)}><X size={17} /></button><p className="section-kicker">{language === "HI" ? "आइटम विवरण" : language === "TE" ? "ఐటమ్ వివరాలు" : "ITEM DETAILS"}</p><h2>{priceProduct.name}</h2><div className="product-detail-grid"><div><span>{language === "HI" ? "स्टॉक" : language === "TE" ? "స్టాక్" : "Stock"}</span><strong>{getProductStock(priceProduct)} {priceProduct.unit}</strong></div><div><span>{ui.reorderAt}</span><strong>{getProductReorder(priceProduct)} {priceProduct.unit}</strong></div><div><span>{language === "HI" ? "मौजूदा कीमत" : language === "TE" ? "ప్రస్తుత ధర" : "Current price"}</span><strong>{formatMoney(getProductPrice(priceProduct))}</strong></div><div><span>{ui.status}</span><strong>{getProductStock(priceProduct) <= getProductReorder(priceProduct) ? (language === "HI" ? "कम स्टॉक" : language === "TE" ? "తక్కువ స్టాక్" : "Running low") : (language === "HI" ? "स्टॉक में" : language === "TE" ? "స్టాక్‌లో ఉంది" : "In stock")}</strong></div></div><p className="modal-copy">{language === "HI" ? "यह कीमत ग्राहक खरीद बिल में इस्तेमाल होगी।" : language === "TE" ? "ఈ ధర కస్టమర్ కొనుగోలు బిల్లులలో ఉపయోగించబడుతుంది." : "This price is used for customer purchase bills."}</p><label><span>{ui.price} per {priceProduct.unit.replace(/s$/, "")}</span><input type="number" min="0" step="0.01" value={editPrice} onChange={(event) => setEditPrice(event.target.value)} placeholder="0.00" autoFocus /></label><button className="submit-item-button" type="submit" disabled={isUpdatingPrice}>{isUpdatingPrice ? (language === "HI" ? "कीमत अपडेट हो रही है..." : language === "TE" ? "ధర అప్డేట్ అవుతోంది..." : "Updating price...") : (language === "HI" ? "कीमत अपडेट करें" : language === "TE" ? "ధర అప్డేట్ చేయండి" : "Update price")}</button></form></div>}

      {isPurchaseListening && <div className="modal-backdrop" onClick={stopPurchaseRecognition}><div className="voice-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={stopPurchaseRecognition}><X size={17} /></button><div className="listening-visual"><div className="listening-ripple ripple-a" /><div className="listening-ripple ripple-b" /><div className="listening-core"><Mic size={28} /></div></div><p className="section-kicker">{ui.customerPurchase}</p><h2>{ui.purchaseModalTitle}</h2><p className="modal-copy">{ui.purchaseModalHelp}</p><div className="waveform"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div><div className="command-preview"><div className="preview-label"><span className="live-dot" /> {purchaseStatus}</div><strong>{purchaseTranscript || ui.listeningBasket}</strong></div><div className="command-list">{purchaseExamples.map((example) => <button key={example} onClick={() => applyPurchaseCommand(example)}>{example}<ChevronRight size={15} /></button>)}</div><button className="type-command" onClick={() => { recognitionRef.current?.stop(); setPurchaseStatus(language === "HI" ? "ग्राहक आइटम फिर से सुन रहे हैं।" : language === "TE" ? "కస్టమర్ ఐటమ్స్ మళ్లీ వినుతోంది." : "Listening again for customer items."); startPurchaseRecognition(); }}><Command size={15} /> {ui.listenAgain}</button></div></div>}

      {isListening && <div className="modal-backdrop" onClick={stopVoiceRecognition}><div className="voice-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={stopVoiceRecognition}><X size={17} /></button><div className="listening-visual"><div className="listening-ripple ripple-a" /><div className="listening-ripple ripple-b" /><div className="listening-core"><Mic size={28} /></div></div><p className="section-kicker">{ui.voiceCommand}</p><h2>{ui.voiceTitle}</h2><p className="modal-copy">{ui.voiceHelp}</p><div className="waveform"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div><div className="command-preview"><div className="preview-label"><span className="live-dot" /> {voiceStatus}</div><strong>{voiceTranscript || ui.listeningCommand}</strong></div><div className="command-list">{commands.map((command) => <button key={command} onClick={() => applyCommand(command)}>{command}<ChevronRight size={15} /></button>)}</div><button className="type-command" onClick={() => { recognitionRef.current?.stop(); setVoiceStatus(language === "HI" ? "फिर से सुन रहे हैं। प्रोडक्ट नाम और मात्रा बोलें।" : language === "TE" ? "మళ్లీ వింటోంది. ప్రోడక్ట్ పేరు మరియు పరిమాణం చెప్పండి." : "Listening again. Say a product name and quantity."); startVoiceRecognition(); }}><Command size={15} /> {ui.listenAgain}</button></div></div>}
    </div>
  );
}
