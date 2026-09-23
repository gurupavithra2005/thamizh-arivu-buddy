/**
 * MOCK DATA — UI development only.
 *
 * Every value here is a clearly-labelled placeholder used to develop the
 * interface before the real pipeline (query understanding -> dynamic source
 * discovery -> retrieval -> hybrid + semantic search -> ranking -> RAG -> LLM)
 * is implemented. Nothing here should be presented to end users as a verified
 * answer: components render an explicit "mock" badge wherever it is used.
 */

export type SourceType =
  | "webpage"
  | "book"
  | "ebook"
  | "pdf"
  | "document"
  | "archive"
  | "chapter"
  | "ocr";

export interface KnowledgeSource {
  id: string;
  title: string;
  titleTamil?: string;
  type: SourceType;
  url: string;
  publisher: string;
  relevance: number; // 0..1 ranking score placeholder
  passage: string;
  language: "ta" | "en" | "mixed";
  verified: boolean;
}

export type MessageRole = "user" | "assistant";

export interface DetectedLanguage {
  label: string;
  code: "ta" | "en" | "tanglish" | "mixed" | "translit";
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  /** Present on assistant messages only. */
  grounded?: boolean;
  unverified?: boolean;
  sources?: KnowledgeSource[];
  relatedQuestions?: string[];
  detectedLanguage?: DetectedLanguage;
  isMock?: boolean;
}

export const MOCK_SOURCES: KnowledgeSource[] = [
  {
    id: "src-thirukkural",
    title: "Tirukkuṟaḷ — Complete Text with Commentary",
    titleTamil: "திருக்குறள் — உரையுடன்",
    type: "ebook",
    url: "https://www.projectmadurai.org/",
    publisher: "Project Madurai (Tamil e-text archive)",
    relevance: 0.94,
    passage:
      "MOCK PASSAGE — the retrieved snippet from the source document will appear here, with the matched sentences highlighted.",
    language: "ta",
    verified: true,
  },
  {
    id: "src-sangam",
    title: "Sangam Literature: The Eight Anthologies",
    titleTamil: "எட்டுத்தொகை",
    type: "book",
    url: "https://tamilvu.org/",
    publisher: "Tamil Virtual Academy",
    relevance: 0.87,
    passage:
      "MOCK PASSAGE — retrieved chunk text with citation offsets will be shown in this area.",
    language: "ta",
    verified: true,
  },
  {
    id: "src-archive",
    title: "Digitised Palm-leaf Manuscript Collection",
    titleTamil: "ஓலைச்சுவடி தொகுப்பு",
    type: "archive",
    url: "https://archive.org/",
    publisher: "Internet Archive",
    relevance: 0.71,
    passage: "MOCK PASSAGE — OCR-extracted text of the scanned folio.",
    language: "mixed",
    verified: false,
  },
];

export const MOCK_CONVERSATION: ChatMessage[] = [
  {
    id: "m1",
    role: "user",
    content: "சங்க இலக்கியத்தில் அகம் மற்றும் புறம் என்றால் என்ன?",
    detectedLanguage: { label: "Tamil", code: "ta" },
  },
  {
    id: "m2",
    role: "assistant",
    isMock: true,
    grounded: true,
    content:
      "MOCK RESPONSE — the grounded answer generated from retrieved source passages will appear here in simple modern Tamil and English, followed by its citations.",
    sources: MOCK_SOURCES,
    relatedQuestions: [
      "அகத்திணை வகைகள் யாவை?",
      "Who compiled the Ettuthokai anthologies?",
      "Purananuru la enna sollirukku?",
    ],
  },
];

export const EXAMPLE_QUESTIONS: { text: string; hint: string }[] = [
  { text: "திருக்குறளில் அறத்துப்பால் என்பது என்ன?", hint: "Tamil" },
  { text: "Sangam era la enna maadhiri kalai irunthadhu?", hint: "Tanglish" },
  { text: "Explain the architecture of Chola temples", hint: "English" },
  { text: "pongal festival history sollunga", hint: "Transliteration" },
  { text: "சிலப்பதிகாரம் பற்றி சுருக்கமாக சொல்லுங்கள்", hint: "Tamil" },
];

