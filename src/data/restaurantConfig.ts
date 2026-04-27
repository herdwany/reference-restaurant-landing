export type IconKey =
  | "star"
  | "chef"
  | "leaf"
  | "bike"
  | "shield"
  | "clock"
  | "flame"
  | "card";

export type CartSource = "dish" | "offer" | "menu";

export interface RestaurantInfo {
  id?: string;
  name: string;
  slogan: string;
  logoText: string;
  phone: string;
  whatsappNumber: string;
  email: string;
  address: string;
  workingHours: string;
  mapImage: string;
  mapUrl: string;
  currency: string;
  deliveryFee: number;
}

export interface BrandSettings {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  successColor: string;
  darkColor: string;
  lightColor: string;
  borderColor: string;
  borderRadius: string;
  heroImage: string;
}

export interface NavLink {
  label: string;
  targetId: string;
}

export interface HeroContent {
  badgeText: string;
  title: string;
  subtitle: string;
  primaryCtaText: string;
  secondaryCtaText: string;
  image: string;
  imageBadge: string;
}

export interface Benefit {
  title: string;
  icon: IconKey;
}

export interface Feature {
  title: string;
  description: string;
  icon: IconKey;
}

export interface Dish {
  id: string;
  name: string;
  description: string;
  price: number;
  oldPrice?: number;
  image: string;
  imageUrl?: string;
  badge?: string;
  category: string;
  rating: number;
  isPopular: boolean;
  ingredients: string[];
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  price: number;
  oldPrice?: number;
  image: string;
  imageUrl?: string;
  colorTheme: "orange" | "red" | "gold";
  ctaText: string;
  isActive?: boolean;
  sortOrder?: number;
  startsAt?: string;
  endsAt?: string;
}

