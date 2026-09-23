
INSERT INTO public.cultural_categories (name, slug, description) VALUES
('Literature|இலக்கியம்','literature','Epics, devotional poetry, prose and modern Tamil writing.'),
('Classical Tamil|செம்மொழி தமிழ்','classical-tamil','Sangam corpus, Tolkappiyam grammar and classical poetics.'),
('Festivals|பண்டிகைகள்','festivals','Seasonal, agrarian and temple festival traditions.'),
('Traditions|பாரம்பரியம்','traditions','Rituals, family customs and community practices.'),
('Arts|கலைகள்','arts','Dance, music, folk performance and craft traditions.'),
('Architecture|கட்டிடக்கலை','architecture','Temple gopurams, mandapams and Dravidian construction.'),
('Food|உணவு மரபு','food','Regional cuisines, grains, and food in literature.'),
('History|வரலாறு','history','Dynasties, trade, inscriptions and historical geography.'),
('Cultural Practices|பண்பாட்டு வழக்கங்கள்','cultural-practices','Concepts, ethics and everyday cultural knowledge.')
ON CONFLICT DO NOTHING;

INSERT INTO public.cultural_items (category_id, title, description, query_text)
SELECT c.id, v.title, v.description, v.query_text
FROM public.cultural_categories c
JOIN (VALUES
 ('literature','Silappadhikaram','The earliest Tamil epic, on Kannagi and Kovalan.','சிலப்பதிகாரம் பற்றி சுருக்கமாக சொல்லுங்கள்'),
 ('literature','Kambaramayanam','Kamban''s Tamil retelling of the Ramayana.','கம்பராமாயணம் எப்படி அமைந்துள்ளது?'),
 ('literature','Bharathiyar','Modern nationalist and devotional Tamil poetry.','பாரதியார் கவிதைகளின் சிறப்பு என்ன?'),
 ('literature','Modern prose','Novels, short stories and essays in modern Tamil.','நவீன தமிழ் உரைநடையின் வளர்ச்சி'),
 ('classical-tamil','Tolkappiyam','The oldest extant Tamil grammar and poetics.','தொல்காப்பியம் என்ன கூறுகிறது?'),
 ('classical-tamil','Ettuthokai','The Eight Anthologies of Sangam poetry.','எட்டுத்தொகை நூல்கள் யாவை?'),
 ('classical-tamil','Pathupattu','The Ten Idylls of the Sangam corpus.','பத்துப்பாட்டு நூல்கள் பற்றி விளக்குங்கள்'),
 ('classical-tamil','Agam & Puram','Inner (love) and outer (public life) poetic domains.','சங்க இலக்கியத்தில் அகம் மற்றும் புறம் என்றால் என்ன?'),
 ('festivals','Pongal','The Tamil harvest thanksgiving festival.','பொங்கல் பண்டிகையின் வரலாறு என்ன?'),
 ('festivals','Thai Poosam','Temple festival of Thai month, Murugan worship.','தைப்பூசம் எவ்வாறு கொண்டாடப்படுகிறது?'),
 ('festivals','Chithirai','Chithirai festival and the Madurai tradition.','சித்திரைத் திருவிழா பற்றி சொல்லுங்கள்'),
 ('festivals','Karthigai Deepam','The festival of lamps in Karthigai month.','கார்த்திகை தீபம் ஏன் கொண்டாடப்படுகிறது?'),
 ('traditions','Kolam','Threshold floor drawings and their geometry.','கோலம் போடும் மரபின் பொருள் என்ன?'),
 ('traditions','Seer varisai','Ceremonial gift exchange in Tamil weddings.','சீர் வரிசை மரபு எப்படி நடைபெறுகிறது?'),
 ('traditions','Naming customs','Traditional Tamil naming and lineage practice.','தமிழ் பெயரிடும் மரபுகள் யாவை?'),
 ('traditions','Village deities','Guardian deities and folk worship.','கிராம தெய்வ வழிபாடு பற்றி விளக்குங்கள்'),
 ('arts','Bharatanatyam','Classical Tamil dance and its repertoire.','பரதநாட்டியத்தின் வரலாறு என்ன?'),
 ('arts','Parai','The parai drum and its social history.','பறை இசையின் பண்பாட்டு முக்கியத்துவம்'),
 ('arts','Therukoothu','Village street theatre traditions.','தெருக்கூத்து கலை பற்றி சொல்லுங்கள்'),
 ('arts','Tanjore painting','Gold-leaf devotional painting from Thanjavur.','தஞ்சாவூர் ஓவியக் கலையின் சிறப்பு'),
 ('architecture','Gopuram','Monumental temple gateway towers.','கோபுரக் கட்டுமானம் எவ்வாறு அமைகிறது?'),
 ('architecture','Chola temples','Great Living Chola Temples and their design.','சோழர் கோவில் கட்டிடக்கலையின் சிறப்பு என்ன?'),
 ('architecture','Mamallapuram','Pallava rock-cut monuments at Mahabalipuram.','மாமல்லபுரம் சிற்பங்கள் பற்றி விளக்குங்கள்'),
 ('architecture','Stone sculpture','Iconography and stone-carving traditions.','தமிழ் கல் சிற்பக் கலையின் வரலாறு'),
 ('food','Chettinad','Chettinad cuisine and spice traditions.','செட்டிநாடு உணவு மரபின் தனித்தன்மை'),
 ('food','Millets','Traditional millets in Tamil food culture.','தமிழர் உணவில் சிறுதானியங்களின் இடம்'),
 ('food','Temple prasadam','Food offerings and temple kitchens.','கோவில் பிரசாதம் தயாரிக்கும் மரபு'),
 ('food','Festival sweets','Sweets tied to Tamil festival calendars.','பண்டிகை இனிப்பு வகைகள் யாவை?'),
 ('history','Cholas','Chola state, temples, bronzes and navy.','சோழர் வரலாற்றின் முக்கிய நிகழ்வுகள்'),
 ('history','Pandyas','Pandya kingdom, Madurai and pearl trade.','பாண்டியர் வரலாறு பற்றி சொல்லுங்கள்'),
 ('history','Pallavas','Pallava art, architecture and Kanchipuram.','பல்லவர் காலக் கலை வளர்ச்சி'),
 ('history','Maritime trade','Ancient Tamil sea trade and ports.','பழந்தமிழர் கடல் வாணிபம் எவ்வாறு இருந்தது?'),
 ('cultural-practices','Aram','The Tamil ethical concept of righteousness.','திருக்குறளில் அறத்துப்பால் என்பது என்ன?'),
 ('cultural-practices','Thinai concepts','Landscape-based poetic and cultural classification.','திணை என்ற கருத்து என்ன?'),
 ('cultural-practices','Folk medicine','Siddha and household healing traditions.','தமிழ் நாட்டு மரபு மருத்துவம் பற்றி விளக்குங்கள்'),
 ('cultural-practices','Proverbs','Tamil proverbs and everyday wisdom.','தமிழ் பழமொழிகளின் பண்பாட்டு பொருள்')
) AS v(slug, title, description, query_text) ON v.slug = c.slug
ON CONFLICT DO NOTHING;

