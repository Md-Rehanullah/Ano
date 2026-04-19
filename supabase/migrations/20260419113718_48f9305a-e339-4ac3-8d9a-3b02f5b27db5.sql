-- 1) Remove old seed posts
DELETE FROM public.posts WHERE is_seed = true;

-- 2) Insert ~60 fresh seed posts
INSERT INTO public.posts (title, description, category, is_seed, seed_author_name, image_url, likes, views, created_at) VALUES

-- ===== SHORT posts (with deliberate typos to feel real) =====
('Best way to memorise formulas?','Honestly flashcards + spaced repition works wonders. Anki is goat. What works for you guys?','Education',true,'Rahul Sharma',NULL,12,84,now() - interval '2 hours'),
('Pomodoro is overrated tbh','I tried 25/5 for a month, broke my flow constantly. 50/10 hit better for me. anyone else feel same?','Education',true,'Priya Verma',NULL,8,62,now() - interval '5 hours'),
('Chai > Coffee for late night study','fight me 😤','Lifestyle',true,'Aarav Mehta',NULL,34,201,now() - interval '8 hours'),
('JEE Main result out','All the best to evryone who appeared. Result link is on nta site. Dont stress over rank too much.','Education',true,'Ananya Iyer',NULL,22,140,now() - interval '12 hours'),
('Quick tip: revise within 24hrs','Whatever you study today, revise it tomorrow morning even for 10 min. Retention literaly doubles.','Education',true,'Vikram Singh',NULL,45,310,now() - interval '1 day'),
('Iran-Israel ceasefire holding?','Latest reports say its still fragile but no major escalation in last 48 hrs. Praying for civilians.','General',true,'Karthik Nair',NULL,18,156,now() - interval '1 day 3 hours'),
('Cricket > Football','don''t @ me','Lifestyle',true,'Rohan Gupta',NULL,52,289,now() - interval '1 day 5 hours'),
('Best laptop under 60k for coding?','Need somthing for college, mostly web dev and some ML. Macbook air m1 worth it or go for thinkpad?','Technology',true,'Ishaan Reddy',NULL,15,98,now() - interval '2 days'),
('UPSC Mains tomorrow','Friends pls share your prep tips for last day. Should i revise or just relax?','Education',true,'Sneha Patel',NULL,28,167,now() - interval '2 days 4 hours'),
('Whatsapp down again??','anyone else getting message not delivred?','Technology',true,'Manish Joshi',NULL,11,76,now() - interval '2 days 8 hours'),