export interface Testimonial {
  name: string;
  text: string;
  rating: number;
  avatar: string;
  role?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  description: string;
  image: string;
  items: MenuItem[];
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface SocialLinks {
  instagram: string;
  tiktok: string;
  snapchat: string;
  x: string;
}

export interface PaymentMethod {
  id: string;
  label: string;
}

export interface GalleryImage {
  id: string;
  title: string;
  image: string;
}

export interface CartItem {
  id: string;
  sourceId: string;
  source: CartSource;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

export interface BookingFormData {
  fullName: string;
  phone: string;
  date: string;
  time: string;
  guests: string;
}

export interface SectionVisibilitySettings {
  hero: boolean;
  trustBadges: boolean;
  featuredDishes: boolean;
  offers: boolean;
  gallery: boolean;
  testimonials: boolean;
  actionGrid: boolean;
  faq: boolean;
  footer: boolean;
}

export interface RestaurantConfig {
  settings: {
    currency: string;
    language: string;
    direction: "rtl" | "ltr";
    orderMode: "whatsapp" | "database" | "both";
    reservationMode: "whatsapp" | "database" | "both";
    sections: SectionVisibilitySettings;
  };
  restaurant: RestaurantInfo;
  brand: BrandSettings;
  navigation: NavLink[];
  hero: HeroContent;
  quickBenefits: Benefit[];
  features: Feature[];
  dishes: Dish[];
  offers: Offer[];
  testimonials: Testimonial[];
  menuCategories: MenuCategory[];
  faqs: FAQItem[];
  socialLinks: SocialLinks;
  paymentMethods: PaymentMethod[];
  galleryImages: GalleryImage[];
  ui: {
    templateButton: string;
    cartButtonLabel: string;
    orderNow: string;
    addToCart: string;
    details: string;
    quantity: string;
    close: string;
    whatsappInquiryMessage: string;
    sectionTitles: {
      featuredDishes: string;
      offers: string;
      testimonials: string;
      actionGrid: string;
      gallery: string;
      faq: string;
    };
    booking: {
      title: string;
      fullName: string;
      phone: string;
      date: string;
      time: string;
      guests: string;
      submit: string;
      whatsappSubmit: string;
      successTitle: string;
      successText: string;
    };
    menu: {
      title: string;
      view: string;
      viewFull: string;
      fullTitle: string;
    };
    location: {
      title: string;
      whatsapp: string;
      openMap: string;
    };
    cart: {
      title: string;
      empty: string;
      subtotal: string;
      delivery: string;
      total: string;
      checkoutWhatsapp: string;
      customerLocationHint: string;
    };
    footer: {
      description: string;
      contactTitle: string;
      quickLinksTitle: string;
      socialTitle: string;
      privacy: string;
      terms: string;
      copyrightPrefix: string;
      copyrightYear: string;
    };
    editableTemplateModal: {
      title: string;
      text: string;
      points: string[];
    };
    toasts: {
      added: string;
      removed: string;
      bookingSuccess: string;
      completeFields: string;
      cartEmpty: string;
    };
  };
}

const foodImage = (id: string, w = 900, h = 700) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=${h}&q=85`;

// عدل هذا الملف فقط لتغيير اسم المطعم، الألوان، الصور، الأسعار، روابط التواصل، أو محتوى الصفحة بالكامل.
export const restaurantConfig: RestaurantConfig = {
  settings: {
    currency: "ر.س",
    language: "ar",
    direction: "rtl",
    orderMode: "whatsapp",
    reservationMode: "whatsapp",
    sections: {
      hero: true,
      trustBadges: true,
      featuredDishes: true,
      offers: true,
      gallery: true,
      testimonials: true,
      actionGrid: true,
      faq: true,
      footer: true,
    },
  },
  restaurant: {
    name: "مطعم الذواقة",
    slogan: "طعم يبقى بك",
    logoText: "الذواقة",
    phone: "+966 55 123 4567",
    whatsappNumber: "966551234567",
    email: "hello@althawaqa.example",
    address: "شارع الأمير سلطان، الرياض، المملكة العربية السعودية",
    workingHours: "نحن في خدمتكم يومياً من 12 ظهراً حتى 1 بعد منتصف الليل",
    mapImage: foodImage("photo-1524661135-423995f22d0b", 900, 520),
    mapUrl: "https://maps.google.com/?q=Riyadh%20Restaurant",
    currency: "ر.س",
    deliveryFee: 12,
  },
  brand: {
    primaryColor: "#E51B2B",
    secondaryColor: "#F97316",
    accentColor: "#FBBF24",
    successColor: "#22C55E",
    darkColor: "#1F2937",
    lightColor: "#FFF8ED",
    borderColor: "#E5E7EB",
    borderRadius: "24px",
    heroImage: foodImage("photo-1543353071-873f17a7a088", 1000, 900),
  },
  navigation: [
    { label: "الرئيسية", targetId: "home" },
    { label: "المنيو", targetId: "menu" },
    { label: "العروض", targetId: "offers" },
    { label: "عن المطعم", targetId: "about" },
    { label: "المعرض", targetId: "gallery" },
    { label: "التقييمات", targetId: "testimonials" },
    { label: "اتصل بنا", targetId: "contact" },
  ],
  hero: {
    badgeText: "جودة المكونات، سر مذاقنا",
    title: "عنوان قوي لزيادة الطلبات",
    subtitle:
      "اكتشف أشهى الأطباق المحضّرة من مكونات طازجة على أيدي أفضل الشيفات. تجربة لا تُنسى تنتظرك!",
    primaryCtaText: "اطلب الآن",
    secondaryCtaText: "تواصل عبر واتساب",
    image: foodImage("photo-1565299624946-b28f40a0ae38", 1000, 900),
    imageBadge: "تواصل يومياً",
  },
  quickBenefits: [
    { title: "توصيل سريع", icon: "clock" },
    { title: "مكونات طازجة", icon: "leaf" },
    { title: "جودة عالية", icon: "star" },
    { title: "دفع آمن", icon: "shield" },
  ],
  features: [
    {
      title: "تقييمات ممتازة",
      description: "موصى بنا من عملائنا بتقييمات عالية وتجارب متكررة.",
      icon: "star",
    },
    {
      title: "شيفات محترفون",
      description: "فريق من أمهر الشيفات لخدمتكم بكل شغف.",
      icon: "chef",
    },
    {
      title: "مكونات طازجة",
      description: "نستخدم مكونات يومية طازجة عالية الجودة.",
      icon: "leaf",
    },
    {
      title: "توصيل سريع",
      description: "يصلك طلبك ساخناً وفي الوقت المحدد.",
      icon: "bike",
    },
  ],
  dishes: [
    {
      id: "alfredo-chicken-pasta",
      name: "باستا ألفريدو بالدجاج",
      description: "باستا كريمية مع دجاج مشوي وجبن بارميزان وصلصة غنية.",
      price: 45,
      oldPrice: 56,
      image: foodImage("photo-1551183053-bf91a1d81141"),
      badge: "الأكثر طلباً",
      category: "الأطباق الرئيسية",
      rating: 4.9,
      isPopular: true,
      ingredients: ["باستا فيتوتشيني", "دجاج مشوي", "كريمة", "بارميزان", "فلفل أسود"],
    },
    {
      id: "classic-beef-burger",
      name: "برجر اللحم الكلاسيكي",
      description: "لحم بقري طازج مع جبن شيدر وخس وصوص خاص داخل خبز بريوش.",
      price: 38,
      image: foodImage("photo-1550547660-d9450f859349"),
      badge: "جديد",
      category: "الساندويتشات",
      rating: 4.8,
      isPopular: true,
      ingredients: ["لحم بقري", "جبن شيدر", "خس", "طماطم", "صوص خاص"],
    },
    {
      id: "herb-grilled-chicken",
      name: "دجاج مشوي بالأعشاب",
      description: "صدر دجاج متبل بالأعشاب يقدم مع خضار موسمية وصلصة الليمون.",
      price: 42,
      image: foodImage("photo-1598515214211-89d3c73ae83b"),
      category: "الأطباق الرئيسية",
      rating: 4.7,
      isPopular: false,
      ingredients: ["دجاج", "إكليل الجبل", "ليمون", "خضار", "زيت زيتون"],
    },
    {
      id: "chocolate-cake",
      name: "كيكة الشوكولاتة",
      description: "طبقات شوكولاتة فاخرة مع صوص كاكاو وكريمة خفيفة.",
      price: 28,
      image: foodImage("photo-1606890737304-57a1ca8a5b62"),
      badge: "حلوى اليوم",
      category: "الحلويات والمشروبات",
      rating: 4.9,
      isPopular: true,
      ingredients: ["كاكاو", "كريمة", "زبدة", "شوكولاتة داكنة"],
    },
    {
      id: "margherita-pizza",
      name: "بيتزا مارجريتا",
      description: "عجينة رقيقة وصلصة طماطم إيطالية مع موزاريلا وريحان.",
      price: 39,
      oldPrice: 48,
      image: foodImage("photo-1574071318508-1cdbab80d002"),
      badge: "عرض خاص",
      category: "الأطباق الرئيسية",
      rating: 4.8,
      isPopular: true,
      ingredients: ["عجينة بيتزا", "موزاريلا", "طماطم", "ريحان", "زيت زيتون"],
    },
    {
      id: "grilled-steak",
      name: "ستيك مشوي",
      description: "قطعة ستيك مختارة مشوية بدرجة مثالية مع بطاطس وصوص الفلفل.",
      price: 89,
      image: foodImage("photo-1558030006-450675393462"),
      badge: "فاخر",
      category: "الأطباق الرئيسية",
      rating: 4.9,
      isPopular: true,
      ingredients: ["ستيك بقري", "بطاطس", "زبدة", "فلفل", "أعشاب"],
    },
    {
      id: "caesar-salad",
      name: "سلطة سيزر",
      description: "خس روماني طازج مع دجاج مشوي وقطع خبز محمص وصوص سيزر.",
      price: 26,
      image: foodImage("photo-1546793665-c74683f339c1"),
      category: "الأطباق الرئيسية",
      rating: 4.6,
      isPopular: false,
      ingredients: ["خس", "دجاج", "بارميزان", "خبز محمص", "صوص سيزر"],
    },
    {
      id: "mint-lemon-mojito",
      name: "موهيتو ليمون ونعناع",
      description: "مشروب منعش بالليمون الطازج والنعناع والثلج المجروش.",
      price: 18,
      image: foodImage("photo-1621263764928-df1444c5e859"),
      badge: "منعش",
      category: "الحلويات والمشروبات",
      rating: 4.7,
      isPopular: false,
      ingredients: ["ليمون", "نعناع", "ثلج", "مياه غازية", "سكر قصب"],
    },
  ],
  offers: [
    {
      id: "saving-meal",
      title: "وجبة التوفير",
      description: "برجر كلاسيكي مع بطاطس مقرمشة ومشروب بارد.",
      price: 32,
      oldPrice: 49,
      image: foodImage("photo-1568901346375-23c9450c58cd", 760, 640),
      colorTheme: "orange",
      ctaText: "اطلب الآن",
    },
    {
      id: "pizza-offer",
      title: "عرض البيتزا",
      description: "بيتزا مارجريتا كبيرة مع مقبلات ومشروبين.",
      price: 59,
      oldPrice: 86,
      image: foodImage("photo-1594007654729-407eedc4be65", 760, 640),
      colorTheme: "red",
      ctaText: "اطلب العرض",
    },
    {
      id: "family-meal",
      title: "وجبة عائلية",
      description: "تشكيلة مشويات وسلطات ومشروبات تكفي أربعة أشخاص.",
      price: 129,
      oldPrice: 198,
      image: foodImage("photo-1529692236671-f1f6cf9683ba", 760, 640),
      colorTheme: "gold",
      ctaText: "اطلب الآن",
    },
  ],
  testimonials: [
    {
      name: "نورة العبدالله",
      text: "الطلب وصل ساخناً والطعم كان ممتازاً. تجربة مرتبة من أول رسالة واتساب حتى آخر لقمة.",
      rating: 5,
      avatar: foodImage("photo-1494790108377-be9c29b29330", 240, 240),
      role: "عميلة دائمة",
    },
    {
      name: "سلمان الحربي",
      text: "أفضل برجر جربته مؤخراً، التغليف نظيف والبطاطس وصلت مقرمشة.",
      rating: 5,
      avatar: foodImage("photo-1500648767791-00dcc994a43e", 240, 240),
      role: "طلب سريع",
    },
    {
      name: "ريم القحطاني",
      text: "حجز الطاولة كان سهل جداً، والخدمة في المطعم راقية ومريحة.",
      rating: 5,
      avatar: foodImage("photo-1544005313-94ddf0286df2", 240, 240),
      role: "حجز عائلي",
    },
    {
      name: "ماجد السبيعي",
      text: "العروض ممتازة والأسعار واضحة. أضفت الطلب للسلة وأرسلته عبر واتساب في ثواني.",
      rating: 5,
      avatar: foodImage("photo-1506794778202-cad84cf45f1d", 240, 240),
      role: "عميل جديد",
    },
    {
      name: "هدى المالكي",
      text: "أحببت تنوع المنيو وجودة الصور. الطلبات وصلت كاملة ومنظمة.",
      rating: 5,
      avatar: foodImage("photo-1517841905240-472988babdf9", 240, 240),
      role: "طلب عائلي",
    },
    {
      name: "عبدالعزيز فهد",
      text: "الستيك كان مضبوطاً، وخدمة العملاء عبر واتساب كانت سريعة ومحترفة.",
      rating: 5,
      avatar: foodImage("photo-1519085360753-af0119f7cbe7", 240, 240),
      role: "تجربة عشاء",
    },
  ],
  menuCategories: [
    {
      id: "mains",
      name: "الأطباق الرئيسية",
      description: "وجبات مشبعة محضرة بعناية يومية.",
      image: foodImage("photo-1504674900247-0877df9cc836", 320, 240),
      items: [
        {
          id: "main-mixed-grill",
          name: "مشاوي مشكلة",
          description: "كباب وشيش طاووق وريش مع أرز وسلطات.",
          price: 74,
          image: foodImage("photo-1529692236671-f1f6cf9683ba", 260, 220),
        },
        {
          id: "main-salmon",
          name: "سلمون بالليمون",
          description: "فيليه سلمون مشوي مع خضار وصلصة حمضية.",
          price: 68,
          image: foodImage("photo-1485921325833-c519f76c4927", 260, 220),
        },
        {
          id: "main-risotto",
          name: "ريزوتو الفطر",
          description: "أرز إيطالي كريمي مع فطر طازج وبارميزان.",
          price: 44,
          image: foodImage("photo-1476124369491-e7addf5db371", 260, 220),
        },
      ],
    },
    {
      id: "sandwiches",
      name: "الساندويتشات",
      description: "اختيارات سريعة وغنية بالنكهات.",
      image: foodImage("photo-1521305916504-4a1121188589", 320, 240),
      items: [
        {
          id: "sandwich-crispy",
          name: "ساندويتش دجاج كرسبي",
          description: "دجاج مقرمش مع خس وصوص عسل خردل.",
          price: 31,
          image: foodImage("photo-1606755962773-d324e7a7a7b6", 260, 220),
        },
        {
          id: "sandwich-steak",
          name: "ساندويتش ستيك",
          description: "شرائح ستيك مع بصل مكرمل وجبن.",
          price: 46,
          image: foodImage("photo-1550507992-eb63ffee0847", 260, 220),
        },
        {
          id: "sandwich-falafel",
          name: "راب فلافل",
          description: "فلافل مقرمشة مع طحينة وخضار طازجة.",
          price: 22,
          image: foodImage("photo-1615870216519-2f9fa575fa5c", 260, 220),
        },
      ],
    },
    {
      id: "desserts-drinks",
      name: "الحلويات والمشروبات",
      description: "نهايات حلوة ومشروبات منعشة.",
      image: foodImage("photo-1497534446932-c925b458314e", 320, 240),
      items: [
        {
          id: "dessert-tiramisu",
          name: "تيراميسو",
          description: "طبقات قهوة وماسكاربوني بلمسة كاكاو.",
          price: 29,
          image: foodImage("photo-1571877227200-a0d98ea607e9", 260, 220),
        },
        {
          id: "drink-berry",
          name: "كوكتيل توت",
          description: "توت مشكل مع ثلج ونعناع.",
          price: 21,
          image: foodImage("photo-1502741224143-90386d7f8c82", 260, 220),
        },
        {
          id: "coffee-latte",
          name: "لاتيه مثلج",
          description: "إسبريسو بارد مع حليب كريمي.",
          price: 19,
          image: foodImage("photo-1461023058943-07fcbe16d735", 260, 220),
        },
      ],
    },
  ],
  faqs: [
    {
      question: "هل يمكنني تعديل طلبي بعد تأكيده؟",
      answer: "نعم، تواصل معنا عبر واتساب خلال أول عشر دقائق من إرسال الطلب وسنحاول تعديله قبل التجهيز.",
    },
    {
      question: "هل لديكم خيارات نباتية أو خالية من الجلوتين؟",
      answer: "تتوفر خيارات نباتية وعدة أطباق يمكن تعديلها حسب الحساسية أو التفضيل عند الطلب.",
    },
    {
      question: "ما هي أوقات العمل؟",
      answer: "نعمل يومياً من 12 ظهراً حتى 1 بعد منتصف الليل، وقد تختلف أوقات الفروع في المواسم.",
    },
    {
      question: "هل يوجد توصيل لجميع مناطق المدينة؟",
      answer: "نغطي معظم أحياء المدينة، ويتم تأكيد نطاق التوصيل والتكلفة عبر واتساب قبل تجهيز الطلب.",
    },
    {
      question: "ما هي طرق الدفع المتاحة؟",
      answer: "نقبل مدى وفيزا وماستركارد وآبل باي، ويمكن تأكيد طريقة الدفع عند إتمام الطلب.",
    },
    {
      question: "كم يستغرق وصول الطلب؟",
      answer: "غالباً يصل الطلب خلال 30 إلى 45 دقيقة حسب بعد الموقع وحجم الطلب ووقت الذروة.",
    },
  ],
  socialLinks: {
    instagram: "https://instagram.com/",
    tiktok: "https://www.tiktok.com/",
    snapchat: "https://www.snapchat.com/",
    x: "https://x.com/",
  },
  paymentMethods: [
    { id: "mada", label: "mada" },
    { id: "visa", label: "Visa" },
    { id: "applePay", label: "Apple Pay" },
    { id: "mastercard", label: "Mastercard" },
  ],
  galleryImages: [
    {
      id: "gallery-1",
      title: "طبق الشيف اليومي",
      image: foodImage("photo-1551218808-94e220e084d2", 720, 560),
    },
    {
      id: "gallery-2",
      title: "جلسات راقية",
      image: foodImage("photo-1514933651103-005eec06c04b", 720, 560),
    },
    {
      id: "gallery-3",
      title: "مشروبات منعشة",
      image: foodImage("photo-1544145945-f90425340c7e", 720, 560),
    },
    {
      id: "gallery-4",
      title: "حلويات فاخرة",
      image: foodImage("photo-1551024506-0bccd828d307", 720, 560),
    },
  ],
  ui: {
    templateButton: "قالب قابل للتخصيص",
    cartButtonLabel: "السلة",
    orderNow: "اطلب الآن",
    addToCart: "أضف للسلة",
    details: "تفاصيل الطبق",
    quantity: "الكمية",
    close: "إغلاق",
    whatsappInquiryMessage: "مرحباً، أريد الاستفسار عن الطلبات والعروض.",
    sectionTitles: {
      featuredDishes: "الأطباق المميزة",
      offers: "عروض اليوم",
      testimonials: "ماذا يقول عملاؤنا؟",
      actionGrid: "كل ما تحتاجه في مكان واحد",
      gallery: "لمحة من أجوائنا",
      faq: "الأسئلة الشائعة",
    },
    booking: {
      title: "احجز طاولتك الآن",
      fullName: "الاسم الكامل",
      phone: "رقم الجوال",
      date: "التاريخ",
      time: "الوقت",
      guests: "عدد الأشخاص",
      submit: "احجز الآن",
      whatsappSubmit: "إرسال الحجز إلى واتساب",
      successTitle: "تم استلام طلب الحجز",
      successText: "سنتواصل معك قريباً لتأكيد الموعد والتفاصيل.",
    },
    menu: {
      title: "المنيو",
      view: "عرض",
      viewFull: "عرض المنيو كامل",
      fullTitle: "المنيو الكامل",
    },
    location: {
      title: "زورونا",
      whatsapp: "تواصل عبر واتساب",
      openMap: "فتح الموقع",
    },
    cart: {
      title: "سلة الطلبات",
      empty: "سلتك فارغة حالياً، أضف أطباقك المفضلة.",
      subtotal: "المجموع الفرعي",
      delivery: "رسوم التوصيل",
      total: "الإجمالي",
      checkoutWhatsapp: "إتمام الطلب عبر واتساب",
      customerLocationHint: "يرجى إرسال موقعك بعد فتح واتساب لإكمال الطلب.",
    },
    footer: {
      description: "قالب مطعم عربي فاخر يساعدك على عرض الأطباق والعروض واستقبال الطلبات والحجوزات بسرعة.",
      contactTitle: "معلومات التواصل",
      quickLinksTitle: "روابط سريعة",
      socialTitle: "تابعنا",
      privacy: "سياسة الخصوصية",
      terms: "الشروط والأحكام",
      copyrightPrefix: "© جميع الحقوق محفوظة",
      copyrightYear: "2025",
    },
    editableTemplateModal: {
      title: "كيف تعدل القالب؟",
      text: "كل محتوى الصفحة متصل بملف بيانات مركزي واحد، لذلك يمكنك تغيير المطعم بالكامل دون تعديل المكونات.",
      points: [
        "غيّر الاسم والشعار والألوان من restaurantConfig.ts.",
        "أضف أو احذف الأطباق والعروض من المصفوفات مباشرة.",
        "حدّث رقم واتساب وروابط السوشيال والموقع من نفس الملف.",
        "تحكّم في إظهار أو إخفاء الأقسام من settings.sections.",
      ],
    },
    toasts: {
      added: "تمت إضافة الطبق إلى السلة",
      removed: "تم حذف العنصر من السلة",
      bookingSuccess: "تم إرسال طلب الحجز بنجاح، سنتواصل معك قريباً.",
      completeFields: "يرجى إكمال الحقول المطلوبة.",
      cartEmpty: "السلة فارغة حالياً.",
    },
  },
};

export const defaultRestaurantConfig = restaurantConfig;