INSERT INTO public.knowledge_sources (title, source_type, author, publisher, url, language, description, credibility_level, status) VALUES
('Tirukkuṟaḷ — complete Tamil e-text','ebook','Thiruvalluvar','Project Madurai','https://www.projectmadurai.org/pmworks.html','ta','Public-domain Tamil e-text edition of the Tirukkuṟaḷ with commentary.','trusted','active'),
('Tamil Virtual Academy digital library','webpage',NULL,'Tamil Virtual Academy','https://www.tamilvu.org/','ta','Government-run digital library of Tamil literature, grammar and reference works.','trusted','active'),
('Sangam literature: Ettuthokai anthologies','book',NULL,'Tamil Virtual Academy','https://www.tamilvu.org/library/libindex.htm','ta','The Eight Anthologies of classical Sangam poetry with commentary.','trusted','active'),
('Tolkappiyam — Tamil grammar and poetics','book','Tolkappiyar','Project Madurai','https://www.projectmadurai.org/pm_etexts/utf8/pmuni0100.html','ta','Oldest surviving Tamil grammar, covering phonology, morphology and poetics.','trusted','active'),
('Silappadhikaram e-text','ebook','Ilango Adigal','Project Madurai','https://www.projectmadurai.org/pm_etexts/utf8/pmuni0007.html','ta','Full Tamil text of the epic Silappadhikaram.','trusted','active'),
('Digitised Tamil manuscripts and printed books','digital_archive',NULL,'Internet Archive','https://archive.org/details/tamil','mixed','Scanned palm-leaf manuscripts and early printed Tamil books, quality varies.','unknown','active'),
('Great Living Chola Temples','webpage',NULL,'UNESCO World Heritage Centre','https://whc.unesco.org/en/list/250/','en','Official documentation of the Chola temples at Thanjavur, Gangaikondacholapuram and Darasuram.','trusted','active'),
('Group of Monuments at Mahabalipuram','webpage',NULL,'UNESCO World Heritage Centre','https://whc.unesco.org/en/list/249/','en','Official documentation of the Pallava rock-cut monuments at Mamallapuram.','trusted','active')
ON CONFLICT DO NOTHING;
