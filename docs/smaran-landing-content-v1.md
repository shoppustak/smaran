# Smaran — Landing Page Content Script v1.0
### Re-staged for the actual reader: the independent urban purohit
*Structure preserved from the wireframe (hero / how-it-works / trust / pricing / footer). Copy is the deliverable here — Hindi is the primary text on the page, English is the toggle. All CTAs route to the same wa.me link (State 1 of the bot).*

---

## §0 — Staging corrections (why the previous script was mis-aimed)

**S1 — Language order was inverted.** Default language must be **Hindi (Devanagari), with EN as the toggle** — not the reverse. The reader is a 40–65-year-old Hindi/Sanskrit-register professional; an English-default page tells him "this is not for you" before the headline is read. Toggle top-right reads **EN** (what you switch *to*).

**S2 — QR needs a responsive rule, not a placement rule.** "QR always visible" is right for desktop and sabha projection, and useless on mobile — a man cannot scan his own screen. Rule: hero shows button + QR side-by-side at ≥768px; below that, button only. (The QR's real life is the printed flyer and the projected sabha slide — this page doubles as that slide.)

**S3 — The four rungs were in team vocabulary, not his.** REMEMBER / RECOVER / PROTECT / COLLECT are internal value-ladder names. "Recover" sounds like debt collection; "Collect" is mercantile — the one register this brand can never touch. Renamed below in his language, with the dakshina rung handled with dignity.

**S4 — Register throughout:** aap-form, respectful, zero startup-speak, zero exclamation marks. The page should read like it was written by someone who touches feet at the right moments.

**S5 — No fake proof, extended:** no testimonials or counters exist yet — the trust row carries positioning instead. When real purohits are live, their names (with permission, ward-level) replace nothing — they get added *above* the trust row.

**S6 — One conversion event.** Every CTA on the page is the same wa.me deep link with a pre-filled first message, so the tap lands inside the bot's onboarding wow (one family → one date → one card). The page's only job is that tap.

---

## §1 — HERO

**Wordmark:** स्मरण *(Smaran wordmark; Devanagari primary, Latin secondary)*
**Toggle (top-right):** EN ⇄ हिं

**Headline (HI, gradient emphasis on «याद»):**
# आपका बही खाता — अब खुद **याद** रखता है

**Headline (EN, gradient on "remembers"):**
# Your bahi khata — now it **remembers** for you

**Subline (HI):**
हर परिवार की तिथि, समय से पहले, WhatsApp पर — हमेशा आपके ही नाम से।

**Subline (EN):**
Every family's tithi, reminded ahead of time, on WhatsApp — always in your name.

**CTA button (solid violet):**
HI: **WhatsApp पर शुरू करें** · EN: **Start on WhatsApp**

**Microcopy under button:**
HI: कोई app नहीं। कोई form नहीं। सीधे आपके WhatsApp पर।
EN: No app. No forms. Straight on your WhatsApp.

**QR caption (≥768px only):**
HI: फ़ोन से scan करें
EN: Scan with your phone

**wa.me pre-filled message:** `नमस्ते स्मरण` *(so the bot's first reply can greet respectfully and start State 1)*

---

## §2 — HOW IT WORKS — «स्मरण आपके लिए क्या करता है»
*Section heading EN: "What Smaran does for you." Single-column stack, icon + label + one line. Lucide icons noted per item.*

**1. तिथि स्मरण** · *(EN label: Tithi reminders)* · icon: `bell-ring`
HI: हर परिवार की तिथि — श्राद्ध, कथा, जन्मदिन — पंचांग से मिलाकर, समय से पहले आपको याद दिला दी जाती है।
EN: Every family's dates — shraddh, katha, birthdays — matched to the panchang and brought to you ahead of time.

**2. पुनः सम्पर्क** · *(EN label: Reconnect)* · icon: `heart-handshake`
HI: जो यजमान चुप हो गए हैं, स्मरण आपको बताता है — और आपके नाम से आदरपूर्वक नमस्कार भेजने में सहायता करता है।
EN: Smaran notices the families who have gone quiet — and helps you send a respectful namaskar, in your name.

**3. मुहूर्त सुरक्षा** · *(EN label: Muhurat protection)* · icon: `shield-check`
HI: त्योहार के मौसम में एक ही मुहूर्त पर दो बुकिंग? स्मरण पहले ही सचेत कर देता है।
EN: Two bookings in the same muhurat at festival time? Smaran warns you before it happens.

**4. दक्षिणा, सम्मान सहित** · *(EN label: Dakshina, with dignity)* · icon: `indian-rupee`
HI: पूजा के उपरान्त परिवार को धन्यवाद-कार्ड जाता है — दक्षिणा सीधे आपके अपने UPI में। कोई कमीशन नहीं, कभी नहीं।
EN: After the ritual, the family receives a gratitude card — dakshina goes straight to your own UPI. No commission, ever.

---

## §3 — TRUST ROW — «हमारा वचन»
*(EN heading: "Our word." Three plain statements, list or 3-col row, no cards.)*

**1.**
HI: यह कोई marketplace नहीं है — आपके यजमान केवल आपके हैं, और केवल आपको ही देखते हैं।
EN: This is not a marketplace — your yajmans are yours alone, and they see only you.

**2.**
HI: दक्षिणा सीधे आपके UPI में — बीच में कोई नहीं।
EN: Dakshina goes straight to your UPI — no one in between.

**3.**
HI: आपका बही खाता आपकी विरासत है — हर परिवार, हर गोत्र, हर तिथि, अगली पीढ़ी के लिए वैसे ही सुरक्षित।
EN: Your bahi khata is your legacy — every family, every gotra, every tithi, kept intact for the next generation.

---

## §4 — PRICING — single card

**Framing line above the price (HI):**
एक लौटा हुआ यजमान — कई वर्षों के शुल्क के बराबर।
**(EN):** One returned yajman covers years of the fee.

**The card:**
HI: **₹1,101 / वर्ष**
आपके क्षेत्र के पहले १०० पुरोहितों के लिए — पहला वर्ष **₹501**
EN: **₹1,101 / year** · For the first 100 purohits of your area — first year **₹501**

**Included (3 short lines on card):**
HI: असीमित परिवार और तिथियाँ · WhatsApp पर सब कुछ · पहले आज़माएँ, फिर निर्णय लें
EN: Unlimited families and tithis · Everything on WhatsApp · Try first, decide later

**Card CTA:** same wa.me button — HI: **WhatsApp पर शुरू करें**

**Fallback line (small, beneath card, one line only):**
HI: मासिक ₹151 की सुविधा भी उपलब्ध है।
EN: A monthly plan at ₹151 is also available.

---

## §5 — FOOTER

**CTA (button only, no QR):** HI: **WhatsApp पर शुरू करें** · EN: **Start on WhatsApp**

**Succession line:**
HI: स्मरण — ताकि आपकी स्मृति, आपकी परम्परा बने।
EN: Smaran — so that your memory becomes your tradition.

**Privacy micro-line (DPDP-honest, one line):**
HI: आपके परिवारों की जानकारी केवल आपकी है — कभी बेची नहीं जाएगी, और माँगते ही हटा दी जाएगी।
EN: Your families' information is yours alone — never sold, and deleted the moment you ask.

**Bottom row:** © स्मरण · *(no social links, no newsletter — none exist; don't fake affordances)*

---

## §6 — Copy rules for anything added later
1. Hindi first, always; English is the translation, not the source.
2. Aap-form everywhere; no exclamation marks; no startup vocabulary (free, hack, boost, unlock).
3. The word "commission" appears only beside "नहीं / no."
4. Money language stays inside the dakshina register — gratitude, sammaan, seva; never "collect," "chase," or "payments due."
5. Nothing on the page may promise what the bot can't do in its first three minutes.