-- ===== MEDIUM posts =====
('Notes on Newton''s Laws (Class 11 Physics)','Quick recap for anyone revising:

1. First Law (Inertia): An object at rest stays at rest unless a force acts on it. Mass is a measure of inertia.
2. Second Law: F = ma. Force is the rate of change of momentum.
3. Third Law: For every action there is an equal and opposite reaction.

Common mistake students make - they confuse mass and weight. Mass is constant, weight changes with g. Also remember Newton''s laws are valid only in inertial frames of reference.

If u want PDF notes drop a comment, ill share my handwritten ones.','Education',true,'Priya Verma','https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800',67,420,now() - interval '3 days'),

('Active Recall + Spaced Repetition = Topper combo','I scored 96% in boards using only these two techniques. Heres what i did:

Active recall means closing the book and trying to recall everything. Don''t just re-read - that feels productive but its not. Test yourself constantly.

Spaced repetition means reviewing at increasing intervals. Day 1, Day 3, Day 7, Day 14, Day 30. I used Anki for this.

Combine both. Make Anki cards from your active recall sessions. The cards you fail = topics you actually need to study. The cards you pass = waste of time to re-read.

Took me 2 months to trust this method but once it clicks ur done.','Education',true,'Ananya Iyer',NULL,134,890,now() - interval '3 days 6 hours'),

('Russia-Ukraine war update','Latest from Reuters: heavy fighting continues in Donetsk region. Drone attacks reported on both sides over the weekend. Western support packages from US and EU getting delayed due to political deadlock.

Civillian casualities have crossed 11,000 according to UN figures, though actual number is likely higher. Winter is going to be brutal - power infrastructure already 60% damaged in eastern Ukraine.

Indian govt continues neutral stance, mainly focused on cheap russian oil imports. Whats your take on india''s position?','General',true,'Karthik Nair',NULL,89,567,now() - interval '4 days'),

('Free study resources I wish i knew earlier','Sharing my list:

- NPTEL: free engineering courses from IITs
- MIT OpenCourseWare: literally free MIT lectures
- Khan Academy: best for fundamentals
- 3Blue1Brown: math will finally make sense
- Crash Course on YouTube: history, science, lit
- Library Genesis: ahem... books
- Coursera financial aid: 90% of courses are free if u apply
- freeCodeCamp: full dev curriculum

Bookmark this post and thank me later. Also drop ur recommendations below 👇','Education',true,'Vikram Singh','https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800',256,1840,now() - interval '4 days 8 hours'),

('Why is my code not working','Spent 4 hrs debugging. Issue was a missing semicolon. I want to cry.

Senior devs tell me - does this ever stop? Or is this just life now?','Technology',true,'Ishaan Reddy',NULL,78,456,now() - interval '5 days'),

('Iran nuclear deal talks resume in Vienna','After months of stalled negotiations, the JCPOA talks resumed last week. Key sticking points remain - Iran wants full sanctions relief while US wants verifiable nuclear restrictions.

Israel obviously not happy and has hinted at unilateral action if deal goes through. Saudi-Iran rapprochement (mediated by China) has changed the regional dynamic significantly.

For Indians this matters because oil prices will swing based on outcome. Already Brent is at $89. If deal collapses we might see $100+.

What do you think - will biden push it through before elections?','General',true,'Karthik Nair',NULL,45,312,now() - interval '5 days 4 hours'),

('Mom''s home food vs hostel mess','no contest. mum wins always. even her boring daal feels gourmet after 3 months of mess sambar.

who else is counting days till semester break?','Lifestyle',true,'Rohan Gupta',NULL,189,1240,now() - interval '5 days 8 hours'),

-- ===== LONG posts =====
('Complete guide to Organic Chemistry for NEET 2025','Bhai log, organic is scoring if you do it right. Heres my full strategy that got me 680/720 in NEET:

**Phase 1: GOC (General Organic Chemistry) - 2 weeks**
This is the foundation. If GOC is weak everything collapses. Focus on:
- Inductive effect, mesomeric effect, hyperconjugation
- Stability of carbocations, carbanions, free radicals
- Acidic and basic strength comparison
- Aromaticity and Huckel''s rule

Don''t move forward till you can do any GOC question in under 30 sec.

**Phase 2: Named Reactions (Memorise + Mechanism) - 3 weeks**
Make a separate notebook. Write reaction, conditions, mechanism, and a sample problem for each:
- Aldol, Cannizaro, Perkin
- Friedel Crafts (alkylation + acylation)
- Wurtz, Reimer Tiemann, Kolbe
- Williamson ether synthesis
- Hoffmann bromamide, Gabriel phthalimide
- Sandmeyer, Gattermann

NCERT ke har named reaction ka mechanism likho. PYQ se cross check.

**Phase 3: Conversion problems - 2 weeks**
This is where toppers separate from average. Practice 20 conversions daily. NCERT exemplar + MS Chouhan is enough. Don''t touch Himanshu Pandey unless you''re aiming AIR.

**Phase 4: Biomolecules + Polymers + Daily life chem**
Easy chapters. 1 week is enough. Just NCERT line by line.

**Common mistakes**
- Skipping mechanisms - dont do this
- Doing only MCQs without theory
- Ignoring NCERT in-text questions
- Not revising named reactions weekly

DM me if you need my notes pdf. Will share for free. Also ill make a separate post for inorganic strategy soon.','Education',true,'Sneha Patel','https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800',412,2890,now() - interval '6 days'),

('How I cracked Google interview as a tier-3 college student','Long post incoming, get chai ready ☕

Background: I''m from a tier-3 college in UP. CGPA 7.8. No prior internships at FAANG. Got Google offer as SWE-II in Bangalore. Heres exactly what i did over 14 months.

**Month 1-3: Foundation**
Started with Striver''s SDE sheet. 180 questions. Did them religiously - 2 questions daily. Wrote solutions in notebook BEFORE coding. This forces you to think first instead of jumping to keyboard.

Also did "Cracking the Coding Interview" book. Ignored chapters on system design at this stage.

**Month 4-6: Patterns**
This was the breakthrough. I realised most problems are just patterns. I made a sheet of 18 patterns:
- Two pointer, sliding window, fast-slow pointer
- Modified binary search, top-K elements
- Tree BFS/DFS, graph BFS/DFS
- Backtracking, dynamic programming (1D, 2D, knapsack)
- Greedy, intervals, prefix sum
- Trie, union find, monotonic stack
- Bit manipulation

For each pattern I solved 10-15 problems till I could identify the pattern within 30 sec of reading any new problem.

**Month 7-9: Leetcode grind**
Did 400 problems on Leetcode. Mostly mediums (300+), some hards (50). Easy I skipped after first 50.

Time targets:
- Easy: 10 min
- Medium: 25 min
- Hard: 45 min

If I couldnt solve in time, I read editorial, understood, then re-solved next day from scratch.

**Month 10-12: System design + behavioral**
For SDE-II you need basic system design. Did "System Design Primer" on github + Alex Xu''s book. Made my own templates for designing common systems (URL shortener, twitter feed, chat app, parking lot).

Behavioral: prepared 8 STAR stories covering leadership, conflict, failure, ambiguity. Practiced with friends on zoom.

**Month 13: Apply**
Cold emailed 40+ Google recruiters on LinkedIn with my story. Got 3 responses, 1 referral. Application went through.

**Month 14: Interviews**
- Phone screen: 1 medium DSA (sliding window). Cleared.
- Onsite (virtual): 4 rounds
  - DSA round 1: Graph problem, BFS variant. Solved with optimal complexity.
  - DSA round 2: DP problem, did with memoization, then optimized to bottom-up.
  - System design: Designed instagram feed. Discussed scaling, caching, sharding.
  - Behavioral/Googliness: STAR stories, asked about handling disagreement.

Got the call in 8 days. Highest base salary anyone in my college history has gotten.

**Things i wish someone told me:**
1. College tier doesnt matter as much as you think
2. CP is overrated for SWE roles, focus on patterns
3. Mock interviews are non-negotiable - did 20+ on pramp
4. Communicate while coding - silence is the killer
5. Always start with brute force, then optimize

Happy to answer specific questions. Also planning to make a youtube channel to help juniors. Drop subs if interested.','Technology',true,'Aarav Mehta','https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800',892,5670,now() - interval '6 days 6 hours'),

-- ===== VERY LONG post =====
('The complete history of Israel-Palestine conflict explained for Indians','I''ve seen so much misinformation on Indian whatsapp groups about this conflict. Let me try to give a balanced timeline. This will be long but please read fully before forming opinion.

**Pre-1948: Ottoman + British era**
Palestine was part of the Ottoman Empire for 400+ years. Both Jewish and Arab Muslim populations lived there, mostly peacefully. Jewish population was around 6% in 1900.

In late 1800s, Zionism emerged as a movement among European Jews who faced severe persecution (pogroms in Russia, antisemitism across Europe). They wanted a homeland and Palestine was chosen for biblical/historical reasons.

After WW1, Britain took control of Palestine via League of Nations mandate. Balfour Declaration of 1917 promised "a national home for Jewish people" in Palestine - this is where things start getting messy because Britain also promised arabs independence in exchange for fighting Ottomans.

Jewish immigration accelerated, especially after Hitler came to power in 1930s. By 1947 Jewish pop was 33%.

**1947-48: Partition and First War**
UN voted to partition Palestine into Jewish and Arab states. Jews got 56% land despite being 33% population - this is the core arab grievance. Jews accepted, Arabs rejected.

Israel declared independence on May 14, 1948. Next day, 5 arab nations (Egypt, Jordan, Syria, Lebanon, Iraq) attacked. Israel won. 700,000 Palestinians displaced - this is called "Nakba" (catastrophe). Many fled to Jordan, Lebanon, Gaza, West Bank.

**1948-1967: Cold war + tension**
Israel built itself into modern state with western support. Palestinians lived as refugees. PLO (Palestine Liberation Organization) formed in 1964 by Yasser Arafat to fight for palestinian state.

**1967: Six Day War (game changer)**
Israel launched preemptive strike against Egypt, Jordan, Syria. In 6 days, captured:
- Sinai (from Egypt) - returned in 1979 peace treaty
- West Bank + East Jerusalem (from Jordan) - still occupied
- Gaza Strip (from Egypt) - withdrew in 2005
- Golan Heights (from Syria) - still occupied

This is when modern occupation began. Settlements started in West Bank.

**1973: Yom Kippur War**
Egypt + Syria attacked on Jewish holy day. Israel won again but barely. Led to Camp David Accords 1978, Egypt-Israel peace 1979.

**1987: First Intifada**
Palestinian uprising in occupied territories. Mass protests, stone throwing, strikes. Lasted till 1993. Led to Oslo Accords.

**1993: Oslo Accords - the lost peace**
Arafat and Rabin signed historic peace deal. Created Palestinian Authority for limited self-rule in West Bank + Gaza. Goal was full Palestinian state by 1999.

It all collapsed because:
- Rabin was assassinated by Israeli extremist in 1995
- Hardliners on both sides sabotaged talks
- Settlement expansion continued
- 2nd Intifada broke out in 2000

**2005: Gaza disengagement**
Israel withdrew all settlers from Gaza. Hamas (Islamist group) won 2006 elections, took full control by 2007 after fighting Fatah. Israel + Egypt imposed blockade.

**2008-2023: Cycle of violence**
Multiple Gaza wars - 2008-09, 2012, 2014, 2021. Each time hundreds-thousands of Palestinian civillians died, Israeli civillians died from Hamas rockets. West Bank settlements kept expanding.

Trump moved US embassy to Jerusalem in 2018 - hugely controversial.
Abraham Accords 2020 - UAE, Bahrain, Morocco normalized with Israel without Palestinian state. Saudi was about to join...

**Oct 7, 2023: The day everything changed**
Hamas launched massive attack on Israel. 1200+ Israelis killed, 250+ taken hostage. Worst attack on Jewish people since holocaust.

Israel responded with full scale war on Gaza. As of now, 40,000+ Palestinians killed (per Gaza health ministry, mostly women and children), Gaza largely destroyed, humanitarian catastrophe.

War expanded to Lebanon (Hezbollah), Yemen (Houthis), and direct Israel-Iran exchanges in 2024.

**Where India stands**
Historically India supported Palestine (Nehru, Gandhi era). Recognized Israel only in 1992. Modi era has dramatically shifted India closer to Israel - defense, agriculture, tech cooperation. But India still officially supports two-state solution and votes for Palestinian humanitarian resolutions.

**My personal take**
Both sides have legitimate grievances. Israelis fear annihilation (history justifies this fear). Palestinians have lived under occupation for 75 years with no state. The land is sacred to 3 religions.

Solutions tried:
- Two state - keeps failing due to settlement expansion + extremists on both sides
- One state - demographic problem for Israel as Jewish state
- Status quo - leads to perpetual war

There is no simple answer. Anyone telling you "just do X" is lying or naive.

What we as Indians can do: read multiple sources, avoid spreading whatsapp forwards, donate to credible humanitarian orgs, and pressure our government to push for ceasefire and humanitarian access.

If you read till here, thank you. Disagree? Comment respectfully. Spread misinformation in comments and i''ll mute.','General',true,'Karthik Nair','https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=800',1456,8920,now() - interval '7 days'),

-- ===== more variety =====
('Maths short trick: Squares of numbers ending in 5','Any number ending in 5, square it like this:
75² = (7×8) followed by 25 = 5625
85² = (8×9) followed by 25 = 7225
105² = (10×11) followed by 25 = 11025

Just multiply ten''s digit by next number and append 25. Works always. Useful for SSC, banking, CAT.','Education',true,'Manish Joshi',NULL,234,1567,now() - interval '7 days 6 hours'),

('Why is petrol so expensive in india?','Crude is at 80$ but petrol still 105rs. Why? Because central + state taxes are 50%+ of retail price. Even when crude crashes govt just increases excise duty. Its a cash cow they can''t give up.','General',true,'Vikram Singh',NULL,167,890,now() - interval '8 days'),

('Best apps for productivity 2025','My phone home screen has only these:
- Notion (notes + planning)
- Forest (focus timer)
- Anki (spaced repetition)
- Habitica (habits as RPG)
- Headspace (meditation)
- Goodreads (reading log)

Deleted instagram and youtube from phone, only on laptop. Productivity went up 3x easily.','Lifestyle',true,'Sneha Patel',NULL,98,623,now() - interval '8 days 6 hours'),

('Open AI just dropped GPT-5','Has anyone tried it? Apparently context window is 1M tokens now and reasoning is crazy good. My coding tests show it''s solving leetcode hards i couldn''t solve.

Are we close to AGI or just better autocomplete?','Technology',true,'Aarav Mehta',NULL,345,2340,now() - interval '9 days'),

('Bharat me caste system kab khatm hoga?','Genuine question. Even in 2025 mein matrimony sites pe caste filter hai. College mein groups caste ke basis pe banti hai. When does it actually end?','General',true,'Rohan Gupta',NULL,89,567,now() - interval '9 days 6 hours'),

('Quantum Physics for beginners - my notes','Started learning quantum mech for fun. Sharing what i understood:

**Wave-particle duality**: Light + matter both behave as waves AND particles depending on how u observe. Double slit experiment proves this - electrons make interference pattern but if u observe which slit they go through, pattern disappears. Mind blown.

**Heisenberg uncertainty**: You can''t know position AND momentum of a particle exactly. The more precise one, the less precise other. Not a measurement limit - it''s how reality works at quantum scale.

**Superposition**: A quantum particle exists in all possible states simultaneously until measured. Schrodinger''s cat is alive AND dead till u open the box.

**Entanglement**: Two particles can be linked such that measuring one instantly affects other, even across galaxies. Einstein called it "spooky action at a distance".

If u want to go deeper - watch PBS Spacetime on youtube. Best free resource.','Education',true,'Ananya Iyer','https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800',456,2890,now() - interval '10 days'),

('Bangalore traffic is killing me','2 hour commute one way. WFH has spoilt me, going back to office feels like punishment. How do you guys cope?','Lifestyle',true,'Ishaan Reddy',NULL,234,1234,now() - interval '10 days 6 hours'),

('Climate report 2024: We are cooked','Latest IPCC report says we''ll cross 1.5C limit by 2030. Heatwaves, floods, crop failures will be norm. India + south asia will be hit hardest.

What r u doing personally to reduce footprint? I''ve cut down on meat + fast fashion. Started cycling to college.','General',true,'Karthik Nair',NULL,178,1023,now() - interval '11 days'),

('Anki deck for NEET Biology - free','Made an Anki deck with 4500 cards covering full NCERT bio. Took me 6 months. Sharing free for next batch.

Drop email in comments and i''ll send link. Already shared with 200+ students, all positive feedback.','Education',true,'Sneha Patel',NULL,567,3450,now() - interval '11 days 6 hours'),

('Indian railways app finally usable','IRCTC redesigned their app. Booking actually works first try now! Previous versions wud crash 5 times before tatkal opens. Modi sarkar 1, my anxiety 0.','Technology',true,'Manish Joshi',NULL,123,789,now() - interval '12 days'),

('How to read 50 books a year','Sounds impossible but its just 1 book a week.

Tips:
1. Always carry kindle. Read in metro, lunch, before bed.
2. Audio books while walking/gym
3. DNF books u don''t enjoy. life''s too short.
4. Mix genres - alternate fiction + non-fiction
5. Join goodreads challenge for accountability
6. Read 30 min before sleep instead of scrolling

Did 67 books last year. Currently on 23 for 2025.','Lifestyle',true,'Priya Verma',NULL,289,1670,now() - interval '12 days 6 hours'),

('NEET 2025 paper analysis','Physics: moderate, lots of mechanics + modern physics
Chemistry: easier than last year, organic dominated
Biology: surprisingly tough botany section, zoology was straightforward

Expected cutoff for govt mbbs: 680+
For private: 600+

What was ur experience?','Education',true,'Ananya Iyer',NULL,345,2100,now() - interval '13 days'),

('Trump won. Now what for India?','US elections done. Trump back in white house. What does this mean for india?

Trade: more tariffs likely on indian exports
Immigration: H1B will get harder
Defense: probably more sales to india
Russia: trump might broker ukraine deal which helps india
China: hardline against china = good for india

Overall mixed bag. We''ll need to navigate carefully.','General',true,'Vikram Singh',NULL,234,1456,now() - interval '13 days 6 hours'),

('My 6 month transformation - 95kg to 75kg','Did it without gym. Just walking 10k steps + intermittent fasting (16:8) + home cooked food only.

No supplements. No expensive trainer. Just consistency.

Now my BMI is normal first time in 5 years. Knees don''t hurt. Sleep is amazing. Energy is 10x.

If a lazy software engineer like me can do it, anyone can. Drop questions in comments.','Lifestyle',true,'Aarav Mehta','https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',678,4230,now() - interval '14 days'),

('SQL window functions explained simply','Most underrated SQL feature. Once u get window functions, u stop writing 5 nested subqueries.

Basic syntax:
SELECT col, AGG_FUNC() OVER (PARTITION BY x ORDER BY y) FROM table

Common functions:
- ROW_NUMBER(): 1,2,3 for each row
- RANK(): handles ties (1,1,3)
- DENSE_RANK(): handles ties without gap (1,1,2)
- LAG/LEAD: previous/next row value
- SUM/AVG OVER: running totals

Use case: top N per group, running totals, period over period comparisons.

Practice on stratascratch or leetcode db section.','Technology',true,'Ishaan Reddy',NULL,189,987,now() - interval '14 days 6 hours'),

('Indian web series recommendations','Just finished Panchayat S3. So good.

My all time top 5:
1. Panchayat (TVF/Prime)
2. Scam 1992 (Sony Liv)
3. The Family Man (Prime)
4. Kota Factory (Netflix/TVF)
5. Aspirants (TVF)

What''s on ur list?','Lifestyle',true,'Rohan Gupta',NULL,456,2890,now() - interval '15 days'),

('CBSE class 10 sample paper analysis','New sample papers out. Key changes:

Maths: more case based questions (3 instead of 2). Statistics chapter weightage reduced.
Science: assertion-reason questions increased to 4. Mostly bio + chem.
SST: source based questions are tricky now. Map work simplified.
English: writing skills changed format - notice + letter dropped, only essay.

Start solving from now. Don''t leave for last month.','Education',true,'Manish Joshi',NULL,167,1234,now() - interval '15 days 6 hours'),

('AI replacing developers??','Every junior i mentor asks this. Honest answer: AI replaces tasks not jobs.

Boilerplate code, basic CRUD, debugging - AI does in seconds. So if ur job is just that, yes ur in trouble.

But system design, business logic, debugging in production, code review, architecture decisions, team collaboration - AI is no where close.

Adapt or die. Learn to work WITH AI not against it. Use copilot, learn prompt engineering, focus on higher level skills.','Technology',true,'Aarav Mehta',NULL,567,3450,now() - interval '16 days'),

('Cooking aloo paratha for hostel friends','First time cook attempt. Burned 2, dropped 1. But the 5 i made were edible. Friends are the best - they ate everything pretending its great.

Learning to cook in your 20s is essential life skill. Don''t depend on swiggy forever.','Lifestyle',true,'Priya Verma','https://images.unsplash.com/photo-1626776876729-bab4369a5a5a?w=800',289,1670,now() - interval '16 days 6 hours'),

('GATE 2026 preparation strategy','Starting early is the key. Heres my plan:

Sept-Dec: Cover all subjects from standard books. No problems yet, just concept building.
Jan-March: Subject wise problems. NPTEL + previous year topic wise.
April-June: Full PYQ practice. Last 20 years.
July-Oct: Mock tests. 1 per week minimum.
Nov-Dec: Revision + weak areas.

Books for CS:
- DBMS: Korth
- OS: Galvin
- CN: Forouzan / Tanenbaum
- TOC: Hopcroft / Ullman
- Algo: CLRS
- DS: Narasimha Karumanchi

GO classes course is gold standard. Worth the money if u can afford.','Education',true,'Vikram Singh',NULL,345,2100,now() - interval '17 days'),

('Indian startup ecosystem update','Funding winter ending? Q1 2025 saw 40% YoY increase. AI startups getting most attention obvviously.

But layoffs continue. Byjus, Unacademy still struggling. Edtech bubble has burst.

D2C is hot - Mamaearth IPO success has opened doors. Quick commerce (Zepto, Blinkit, Instamart) is profitable finally.

Where would u start a company today?','Technology',true,'Ishaan Reddy',NULL,178,1100,now() - interval '17 days 6 hours'),

('Best biryani in india debate','Hyderabadi - rich, authentic, nawabi feel
Lucknowi - subtle, aromatic, melt in mouth
Kolkata - has potato, controversial but delicious
Ambur - fragrant, less spicy, perfect rice
Thalassery - kerala style, short grain rice

Honestly all are amazing. Pineapple biryani is the only crime.','Lifestyle',true,'Rohan Gupta',NULL,789,4560,now() - interval '18 days'),

('JEE Advanced 2025 cut off prediction','Based on paper difficulty + last 5 years trend:

General: 95-105 (out of 360)
OBC: 85-95
SC/ST: 50-60

For top 100 IITs: 250+
For CSE in top IITs: 280+
For old IITs any branch: 200+

These are ESTIMATES. Wait for official.','Education',true,'Ananya Iyer',NULL,234,1567,now() - interval '18 days 6 hours'),

('Mental health awareness for indian students','We need to talk about this more. Indian society treats depression like character flaw. "Bhagwan ka naam lo, theek ho jaayega" doesn''t cure clinical depression.

Signs to watch:
- Persistent sadness 2+ weeks
- Loss of interest in everything
- Sleep changes
- Appetite changes
- Suicidal thoughts

Resources:
- iCall: 9152987821 (free counseling)
- Vandrevala Foundation: 1860-2662-345
- AASRA: 9820466726

Therapy is normal. Medication if prescribed is normal. You''re not weak. Reach out.','General',true,'Sneha Patel',NULL,892,5670,now() - interval '19 days'),

('Quick chemistry trick: PT pattern','Periodic table has patterns - learn these instead of mugging:

Group 1: alkali metals - 1 valence electron, super reactive
Group 2: alkaline earth - 2 valence electrons
Group 17: halogens - 7 valence electrons
Group 18: noble gases - full octet

Period: same number of shells
Down a group: atomic size increases, ionization energy decreases
Across a period: atomic size decreases, IE increases

Once these are clear, half of inorganic chem makes sense.','Education',true,'Manish Joshi',NULL,167,890,now() - interval '19 days 6 hours'),

('Stock market crashed today','5% red across sectors. Nifty below 21k.

Reasons being given: FII selling, china stimulus, election uncertainty.

Sip people: keep buying. don''t time market.
Lump sum people: deploy slowly.
Traders: sl already hit i bet.

Long term india story intact. This is opportunity not catastrophe.','General',true,'Vikram Singh',NULL,156,890,now() - interval '20 days'),

('Hostel life vs PG vs apartment','Hostel: cheapest, mess food, least privacy, best friendships
PG: middle ground, decent food, some privacy, mixed crowd
Apartment: most expensive, cook urself, full privacy, lonely

Did all 3 in last 5 yrs. Hostel was most fun, apartment is best for productivity.

What''s ur situation?','Lifestyle',true,'Priya Verma',NULL,234,1450,now() - interval '20 days 6 hours'),

('React vs Vue vs Svelte 2025','Built same project in all 3 last month. Honest review:

React: most jobs, biggest ecosystem, hooks took time. Use for big production apps.
Vue: cleanest syntax, easy learning curve, great docs. Use for medium projects.
Svelte: fastest, no virtual DOM, smallest bundle. Future is bright.

For freshers: learn react. Job market demands it.
For side projects: try svelte.','Technology',true,'Aarav Mehta',NULL,345,1890,now() - interval '21 days'),

('My grandma''s wisdom hit different','Spent week with dadi in village. Things she said:

"Beta phone se bahar dekho, asli duniya yahan hai"
"Khushi cheezon mein nahi rishton mein hai"
"Jitna kamao utna mat kharch karo, bachat seekho"
"Apne maa baap ko time do, paisa nahi"

Simple but profound. We complicate everything in cities.','Lifestyle',true,'Rohan Gupta',NULL,567,3450,now() - interval '21 days 6 hours'),

('UPI transactions cross 15B in month','India did 15.8 billion UPI transactions in march 2025. 
Worth 22 lakh crore rupees.

For comparison: USA does ~3 billion card transactions monthly.

We are leading the world in digital payments. Even my chaiwala has scanner. Imagine telling 2015 self this.','Technology',true,'Ishaan Reddy',NULL,234,1340,now() - interval '22 days'),

('Best free movies on YouTube','Yes legally free. Bollywood goldmine on YouTube:

- Andaz Apna Apna
- Jaane Bhi Do Yaaro
- Jab We Met (some channels)
- Many old amitabh films
- Satyajit ray collection
- Most south dubbed films

Save your netflix money for new releases only.','Lifestyle',true,'Manish Joshi',NULL,189,1100,now() - interval '22 days 6 hours'),

('Group study or solo - whats better?','Did poll on my insta. Results:

Solo: 65%
Group: 25%
Mix: 10%

I personally do solo for new concepts (need focus) and group for revision/doubts (helps to teach others).

Whats ur preference?','Education',true,'Sneha Patel',NULL,178,1023,now() - interval '23 days'),

('GST council updates','Latest GST council meeting:
- Mobile phone GST reduced 18% to 12%
- Online gaming still 28%
- Health insurance might go from 18% to 5% (next meet)
- Crypto taxation unchanged

Mixed reactions from businesses. Compliance burden still high.','General',true,'Karthik Nair',NULL,123,723,now() - interval '23 days 6 hours'),

('Cracked TCS Ninja - mock interview tips','For freshers giving TCS soon:

Technical round:
- Basic dsa (1-2 questions, easy level)
- OOPs - definitely asked
- Project explanation - know every line of code
- DBMS basic queries
- One coding question (mostly simple)

HR round:
- Why TCS
- 5 year plan
- Strengths weaknesses
- Relocation comfortable?
- Bond agreement understanding

They take everyone who has basics + good communication. Don''t panic.','Education',true,'Ananya Iyer',NULL,234,1567,now() - interval '24 days'),

('IPL auction 2025 thoughts','Crazy money this year. 

Pant: 27cr (most expensive)
Iyer: 26.75cr
Arshdeep: 18cr

RCB still investing heavy but trophy nahi aayega 😂
CSK aging squad, dhoni''s last season prob
MI strong on paper
KKR defending champs

Who''s ur team?','Lifestyle',true,'Rohan Gupta',NULL,456,2890,now() - interval '24 days 6 hours'),

('Dark mode is not just aesthetic','Studies show dark mode:
- Reduces eye strain in low light
- Saves battery on OLED screens (15-30%)
- May help sleep (less blue light)

But it can be HARDER to read for some people, esp those with astigmatism. Light mode actually has better contrast for reading long text.

Use what works for you. Don''t follow trend blindly.','Technology',true,'Vikram Singh',NULL,167,890,now() - interval '25 days'),

('Why are we so obsessed with foreign degrees?','Honest discussion. Indian universities have improved a lot. IITs, IIMs, IISc are world class. Yet we send kids abroad for 50L+ loans for average colleges.

Status symbol? Better job prospects? Or escape from indian education system?

Curious what ur thoughts are.','General',true,'Priya Verma',NULL,234,1340,now() - interval '25 days 6 hours');