export interface HeritageCategory {
  slug: string;
  title: string;
  titleTamil: string;
  description: string;
  icon: string;
  topics: string[];
}

export const HERITAGE_CATEGORIES: HeritageCategory[] = [
  {
    slug: "literature",
    title: "Literature",
    titleTamil: "இலக்கியம்",
    description: "Epics, devotional poetry, prose and modern Tamil writing.",
    icon: "BookOpen",
    topics: ["Silappadhikaram", "Kambaramayanam", "Bharathiyar", "Modern prose"],
  },
  {
    slug: "classical-tamil",
    title: "Classical Tamil",
    titleTamil: "செம்மொழி தமிழ்",
    description: "Sangam corpus, Tolkappiyam grammar and classical poetics.",
    icon: "ScrollText",
    topics: ["Tolkappiyam", "Ettuthokai", "Pathupattu", "Agam & Puram"],
  },
  {
    slug: "festivals",
    title: "Festivals",
    titleTamil: "பண்டிகைகள்",
    description: "Seasonal, agrarian and temple festival traditions.",
    icon: "PartyPopper",
    topics: ["Pongal", "Thai Poosam", "Chithirai", "Karthigai Deepam"],
  },
  {
    slug: "traditions",
    title: "Traditions",
    titleTamil: "பாரம்பரியம்",
    description: "Rituals, family customs and community practices.",
    icon: "HandHeart",
    topics: ["Kolam", "Seer varisai", "Naming customs", "Village deities"],
  },
  {
    slug: "arts",
    title: "Arts",
    titleTamil: "கலைகள்",
    description: "Dance, music, folk performance and craft traditions.",
    icon: "Music4",
    topics: ["Bharatanatyam", "Parai", "Therukoothu", "Tanjore painting"],
  },
  {
    slug: "architecture",
    title: "Architecture",
    titleTamil: "கட்டிடக்கலை",
    description: "Temple gopurams, mandapams and Dravidian construction.",
    icon: "Landmark",
    topics: ["Gopuram", "Chola temples", "Mamallapuram", "Stone sculpture"],
  },
  {
    slug: "food",
    title: "Food",
    titleTamil: "உணவு மரபு",
    description: "Regional cuisines, grains, and food in literature.",
    icon: "UtensilsCrossed",
    topics: ["Chettinad", "Millets", "Temple prasadam", "Festival sweets"],
  },
  {
    slug: "history",
    title: "History",
    titleTamil: "வரலாறு",
    description: "Dynasties, trade, inscriptions and historical geography.",
    icon: "Milestone",
    topics: ["Cholas", "Pandyas", "Pallavas", "Maritime trade"],
  },
  {
    slug: "cultural-practices",
    title: "Cultural Practices",
    titleTamil: "பண்பாட்டு வழக்கங்கள்",
    description: "Concepts, ethics and everyday cultural knowledge.",
    icon: "Sparkles",
    topics: ["Aram", "Thinai concepts", "Folk medicine", "Proverbs"],
  },
];

export interface ConversationSummary {
  id: string;
  title: string;
  language: string;
  turns: number;
  updatedAt: string;
  preview: string;
}

export const MOCK_CONVERSATIONS: ConversationSummary[] = [
  {
    id: "c1",
    title: "சங்க இலக்கியம் — அகம் & புறம்",
    language: "Tamil",
    turns: 6,
    updatedAt: "Today",
    preview: "MOCK — conversation memory summary appears here.",
  },
  {
    id: "c2",
    title: "Chola temple architecture",
    language: "English",
    turns: 4,
    updatedAt: "Yesterday",
    preview: "MOCK — follow-up questions used prior context.",
  },
  {
    id: "c3",
    title: "Pongal history sollunga",
    language: "Tanglish",
    turns: 3,
    updatedAt: "2 days ago",
    preview: "MOCK — mixed-script query handling.",
  },
];

export const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  webpage: "Webpage",
  book: "Book",
  ebook: "E-book",
  pdf: "PDF",
  document: "Document",
  archive: "Digital archive",
  chapter: "Chapter",
  ocr: "OCR document",
};
